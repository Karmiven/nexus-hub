const initSqlJs = require('sql.js');
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
 * Wrapper around sql.js to provide a simpler API.
 * After calling initDatabase(), use db module methods.
 */

function saveToFile() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Dirty flag — set to true on writes, auto-save flushes it
let isDirty = false;

// Auto-save every 5 seconds (only writes when dirty)
let saveInterval = null;

function startAutoSave() {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    if (isDirty) {
      saveToFile();
      isDirty = false;
    }
  }, 5000);
}

/**
 * Initialize the database: load from file or create new
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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

  db.run(`
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
  const userColsStmt = db.prepare("PRAGMA table_info(users)");
  const userCols = [];
  while (userColsStmt.step()) {
    userCols.push(userColsStmt.getAsObject());
  }
  userColsStmt.free();
  
  const hasLastLogin = userCols.some(col => col.name === 'last_login');
  const hasLastIp = userCols.some(col => col.name === 'last_ip');
  
  if (!hasLastLogin) {
    db.run("ALTER TABLE users ADD COLUMN last_login DATETIME");
  }
  if (!hasLastIp) {
    db.run("ALTER TABLE users ADD COLUMN last_ip TEXT");
  }

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
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
  for (const [key, value] of Object.entries(defaults)) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  saveToFile();
  startAutoSave();
  console.log('✅ Database initialized');
}

/**
 * Helper: run a SELECT and return all rows as plain objects
 */
function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: run a SELECT and return first row or null
 */
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run INSERT/UPDATE/DELETE, return { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const info = db.exec("SELECT changes() as changes, last_insert_rowid() as lastId");
  const changes = info.length > 0 ? info[0].values[0][0] : 0;
  const lastInsertRowid = info.length > 0 ? info[0].values[0][1] : 0;
  isDirty = true;
  return { changes, lastInsertRowid };
}

/**
 * Helper: run raw exec (for multi-statement SQL)
 */
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
  isDirty = true;
}

function stopAutoSave() {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  // Flush any pending changes on shutdown
  if (isDirty) {
    saveToFile();
    isDirty = false;
  }
}

module.exports = { initDatabase, all, get, run, exec, saveToFile, stopAutoSave };
