require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const crypto = require('crypto');

async function seed() {
  console.log('🌱 Starting database seeding...');
  await db.initDatabase();
  console.log('✅ Database initialized');

  // Create admin user — require env var or generate a secure random password
  let rawPassword = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!rawPassword) {
    rawPassword = crypto.randomBytes(16).toString('base64url');
    generated = true;
  }
  const adminPassword = await bcrypt.hash(rawPassword, 12);
  db.run(
    'INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [process.env.ADMIN_USERNAME || 'Admin', 'admin@nexushub.local', adminPassword, 'admin']
  );

  // Sample news
  const newsItems = [
    {
      title_en: 'Welcome to NexusHub!',
      title_ru: 'Добро пожаловать в NexusHub!',
      content_short_en: 'Welcome to our gaming server hub! Find servers, check status, and join the community.',
      content_short_ru: 'Добро пожаловать в наш игровой хаб! Находите серверы, проверяйте статус и присоединяйтесь к сообществу.',
      content_full_en: 'Welcome to our gaming server hub! Here you can find all our game servers, check their status, and join the community. We host Blade and Soul, World of Warcraft (AzerothCore), Killing Floor 2, Minecraft, and more!\n\nFeatures:\n• Real-time server status monitoring\n• Community chat with players\n• Admin panel for server management\n• Responsive design for all devices',
      content_full_ru: 'Добро пожаловать в наш игровой хаб! Здесь вы можете найти все наши игровые серверы, проверить их статус и присоединиться к сообществу. Мы размещаем Blade and Soul, World of Warcraft (AzerothCore), Killing Floor 2, Minecraft и многое другое!\n\nВозможности:\n• Мониторинг статуса серверов в реальном времени\n• Чат сообщества с игроками\n• Панель администратора для управления серверами\n• Адаптивный дизайн для всех устройств',
      pinned: 1
    },
    {
      title_en: 'New Minecraft Server Launched',
      title_ru: 'Запущен новый сервер Minecraft',
      content_short_en: 'Brand new Minecraft survival server with custom plugins! Join now.',
      content_short_ru: 'Новый сервер Minecraft с пользовательскими плагинами! Присоединяйтесь.',
      content_full_en: 'We just launched a brand new Minecraft survival server with custom plugins! Join now and start your adventure.\n\nServer Features:\n• Custom enchantments and items\n• Land claiming with GriefPrevention\n• Active economy with player shops\n• Regular events and competitions\n• Discord integration for cross-platform chat',
      content_full_ru: 'Мы запустили новый сервер выживания Minecraft с пользовательскими плагинами! Присоединяйтесь и начните своё приключение.\n\nОсобенности сервера:\n• Пользовательские чары и предметы\n• Система защиты территории\n• Активная экономика с магазинами игроков\n• Регулярные ивенты и соревнования\n• Интеграция Discord для кросс-платформного чата',
      pinned: 0
    },
    {
      title_en: 'WoW AzerothCore Update 3.3.5a',
      title_ru: 'Обновление WoW AzerothCore 3.3.5a',
      content_short_en: 'AzerothCore updated with improved mechanics and fully scripted ICC!',
      content_short_ru: 'AzerothCore обновлен с улучшенной механикой и полностью сценарием ICC!',
      content_full_en: 'Our World of Warcraft private server running AzerothCore has been updated to the latest revision. Enjoy improved boss mechanics, fixed quests, and better performance.\n\nUpdate Highlights:\n• Icecrown Citadel fully scripted\n• Improved boss AI and mechanics\n• Fixed over 50 quest chains\n• Better server stability and performance\n• New custom events starting next week',
      content_full_ru: 'Наш приватный сервер World of Warcraft на AzerothCore обновлен до последней версии. Наслаждайтесь улучшенной механикой боссов, исправленными квестами и лучшей производительностью.\n\nВысветление обновления:\n• Цитадель Льда полностью сценирована\n• Улучшенный AI босов и механика\n• Исправлено более 50 цепочек квестов\n• Лучшая стабильность и производительность сервера\n• Новые пользовательские ивенты на следующей неделе',
      pinned: 0
    },
    {
      title_en: 'Blade and Soul Server Maintenance Complete',
      title_ru: 'Техническое обслуживание сервера Blade and Soul завершено',
      content_short_en: 'Maintenance complete! Latest patches applied and stability improved.',
      content_short_ru: 'Обслуживание завершено! Применены последние патчи и улучшена стабильность.',
      content_full_en: 'The scheduled maintenance for our Blade and Soul server is now complete. We have applied the latest patches and improved server stability.\n\nMaintenance Details:\n• Applied latest game patches\n• Database optimization completed\n• Network infrastructure upgraded\n• Bug fixes for class abilities\n• Enjoy your gaming!',
      content_full_ru: 'Плановое техническое обслуживание нашего сервера Blade and Soul завершено. Мы применили последние патчи и улучшили стабильность сервера.\n\nДетали технического обслуживания:\n• Применены последние игровые патчи\n• Завершена оптимизация базы данных\n• Обновлена сетевая инфраструктура\n• Исправления ошибок классовых способностей\n• Наслаждайтесь игрой!',
      pinned: 0
    }
  ];

  for (const item of newsItems) {
    db.run(
      'INSERT INTO news (title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, pinned, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [item.title_en, item.title_ru, 
       item.content_short_en, item.content_short_ru,
       item.content_full_en, item.content_full_ru,
       item.pinned, 'Admin']
    );
  }

  // Sample servers
  const sampleServers = [
    {
      name: 'AzerothCore WoW',
      game: 'World of Warcraft',
      ip: '127.0.0.1',
      port: 8085,
      description: 'WotLK 3.3.5a private server running AzerothCore. Full PvE and PvP content available.',
      redirect_enabled: 0,
      redirect_url: '',
      sort_order: 1
    },
    {
      name: 'Blade and Soul Revolution',
      game: 'Blade and Soul',
      ip: '127.0.0.1',
      port: 10100,
      description: 'Custom Blade and Soul private server with all classes unlocked.',
      redirect_enabled: 1,
      redirect_url: 'https://example.com/bns-launcher',
      sort_order: 2
    },
    {
      name: 'KF2 Survival',
      game: 'Killing Floor 2',
      ip: '127.0.0.1',
      port: 7777,
      description: 'Killing Floor 2 dedicated server. All maps, all difficulties.',
      redirect_enabled: 0,
      redirect_url: '',
      sort_order: 3
    },
    {
      name: 'Nexus Minecraft SMP',
      game: 'Minecraft',
      ip: '127.0.0.1',
      port: 25565,
      description: 'Minecraft 1.20.4 survival multiplayer with plugins and custom world.',
      redirect_enabled: 0,
      redirect_url: '',
      show_player_count: 1,
      sort_order: 4
    }
  ];

  for (const srv of sampleServers) {
    db.run(
      'INSERT INTO servers (name, game, ip, port, description, redirect_enabled, redirect_url, show_player_count, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [srv.name, srv.game, srv.ip, srv.port, srv.description,
       srv.redirect_enabled, srv.redirect_url, srv.show_player_count || 0, srv.sort_order]
    );
  }

  console.log('✅ Admin user created: ' + (process.env.ADMIN_USERNAME || 'Admin'));
  if (generated) {
    console.log('⚠️  No ADMIN_PASSWORD env var set — generated password: ' + rawPassword);
    console.log('   Save this password now! It will not be shown again.');
  }
  console.log('✅ Sample data created successfully!');

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
