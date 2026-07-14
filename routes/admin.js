const express = require('express');
const router = express.Router();
const net = require('net');
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { checkAllServers } = require('../utils/statusChecker');
const { encrypt } = require('../utils/crypto');
const { createUploader, resolveImage } = require('../utils/imageUpload');
const { logAdmin } = require('../utils/adminLog');
const { createBackup, listBackups, backupPath, cleanupAnalytics } = require('../utils/maintenance');
const { isValidWebhookUrl, notifyNews } = require('../utils/discord');
const translate = require('../utils/translate');

const upload = createUploader('news');
const uploadServer = createUploader('servers');

// All admin routes require admin role
router.use(isAdmin);

// ── Helper: validate server input ──
const HOSTNAME_RE = /^(?!-)([A-Za-z0-9-]{1,63}\.)*[A-Za-z]{2,}$/;

function validateServerInput(body) {
  const { name, game, ip, port } = body;
  if (!name || !game || !ip || !port) {
    return 'flash_server_fields_required';
  }
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return 'flash_server_invalid_port';
  }
  if (net.isIP(ip) === 0 && !HOSTNAME_RE.test(ip)) {
    return 'flash_server_invalid_ip';
  }
  return null;
}

// ── Helper: validate news input ──
const MAX_NEWS_CONTENT_SIZE = 50000; // 50KB per field

function validateNewsInput(body) {
  // English is the source language and is required; ru/ro/de are optional and
  // auto-translated on save when left blank.
  const { title_en, content_short_en, content_full_en } = body;
  if (!title_en || !content_short_en || !content_full_en) {
    return 'flash_news_fields_required';
  }
  const fields = [
    title_en, body.title_ru, content_short_en, body.content_short_ru,
    content_full_en, body.content_full_ru
  ];
  if (fields.some(f => f && String(f).length > MAX_NEWS_CONTENT_SIZE)) {
    return 'flash_news_content_too_long';
  }
  return null;
}


// ── Dashboard ──
router.get('/', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC');
  const newsCount = db.get('SELECT COUNT(*) as count FROM news');
  const userCount = db.get('SELECT COUNT(*) as count FROM users');
  const onlineCount = db.get("SELECT COUNT(*) as count FROM servers WHERE status = 'online'");

  // Total unique page views (by IP)
  const totalViews = db.get('SELECT COUNT(DISTINCT ip) as count FROM page_views') || { count: 0 };
  // Today's unique views (by IP)
  const todayViews = db.get("SELECT COUNT(DISTINCT ip) as count FROM page_views WHERE date(created_at) = date('now')") || { count: 0 };
  // Chat messages count
  const chatCount = db.get('SELECT COUNT(*) as count FROM chat_messages') || { count: 0 };

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    servers,
    stats: {
      newsCount: newsCount?.count || 0,
      userCount: userCount?.count || 0,
      onlineServers: onlineCount?.count || 0,
      totalServers: servers.length,
      totalViews: totalViews.count || 0,
      todayViews: todayViews.count || 0,
      chatMessages: chatCount.count || 0
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

const NEWS_BASES = ['title', 'content_short', 'content_full'];

router.post('/news/create', upload.single('image'), async (req, res) => {
  const { pinned, croppedImageData } = req.body;

  const validationError = validateNewsInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/news');
  }

  const imageData = resolveImage(croppedImageData, req.file, 'news', 'cropped');
  const fields = collectNewsFields(req.body);
  await translate.fillMissingFields(fields, NEWS_BASES, 'en');

  const inserted = db.run(
    `INSERT INTO news (
       title_en, title_ru, title_ro, title_de,
       content_short_en, content_short_ru, content_short_ro, content_short_de,
       content_full_en, content_full_ru, content_full_ro, content_full_de,
       image, pinned, author
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fields.title_en, fields.title_ru, fields.title_ro, fields.title_de,
      fields.content_short_en, fields.content_short_ru, fields.content_short_ro, fields.content_short_de,
      fields.content_full_en, fields.content_full_ru, fields.content_full_ro, fields.content_full_de,
      imageData, pinned ? 1 : 0, req.session.user.username
    ]
  );

  notifyNews(fields.title_en, fields.content_short_en, `${req.protocol}://${req.get('host')}/news/${inserted.lastInsertRowid}`);
  logAdmin(req, 'news.create', fields.title_en);
  req.flash('success', 'flash_news_created');
  res.redirect('/admin/news');
});

// Gather the per-language news columns from a submitted form into one record.
// Empty ru/ro/de start blank so translate.fillMissingFields() can fill them.
function collectNewsFields(body) {
  const rec = {};
  for (const base of NEWS_BASES) {
    for (const lang of translate.LANGS) {
      rec[`${base}_${lang}`] = String(body[`${base}_${lang}`] || '').trim();
    }
  }
  return rec;
}

router.post('/news/:id', upload.single('image'), async (req, res) => {
  const { pinned, croppedImageData } = req.body;

  const article = db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!article) {
    req.flash('error', 'flash_article_not_found');
    return res.redirect('/admin/news');
  }

  const validationError = validateNewsInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/news');
  }

  const imageData = resolveImage(croppedImageData, req.file, 'news', 'cropped', article.image);
  const fields = collectNewsFields(req.body);
  await translate.fillMissingFields(fields, NEWS_BASES, 'en');

  db.run(
    `UPDATE news SET
       title_en = ?, title_ru = ?, title_ro = ?, title_de = ?,
       content_short_en = ?, content_short_ru = ?, content_short_ro = ?, content_short_de = ?,
       content_full_en = ?, content_full_ru = ?, content_full_ro = ?, content_full_de = ?,
       image = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      fields.title_en, fields.title_ru, fields.title_ro, fields.title_de,
      fields.content_short_en, fields.content_short_ru, fields.content_short_ro, fields.content_short_de,
      fields.content_full_en, fields.content_full_ru, fields.content_full_ro, fields.content_full_de,
      imageData, pinned ? 1 : 0, req.params.id
    ]
  );

  logAdmin(req, 'news.update', `#${req.params.id} ${fields.title_en}`);
  req.flash('success', 'flash_news_updated');
  res.redirect('/admin/news');
});

router.post('/news/:id/delete', (req, res) => {
  const article = db.get('SELECT title_en FROM news WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM news WHERE id = ?', [req.params.id]);
  logAdmin(req, 'news.delete', `#${req.params.id} ${article ? article.title_en : ''}`);
  req.flash('success', 'flash_news_deleted');
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
    req.flash('success', 'flash_servers_refreshed');
  } catch (err) {
    console.error('Status refresh error:', err);
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: false, message: 'Failed to refresh server statuses.' });
    }
    req.flash('error', 'flash_servers_refresh_failed');
  }
  res.redirect('/admin/servers');
});

router.post('/servers', uploadServer.single('image'), async (req, res) => {
  const { name, game, ip, port, croppedImageData, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order } = req.body;

  const validationError = validateServerInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/servers');
  }
  const portNum = parseInt(port);
  const image = resolveImage(croppedImageData, req.file, 'servers', 'server');
  const d = collectServerDesc(req.body);
  await translate.fillMissingFields(d, ['description'], 'en');

  db.run(
    `INSERT INTO servers (name, game, ip, port, description, description_en, description_ru, description_ro, description_de, image, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, game, ip, portNum,
    d.description_en || d.description_ru, d.description_en, d.description_ru, d.description_ro, d.description_de, image,
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, show_ip_address ? 1 : 0, parseInt(sort_order) || 0]
  );

  logAdmin(req, 'server.create', `${name} (${ip}:${portNum})`);
  req.flash('success', 'flash_server_added');
  res.redirect('/admin/servers');
});

// Gather per-language server descriptions from the form. English is the source;
// blank ru/ro/de are auto-translated on save.
function collectServerDesc(body) {
  const rec = {};
  for (const lang of translate.LANGS) {
    rec[`description_${lang}`] = String(body[`description_${lang}`] || '').trim();
  }
  return rec;
}

router.get('/servers/:id/edit', (req, res) => {
  const server = db.get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  if (!server) {
    req.flash('error', 'flash_server_not_found');
    return res.redirect('/admin/servers');
  }
  res.render('admin/server-form', { title: 'Edit Server', server });
});

router.post('/servers/:id', uploadServer.single('image'), async (req, res) => {
  const { name, game, ip, port, croppedImageData, redirect_enabled, redirect_url, show_player_count, show_ip_address, sort_order } = req.body;

  const validationError = validateServerInput(req.body);
  if (validationError) {
    req.flash('error', validationError);
    return res.redirect('/admin/servers');
  }
  const portNum = parseInt(port);
  const existing = db.get('SELECT image FROM servers WHERE id = ?', [req.params.id]);
  const image = resolveImage(croppedImageData, req.file, 'servers', 'server', existing ? existing.image : '');
  const d = collectServerDesc(req.body);
  await translate.fillMissingFields(d, ['description'], 'en');

  db.run(
    `UPDATE servers SET name = ?, game = ?, ip = ?, port = ?, description = ?, description_en = ?, description_ru = ?, description_ro = ?, description_de = ?, image = ?,
     redirect_enabled = ?, redirect_url = ?, show_player_count = ?, show_ip_address = ?, sort_order = ? WHERE id = ?`,
    [name, game, ip, portNum,
    d.description_en || d.description_ru, d.description_en, d.description_ru, d.description_ro, d.description_de, image,
    redirect_enabled ? 1 : 0, redirect_url || '',
    show_player_count ? 1 : 0, show_ip_address ? 1 : 0, parseInt(sort_order) || 0,
    req.params.id]
  );

  logAdmin(req, 'server.update', `#${req.params.id} ${name} (${ip}:${portNum})`);
  req.flash('success', 'flash_server_updated');
  res.redirect('/admin/servers');
});

router.post('/servers/:id/delete', (req, res) => {
  const srv = db.get('SELECT name FROM servers WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM servers WHERE id = ?', [req.params.id]);
  logAdmin(req, 'server.delete', `#${req.params.id} ${srv ? srv.name : ''}`);
  req.flash('success', 'flash_server_deleted');
  res.redirect('/admin/servers');
});

// ── Settings ──
router.get('/settings', (req, res) => {
  const settings = db.getCachedSettings();
  res.render('admin/settings', { title: 'Settings', settings });
});

router.post('/settings', (req, res) => {
  const keys = [
    'site_name', 'site_description', 'navbar_title',
    'status_check_interval', 'max_chat_messages', 'community_enabled',
    'registration_enabled', 'monitoring_public',
    'hero_subtitle', // shown as the Overview subtitle
    'site_timezone',
    'footer_tagline', 'footer_copyright',
    'discord_webhook_url', 'discord_notify_status', 'discord_notify_news'
  ];

  // Reject malformed Discord webhook URLs (empty = disabled is fine)
  if (req.body.discord_webhook_url && !isValidWebhookUrl(req.body.discord_webhook_url)) {
    req.flash('error', 'flash_invalid_webhook');
    return res.redirect('/admin/settings');
  }

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

  // DeepL API key — stored encrypted at rest (AES-256-GCM), never echoed back
  // to the form. Only overwrite when a new key is submitted; a dedicated
  // checkbox removes it. This mirrors how the Proxmox token secret is handled.
  if (String(req.body.deepl_api_key_clear) === '1') {
    db.run("DELETE FROM settings WHERE key = 'deepl_api_key'");
    logAdmin(req, 'settings.deepl_key', 'cleared');
  } else if (req.body.deepl_api_key && String(req.body.deepl_api_key).trim()) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['deepl_api_key', encrypt(String(req.body.deepl_api_key).trim())]);
    logAdmin(req, 'settings.deepl_key', 'updated');
  }

  // Invalidate cached settings so changes take effect immediately
  db.invalidateSettingsCache();

  logAdmin(req, 'settings.save');
  req.flash('success', 'flash_settings_saved');
  res.redirect('/admin/settings');
});

// ── Users Management ──
router.get('/users', (req, res) => {
  const users = db.all('SELECT id, username, email, role, last_login, last_ip, created_at FROM users ORDER BY created_at DESC');
  res.render('admin/users', { title: 'Manage Users', users });
});

// Change user role (user / gm / admin)
const VALID_ROLES = ['user', 'gm', 'admin'];
router.post('/users/:id/role', (req, res) => {
  const targetId = parseInt(req.params.id);
  const role = String(req.body.role || '');
  if (!VALID_ROLES.includes(role)) {
    req.flash('error', 'flash_invalid_role');
    return res.redirect('/admin/users');
  }
  if (targetId === req.session.user.id) {
    req.flash('error', 'flash_cannot_change_own_role');
    return res.redirect('/admin/users');
  }
  const target = db.get('SELECT id FROM users WHERE id = ?', [targetId]);
  if (!target) {
    req.flash('error', 'flash_user_not_found');
    return res.redirect('/admin/users');
  }
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
  // Re-check the setup guard in case the last other admin was demoted
  const resetCache = req.app.get('resetInstalledCache');
  if (resetCache) resetCache();
  logAdmin(req, 'user.role', `#${targetId} → ${role}`);
  req.flash('success', 'flash_role_updated');
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    req.flash('error', 'flash_cannot_delete_self');
    return res.redirect('/admin/users');
  }
  const target = db.get('SELECT username FROM users WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  // Reset installed cache so the setup guard re-checks admin count
  const resetCache = req.app.get('resetInstalledCache');
  if (resetCache) resetCache();
  logAdmin(req, 'user.delete', `#${req.params.id} ${target ? target.username : ''}`);
  req.flash('success', 'flash_user_deleted');
  res.redirect('/admin/users');
});

// ── System: audit log + database backups ──
router.get('/system', (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const perPage = 50;
  const total = db.get('SELECT COUNT(*) AS c FROM admin_log');
  const totalPages = Math.max(Math.ceil((total ? total.c : 0) / perPage), 1);
  const logs = db.all('SELECT * FROM admin_log ORDER BY id DESC LIMIT ? OFFSET ?', [perPage, (page - 1) * perPage]);
  res.render('admin/system', { title: 'System', logs, page, totalPages, backups: listBackups() });
});

router.post('/system/backup', async (req, res) => {
  try {
    const name = await createBackup();
    logAdmin(req, 'backup.create', name);
    req.flash('success', 'flash_backup_created');
  } catch (e) {
    console.error('Backup error:', e);
    req.flash('error', 'flash_backup_failed');
  }
  res.redirect('/admin/system');
});

router.get('/system/backup/:name/download', (req, res) => {
  const p = backupPath(req.params.name);
  if (!p) return res.status(404).render('errors/404', { title: 'Not Found' });
  logAdmin(req, 'backup.download', req.params.name);
  res.download(p);
});

router.post('/system/cleanup', (req, res) => {
  const removed = cleanupAnalytics();
  logAdmin(req, 'analytics.cleanup', `page_views: ${removed.pageViews}, status_log: ${removed.statusLog}`);
  req.flash('success', 'flash_cleanup_done');
  res.redirect('/admin/system');
});

// ── Proxmox Admin Page ──
router.get('/proxmox', (req, res) => {
  const settings = db.getCachedSettings();
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
  db.invalidateSettingsCache();
  logAdmin(req, 'proxmox.connection', host || '');
  res.json({ success: true });
});

router.post('/proxmox/save-guests', (req, res) => {
  const { guests } = req.body || {};
  const list = Array.isArray(guests) ? guests : [];
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proxmox_guests', JSON.stringify(list)]);
  db.invalidateSettingsCache();
  res.json({ success: true });
});

// ── Live translation (admin form "Auto-translate" button) ──
// POST { texts: string[], target: 'ru'|'ro'|'de', source?: 'en' }
//   → { success, configured, translations: string[] }
router.post('/translate', express.json(), async (req, res) => {
  const { texts, target, source } = req.body || {};
  if (!translate.isConfigured()) {
    return res.json({ success: false, configured: false, translations: [] });
  }
  if (!Array.isArray(texts) || !texts.length || !target) {
    return res.status(400).json({ success: false, error: 'invalid_request' });
  }
  const clean = texts.map(t => String(t == null ? '' : t));
  try {
    const translations = await translate.translateBatch(clean, target, source || 'en');
    res.json({ success: true, configured: true, translations });
  } catch (e) {
    console.error('[translate] live endpoint failed:', e.message);
    res.status(502).json({ success: false, configured: true, error: 'translate_failed' });
  }
});

module.exports = router;
