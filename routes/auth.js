const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const rateLimit = require('express-rate-limit');

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY;


async function verifyTurnstile(token, ip) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

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
  res.render('auth/login', { title: 'Login', turnstileSiteKey: TURNSTILE_SITE_KEY });
});

// Login handler
router.post('/login', isGuest, loginLimiter, catchAsync(async (req, res) => {
  let { username, password } = req.body;
  const turnstileToken = req.body['cf-turnstile-response'];

  if (!turnstileToken || !(await verifyTurnstile(turnstileToken, req.ip))) {
    req.flash('error', 'flash_bot_failed');
    return res.redirect('/auth/login');
  }

  if (!username || !password) {
    req.flash('error', 'flash_fill_all');
    return res.redirect('/auth/login');
  }

  // Sanitize username - allow alphanumeric, underscore, and Unicode letters
  username = String(username).replace(/[^\p{L}\p{N}_]/gu, '');
  
  if (username.length < 2 || username.length > 30) {
    req.flash('error', 'flash_invalid_username');
    return res.redirect('/auth/login');
  }

  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    req.flash('error', 'flash_invalid_creds');
    return res.redirect('/auth/login');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    req.flash('error', 'flash_invalid_creds');
    return res.redirect('/auth/login');
  }

  // Update last login and IP (trust proxy is configured, so req.ip is correct)
  let clientIP = req.ip || 'unknown';
  if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') clientIP = '127.0.0.1';
  if (clientIP.startsWith('::ffff:')) clientIP = clientIP.slice(7);
  db.run(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
    [clientIP, user.id]
  );

  // Regenerate session ID to prevent session fixation attacks
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  const redirectTo = user.role === 'admin' ? '/admin' : '/';

  req.session.regenerate((err) => {
    if (err) {
      console.error('Session regeneration error:', err);
      req.flash('error', 'flash_session_error');
      return res.redirect('/auth/login');
    }
    req.session.user = userData;
    req.session.save((saveErr) => {
      if (saveErr) console.error('Session save error:', saveErr);
      // flash won't work after regenerate without save, so set it after save
      return res.redirect(redirectTo);
    });
  });
}));

// Register page
router.get('/register', isGuest, (req, res) => {
  // Check if registration is enabled
  const s = db.getCachedSettings('registration_enabled');
  if (s.registration_enabled === '0') {
    req.flash('error', 'flash_reg_disabled');
    return res.redirect('/auth/login');
  }
  res.render('auth/register', { title: 'Register' });
});

// Register handler
router.post('/register', isGuest, registerLimiter, catchAsync(async (req, res) => {
  // Check if registration is enabled
  const s = db.getCachedSettings('registration_enabled');
  if (s.registration_enabled === '0') {
    req.flash('error', 'flash_reg_disabled');
    return res.redirect('/auth/login');
  }

  const { username, email, password, password2 } = req.body;

  if (!username || !password || !password2) {
    req.flash('error', 'flash_username_required');
    return res.redirect('/auth/register');
  }

  // Sanitize username
  const cleanUsername = String(username).replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 30);
  if (cleanUsername.length < 2) {
    req.flash('error', 'flash_username_short');
    return res.redirect('/auth/register');
  }

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      req.flash('error', 'flash_email_invalid');
      return res.redirect('/auth/register');
    }
  }

  if (password !== password2) {
    req.flash('error', 'flash_passwords_mismatch');
    return res.redirect('/auth/register');
  }

  if (password.length < 8) {
    req.flash('error', 'flash_password_short');
    return res.redirect('/auth/register');
  }

  // Check if username already exists
  const existingUser = db.get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existingUser) {
    req.flash('error', 'flash_username_taken');
    return res.redirect('/auth/register');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail) {
      req.flash('error', 'flash_email_taken');
      return res.redirect('/auth/register');
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, email ? email.trim().toLowerCase() : null, hashedPassword, 'user']
    );

    req.flash('success', 'flash_account_created');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'flash_reg_error');
    res.redirect('/auth/register');
  }
}));

// Profile page
router.get('/profile', isAuthenticated, (req, res) => {
  const profile = db.get('SELECT id, username, email, role, notify_email, notify_discord, created_at FROM users WHERE id = ?', [req.session.user.id]);
  if (!profile) {
    req.flash('error', 'flash_user_not_found');
    return res.redirect('/');
  }
  res.render('auth/profile', { title: 'Profile', profile });
});

// Update notification preferences
router.post('/profile/notifications', isAuthenticated, (req, res) => {
  try {
    const { notify_email, notify_discord } = req.body;
    const cleanDiscord = String(notify_discord || '').replace(/[^0-9]/g, '').slice(0, 20);
    db.run(
      'UPDATE users SET notify_email = ?, notify_discord = ? WHERE id = ?',
      [notify_email ? 1 : 0, cleanDiscord, req.session.user.id]
    );
    req.flash('success', 'flash_prefs_saved');
    res.redirect('/auth/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    req.flash('error', 'flash_error');
    res.redirect('/auth/profile');
  }
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
