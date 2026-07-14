const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all servers
router.get('/', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC, name ASC');

  res.render('servers', {
    title: 'Game Servers',
    servers
  });
});

// Server detail / redirect
router.get('/:id', (req, res) => {
  const server = db.get('SELECT * FROM servers WHERE id = ?', [req.params.id]);

  if (!server) {
    return res.status(404).render('errors/404', { title: 'Server Not Found' });
  }

  // If redirect is enabled and URL is set, redirect to external site
  if (server.redirect_enabled && server.redirect_url) {
    // Validate redirect URL to prevent open redirect attacks
    try {
      const redirectUrl = new URL(server.redirect_url);
      if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
        return res.status(400).render('errors/404', { title: 'Invalid Redirect' });
      }
    } catch {
      return res.status(400).render('errors/404', { title: 'Invalid Redirect' });
    }
    return res.redirect(server.redirect_url);
  }

  // ── Stats from the collected status log (best-effort; empty on fresh installs) ──
  const stats = { up24h: null, up7d: null, peak24h: null, peak7d: null, avgPing: null, samples: 0 };
  let events = [];
  try {
    const agg = db.get(
      `SELECT
         ROUND(AVG(CASE WHEN created_at >= datetime('now','-1 day')  THEN (status='online') END) * 100, 1) AS up24h,
         ROUND(AVG(status='online') * 100, 1) AS up7d,
         MAX(CASE WHEN created_at >= datetime('now','-1 day') THEN player_count END) AS peak24h,
         MAX(player_count) AS peak7d,
         CAST(ROUND(AVG(CASE WHEN status='online' AND latency > 0 THEN latency END)) AS INTEGER) AS avgPing,
         COUNT(*) AS samples
       FROM server_status_log
       WHERE server_id = ? AND created_at >= datetime('now','-7 days')`,
      [server.id]
    );
    if (agg) {
      stats.up24h = agg.up24h;
      stats.up7d = agg.up7d;
      stats.peak24h = agg.peak24h;
      stats.peak7d = agg.peak7d;
      stats.avgPing = agg.avgPing;
      stats.samples = agg.samples || 0;
    }

    // Recent up/down transitions: keep only rows where status changed from the previous check.
    const rows = db.all(
      `SELECT status, player_count, created_at FROM server_status_log
       WHERE server_id = ? ORDER BY created_at DESC LIMIT 400`,
      [server.id]
    );
    for (let i = 0; i < rows.length; i++) {
      const next = rows[i + 1]; // older row
      if (!next || next.status !== rows[i].status) {
        events.push({ status: rows[i].status, created_at: rows[i].created_at, player_count: rows[i].player_count });
        if (events.length >= 8) break;
      }
    }
  } catch (e) { /* log table may not exist yet */ }

  res.render('server-detail', {
    title: server.name,
    server,
    stats,
    events
  });
});

module.exports = router;
