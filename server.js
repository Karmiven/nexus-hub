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
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const helmet = require('helmet');
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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
    }
  },
  crossOriginEmbedderPolicy: false
}));

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
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 
  }
}));
app.use(flash());

const { csrfTokenMiddleware, csrfProtection } = require('./middleware/csrf');
app.use(csrfTokenMiddleware);
app.use(csrfProtection);

// Flash messages & global settings middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;

  // Global settings for templates (sync read — microsecond-fast with SQLite)
  try {
    const rows = db.all("SELECT key, value FROM settings WHERE key IN ('navbar_title', 'monitoring_public')");
    const s = {};
    for (const r of rows) s[r.key] = r.value;
    res.locals.navbarTitle = s.navbar_title || 'NexusHub';
    res.locals.monitoringPublic = String(s.monitoring_public) === '1';
  } catch (e) {
    res.locals.navbarTitle = 'NexusHub';
    res.locals.monitoringPublic = false;
  }
  next();
});

// ── View Engine ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ──
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ── Socket.io Chat ──
require('./sockets/chat')(io);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { title: 'Server Error' });
});

// ── Start ──
const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  
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
