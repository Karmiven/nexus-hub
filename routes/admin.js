const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { isAdmin } = require('../middleware/auth');
const { checkAllServers } = require('../utils/statusChecker');
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
  const { 
    title_en, title_ru, 
    content_short_en, content_short_ru, 
    content_full_en, content_full_ru, 
    pinned,
    croppedImageData
  } = req.body;
  
  // Use cropped image data (base64) if provided, otherwise use uploaded file
  let imageData = '';
  if (croppedImageData) {
    imageData = croppedImageData;
  } else if (req.file) {
    imageData = '/uploads/news/' + req.file.filename;
  }
  
  db.run(
    'INSERT INTO news (title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, image, pinned, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      title_en, title_ru,
      content_short_en, content_short_ru,
      content_full_en, content_full_ru,
      imageData, pinned ? 1 : 0,
      req.session.user.username
    ]
  );

  req.flash('success', 'News article created.');
  res.redirect('/admin/news');
});

router.post('/news/:id', upload.single('image'), (req, res) => {
  const { 
    title_en, title_ru, 
    content_short_en, content_short_ru, 
    content_full_en, content_full_ru, 
    pinned,
    croppedImageData
  } = req.body;
  
  const article = db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!article) {
    req.flash('error', 'Article not found.');
    return res.redirect('/admin/news');
  }
  
  // Use cropped image data (base64) if provided, otherwise use uploaded file, otherwise keep existing
  let imageData = article.image || '';
  if (croppedImageData) {
    imageData = croppedImageData;
  } else if (req.file) {
    imageData = '/uploads/news/' + req.file.filename;
  }
  
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
    req.flash('success', 'Server statuses refreshed.');
  } catch (err) {
    console.error('Status refresh error:', err);
    req.flash('error', 'Failed to refresh server statuses.');
  }
  res.redirect('/admin/servers');
});

router.post('/servers', (req, res) => {
  const { name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, sort_order } = req.body;
  db.run(
    `INSERT INTO servers (name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, game, ip, parseInt(port),
    description || '', image || '',
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, parseInt(sort_order) || 0]
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
  const { name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, sort_order } = req.body;
  db.run(
    `UPDATE servers SET name = ?, game = ?, ip = ?, port = ?, description = ?, image = ?,
     redirect_enabled = ?, redirect_url = ?, show_player_count = ?, sort_order = ? WHERE id = ?`,
    [name, game, ip, parseInt(port),
    description || '', image || '',
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, parseInt(sort_order) || 0,
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
  const settings = {};
  const rows = db.all('SELECT * FROM settings');
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.render('admin/settings', { title: 'Settings', settings });
});

router.post('/settings', (req, res) => {
  const keys = [
    'site_name', 'site_description', 'navbar_title',
    'status_check_interval', 'max_chat_messages', 'community_enabled',
    'hero_title', 'hero_subtitle', 'hero_style', 'games_list'
  ];

  for (const key of keys) {
    if (req.body[key] !== undefined) {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, req.body[key]]);
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
  req.flash('success', 'User deleted.');
  res.redirect('/admin/users');
});

module.exports = router;
