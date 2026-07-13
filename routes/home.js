const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ── Overview (home) — compact summary of every section ──
router.get('/', (req, res) => {
  const settings = db.getCachedSettings('site_name', 'hero_subtitle', 'community_enabled');

  const servers = db.all('SELECT id, name, game, ip, port, status, player_count, max_players, show_ip_address, show_player_count FROM servers ORDER BY sort_order ASC LIMIT 6');
  const news = db.all('SELECT * FROM news ORDER BY pinned DESC, created_at DESC LIMIT 3');
  const userCount = db.get('SELECT COUNT(*) as count FROM users');

  // Last chat messages (with role for badges), only if chat is enabled
  let chatPreview = [];
  const communityEnabled = settings.community_enabled !== '0';
  if (communityEnabled) {
    chatPreview = db.all(
      `SELECT m.username, m.message, m.created_at, u.role
       FROM chat_messages m
       LEFT JOIN users u ON u.username = m.username COLLATE NOCASE
       WHERE m.channel = 'general'
       ORDER BY m.created_at DESC LIMIT 3`
    ).reverse();
  }

  res.render('home', {
    title: settings.site_name || 'NexusHub',
    heroSubtitle: settings.hero_subtitle || '',
    servers,
    news,
    chatPreview,
    communityEnabled,
    currentLang: req.session.language || 'en',
    userCount: userCount?.count || 0
  });
});

// ── News feed (moved off the home page to keep it light) ──
const NEWS_PER_PAGE = 10;

router.get('/news', (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const q = String(req.query.q || '').trim().slice(0, 100);

  let where = '';
  let params = [];
  if (q) {
    where = 'WHERE title_en LIKE ? OR title_ru LIKE ? OR content_short_en LIKE ? OR content_short_ru LIKE ?';
    const like = `%${q}%`;
    params = [like, like, like, like];
  }

  const total = db.get(`SELECT COUNT(*) AS c FROM news ${where}`, params);
  const totalPages = Math.max(Math.ceil((total ? total.c : 0) / NEWS_PER_PAGE), 1);
  const news = db.all(
    `SELECT * FROM news ${where} ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, NEWS_PER_PAGE, (Math.min(page, totalPages) - 1) * NEWS_PER_PAGE]
  );

  res.render('news', {
    title: 'News',
    news,
    q,
    page: Math.min(page, totalPages),
    totalPages,
    currentLang: req.session.language || 'en'
  });
});

// ── Single article (deep link: sharing, SEO, RSS, Discord) ──
router.get('/news/:id(\\d+)', (req, res) => {
  const article = db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!article) {
    return res.status(404).render('errors/404', { title: 'Page Not Found' });
  }
  const lang = req.session.language || 'en';
  const origin = `${req.protocol}://${req.get('host')}`;
  const title = lang === 'ru' ? article.title_ru : article.title_en;
  const description = lang === 'ru' ? article.content_short_ru : article.content_short_en;
  res.render('news-article', {
    title,
    article,
    currentLang: lang,
    og: {
      title,
      description: String(description).slice(0, 200),
      image: article.image ? origin + article.image : null,
      url: `${origin}/news/${article.id}`
    }
  });
});

// ── RSS feed (?lang=ru for Russian titles) ──
const escXml = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

router.get('/rss.xml', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'en';
  const s = db.getCachedSettings('site_name', 'site_description');
  const origin = `${req.protocol}://${req.get('host')}`;
  const news = db.all('SELECT id, title_en, title_ru, content_short_en, content_short_ru, created_at FROM news ORDER BY created_at DESC LIMIT 20');

  const items = news.map(n => `    <item>
      <title>${escXml(lang === 'ru' ? n.title_ru : n.title_en)}</title>
      <link>${origin}/news/${n.id}</link>
      <guid isPermaLink="true">${origin}/news/${n.id}</guid>
      <description>${escXml(lang === 'ru' ? n.content_short_ru : n.content_short_en)}</description>
      <pubDate>${new Date(n.created_at + 'Z').toUTCString()}</pubDate>
    </item>`).join('\n');

  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escXml(s.site_name || 'NexusHub')}</title>
    <link>${origin}/news</link>
    <description>${escXml(s.site_description || '')}</description>
${items}
  </channel>
</rss>`);
});

// ── Sitemap ──
router.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const staticPages = ['/', '/servers', '/news', '/community'];
  const news = db.all('SELECT id, updated_at FROM news ORDER BY created_at DESC LIMIT 500');
  const servers = db.all('SELECT id FROM servers ORDER BY sort_order ASC');

  const urls = [
    ...staticPages.map(p => `  <url><loc>${origin}${p}</loc></url>`),
    ...news.map(n => `  <url><loc>${origin}/news/${n.id}</loc><lastmod>${String(n.updated_at).slice(0, 10)}</lastmod></url>`),
    ...servers.map(sr => `  <url><loc>${origin}/servers/${sr.id}</loc></url>`)
  ].join('\n');

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

module.exports = router;
