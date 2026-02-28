const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

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
router.post('/', async (req, res) => {
  if (isInstalled()) {
    return res.redirect('/');
  }

  const { site_name, admin_username, admin_email, admin_password, admin_password_confirm } = req.body;

  if (!site_name || !admin_username || !admin_email || !admin_password || !admin_password_confirm) {
    req.flash('error', 'Please fill in all fields.');
    return res.redirect('/setup');
  }

  if (admin_password !== admin_password_confirm) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/setup');
  }

  if (admin_password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters long.');
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
      [admin_username, admin_email, hashedPassword, 'admin']
    );

    req.flash('success', 'Setup complete! You can now log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Setup error:', error);
    req.flash('error', 'An error occurred during setup. Please try again.');
    res.redirect('/setup');
  }
});

module.exports = router;
