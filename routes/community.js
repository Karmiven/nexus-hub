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
    `SELECT m.id, m.username, m.message, m.created_at, u.role
     FROM chat_messages m
     LEFT JOIN users u ON u.username = m.username COLLATE NOCASE
     WHERE m.channel = ? ORDER BY m.created_at DESC LIMIT ?`,
    ['general', maxMessages]
  ).reverse();

  res.render('community', {
    title: 'Community',
    messages
  });
});

module.exports = router;
