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

  // Database schema is initialized with bilingual support

  // Add last_login and last_ip columns if they don't exist
  const userCols = db.pragma("table_info(users)");
  
  const hasLastLogin = userCols.some(col => col.name === 'last_login');
  const hasLastIp = userCols.some(col => col.name === 'last_ip');
  
  if (!hasLastLogin) {
    db.exec("ALTER TABLE users ADD COLUMN last_login DATETIME");
  }
  if (!hasLastIp) {
    db.exec("ALTER TABLE users ADD COLUMN last_ip TEXT");
  }

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
      player_count INTEGER DEFAULT 0,
      max_players INTEGER DEFAULT 0,
      status TEXT DEFAULT 'offline',
      last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

/**
 * Helper: run a SELECT and return all rows as plain objects
 */
function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  return db.prepare(sql).all(params);
}

/**
 * Helper: run a SELECT and return first row or null
 */
function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const row = db.prepare(sql).get(params);
  return row || null;
}

/**
 * Helper: run INSERT/UPDATE/DELETE, return { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const info = db.prepare(sql).run(params);
  return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
}

/**
 * Helper: run raw exec (for multi-statement SQL)
 */
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
}

function stopAutoSave() {
  if (db) {
    db.close();
  }
}

module.exports = { initDatabase, all, get, run, exec, stopAutoSave };
