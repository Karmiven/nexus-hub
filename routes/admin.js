const express = require('express');
const router = express.Router();
const net = require('net');
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { checkAllServers } = require('../utils/statusChecker');
const { encrypt } = require('../utils/crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'news');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// All admin routes require admin role
router.use(isAdmin);

// ── Helper: read all settings as object ──
function getSettingsMap() {
  const rows = db.all('SELECT * FROM settings');
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

// ── Helper: validate server input ──
const HOSTNAME_RE = /^(?!-)([A-Za-z0-9-]{1,63}\.)*[A-Za-z]{2,}$/;

function validateServerInput(body) {
  const { name, game, ip, port } = body;
  if (!name || !game || !ip || !port) {
    return 'Name, game, IP, and port are required.';
  }
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return 'Port must be a valid number between 1 and 65535.';
  }
  if (net.isIP(ip) === 0 && !HOSTNAME_RE.test(ip)) {
    return 'Invalid IP address or hostname format.';
  }
  return null;
}

// ── Helper: validate news input ──
const MAX_NEWS_CONTENT_SIZE = 50000; // 50KB per field

function validateNewsInput(body) {
  const { title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru } = body;
  if (!title_en || !title_ru || !content_short_en || !content_short_ru || !content_full_en || !content_full_ru) {
    return 'All title and content fields are required.';
  }
  const fields = [title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru];
  if (fields.some(f => String(f).length > MAX_NEWS_CONTENT_SIZE)) {
    return 'Content is too long (max 50KB per field).';
  }
  return null;
}

function resolveNewsImage(croppedImageData, uploadedFile, existingImage = '') {
  // If cropped base64 data URI is provided, save it as a file to avoid DB bloat
  if (croppedImageData && croppedImageData.startsWith('data:image/')) {
    try {
      const matches = croppedImageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        // Limit decoded size to 5MB
        if (buffer.length > 5 * 1024 * 1024) return existingImage;
        const filename = 'cropped-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        return '/uploads/news/' + filename;
      }
    } catch (e) {
      console.error('Failed to save cropped image:', e.message);
    }
  }
  if (uploadedFile) return '/uploads/news/' + uploadedFile.filename;
  return existingImage;
}

// ── Dashboard ──
router.get('/', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC');
  const newsCount = db.get('SELECT COUNT(*) as count FROM news');
  const userCount = db.get('SELECT COUNT(*) as count FROM users');
  const onlineCount = db.get("SELECT COUNT(*) as count FROM servers WHERE status = 'online'");

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    servers,
    stats: {
      newsCount: newsCount?.count || 0,
      userCount: userCount?.count || 0,
      onlineServers: onlineCount?.count || 0,
      totalServers: servers.length
    }
  });
});

// ── News Management ──
router.get('/news', (req, res) => {
  const news = db.all('SELECT * FROM news ORDER BY created_at DESC');
  res.render('admin/news-unified', { title: 'Manage News', news, editingId: null, article: null });
});

// API endpoint to get article data for editing
router.get('/news/:id/data', (req, res) => {
  const article = db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

router.post('/news/create', upload.single('image'), (req, res) => {
  const { title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, pinned, croppedImageData } = req.body;

  const validationError = validateNewsInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/news');
  }

  const imageData = resolveNewsImage(croppedImageData, req.file);

  db.run(
    'INSERT INTO news (title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, image, pinned, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, imageData, pinned ? 1 : 0, req.session.user.username]
  );

  req.flash('success', 'News article created.');
  res.redirect('/admin/news');
});

router.post('/news/:id', upload.single('image'), (req, res) => {
  const { title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, pinned, croppedImageData } = req.body;

  const article = db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!article) {
    req.flash('error', 'Article not found.');
    return res.redirect('/admin/news');
  }

  const validationError = validateNewsInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/news');
  }

  const imageData = resolveNewsImage(croppedImageData, req.file, article.image);

  db.run(
    'UPDATE news SET title_en = ?, title_ru = ?, content_short_en = ?, content_short_ru = ?, content_full_en = ?, content_full_ru = ?, image = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, imageData, pinned ? 1 : 0, req.params.id]
  );

  req.flash('success', 'News article updated.');
  res.redirect('/admin/news');
});

router.post('/news/:id/delete', (req, res) => {
  db.run('DELETE FROM news WHERE id = ?', [req.params.id]);
  req.flash('success', 'News article deleted.');
  res.redirect('/admin/news');
});

// ── Server Management ──
router.get('/servers', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC');
  res.render('admin/servers', { title: 'Manage Servers', servers });
});

router.get('/servers/new', (req, res) => {
  res.render('admin/server-form', { title: 'Add Server', server: null });
});

// ── Force Status Refresh (must be before :id routes) ──
router.post('/servers/refresh', async (req, res) => {
  try {
    await checkAllServers();
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true });
    }
    req.flash('success', 'Server statuses refreshed.');
  } catch (err) {
    console.error('Status refresh error:', err);
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: false, message: 'Failed to refresh server statuses.' });
    }
    req.flash('error', 'Failed to refresh server statuses.');
  }
  res.redirect('/admin/servers');
});

router.post('/servers', (req, res) => {
  const { name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order } = req.body;
  
  const validationError = validateServerInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/servers');
  }
  const portNum = parseInt(port);
  
  db.run(
    `INSERT INTO servers (name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, game, ip, portNum,
    description || '', image || '',
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, show_ip_address ? 1 : 0, parseInt(sort_order) || 0]
  );

  req.flash('success', 'Server added.');
  res.redirect('/admin/servers');
});

router.get('/servers/:id/edit', (req, res) => {
  const server = db.get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  if (!server) {
    req.flash('error', 'Server not found.');
    return res.redirect('/admin/servers');
  }
  res.render('admin/server-form', { title: 'Edit Server', server });
});

router.post('/servers/:id', (req, res) => {
  const { name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order } = req.body;
  
  const validationError = validateServerInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/servers');
  }
  const portNum = parseInt(port);
  
  db.run(
    `UPDATE servers SET name = ?, game = ?, ip = ?, port = ?, description = ?, image = ?,
     redirect_enabled = ?, redirect_url = ?, show_player_count = ?, show_ip_address = ?, sort_order = ? WHERE id = ?`,
    [name, game, ip, portNum,
    description || '', image || '',
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, show_ip_address ? 1 : 0, parseInt(sort_order) || 0,
    req.params.id]
  );

  req.flash('success', 'Server updated.');
  res.redirect('/admin/servers');
});

router.post('/servers/:id/delete', (req, res) => {
  db.run('DELETE FROM servers WHERE id = ?', [req.params.id]);
  req.flash('success', 'Server deleted.');
  res.redirect('/admin/servers');
});

// ── Settings ──
router.get('/settings', (req, res) => {
  const settings = getSettingsMap();
  res.render('admin/settings', { title: 'Settings', settings });
});

router.post('/settings', (req, res) => {
  const keys = [
    'site_name', 'site_description', 'navbar_title',
    'status_check_interval', 'max_chat_messages', 'community_enabled',
    'registration_enabled', 'monitoring_public',
    'hero_title', 'hero_subtitle', 'hero_style', 'games_list'
  ];

  for (const key of keys) {
    if (req.body[key] !== undefined) {
      let value = req.body[key];
      // If checkbox and hidden input both send values, it becomes an array. Take the last one.
      if (Array.isArray(value)) {
        value = value[value.length - 1];
      }
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  req.flash('success', 'Settings saved.');
  res.redirect('/admin/settings');
});

// ── Users Management ──
router.get('/users', (req, res) => {
  const users = db.all('SELECT id, username, email, role, last_login, last_ip, created_at FROM users ORDER BY created_at DESC');
  res.render('admin/users', { title: 'Manage Users', users });
});

router.post('/users/:id/delete', (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    req.flash('error', 'Cannot delete your own account.');
    return res.redirect('/admin/users');
  }
  db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  // Reset installed cache so the setup guard re-checks admin count
  const resetCache = req.app.get('resetInstalledCache');
  if (resetCache) resetCache();
  req.flash('success', 'User deleted.');
  res.redirect('/admin/users');
});

// ── Proxmox Admin Page ──
router.get('/proxmox', (req, res) => {
  const settings = getSettingsMap();
  res.render('admin/proxmox', { title: 'Proxmox', settings });
});

router.post('/proxmox/save-connection', (req, res) => {
  const { host, port, tokenId, tokenSecret, node } = req.body || {};
  const keys = {
    proxmox_host: host || '',
    proxmox_port: port || '8006',
    proxmox_token_id: tokenId || '',
    proxmox_node: node || ''
  };
  // Only overwrite the secret if user provided a new one
  if (tokenSecret) {
    keys.proxmox_token_secret = encrypt(tokenSecret);
  }
  for (const [key, value] of Object.entries(keys)) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
  res.json({ success: true });
});

router.post('/proxmox/save-guests', (req, res) => {
  const { guests } = req.body || {};
  const list = Array.isArray(guests) ? guests : [];
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proxmox_guests', JSON.stringify(list)]);
  res.json({ success: true });
});

module.exports = router;
