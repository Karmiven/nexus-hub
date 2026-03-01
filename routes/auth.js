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

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: 'Too many registration attempts, please try again later.',
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

// Register page
router.get('/register', isGuest, (req, res) => {
  // Check if registration is enabled
  const regSetting = db.get("SELECT value FROM settings WHERE key = 'registration_enabled'");
  if (regSetting?.value === '0') {
    req.flash('error', 'Registration is currently disabled.');
    return res.redirect('/auth/login');
  }
  res.render('auth/register', { title: 'Register' });
});

// Register handler
router.post('/register', isGuest, registerLimiter, async (req, res) => {
  // Check if registration is enabled
  const regSetting = db.get("SELECT value FROM settings WHERE key = 'registration_enabled'");
  if (regSetting?.value === '0') {
    req.flash('error', 'Registration is currently disabled.');
    return res.redirect('/auth/login');
  }

  const { username, email, password, password2 } = req.body;

  if (!username || !password || !password2) {
    req.flash('error', 'Username and password are required.');
    return res.redirect('/auth/register');
  }

  // Sanitize username
  const cleanUsername = String(username).replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 30);
  if (cleanUsername.length < 2) {
    req.flash('error', 'Username must be at least 2 characters (letters, numbers, underscores).');
    return res.redirect('/auth/register');
  }

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      req.flash('error', 'Invalid email format.');
      return res.redirect('/auth/register');
    }
  }

  if (password !== password2) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }

  if (password.length < 8) {
    req.flash('error', 'Password must be at least 8 characters long.');
    return res.redirect('/auth/register');
  }

  // Check if username already exists
  const existingUser = db.get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existingUser) {
    req.flash('error', 'Username is already taken.');
    return res.redirect('/auth/register');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail) {
      req.flash('error', 'Email is already registered.');
      return res.redirect('/auth/register');
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, email ? email.trim().toLowerCase() : null, hashedPassword, 'user']
    );

    req.flash('success', 'Account created! You can now log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'An error occurred during registration.');
    res.redirect('/auth/register');
  }
});

// Profile page
router.get('/profile', isAuthenticated, (req, res) => {
  const profile = db.get('SELECT id, username, email, role, notify_email, notify_discord, created_at FROM users WHERE id = ?', [req.session.user.id]);
  if (!profile) {
    req.flash('error', 'User not found.');
    return res.redirect('/');
  }
  res.render('auth/profile', { title: 'Profile', profile });
});

// Update notification preferences
router.post('/profile/notifications', isAuthenticated, (req, res) => {
  const { notify_email, notify_discord } = req.body;

  // Sanitize discord ID — allow only digits
  const cleanDiscord = String(notify_discord || '').replace(/[^0-9]/g, '').slice(0, 20);

  db.run(
    'UPDATE users SET notify_email = ?, notify_discord = ? WHERE id = ?',
    [notify_email ? 1 : 0, cleanDiscord, req.session.user.id]
  );

  req.flash('success', 'Preferences saved.');
  res.redirect('/auth/profile');
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

module.exports = router;
