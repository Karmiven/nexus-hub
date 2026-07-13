const db = require('../config/database');

/**
 * Record an admin action into the audit trail (admin_log table).
 * Never throws — audit logging must not break the action itself.
 *
 * @param {object} req    Express request (used for username + IP)
 * @param {string} action Short action code, e.g. "news.create", "user.role"
 * @param {string} details Optional human-readable details, capped at 500 chars
 */
function logAdmin(req, action, details = '') {
  try {
    const username = (req.session && req.session.user && req.session.user.username) || 'unknown';
    let ip = req.ip || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    if (ip === '::1') ip = '127.0.0.1';
    db.run(
      'INSERT INTO admin_log (username, action, details, ip) VALUES (?, ?, ?, ?)',
      [username, String(action).slice(0, 60), String(details).slice(0, 500), ip.slice(0, 45)]
    );
  } catch (e) {
    console.error('[admin-log]', e.message);
  }
}

module.exports = { logAdmin };
