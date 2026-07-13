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
try {
  fs.watch(langDir, () => { _langCache = null; });
} catch (e) {
  console.warn('Language dir watch unavailable:', e.message);
}

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

// ── Server history (uptime + players from status log) ──
// 24h → 1h buckets (~24 points), 7d → 6h buckets (~28 points)
router.get('/servers/:id/history', (req, res) => {
  const server = db.get('SELECT id FROM servers WHERE id = ?', [req.params.id]);
  if (!server) {
    return res.status(404).json({ success: false, error: 'Server not found' });
  }
  const range = req.query.range === '7d' ? '7d' : '24h';
  const bucketSec = range === '7d' ? 21600 : 3600;
  const since = range === '7d' ? '-7 days' : '-24 hours';

  // bucketSec is inlined: bound parameters coerce the division to REAL,
  // which breaks integer bucketing. Value is server-controlled (3600/21600).
  const rows = db.all(
    `SELECT (CAST(strftime('%s', created_at) AS INTEGER) / ${bucketSec}) * ${bucketSec} AS t,
            ROUND(AVG(status = 'online') * 100, 1) AS up,
            CAST(ROUND(AVG(player_count)) AS INTEGER) AS players,
            MAX(player_count) AS peak
     FROM server_status_log
     WHERE server_id = ? AND created_at >= datetime('now', ?)
     GROUP BY t ORDER BY t`,
    [server.id, since]
  );
  res.json({ success: true, range, bucketSec, points: rows });
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
