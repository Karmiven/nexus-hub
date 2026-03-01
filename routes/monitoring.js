const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ProxmoxClient } = require('../utils/proxmox');
const { isAdmin, isAuthenticated } = require('../middleware/auth');
const { decrypt } = require('../utils/crypto');

/**
 * Build a ProxmoxClient from DB settings (or .env fallback)
 */
function getProxmoxClient() {
  let host = process.env.PROXMOX_HOST || '';
  let port = parseInt(process.env.PROXMOX_PORT) || 8006;
  let tokenId = process.env.PROXMOX_TOKEN_ID || '';
  let tokenSecret = process.env.PROXMOX_TOKEN_SECRET || '';
  let node = process.env.PROXMOX_NODE || '';

  try {
    // Batch-read all proxmox settings in one query
    const rows = db.all(
      "SELECT key, value FROM settings WHERE key IN ('proxmox_host', 'proxmox_port', 'proxmox_token_id', 'proxmox_token_secret', 'proxmox_node')"
    );
    const s = {};
    for (const r of rows) s[r.key] = r.value;

    if (s.proxmox_host) host = s.proxmox_host;
    if (s.proxmox_port) port = parseInt(s.proxmox_port) || 8006;
    if (s.proxmox_token_id) tokenId = s.proxmox_token_id;
    if (s.proxmox_token_secret) tokenSecret = decrypt(s.proxmox_token_secret);
    if (s.proxmox_node) node = s.proxmox_node;
  } catch (e) { /* DB not ready */ }

  return new ProxmoxClient({ host, port, tokenId, tokenSecret, node });
}

/**
 * Get the list of admin-selected guests from DB
 * Stored as JSON: [{vmid, type, node, name}]
 */
function getSelectedGuests() {
  try {
    const row = db.get("SELECT value FROM settings WHERE key = 'proxmox_guests'");
    if (row?.value) return JSON.parse(row.value);
  } catch (e) { /* ignore */ }
  return [];
}

// ── Guard: public if monitoring_public=1, otherwise auth+admin ──
function monitoringAccess(req, res, next) {
  const row = db.get("SELECT value FROM settings WHERE key = 'monitoring_public'");
  const isPublic = String(row?.value) === '1';
  if (isPublic) return next();
  // Not public — require authenticated admin
  if (req.session?.user?.role === 'admin') return next();
  if (req.session?.user) {
    return res.status(404).render('errors/404', { title: 'Page Not Found' });
  }
  req.flash('error', 'Please log in to access this page.');
  return res.redirect('/auth/login');
}

// ── JSON API: selected guests status ──
router.get('/resources', monitoringAccess, async (req, res) => {
  try {
    const pve = getProxmoxClient();
    if (!pve.isConfigured()) {
      return res.json({ success: false, error: 'Proxmox not configured', configured: false });
    }

    const selected = getSelectedGuests();
    if (selected.length === 0) {
      return res.json({ success: true, guests: [], timestamp: new Date().toISOString() });
    }

    const guests = await pve.getSelectedGuestsStatus(selected);
    res.json({ success: true, guests, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Proxmox monitoring error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── JSON API: test connection (accepts inline creds from admin form) ──
router.post('/test-connection', isAdmin, async (req, res) => {
  try {
    const { host, port, tokenId, tokenSecret, node } = req.body || {};
    let pve;

    if (host && tokenId && tokenSecret) {
      pve = new ProxmoxClient({ host, port: parseInt(port) || 8006, tokenId, tokenSecret, node: node || '' });
    } else {
      pve = getProxmoxClient();
    }

    if (!pve.isConfigured()) {
      return res.json({ success: false, error: 'Proxmox credentials not provided' });
    }
    const result = await pve.testConnection();
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── JSON API: discover guests (for admin picker) ──
router.post('/discover-guests', isAdmin, async (req, res) => {
  try {
    const { host, port, tokenId, tokenSecret, node } = req.body || {};
    let pve;

    if (host && tokenId && tokenSecret) {
      pve = new ProxmoxClient({ host, port: parseInt(port) || 8006, tokenId, tokenSecret, node: node || '' });
    } else {
      pve = getProxmoxClient();
    }

    if (!pve.isConfigured()) {
      return res.json({ success: false, error: 'Proxmox credentials not provided' });
    }
    const guests = await pve.discoverGuests();
    if (guests.length === 0) {
      return res.json({
        success: true,
        guests: [],
        hint: 'API token has no VM/CT permissions. In Proxmox: Datacenter → Permissions → Add → Path: /, Role: PVEAuditor, select your API token. Or disable "Privilege Separation" on the token.'
      });
    }
    res.json({ success: true, guests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Dashboard page ──
router.get('/dashboard', monitoringAccess, (req, res) => {
  const pve = getProxmoxClient();
  const selected = getSelectedGuests();
  res.render('monitoring/dashboard', {
    title: 'Мониторинг',
    proxmoxConfigured: pve.isConfigured(),
    hasSelectedGuests: selected.length > 0
  });
});

module.exports = { router, initMonitoring: () => {} };
