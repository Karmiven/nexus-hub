// Suppress DEP0044 (util.isArray) from dependencies (socket.io/engine.io on Node 24+)
const origEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util.isArray')) return;
  return origEmitWarning.call(this, warning, ...args);
};

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const db = require('./config/database');
const { initDatabase } = db;
const { startStatusChecker } = require('./utils/statusChecker');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Trust proxy (for correct client IP behind Nginx/reverse proxy) ──
// Use 1 instead of true — trust only the first proxy hop
app.set('trust proxy', 1);

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));

// ── Compression ──
app.use(compression());

// ── Bot / Scanner protection ──
// Block malicious path traversal, vulnerability scanners, and suspicious requests
// This runs EARLY — before static files, sessions, or analytics
(function setupBotProtection() {
  // Suspicious path patterns (path traversal, known exploit paths, config files)
  const BLOCKED_PATHS = [
    /\.\./, /\/\.\w/, // path traversal, dotfiles
    /\/etc\//, /\/proc\//, /\/var\//, /\/tmp\//,
    /\/@fs\//, /\/@vite\//, /\/__vite/,
    /\/\.env/, /\/\.git/, /\/\.svn/, /\/\.hg/,
    /\/wp-admin/, /\/wp-login/, /\/wp-content/, /\/wp-includes/, /\/xmlrpc\.php/,
    /\/phpmyadmin/i, /\/pma\//i, /\/adminer/i,
    /\/cgi-bin\//, /\/\.cgi$/,
    /\/config\.(php|json|yml|yaml|xml|ini|bak)$/i,
    /\/debug\//, /\/telescope\//, /\/actuator\//,
    /\/(shell|cmd|command|exec|eval)\b/i,
    /\.sql$/i, /\.bak$/i, /\.old$/i, /\.orig$/i, /\.swp$/i,
    /\/\.well-known\/(?!acme)/, // allow ACME, block rest
  ];

  // Suspicious user-agents (scanners, exploit tools)
  const BLOCKED_UA = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|gobuster|dirbuster|wpscan|acunetix|nessus|openvas|burpsuite|hydra|metasploit/i;

  // IP ban tracking (in-memory, resets on restart)
  const _ipStrikes = new Map();
  const STRIKE_LIMIT = 10;
  const STRIKE_WINDOW = 15 * 60 * 1000; // 15 min
  const BAN_DURATION = 60 * 60 * 1000;  // 1 hour

  app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    // Check if IP is banned
    const record = _ipStrikes.get(ip);
    if (record && record.banned && now < record.bannedUntil) {
      return res.status(403).end();
    }

    const urlPath = decodeURIComponent(req.path).toLowerCase();
    const ua = req.get('user-agent') || '';
    let blocked = false;

    // Check path
    if (BLOCKED_PATHS.some(rx => rx.test(urlPath))) blocked = true;

    // Check user-agent
    if (!blocked && BLOCKED_UA.test(ua)) blocked = true;

    // Check null bytes
    if (!blocked && req.url.includes('%00')) blocked = true;

    if (blocked) {
      // Track strikes
      if (!record || now - record.first > STRIKE_WINDOW) {
        _ipStrikes.set(ip, { first: now, count: 1, banned: false, bannedUntil: 0 });
      } else {
        record.count++;
        if (record.count >= STRIKE_LIMIT) {
          record.banned = true;
          record.bannedUntil = now + BAN_DURATION;
          console.warn(`🚫 Banned IP ${ip} for 1h (${record.count} malicious requests)`);
        }
      }
      return res.status(404).end();
    }

    next();
  });

  // Cleanup old strike records every 30 min
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of _ipStrikes) {
      if (rec.banned && now > rec.bannedUntil) _ipStrikes.delete(ip);
      else if (!rec.banned && now - rec.first > STRIKE_WINDOW) _ipStrikes.delete(ip);
    }
  }, 30 * 60 * 1000).unref();
})();

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
app.use('/auth/', limiter);

// ── Session secret (persist across restarts) ──
function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretPath = path.join(__dirname, 'data', '.session-secret');
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    const secret = require('crypto').randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
    return secret;
  }
}

// ── Middleware ──
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Session middleware — initialized after DB in start()
let sessionMiddleware;
app.use((req, res, next) => sessionMiddleware(req, res, next));
app.use(flash());

const { csrfTokenMiddleware, csrfProtection } = require('./middleware/csrf');
app.use(csrfTokenMiddleware);
app.use(csrfProtection);

// Cache-busting version (changes on each restart)
const ASSET_VERSION = Date.now();

// Flash messages & global settings middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.v = ASSET_VERSION;

  // Use cached settings to avoid DB hit on every request
  try {
    const s = db.getCachedSettings('navbar_title', 'monitoring_public', 'site_timezone');
    res.locals.navbarTitle = s.navbar_title || 'NexusHub';
    res.locals.monitoringPublic = String(s.monitoring_public) === '1';
    res.locals.siteTimezone = s.site_timezone || 'Europe/Moscow';
  } catch (e) {
    res.locals.navbarTitle = 'NexusHub';
    res.locals.monitoringPublic = false;
    res.locals.siteTimezone = 'Europe/Moscow';
  }
  next();
});

// ── View Engine ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
}

// ── Static Files (with cache headers in production) ──
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    // Security headers for user-uploaded content
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'");
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
}));

// ── Setup Middleware ──
let isInstalledCache = false;
// Allow other modules to reset the cache (e.g. when an admin user is deleted)
app.set('resetInstalledCache', () => { isInstalledCache = false; });
app.use((req, res, next) => {
  // Skip check for static files and setup route itself
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/img') || req.path.startsWith('/setup')) {
    return next();
  }
  
  if (isInstalledCache) {
    return next();
  }
  
  try {
    const adminCount = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const isInstalled = adminCount && adminCount.count > 0;
    
    if (!isInstalled) {
      return res.redirect('/setup');
    } else {
      isInstalledCache = true;
    }
  } catch (e) {
    // Database might not be fully initialized yet
  }
  
  next();
});

// ── Analytics middleware (buffered page view tracking) ──
const geoip = require('geoip-lite');
const _analyticsBuffer = [];
const ANALYTICS_FLUSH_INTERVAL = 5000; // flush every 5 seconds

setInterval(() => {
  if (_analyticsBuffer.length === 0) return;
  const batch = _analyticsBuffer.splice(0, _analyticsBuffer.length);
  try {
    const batchInsert = db.transaction((rows) => {
      for (const row of rows) {
        db.run(
          'INSERT INTO page_views (path, method, user_id, ip, user_agent, country) VALUES (?, ?, ?, ?, ?, ?)',
          row
        );
      }
    });
    batchInsert(batch);
  } catch (e) { /* analytics should never break the app */ }
}, ANALYTICS_FLUSH_INTERVAL);

app.use((req, res, next) => {
  // Only track GET requests to actual pages (not static assets, API, or XHR)
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/css') &&
    !req.path.startsWith('/js') &&
    !req.path.startsWith('/img') &&
    !req.path.startsWith('/uploads') &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/admin') &&
    !req.path.startsWith('/health') &&
    !req.path.includes('.') &&
    !req.xhr &&
    req.headers['x-requested-with'] !== 'XMLHttpRequest'
  ) {
    // Resolve country from IP
    const rawIp = req.ip || '';
    const cleanIp = rawIp.replace(/^::ffff:/, '');
    const geo = geoip.lookup(cleanIp);
    const country = (geo && geo.country) || '';

    _analyticsBuffer.push(
      [req.path, req.method, req.session?.user?.id || null, req.ip, (req.headers['user-agent'] || '').substring(0, 255), country]
    );
  }
  next();
});

// ── Routes ──
const setupRoutes = require('./routes/setup');
const homeRoutes = require('./routes/home');
const serverRoutes = require('./routes/servers');
const communityRoutes = require('./routes/community');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const monitoring = require('./routes/monitoring');

app.use('/setup', setupRoutes);
app.use('/', homeRoutes);
app.use('/servers', serverRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/community', communityRoutes);
app.use('/api', apiRoutes);
app.use('/monitoring', monitoring.router);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Socket.io Chat (with session sharing) ──
io.engine.use((req, res, next) => sessionMiddleware(req, res, next));
require('./sockets/chat')(io);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[ERROR]', err.stack || err.message || err);

  // JSON response for API / AJAX requests
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(err.status || 500).json({
      success: false,
      error: isDev ? err.message : 'Internal server error'
    });
  }

  res.status(err.status || 500).render('errors/500', {
    title: 'Server Error',
    error: isDev ? err : null
  });
});

// ── Start ──
const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();

  sessionMiddleware = session({
    store: new SqliteStore({
      client: db.getInstance(),
      expired: { clear: true, intervalMs: 900000 }
    }),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
  });

  monitoring.initMonitoring?.();
  startStatusChecker();

  server.listen(PORT, () => {
    console.log(`\n🎮 NexusHub is running on http://localhost:${PORT}`);
    console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start NexusHub:', err);
  process.exit(1);
});

// Graceful shutdown — flush pending DB writes
process.on('SIGINT', () => {
  db.stopAutoSave();
  process.exit(0);
});
process.on('SIGTERM', () => {
  db.stopAutoSave();
  process.exit(0);
});

module.exports = { app, server, io };
