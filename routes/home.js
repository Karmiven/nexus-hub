const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Home page - Display latest news
router.get('/', (req, res) => {
  const news = db.all('SELECT * FROM news ORDER BY pinned DESC, created_at DESC LIMIT 20');

  const onlineCount = db.get("SELECT COUNT(*) as count FROM servers WHERE status = 'online'");
  const totalServers = db.get('SELECT COUNT(*) as count FROM servers');

  // Batch-fetch all needed settings in one query
  const settingsRows = db.all(
    "SELECT key, value FROM settings WHERE key IN ('site_name', 'hero_title', 'hero_subtitle', 'hero_style')"
  );
  const settings = {};
  for (const row of settingsRows) settings[row.key] = row.value;

  const currentLang = req.session.language || 'en';

  res.render('home', {
    title: settings.site_name || 'NexusHub',
    news,
    currentLang,
    heroTitle: settings.hero_title || 'NexusHub',
    heroSubtitle: settings.hero_subtitle || 'Your Ultimate Gaming Server Hub',
    heroStyle: settings.hero_style || 'glitch',
    stats: {
      onlineServers: onlineCount?.count || 0,
      totalServers: totalServers?.count || 0
    }
  });
});

module.exports = router;
