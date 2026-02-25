// Translation system for NexusHub
const translations = {
  en: {
    // Navigation
    nav_home: 'Home',
    nav_servers: 'Servers',
    nav_community: 'Community',
    nav_monitoring: 'Monitoring',
    nav_profile: 'Profile',
    nav_admin: 'Admin',
    nav_login: 'Login',
    nav_logout: 'Logout',
    
    // Home page
    hero_title: 'NexusHub',
    hero_subtitle: 'Your Ultimate Gaming Server Hub',
    hero_browse_servers: 'Browse Servers',
    hero_join_community: 'Join Community',
    latest_news: 'Latest News',
    hosted_games: 'Hosted Games',
    no_news: 'No news yet. Check back soon!',
    stat_online: 'Online',
    stat_servers: 'Servers',
    pinned: 'Pinned',
    news_by: 'By',

    // Servers
    game_servers: 'Game Servers',
    servers_desc: 'Browse all our hosted game servers. Click on any server for more details.',
    no_servers: 'No servers configured yet. Check back soon!',
    online: 'Online',
    offline: 'Offline',
    game: 'Game',
    address: 'Address',
    players: 'Players',
    launch: 'Launch',
    details: 'Details',
    last_checked: 'Checked',
    
    // Server detail
    back_to_servers: 'Back to Servers',
    server_address: 'Server Address',
    players_online: 'Players Online',
    about_server: 'About this Server',
    copy_address: 'Copy Address',
    open_launcher: 'Open Launcher',
    copied: 'Copied!',
    
    // Community
    community_chat: 'Community Chat',
    community_desc: 'Chat with other players in real-time. Be respectful!',
    your_nickname: 'Your nickname:',
    enter_nickname: 'Enter nickname...',
    join_chat: 'Join Chat',
    type_message: 'Type a message...',
    send: 'Send',
    is_typing: '{user} is typing...',
    
    // Auth
    welcome_back: 'Welcome Back',
    login_subtitle: 'Log in to your NexusHub account',
    username: 'Username',
    password: 'Password',
    log_in: 'Log In',
    
    // Profile
    profile_title: 'Profile',
    account_info: 'Account Info',
    email: 'Email',
    not_set: 'Not set',
    role: 'Role',
    joined: 'Joined',
    notification_prefs: 'Notification Preferences',
    notify_email_label: 'Receive email notifications for new servers/news',
    discord_id_label: 'Discord User ID (for bot notifications)',
    save_preferences: 'Save Preferences',
    
    // Admin
    admin_dashboard: 'Admin Dashboard',
    manage_news: 'Manage News',
    manage_servers: 'Manage Servers',
    manage_users: 'Manage Users',
    settings: 'Settings',
    
    // Monitoring
    resource_monitoring: 'Resource Monitoring',
    monitoring_desc: 'Real-time system resource usage for all game servers',
    total_servers: 'Total Servers',
    online_servers: 'Online',
    offline_servers: 'Offline',
    avg_cpu: 'Avg CPU',
    server_resources: 'Server Resources',
    cpu: 'CPU',
    memory: 'Memory',
    disk: 'Disk',
    cores: 'Cores',
    load: 'Load',
    uptime: 'Uptime',
    last_check: 'Last check',
    server_offline_msg: 'Server is offline or not responding',
    
    // Errors
    page_not_found: 'Page Not Found',
    error_404_desc: "The page you're looking for doesn't exist or has been moved.",
    back_to_home: 'Back to Home',
    server_error: 'Server Error',
    error_500_desc: 'Something went wrong on our end. Please try again later.',
    
    // Footer
    footer_tagline: 'Your ultimate gaming server hub. Play, connect, and conquer.',
    quick_links: 'Quick Links',
    account: 'Account',
    footer_copyright: 'NexusHub. Powered by Proxmox.',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    close: 'Close',
    
    // Time formats
    minutes_ago: '{minutes} minutes ago',
    hours_ago: '{hours} hours ago',
    days_ago: '{days} days ago',
    just_now: 'Just now',
  },
  
  ru: {
    // Navigation
    nav_home: 'Главная',
    nav_servers: 'Сервера',
    nav_community: 'Сообщество',
    nav_monitoring: 'Мониторинг',
    nav_profile: 'Профиль',
    nav_admin: 'Админ',
    nav_login: 'Вход',
    nav_logout: 'Выход',
    
    // Home page
    hero_title: 'NexusHub',
    hero_subtitle: 'Ваш центр игровых серверов',
    hero_browse_servers: 'Сервера',
    hero_join_community: 'Сообщество',
    latest_news: 'Последние новости',
    hosted_games: 'Игры',
    no_news: 'Новостей пока нет. Зайдите позже!',
    stat_online: 'Онлайн',
    stat_servers: 'Сервера',
    pinned: 'Закреплено',
    news_by: 'Автор',

    // Servers
    game_servers: 'Игровые сервера',
    servers_desc: 'Просмотрите все наши игровые сервера. Нажмите на любой сервер для подробной информации.',
    no_servers: 'Сервера не настроены. Зайдите позже!',
    online: 'Онлайн',
    offline: 'Офлайн',
    game: 'Игра',
    address: 'Адрес',
    players: 'Игроки',
    launch: 'Запустить',
    details: 'Подробнее',
    last_checked: 'Проверено',
    
    // Server detail
    back_to_servers: 'Назад к серверам',
    server_address: 'Адрес сервера',
    players_online: 'Игроков онлайн',
    about_server: 'Об этом сервере',
    copy_address: 'Копировать адрес',
    open_launcher: 'Открыть лаунчер',
    copied: 'Скопировано!',
    
    // Community
    community_chat: 'Чат сообщества',
    community_desc: 'Общайтесь с другими игроками в реальном времени. Будьте вежливы!',
    your_nickname: 'Ваш никнейм:',
    enter_nickname: 'Введите никнейм...',
    join_chat: 'Войти в чат',
    type_message: 'Напишите сообщение...',
    send: 'Отправить',
    is_typing: '{user} печатает...',
    
    // Auth
    welcome_back: 'С возвращением',
    login_subtitle: 'Войдите в свой аккаунт NexusHub',
    username: 'Имя пользователя',
    password: 'Пароль',
    log_in: 'Войти',
    
    // Profile
    profile_title: 'Профиль',
    account_info: 'Информация об аккаунте',
    email: 'Email',
    not_set: 'Не указан',
    role: 'Роль',
    joined: 'Дата регистрации',
    notification_prefs: 'Настройки уведомлений',
    notify_email_label: 'Получать email-уведомления о новых серверах/новостях',
    discord_id_label: 'Discord User ID (для уведомлений через бота)',
    save_preferences: 'Сохранить настройки',
    
    // Admin
    admin_dashboard: 'Панель администратора',
    manage_news: 'Управление новостями',
    manage_servers: 'Управление серверами',
    manage_users: 'Управление пользователями',
    settings: 'Настройки',
    
    // Monitoring
    resource_monitoring: 'Мониторинг ресурсов',
    monitoring_desc: 'Мониторинг системных ресурсов всех игровых серверов в реальном времени',
    total_servers: 'Всего серверов',
    online_servers: 'Онлайн',
    offline_servers: 'Офлайн',
    avg_cpu: 'Средняя CPU',
    server_resources: 'Ресурсы серверов',
    cpu: 'CPU',
    memory: 'Память',
    disk: 'Диск',
    cores: 'Ядра',
    load: 'Нагрузка',
    uptime: 'Время работы',
    last_check: 'Последняя проверка',
    server_offline_msg: 'Сервер офлайн или не отвечает',
    
    // Errors
    page_not_found: 'Страница не найдена',
    error_404_desc: 'Страница, которую вы ищете, не существует или была перемещена.',
    back_to_home: 'На главную',
    server_error: 'Ошибка сервера',
    error_500_desc: 'Что-то пошло не так. Пожалуйста, попробуйте позже.',
    
    // Footer
    footer_tagline: 'Ваш центр игровых серверов. Играй, общайся, побеждай.',
    quick_links: 'Быстрые ссылки',
    account: 'Аккаунт',
    footer_copyright: 'NexusHub. Работает на Proxmox.',
    
    // Common
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    cancel: 'Отмена',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    add: 'Добавить',
    create: 'Создать',
    update: 'Обновить',
    back: 'Назад',
    next: 'Далее',
    previous: 'Назад',
    search: 'Поиск',
    filter: 'Фильтр',
    refresh: 'Обновить',
    close: 'Закрыть',
    
    // Time formats
    minutes_ago: '{minutes} минут назад',
    hours_ago: '{hours} часов назад',
    days_ago: '{days} дней назад',
    just_now: 'Только что',
  }
};

/**
 * Translation system
 */
class I18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = translations;
  }

  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) return saved;

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) return browserLang;

    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && translations[urlLang]) return urlLang;

    // Default to English
    return 'en';
  }

  /**
   * Get translation for a key
   */
  t(key, params = {}) {
    const translation = this.translations[this.currentLang][key] || key;
    
    // Replace parameters in translation
    return translation.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] || match;
    });
  }

  /**
   * Set language
   */
  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
      
      // Update page content
      this.updatePageContent();
      
      // Update language selector if exists
      this.updateLanguageSelector();
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return Object.keys(translations);
  }

  /**
   * Update page content with translations
   */
  updatePageContent() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    // Update page title
    const title = document.querySelector('title');
    if (title && title.textContent) {
      const titleKey = title.textContent;
      const translated = this.t(titleKey);
      if (translated !== titleKey) {
        title.textContent = translated;
      }
    }
  }

  /**
   * Update language selector UI
   */
  updateLanguageSelector() {
    const selector = document.querySelector('.language-selector');
    if (selector) {
      selector.value = this.currentLang;
    }
  }

  /**
   * Format time relative to now
   */
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return this.t('days_ago', { days });
    if (hours > 0) return this.t('hours_ago', { hours });
    if (minutes > 0) return this.t('minutes_ago', { minutes });
    return this.t('just_now');
  }
}

// Global i18n instance
window.i18n = new I18n();

// Helper function for templates
window.t = (key, params) => window.i18n.t(key, params);
