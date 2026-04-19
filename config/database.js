const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'nexushub.db');

// Shared database instance
let db = null;

/**
 * Initialize the database: load from file or create new
 */
async function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Better performance and concurrency

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      notify_email INTEGER DEFAULT 0,
      notify_discord TEXT DEFAULT '',
      last_login DATETIME,
      last_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_en TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      content_short_en TEXT NOT NULL,
      content_short_ru TEXT NOT NULL,
      content_full_en TEXT NOT NULL,
      content_full_ru TEXT NOT NULL,
      image TEXT DEFAULT '',
      author TEXT DEFAULT 'Admin',
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure columns exist for older databases upgraded in-place
  try {
    const userCols = db.pragma("table_info(users)").map(c => c.name);
    if (!userCols.includes('last_login')) db.exec("ALTER TABLE users ADD COLUMN last_login DATETIME");
    if (!userCols.includes('last_ip'))    db.exec("ALTER TABLE users ADD COLUMN last_ip TEXT");
  } catch (e) { /* columns already exist */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      game TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      redirect_enabled INTEGER DEFAULT 0,
      redirect_url TEXT DEFAULT '',
      show_player_count INTEGER DEFAULT 0,
      show_ip_address INTEGER DEFAULT 1,
      player_count INTEGER DEFAULT 0,
      max_players INTEGER DEFAULT 0,
      status TEXT DEFAULT 'offline',
      last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add show_ip_address column if it doesn't exist
  try {
    const serverCols = db.pragma("table_info(servers)").map(c => c.name);
    if (!serverCols.includes('show_ip_address')) {
      db.exec("ALTER TABLE servers ADD COLUMN show_ip_address INTEGER DEFAULT 1");
    }
  } catch (e) { /* column already exists */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // ── Analytics tables ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      method TEXT DEFAULT 'GET',
      user_id INTEGER,
      ip TEXT,
      user_agent TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS server_status_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      server_name TEXT NOT NULL,
      status TEXT NOT NULL,
      player_count INTEGER DEFAULT 0,
      latency INTEGER DEFAULT -1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexes for fast queries
  // Migrations
  try { db.exec(`ALTER TABLE page_views ADD COLUMN country TEXT DEFAULT ''`); } catch {}

  db.exec(`CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_page_views_ip ON page_views(ip);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_server_status_log_created ON server_status_log(created_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_server_status_log_server ON server_status_log(server_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON chat_messages(channel, created_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_pinned_created ON news(pinned, created_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order);`);

  // Insert default settings
  const defaults = {
    site_name: 'NexusHub',
    site_description: 'Your Gaming Server Hub',
    status_check_interval: '60',
    max_chat_messages: '200',
    registration_enabled: '1',
    community_enabled: '1'
  };
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  console.log('✅ Database initialized');
}

// Prepared statement cache for performance
const stmtCache = new Map();

function prepare(sql) {
  if (!db) throw new Error('Database not initialized');
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}

/**
 * Helper: run a SELECT and return all rows as plain objects
 */
function all(sql, params = []) {
  return prepare(sql).all(params);
}

/**
 * Helper: run a SELECT and return first row or null
 */
function get(sql, params = []) {
  const row = prepare(sql).get(params);
  return row || null;
}

/**
 * Helper: run INSERT/UPDATE/DELETE, return { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  const info = prepare(sql).run(params);
  return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
}

/**
 * Helper: run raw exec (for multi-statement SQL)
 */
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
}

/**
 * Helper: create a transaction function for batch operations
 * Usage: const batch = transaction((stmt) => { stmt.run(...); });
 */
function transaction(fn) {
  if (!db) throw new Error('Database not initialized');
  return db.transaction(fn);
}

// ── Settings cache (avoids DB hit on every request) ──
let _settingsCache = null;
let _settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 30000; // 30 seconds

function getCachedSettings(...keys) {
  const now = Date.now();
  if (!_settingsCache || now - _settingsCacheTime > SETTINGS_CACHE_TTL) {
    const rows = all('SELECT key, value FROM settings');
    _settingsCache = {};
    for (const r of rows) _settingsCache[r.key] = r.value;
    _settingsCacheTime = now;
  }
  if (keys.length === 0) return _settingsCache;
  const result = {};
  for (const k of keys) result[k] = _settingsCache[k];
  return result;
}

function invalidateSettingsCache() {
  _settingsCache = null;
  _settingsCacheTime = 0;
}

function stopAutoSave() {
  if (db) {
    db.close();
  }
}

function getInstance() { return db; }

module.exports = { initDatabase, all, get, run, exec, transaction, stopAutoSave, getCachedSettings, invalidateSettingsCache, getInstance };
