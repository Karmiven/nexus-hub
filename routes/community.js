const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Community chat page
router.get('/', (req, res) => {
  const s = db.getCachedSettings('community_enabled', 'max_chat_messages');
  if (s.community_enabled === '0') {
    req.flash('error', 'flash_community_disabled');
    return res.redirect('/');
  }

  const maxMessages = Math.min(Math.max(parseInt(s.max_chat_messages) || 200, 10), 1000);

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
