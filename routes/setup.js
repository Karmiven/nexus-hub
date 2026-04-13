const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const rateLimit = require('express-rate-limit');
const catchAsync = require('../utils/catchAsync');

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: 'Too many setup attempts, please try again later.'
});

// Check if already installed
function isInstalled() {
  const adminCount = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  return adminCount && adminCount.count > 0;
}

// GET /setup - Show setup form
router.get('/', (req, res) => {
  if (isInstalled()) {
    return res.redirect('/');
  }
  res.render('setup', { title: 'NexusHub Setup' });
});

// POST /setup - Process setup form
router.post('/', setupLimiter, catchAsync(async (req, res) => {
  if (isInstalled()) {
    return res.redirect('/');
  }

  const { site_name, admin_username, admin_email, admin_password, admin_password_confirm } = req.body;

  if (!site_name || !admin_username || !admin_email || !admin_password || !admin_password_confirm) {
    req.flash('error', 'flash_fill_all');
    return res.redirect('/setup');
  }

  // Sanitize username
  const cleanUsername = String(admin_username).replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 30);
  if (cleanUsername.length < 2) {
    req.flash('error', 'flash_username_short');
    return res.redirect('/setup');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(admin_email)) {
    req.flash('error', 'flash_email_invalid');
    return res.redirect('/setup');
  }

  if (admin_password !== admin_password_confirm) {
    req.flash('error', 'flash_passwords_mismatch');
    return res.redirect('/setup');
  }

  if (admin_password.length < 8) {
    req.flash('error', 'flash_password_short');
    return res.redirect('/setup');
  }

  try {
    // Update site name
    db.run('UPDATE settings SET value = ? WHERE key = ?', [site_name, 'site_name']);
    db.run('UPDATE settings SET value = ? WHERE key = ?', [site_name, 'navbar_title']);

    // Create admin user
    const hashedPassword = await bcrypt.hash(admin_password, 12);
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, admin_email.trim().toLowerCase(), hashedPassword, 'admin']
    );

    req.flash('success', 'flash_setup_complete');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Setup error:', error);
    req.flash('error', 'flash_setup_error');
    res.redirect('/setup');
  }
}));

module.exports = router;
