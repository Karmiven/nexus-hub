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
app.set('trust proxy', true);

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// ── Middleware ──
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());

// Flash messages & global settings middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;

  // Global navbar title from settings
  try {
    const navbarTitle = db.get("SELECT value FROM settings WHERE key = 'navbar_title'");
    res.locals.navbarTitle = navbarTitle?.value || 'NexusHub';
  } catch (e) {
    res.locals.navbarTitle = 'NexusHub';
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
app.use((req, res, next) => {
  // Skip check for static files and setup route itself
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/img') || req.path === '/setup') {
    return next();
  }
  
  try {
    const adminCount = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const isInstalled = adminCount && adminCount.count > 0;
    
    if (!isInstalled) {
      return res.redirect('/setup');
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

// ── Socket.io Chat ──
require('./sockets/chat')(io);

// ── Initialize Monitoring (delay to ensure database is ready) ──
setTimeout(() => monitoring.initMonitoring?.(), 1000);

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
