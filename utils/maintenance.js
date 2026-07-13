const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const KEEP_BACKUPS = 7;
const BACKUP_NAME_RE = /^nexushub-\d{4}-\d{2}-\d{2}-\d{2}\d{2}\d{2}\.db$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 90;

/**
 * Create an online backup of the SQLite database (safe under WAL).
 * Returns the backup file name.
 */
async function createBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '');
  const name = `nexushub-${stamp}.db`;
  await db.getInstance().backup(path.join(BACKUP_DIR, name));
  pruneBackups();
  return name;
}

/**
 * List existing backups, newest first: [{ name, size, mtime }]
 */
function listBackups() {
  let files = [];
  try {
    files = fs.readdirSync(BACKUP_DIR).filter(f => BACKUP_NAME_RE.test(f));
  } catch {
    return [];
  }
  return files
    .map(name => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: st.size, mtime: st.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

/** Resolve a backup name to its absolute path (null if invalid/missing). */
function backupPath(name) {
  if (!BACKUP_NAME_RE.test(name)) return null;
  const p = path.join(BACKUP_DIR, name);
  return fs.existsSync(p) ? p : null;
}

function pruneBackups() {
  const extra = listBackups().slice(KEEP_BACKUPS);
  for (const b of extra) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, b.name)); } catch {}
  }
}

/**
 * Delete analytics rows older than the retention window.
 * Returns { pageViews, statusLog } — number of rows removed.
 */
function cleanupAnalytics() {
  const pv = db.run(`DELETE FROM page_views WHERE created_at < datetime('now', '-${RETENTION_DAYS} days')`);
  const sl = db.run(`DELETE FROM server_status_log WHERE created_at < datetime('now', '-${RETENTION_DAYS} days')`);
  return { pageViews: pv.changes, statusLog: sl.changes };
}

/**
 * Hourly check: if the newest backup is older than 24h (or absent),
 * run the daily maintenance (analytics cleanup + fresh backup).
 * Robust across restarts — no reliance on a long-lived 24h timer.
 */
async function runDailyIfDue() {
  const newest = listBackups()[0];
  if (newest && Date.now() - newest.mtime.getTime() < DAY_MS) return;
  try {
    const removed = cleanupAnalytics();
    const name = await createBackup();
    console.log(`🧹 Daily maintenance: backup ${name}, cleaned ${removed.pageViews} page views, ${removed.statusLog} status logs`);
  } catch (e) {
    console.error('[maintenance]', e.message);
  }
}

function startMaintenance() {
  setTimeout(runDailyIfDue, 60 * 1000);          // first check 1 min after boot
  setInterval(runDailyIfDue, 60 * 60 * 1000);    // then hourly
}

module.exports = { createBackup, listBackups, backupPath, cleanupAnalytics, startMaintenance };
