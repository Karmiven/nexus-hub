const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { tcpPing } = require('../utils/statusChecker');

// Get all servers with status (JSON)
router.get('/servers', (req, res) => {
  const servers = db.all(
    'SELECT id, name, game, ip, port, status, player_count, max_players, last_checked, redirect_enabled, redirect_url FROM servers ORDER BY sort_order ASC'
  );
  res.json({ success: true, servers });
});

// Get single server status
router.get('/servers/:id/status', async (req, res) => {
  const server = db.get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  if (!server) {
    return res.status(404).json({ success: false, error: 'Server not found' });
  }

  const result = await tcpPing(server.ip, server.port);
  res.json({
    success: true,
    server: {
      id: server.id,
      name: server.name,
      status: result.online ? 'online' : 'offline',
      latency: result.latency,
      player_count: server.player_count,
      max_players: server.max_players
    }
  });
});

// ── Language API ──
router.post('/language', (req, res) => {
  const { language } = req.body;
  if (language && (language === 'en' || language === 'ru')) {
    req.session.language = language;
    res.json({ success: true, language });
  } else {
    res.json({ success: false, error: 'Invalid language' });
  }
});

// ── News API ──
router.get('/news', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const news = db.all(
    'SELECT id, title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, image, author, pinned, created_at FROM news ORDER BY pinned DESC, created_at DESC LIMIT ?',
    [limit]
  );
  res.json({ success: true, news });
});

module.exports = router;
