const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Home page - Display latest news
router.get('/', (req, res) => {
  const news = db.all('SELECT * FROM news ORDER BY pinned DESC, created_at DESC LIMIT 20');

  const onlineCount = db.get("SELECT COUNT(*) as count FROM servers WHERE status = 'online'");

  const totalServers = db.get('SELECT COUNT(*) as count FROM servers');

  const siteName = db.get("SELECT value FROM settings WHERE key = 'site_name'");
  const heroTitle = db.get("SELECT value FROM settings WHERE key = 'hero_title'");
  const heroSubtitle = db.get("SELECT value FROM settings WHERE key = 'hero_subtitle'");
  const heroStyle = db.get("SELECT value FROM settings WHERE key = 'hero_style'");

  // Get current language from session or default to 'en'
  const currentLang = req.session.language || 'en';

  res.render('home', {
    title: siteName?.value || 'NexusHub',
    news,
    currentLang,
    heroTitle: heroTitle?.value || 'NexusHub',
    heroSubtitle: heroSubtitle?.value || 'Your Ultimate Gaming Server Hub',
    heroStyle: heroStyle?.value || 'glitch',
    stats: {
      onlineServers: onlineCount?.count || 0,
      totalServers: totalServers?.count || 0
    }
  });
});

module.exports = router;
