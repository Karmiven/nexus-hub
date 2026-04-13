const geoip = require('geoip-lite');
const db = require('../config/database');

const _analyticsBuffer = [];
const ANALYTICS_FLUSH_INTERVAL = 5000; // flush every 5 seconds

setInterval(() => {
  if (_analyticsBuffer.length === 0) return;
  const batch = _analyticsBuffer.splice(0, _analyticsBuffer.length);
  try {
    const batchInsert = db.transaction((rows) => {
      for (const row of rows) {
        db.run(
          'INSERT INTO page_views (path, method, user_id, ip, user_agent, country) VALUES (?, ?, ?, ?, ?, ?)',
          row
        );
      }
    });
    batchInsert(batch);
  } catch (e) { /* analytics should never break the app */ }
}, ANALYTICS_FLUSH_INTERVAL);

function analyticsTracker(req, res, next) {
  // Only track GET requests to actual pages (not static assets, API, or XHR)
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/css') &&
    !req.path.startsWith('/js') &&
    !req.path.startsWith('/img') &&
    !req.path.startsWith('/uploads') &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/admin') &&
    !req.path.startsWith('/health') &&
    !req.path.includes('.') &&
    !req.xhr &&
    req.headers['x-requested-with'] !== 'XMLHttpRequest'
  ) {
    // Resolve country from IP
    const rawIp = req.ip || '';
    const cleanIp = rawIp.replace(/^::ffff:/, '');
    const geo = geoip.lookup(cleanIp);
    const country = (geo && geo.country) || '';

    _analyticsBuffer.push(
      [req.path, req.method, req.session?.user?.id || null, req.ip, (req.headers['user-agent'] || '').substring(0, 255), country]
    );
  }
  next();
}

module.exports = analyticsTracker;
