const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ProxmoxClient } = require('../utils/proxmox');

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
    const dbHost = db.get("SELECT value FROM settings WHERE key = 'proxmox_host'");
    const dbPort = db.get("SELECT value FROM settings WHERE key = 'proxmox_port'");
    const dbTokenId = db.get("SELECT value FROM settings WHERE key = 'proxmox_token_id'");
    const dbTokenSecret = db.get("SELECT value FROM settings WHERE key = 'proxmox_token_secret'");
    const dbNode = db.get("SELECT value FROM settings WHERE key = 'proxmox_node'");

    if (dbHost?.value) host = dbHost.value;
    if (dbPort?.value) port = parseInt(dbPort.value) || 8006;
    if (dbTokenId?.value) tokenId = dbTokenId.value;
    if (dbTokenSecret?.value) tokenSecret = dbTokenSecret.value;
    if (dbNode?.value) node = dbNode.value;
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

// ── JSON API: selected guests status ──
router.get('/resources', async (req, res) => {
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
router.post('/test-connection', async (req, res) => {
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
router.post('/discover-guests', async (req, res) => {
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
router.get('/dashboard', (req, res) => {
  const pve = getProxmoxClient();
  const selected = getSelectedGuests();
  res.render('monitoring/dashboard', {
    title: 'Мониторинг',
    proxmoxConfigured: pve.isConfigured(),
    hasSelectedGuests: selected.length > 0
  });
});

module.exports = { router, initMonitoring: () => {} };
