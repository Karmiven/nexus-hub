const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { tcpPing } = require('../utils/statusChecker');

// ── Available Languages (scan /js/lang/*.js once at startup) ──
const langDir = path.join(__dirname, '..', 'public', 'js', 'lang');
var _langCache = null;

function getAvailableLanguages() {
  if (_langCache) return _langCache;
  try {
    _langCache = fs.readdirSync(langDir)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace('.js', ''))
      .sort((a, b) => a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b));
  } catch (e) {
    _langCache = ['en'];
  }
  return _langCache;
}

// Watch for new/removed language files — invalidate cache
fs.watch(langDir, () => { _langCache = null; });

// Get all servers with status (JSON)
// Don't expose IP/port to unauthenticated users — use separate hardcoded queries
router.get('/servers', (req, res) => {
  const isAdmin = req.session?.user?.role === 'admin';
  const servers = isAdmin
    ? db.all('SELECT id, name, game, ip, port, status, player_count, max_players, last_checked, redirect_enabled, redirect_url FROM servers ORDER BY sort_order ASC')
    : db.all('SELECT id, name, game, status, player_count, max_players, last_checked, redirect_enabled, redirect_url FROM servers ORDER BY sort_order ASC');
  res.json({ success: true, servers });
});

// Get single server status
router.get('/servers/:id/status', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check server status' });
  }
});

// ── Language API ──
router.get('/languages', (req, res) => {
  res.json(getAvailableLanguages());
});

router.post('/language', (req, res) => {
  const { language } = req.body;
  if (language && getAvailableLanguages().includes(language)) {
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
