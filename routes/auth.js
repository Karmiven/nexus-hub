const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Login handler
router.post('/login', isGuest, loginLimiter, async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    req.flash('error', 'Please fill in all fields.');
    return res.redirect('/auth/login');
  }

  // Sanitize username - allow alphanumeric, underscore, and Unicode letters
  username = String(username).replace(/[^\p{L}\p{N}_]/gu, '');
  
  if (username.length < 2 || username.length > 30) {
    req.flash('error', 'Invalid username length.');
    return res.redirect('/auth/login');
  }

  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    req.flash('error', 'Invalid credentials.');
    return res.redirect('/auth/login');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    req.flash('error', 'Invalid credentials.');
    return res.redirect('/auth/login');
  }

  // Update last login and IP
  let clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
  // Normalize IPv6 loopback to readable form
  if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') clientIP = '127.0.0.1';
  if (clientIP.startsWith('::ffff:')) clientIP = clientIP.slice(7);
  db.run(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
    [clientIP, user.id]
  );

  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  req.flash('success', `Welcome back, ${user.username}!`);

  if (user.role === 'admin') {
    return res.redirect('/admin');
  }
  return res.redirect('/');
});

// Logout handler (POST to prevent CSRF via img/link prefetch)
router.post('/logout', isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Also support GET for backward compatibility, but redirect to POST form
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
