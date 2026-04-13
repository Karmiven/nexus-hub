const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Community chat page
router.get('/', (req, res) => {
  const s = db.getCachedSettings('community_enabled', 'max_chat_messages');
  if (s.community_enabled === '0') {
    req.flash('error', 'Community section is currently disabled.');
    return res.redirect('/');
  }

  const maxMessages = parseInt(s.max_chat_messages || '200');

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
