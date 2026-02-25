const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { isGuest, isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Login handler
router.post('/login', isGuest, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.flash('error', 'Please fill in all fields.');
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
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
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

// Register page (disabled)
// router.get('/register', isGuest, (req, res) => {
//   res.render('auth/register', { title: 'Register' });
// });

// Register handler (disabled)
/*
router.post('/register', isGuest, async (req, res) => {
  const { username, email, password, password_confirm } = req.body;

  if (!username || !email || !password || !password_confirm) {
    req.flash('error', 'Please fill in all fields.');
    return res.redirect('/auth/register');
  }

  if (password !== password_confirm) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/register');
  }

  const existingUser = db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existingUser) {
    req.flash('error', 'Username or email already exists.');
    return res.redirect('/auth/register');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'user']
    );
    req.flash('success', 'Registration successful! Please log in.');
    return res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'An error occurred during registration.');
    return res.redirect('/auth/register');
  }
});
*/

// Logout handler
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/');
    }
    // Session destroyed successfully
    res.redirect('/');
  });
});

module.exports = router;
