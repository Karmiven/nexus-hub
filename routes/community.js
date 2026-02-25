const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Community chat page
router.get('/', (req, res) => {
  const enabled = db.get("SELECT value FROM settings WHERE key = 'community_enabled'");
  if (enabled?.value === '0') {
    req.flash('error', 'Community section is currently disabled.');
    return res.redirect('/');
  }

  const maxMessages = parseInt(
    db.get("SELECT value FROM settings WHERE key = 'max_chat_messages'")?.value || '200'
  );

  const messages = db.all(
    'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?',
    ['general', maxMessages]
  ).reverse();

  res.render('community', {
    title: 'Community',
    messages
  });
});

module.exports = router;
