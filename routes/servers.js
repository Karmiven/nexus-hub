const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all servers
router.get('/', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC, name ASC');

  res.render('servers', {
    title: 'Game Servers',
    servers
  });
});

// Server detail / redirect
router.get('/:id', (req, res) => {
  const server = db.get('SELECT * FROM servers WHERE id = ?', [req.params.id]);

  if (!server) {
    return res.status(404).render('errors/404', { title: 'Server Not Found' });
  }

  // If redirect is enabled and URL is set, redirect to external site
  if (server.redirect_enabled && server.redirect_url) {
    return res.redirect(server.redirect_url);
  }

  res.render('server-detail', {
    title: server.name,
    server
  });
});

module.exports = router;
