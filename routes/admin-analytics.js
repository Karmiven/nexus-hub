const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');

router.use(isAdmin);

// ── Analytics Page ──
router.get('/', (req, res) => {
  res.render('admin/analytics', { title: 'Analytics' });
});

// ══════════════════════════════════════════════════════════════
//   ANALYTICS API
// ══════════════════════════════════════════════════════════════

// Page views over last N days (line chart)
router.get('/pageviews', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const rows = db.all(`
    SELECT date(created_at) as day, COUNT(DISTINCT ip) as views
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
    GROUP BY date(created_at)
    ORDER BY day ASC
  `, [days]);
  res.json(rows);
});

// Top pages (horizontal bar chart)
router.get('/popular-pages', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  const rows = db.all(`
    SELECT path, COUNT(DISTINCT ip) as views
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
    GROUP BY path
    ORDER BY views DESC
    LIMIT ?
  `, [days, limit]);
  res.json(rows);
});

// User registrations over time (line chart)
router.get('/registrations', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const rows = db.all(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM users
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `, [days]);
  res.json(rows);
});

// Chat activity per day (bar chart)
router.get('/chat-activity', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const rows = db.all(`
    SELECT date(created_at) as day, COUNT(*) as messages
    FROM chat_messages
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `, [days]);
  res.json(rows);
});

// Server uptime percentage (bar chart with daily breakdown)
router.get('/server-uptime', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const rows = db.all(`
    SELECT server_name, date(created_at) as day,
           SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_checks,
           COUNT(*) as total_checks
    FROM server_status_log
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY server_id, date(created_at)
    ORDER BY server_name ASC, day ASC
  `, [days]);

  // Group by server, collect all unique days
  const servers = {};
  const allDays = new Set();
  for (const r of rows) {
    if (!servers[r.server_name]) servers[r.server_name] = {};
    servers[r.server_name][r.day] = r.total_checks > 0 ? Math.round((r.online_checks / r.total_checks) * 100) : 0;
    allDays.add(r.day);
  }

  const sortedDays = Array.from(allDays).sort();
  const result = {
    days: sortedDays,
    servers: Object.entries(servers).map(([name, dayData]) => ({
      name,
      data: sortedDays.map(d => dayData[d] !== undefined ? dayData[d] : null)
    }))
  };
  res.json(result);
});

// Server status timeline (area chart)
router.get('/server-timeline', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  const rows = db.all(`
    SELECT date(created_at) as day,
           SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
           SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
    FROM server_status_log
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `, [days]);
  res.json(rows);
});

// Hourly traffic distribution (radar / bar chart)
router.get('/hourly-traffic', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const rows = db.all(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(DISTINCT ip) as views
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
    GROUP BY hour
    ORDER BY hour ASC
  `, [days]);
  // Fill all 24 hours
  const hourMap = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;
  for (const r of rows) hourMap[r.hour] = r.views;
  const result = Object.entries(hourMap).map(([h, v]) => ({ hour: parseInt(h), views: v }));
  res.json(result);
});

// Filter out local/private IPs from analytics
const LOCAL_IP_FILTER = `
  AND ip NOT LIKE '127.%'
  AND ip NOT LIKE '10.%'
  AND ip NOT LIKE '172.16.%' AND ip NOT LIKE '172.17.%' AND ip NOT LIKE '172.18.%'
  AND ip NOT LIKE '172.19.%' AND ip NOT LIKE '172.2_.%' AND ip NOT LIKE '172.3_.%'
  AND ip NOT LIKE '192.168.%'
  AND ip NOT LIKE '::1%'
  AND ip NOT LIKE '::ffff:127.%'
  AND ip NOT LIKE '::ffff:10.%'
  AND ip NOT LIKE '::ffff:192.168.%'
  AND ip NOT LIKE 'fe80:%'
`;

// Visitor countries (pie/doughnut chart)
router.get('/countries', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const rows = db.all(`
    SELECT COALESCE(NULLIF(country, ''), 'Unknown') as country, COUNT(DISTINCT ip) as visitors
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
      ${LOCAL_IP_FILTER}
    GROUP BY country
    ORDER BY visitors DESC
    LIMIT 20
  `, [days]);
  res.json(rows);
});

// Visitor log (detailed table with pagination + sorting)
router.get('/visitors', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  // Sorting
  const SORT_COLUMNS = {
    ip: 'ip', country: 'country', visits: 'total_views',
    pages: 'unique_pages', first: 'first_visit', last: 'last_visit'
  };
  const sortCol = SORT_COLUMNS[req.query.sort] || 'total_views';
  const sortDir = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const total = db.get(`
    SELECT COUNT(DISTINCT ip) as count
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
      ${LOCAL_IP_FILTER}
  `, [days]);

  const rows = db.all(`
    SELECT
      ip,
      COALESCE(NULLIF(country, ''), 'Unknown') as country,
      COUNT(*) as total_views,
      COUNT(DISTINCT path) as unique_pages,
      MIN(created_at) as first_visit,
      MAX(created_at) as last_visit,
      GROUP_CONCAT(DISTINCT path) as pages
    FROM page_views
    WHERE created_at >= datetime('now', '-' || ? || ' days')
      AND path NOT LIKE '/admin%'
      ${LOCAL_IP_FILTER}
    GROUP BY ip
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `, [days, limit, offset]);

  // Convert pages to array for frontend
  for (const row of rows) {
    row.pages = row.pages ? row.pages.split(',') : [];
  }

  res.json({
    visitors: rows,
    total: total ? total.count : 0,
    page,
    totalPages: Math.ceil((total ? total.count : 0) / limit)
  });
});

// Cleanup old analytics data (keep last 90 days)
router.post('/cleanup', (req, res) => {
  const pvDeleted = db.run("DELETE FROM page_views WHERE created_at < datetime('now', '-90 days')");
  const slDeleted = db.run("DELETE FROM server_status_log WHERE created_at < datetime('now', '-90 days')");
  res.json({
    success: true,
    pageViewsDeleted: pvDeleted.changes,
    statusLogsDeleted: slDeleted.changes
  });
});

module.exports = router;
