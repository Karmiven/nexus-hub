const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ── Overview (home) — compact summary of every section ──
router.get('/', (req, res) => {
  const settings = db.getCachedSettings('site_name', 'hero_subtitle', 'community_enabled');

  const servers = db.all('SELECT id, name, game, ip, port, status, player_count, max_players, show_ip_address, show_player_count FROM servers ORDER BY sort_order ASC LIMIT 6');
  const news = db.all('SELECT * FROM news ORDER BY pinned DESC, created_at DESC LIMIT 3');
  const userCount = db.get('SELECT COUNT(*) as count FROM users');

  // Last chat messages (with role for badges), only if chat is enabled
  let chatPreview = [];
  const communityEnabled = settings.community_enabled !== '0';
  if (communityEnabled) {
    chatPreview = db.all(
      `SELECT m.username, m.message, m.created_at, u.role
       FROM chat_messages m
       LEFT JOIN users u ON u.username = m.username COLLATE NOCASE
       WHERE m.channel = 'general'
       ORDER BY m.created_at DESC LIMIT 3`
    ).reverse();
  }

  res.render('home', {
    title: settings.site_name || 'NexusHub',
    heroSubtitle: settings.hero_subtitle || '',
    servers,
    news,
    chatPreview,
    communityEnabled,
    currentLang: req.session.language || 'en',
    userCount: userCount?.count || 0
  });
});

// ── News feed (moved off the home page to keep it light) ──
router.get('/news', (req, res) => {
  const news = db.all('SELECT * FROM news ORDER BY pinned DESC, created_at DESC LIMIT 50');
  res.render('news', {
    title: 'News',
    news,
    currentLang: req.session.language || 'en'
  });
});

module.exports = router;
