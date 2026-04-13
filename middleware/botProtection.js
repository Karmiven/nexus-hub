// Suspicious path patterns (path traversal, known exploit paths, config files)
const BLOCKED_PATHS = [
  /\.\./, /\/\.\w/, // path traversal, dotfiles
  /\/etc\//, /\/proc\//, /\/var\//, /\/tmp\//,
  /\/@fs\//, /\/@vite\//, /\/__vite/,
  /\/\.env/, /\/\.git/, /\/\.svn/, /\/\.hg/,
  /\/wp-admin/, /\/wp-login/, /\/wp-content/, /\/wp-includes/, /\/xmlrpc\.php/,
  /\/phpmyadmin/i, /\/pma\//i, /\/adminer/i,
  /\/cgi-bin\//, /\/\.cgi$/,
  /\/config\.(php|json|yml|yaml|xml|ini|bak)$/i,
  /\/debug\//, /\/telescope\//, /\/actuator\//,
  /\/(shell|cmd|command|exec|eval)\b/i,
  /\.sql$/i, /\.bak$/i, /\.old$/i, /\.orig$/i, /\.swp$/i,
  /\/\.well-known\/(?!acme)/, // allow ACME, block rest
];

// Suspicious user-agents (scanners, exploit tools)
const BLOCKED_UA = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|gobuster|dirbuster|wpscan|acunetix|nessus|openvas|burpsuite|hydra|metasploit/i;

// IP ban tracking (in-memory, resets on restart)
const _ipStrikes = new Map();
const STRIKE_LIMIT = 10;
const STRIKE_WINDOW = 15 * 60 * 1000; // 15 min
const BAN_DURATION = 60 * 60 * 1000;  // 1 hour

function botProtection(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  // Check if IP is banned
  const record = _ipStrikes.get(ip);
  if (record && record.banned && now < record.bannedUntil) {
    return res.status(403).end();
  }

  const urlPath = decodeURIComponent(req.path).toLowerCase();
  const ua = req.get('user-agent') || '';
  let blocked = false;

  // Check path
  if (BLOCKED_PATHS.some(rx => rx.test(urlPath))) blocked = true;

  // Check user-agent
  if (!blocked && BLOCKED_UA.test(ua)) blocked = true;

  // Check null bytes
  if (!blocked && req.url.includes('%00')) blocked = true;

  if (blocked) {
    // Track strikes
    if (!record || now - record.first > STRIKE_WINDOW) {
      _ipStrikes.set(ip, { first: now, count: 1, banned: false, bannedUntil: 0 });
    } else {
      record.count++;
      if (record.count >= STRIKE_LIMIT) {
        record.banned = true;
        record.bannedUntil = now + BAN_DURATION;
        console.warn(`Banned IP ${ip} for 1h (${record.count} malicious requests)`);
      }
    }
    return res.status(404).end();
  }

  next();
}

// Cleanup old strike records every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of _ipStrikes) {
    if (rec.banned && now > rec.bannedUntil) _ipStrikes.delete(ip);
    else if (!rec.banned && now - rec.first > STRIKE_WINDOW) _ipStrikes.delete(ip);
  }
}, 30 * 60 * 1000).unref();

module.exports = botProtection;
