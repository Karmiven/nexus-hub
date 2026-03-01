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
    online_users: 'Online',
    
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

    // Admin - Navigation
    admin_panel: 'Control Panel',
    admin_tab_home: 'Home',
    admin_tab_news: 'News',
    admin_tab_servers: 'Servers',
    admin_tab_users: 'Users',
    admin_tab_settings: 'Settings',

    // Admin - Dashboard
    admin_stat_news: 'News',
    admin_stat_total_servers: 'Total Servers',
    admin_stat_online_servers: 'Servers Online',
    admin_stat_users: 'Users',
    admin_server_monitor: 'Server Status Monitor',
    admin_refresh_all: 'Refresh All',
    admin_th_name: 'Name',
    admin_th_game: 'Game',
    admin_th_address: 'Address',
    admin_th_status: 'Status',
    admin_th_checked: 'Checked',

    // Admin - Server Management
    admin_server_mgmt: 'Server Management',
    admin_no_servers: 'No servers configured.',
    admin_all_servers: 'All Servers',
    admin_refresh_status: 'Refresh Status',
    admin_add_server: 'Add Server',
    admin_th_redirect: 'Redirect',
    admin_th_actions: 'Actions',
    admin_redirect_on: 'On',
    admin_redirect_off: 'Off',
    admin_edit_short: 'Edit',
    admin_confirm_delete_server: 'Delete this server?',

    // Admin - Server Form
    admin_edit_server: 'Edit Server',
    admin_new_server: 'New Server',
    admin_server_name: 'Server Name *',
    admin_server_game: 'Game *',
    admin_server_ip: 'IP Address *',
    admin_server_port: 'Port *',
    admin_server_desc: 'Description',
    admin_server_image: 'Image URL (optional)',
    admin_redirect_settings: 'Redirect Settings',
    admin_redirect_enable: 'Enable redirect on server click',
    admin_redirect_url: 'Redirect URL',
    admin_additional: 'Additional',
    admin_show_players: 'Show player count (Minecraft only)',
    admin_sort_order: 'Sort order (lower = higher)',
    admin_save_server: 'Save Server',
    admin_add_server_btn: 'Add Server',

    // Admin - User Management
    admin_user_mgmt: 'User Management',
    admin_users_title: 'Users',
    admin_users_count: 'users',
    admin_th_id: 'ID',
    admin_th_username: 'Username',
    admin_th_email: 'Email',
    admin_th_role: 'Role',
    admin_th_last_login: 'Last Login',
    admin_th_last_ip: 'Last IP',
    admin_th_registered: 'Registered',
    admin_never: 'Never',
    admin_confirm_delete_user: 'Delete user',

    // Admin - News Management
    admin_news_mgmt: 'News Management',
    admin_all_articles: 'All Articles',
    admin_create_news: 'Create News',
    admin_no_news: 'No news yet.',
    admin_th_title: 'Title',
    admin_th_author: 'Author',
    admin_th_pinned: 'Pinned',
    admin_th_date: 'Date',
    admin_pinned_yes: 'Yes',
    admin_pinned_no: '—',
    admin_confirm_delete_article: 'Delete this article?',
    admin_news_modal_create: 'Create News',
    admin_news_modal_edit: 'Edit News',
    admin_news_heading_en: 'Title',
    admin_news_heading_ru: 'Title',
    admin_news_short_en: 'Short Content (Homepage)',
    admin_news_short_ru: 'Short Content (Homepage)',
    admin_news_full_en: 'Full Content (Article)',
    admin_news_full_ru: 'Full Content (Article)',
    admin_news_image: 'Image (16:9 — high quality)',
    admin_news_image_click: 'Click to upload image',
    admin_news_image_hint: 'Supported: JPG, PNG, GIF (max 5MB) • 16:9 • 680×360px',
    admin_news_replace: 'Replace',
    admin_news_pin: 'Pin to homepage',
    admin_news_preview: 'Preview',
    admin_news_preview_title: 'Article Preview',
    admin_news_preview_mini: 'Mini Card (Homepage)',
    admin_news_preview_full: 'Full Article',
    admin_news_preview_mini_desc: 'How it looks on homepage:',
    admin_news_preview_full_desc: 'Full article when clicking the card:',
    admin_news_crop_title: 'Crop Image (16:9)',
    admin_news_crop_apply: 'Apply',
    admin_news_no_title: 'No title',
    admin_news_no_short: 'No short content',
    admin_news_no_full: 'No full content',
    admin_news_pinned_label: 'Pinned',
    admin_news_error_load: 'Error loading article:',
    admin_news_error_save: 'Error saving:',

    // Admin - News Form (simple)
    admin_edit_article: 'Edit Article',
    admin_new_article: 'New Article',
    admin_article_word: 'Article',
    admin_add: 'Add',
    admin_article_title: 'Title *',
    admin_article_short: 'Short Content (Homepage) *',
    admin_article_full: 'Full Content (Article) *',
    admin_article_image: 'Image URL (optional)',
    admin_article_pin: 'Pin article to top',

    // Admin - Settings
    admin_settings_title: 'Settings',
    admin_settings_site: 'Site & Appearance',
    admin_settings_site_name: 'Site Name',
    admin_settings_site_desc: 'Site Description',
    admin_settings_nav_title: 'Navigation Title',
    admin_settings_nav_hint: 'Brand name shown in navbar and browser tab.',
    admin_settings_hero_title: 'Hero Title',
    admin_settings_hero_subtitle: 'Hero Subtitle',
    admin_settings_hero_style: 'Title Style',
    admin_settings_preview: 'Preview',
    admin_settings_server: 'Server & Community',
    admin_settings_check_interval: 'Status Check Interval (sec.)',
    admin_settings_check_hint: 'How often to ping servers. Lower = more frequent, but more resources.',
    admin_settings_chat_enable: 'Enable Community Chat',
    admin_settings_chat_max: 'Max Chat Messages',
    admin_settings_save: 'Save Settings',
    admin_settings_games: 'Games List on Homepage',
    admin_settings_games_hint: 'Add games that will be displayed on the homepage. Icons are automatically resized to 64x64px.',
    admin_settings_game_name: 'Game Name',
    admin_settings_game_icon: 'Icon',

    // Admin - Proxmox
    admin_tab_proxmox: 'Proxmox',
    pve_title: 'Proxmox Monitoring',
    pve_connection: 'Proxmox VE Connection',
    pve_host: 'Host',
    pve_port: 'Port',
    pve_token_hint: 'Format: user@realm!token-name (e.g. root@pam!monitoring)',
    pve_node_label: 'Node name (optional)',
    pve_node_placeholder: 'Auto-detect',
    pve_node_hint: 'Auto-filled when testing connection.',
    pve_test: 'Test Connection',
    pve_checking: 'Checking...',
    pve_connected: 'Connected!',
    pve_conn_error: 'Connection error',
    pve_saved: 'Saved!',
    pve_save_error: 'Save error',
    pve_guests_title: 'Containers & VMs for Monitoring',
    pve_guests_desc: 'Click "Discover" to get a list of available containers and VMs from Proxmox. Check the ones you want on the monitoring dashboard.',
    pve_discover: 'Discover',
    pve_save_selection: 'Save Selection',
    pve_discovering: 'Discovering...',
    pve_no_guests: 'No containers/VMs found',
    pve_perm_hint: 'The API token likely lacks VM listing permissions. Fix in Proxmox:',
    pve_perm_required_title: 'Required Proxmox permissions for LXC/VM discovery:',
    pve_perm_vm_audit: 'view VM/container list and status',
    pve_perm_sys_audit: 'view node information and cluster resources',
    pve_perm_ds_audit: 'view storage/disk data (optional)',
    pve_perm_how_to_fix: 'How to fix:',
    pve_perm_step1: 'Go to Datacenter → API Tokens → select your token',
    pve_perm_step2: 'Disable "Privilege Separation" and recreate the token secret',
    pve_perm_step3: 'Or: Datacenter → Permissions → Add → Path: /, User/Token: your token, Role: PVEAuditor',
    pve_found: 'Found',
    pve_click_discover: 'Click "Discover" to load list.',
    pve_th_name: 'Name',
    pve_th_type: 'Type',
    pve_th_status: 'Status',
    pve_th_node: 'Node',

    // Monitoring Dashboard
    mon_title: 'Monitoring',
    mon_desc: 'Real-time load of containers and virtual machines',
    mon_not_connected: 'Proxmox not connected',
    mon_not_connected_desc: 'Connect a Proxmox VE server to display monitoring data.',
    mon_setup: 'Configure Proxmox',
    mon_no_guests: 'No containers selected',
    mon_no_guests_desc: 'Select containers/VMs for monitoring in the admin panel.',
    mon_select_guests: 'Select Containers',
    mon_loading: 'Loading data...',
    mon_updated: 'Updated',
    mon_refresh: 'Refresh',
    mon_running: 'Running',
    mon_stopped: 'Stopped',
    mon_error: 'Error',
    mon_no_access: 'No access',
    mon_container_stopped: 'Container stopped',
    mon_no_data: 'No data.',
    mon_net_error: 'Network error',
    mon_core_one: 'core',
    mon_core_few: 'cores',
    mon_core_many: 'cores',
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
    online_users: 'Онлайн',
    
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

    // Admin - Navigation
    admin_panel: 'Панель управления',
    admin_tab_home: 'Главная',
    admin_tab_news: 'Новости',
    admin_tab_servers: 'Сервера',
    admin_tab_users: 'Пользователи',
    admin_tab_settings: 'Настройки',

    // Admin - Dashboard
    admin_stat_news: 'Новости',
    admin_stat_total_servers: 'Всего серверов',
    admin_stat_online_servers: 'Сервера онлайн',
    admin_stat_users: 'Пользователи',
    admin_server_monitor: 'Монитор статуса серверов',
    admin_refresh_all: 'Обновить все',
    admin_th_name: 'Название',
    admin_th_game: 'Игра',
    admin_th_address: 'Адрес',
    admin_th_status: 'Статус',
    admin_th_checked: 'Проверено',

    // Admin - Server Management
    admin_server_mgmt: 'Управление серверами',
    admin_no_servers: 'Сервера не настроены.',
    admin_all_servers: 'Все сервера',
    admin_refresh_status: 'Обновить статус',
    admin_add_server: 'Добавить сервер',
    admin_th_redirect: 'Редирект',
    admin_th_actions: 'Действия',
    admin_redirect_on: 'Вкл',
    admin_redirect_off: 'Выкл',
    admin_edit_short: 'Ред.',
    admin_confirm_delete_server: 'Удалить этот сервер?',

    // Admin - Server Form
    admin_edit_server: 'Редактировать сервер',
    admin_new_server: 'Новый сервер',
    admin_server_name: 'Название сервера *',
    admin_server_game: 'Игра *',
    admin_server_ip: 'IP адрес *',
    admin_server_port: 'Порт *',
    admin_server_desc: 'Описание',
    admin_server_image: 'URL изображения (необязательно)',
    admin_redirect_settings: 'Настройки редиректа',
    admin_redirect_enable: 'Включить редирект при клике на сервер',
    admin_redirect_url: 'URL редиректа',
    admin_additional: 'Дополнительно',
    admin_show_players: 'Показывать кол-во игроков (только Minecraft)',
    admin_sort_order: 'Порядок сортировки (меньше = выше)',
    admin_save_server: 'Сохранить сервер',
    admin_add_server_btn: 'Добавить сервер',

    // Admin - User Management
    admin_user_mgmt: 'Управление пользователями',
    admin_users_title: 'Пользователи',
    admin_users_count: 'пользователей',
    admin_th_id: 'ID',
    admin_th_username: 'Имя',
    admin_th_email: 'Email',
    admin_th_role: 'Роль',
    admin_th_last_login: 'Посл. вход',
    admin_th_last_ip: 'Посл. IP',
    admin_th_registered: 'Регистрация',
    admin_never: 'Никогда',
    admin_confirm_delete_user: 'Удалить пользователя',

    // Admin - News Management
    admin_news_mgmt: 'Управление новостями',
    admin_all_articles: 'Все статьи',
    admin_create_news: 'Создать новость',
    admin_no_news: 'Новостей пока нет.',
    admin_th_title: 'Заголовок',
    admin_th_author: 'Автор',
    admin_th_pinned: 'Закреп.',
    admin_th_date: 'Дата',
    admin_pinned_yes: 'Да',
    admin_pinned_no: '—',
    admin_confirm_delete_article: 'Удалить эту статью?',
    admin_news_modal_create: 'Создать новость',
    admin_news_modal_edit: 'Редактировать новость',
    admin_news_heading_en: 'Заголовок',
    admin_news_heading_ru: 'Заголовок',
    admin_news_short_en: 'Краткое содержание (Главная)',
    admin_news_short_ru: 'Краткое содержание (Главная)',
    admin_news_full_en: 'Полное содержание (Статья)',
    admin_news_full_ru: 'Полное содержание (Статья)',
    admin_news_image: 'Изображение (16:9 — высокое качество)',
    admin_news_image_click: 'Нажмите для загрузки изображения',
    admin_news_image_hint: 'Поддерживается: JPG, PNG, GIF (макс. 5MB) • 16:9 • 680×360px',
    admin_news_replace: 'Заменить',
    admin_news_pin: 'Закрепить на главной',
    admin_news_preview: 'Предпросмотр',
    admin_news_preview_title: 'Предпросмотр статьи',
    admin_news_preview_mini: 'Мини-карточка (Главная)',
    admin_news_preview_full: 'Полная статья',
    admin_news_preview_mini_desc: 'Как выглядит на главной:',
    admin_news_preview_full_desc: 'Полная статья при клике на карточку:',
    admin_news_crop_title: 'Обрезка изображения (16:9)',
    admin_news_crop_apply: 'Применить',
    admin_news_no_title: 'Без названия',
    admin_news_no_short: 'Нет краткого содержания',
    admin_news_no_full: 'Нет полного содержания',
    admin_news_pinned_label: 'Закреплено',
    admin_news_error_load: 'Ошибка загрузки статьи:',
    admin_news_error_save: 'Ошибка сохранения:',

    // Admin - News Form (simple)
    admin_edit_article: 'Редактировать статью',
    admin_new_article: 'Новая статья',
    admin_article_word: 'статья',
    admin_add: 'Добавить',
    admin_article_title: 'Заголовок *',
    admin_article_short: 'Краткое содержание (Главная) *',
    admin_article_full: 'Полное содержание (Статья) *',
    admin_article_image: 'URL изображения (необязательно)',
    admin_article_pin: 'Закрепить статью вверху',

    // Admin - Settings
    admin_settings_title: 'Настройки',
    admin_settings_site: 'Сайт и внешний вид',
    admin_settings_site_name: 'Название сайта',
    admin_settings_site_desc: 'Описание сайта',
    admin_settings_nav_title: 'Заголовок навигации',
    admin_settings_nav_hint: 'Название бренда в навигационной панели и вкладке браузера.',
    admin_settings_hero_title: 'Заголовок героя',
    admin_settings_hero_subtitle: 'Подзаголовок героя',
    admin_settings_hero_style: 'Стиль заголовка',
    admin_settings_preview: 'Предпросмотр',
    admin_settings_server: 'Сервер и сообщество',
    admin_settings_check_interval: 'Интервал проверки статуса (сек.)',
    admin_settings_check_hint: 'Как часто пинговать сервера. Меньше = чаще, но больше ресурсов.',
    admin_settings_chat_enable: 'Включить чат сообщества',
    admin_settings_chat_max: 'Макс. сообщений в чате',
    admin_settings_save: 'Сохранить настройки',
    admin_settings_games: 'Список игр на главной',
    admin_settings_games_hint: 'Добавьте игры, которые будут отображаться на главной странице. Иконки автоматически сжимаются до 64x64px.',
    admin_settings_game_name: 'Название игры',
    admin_settings_game_icon: 'Иконка',

    // Admin - Proxmox
    admin_tab_proxmox: 'Proxmox',
    pve_title: 'Proxmox Мониторинг',
    pve_connection: 'Подключение к Proxmox VE',
    pve_host: 'Хост',
    pve_port: 'Порт',
    pve_token_hint: 'Формат: user@realm!token-name (например root@pam!monitoring)',
    pve_node_label: 'Имя ноды (необязательно)',
    pve_node_placeholder: 'Авто-определение',
    pve_node_hint: 'Заполняется автоматически при тесте подключения.',
    pve_test: 'Тест подключения',
    pve_checking: 'Проверка...',
    pve_connected: 'Подключено!',
    pve_conn_error: 'Ошибка подключения',
    pve_saved: 'Сохранено!',
    pve_save_error: 'Ошибка сохранения',
    pve_guests_title: 'Контейнеры и ВМ для мониторинга',
    pve_guests_desc: 'Нажмите «Обнаружить» чтобы получить список доступных контейнеров и ВМ с Proxmox. Отметьте те, которые хотите видеть на дашборде.',
    pve_discover: 'Обнаружить',
    pve_save_selection: 'Сохранить выбор',
    pve_discovering: 'Обнаружение...',
    pve_no_guests: 'Контейнеры/ВМ не найдены',
    pve_perm_hint: 'API токен не имеет прав на просмотр ВМ. Исправьте в Proxmox:',
    pve_perm_required_title: 'Необходимые права Proxmox для обнаружения LXC/VM:',
    pve_perm_vm_audit: 'просмотр списка и статуса ВМ/контейнеров',
    pve_perm_sys_audit: 'просмотр информации о нодах и ресурсах кластера',
    pve_perm_ds_audit: 'просмотр данных хранилища/дисков (необязательно)',
    pve_perm_how_to_fix: 'Как исправить:',
    pve_perm_step1: 'Откройте Datacenter → API Tokens → выберите ваш токен',
    pve_perm_step2: 'Отключите «Privilege Separation» и пересоздайте секрет токена',
    pve_perm_step3: 'Или: Datacenter → Permissions → Add → Path: /, User/Token: ваш токен, Role: PVEAuditor',
    pve_found: 'Найдено',
    pve_click_discover: 'Нажмите «Обнаружить» для загрузки списка.',
    pve_th_name: 'Имя',
    pve_th_type: 'Тип',
    pve_th_status: 'Статус',
    pve_th_node: 'Нода',

    // Monitoring Dashboard
    mon_title: 'Мониторинг',
    mon_desc: 'Нагрузка контейнеров и виртуальных машин в реальном времени',
    mon_not_connected: 'Proxmox не подключён',
    mon_not_connected_desc: 'Подключите сервер Proxmox VE для отображения данных мониторинга.',
    mon_setup: 'Настроить Proxmox',
    mon_no_guests: 'Контейнеры не выбраны',
    mon_no_guests_desc: 'Выберите контейнеры/ВМ для мониторинга в панели администратора.',
    mon_select_guests: 'Выбрать контейнеры',
    mon_loading: 'Загрузка данных...',
    mon_updated: 'Обновлено',
    mon_refresh: 'Обновить',
    mon_running: 'Работает',
    mon_stopped: 'Остановлен',
    mon_error: 'Ошибка',
    mon_no_access: 'Нет доступа',
    mon_container_stopped: 'Контейнер остановлен',
    mon_no_data: 'Нет данных.',
    mon_net_error: 'Ошибка сети',
    mon_core_one: 'ядро',
    mon_core_few: 'ядра',
    mon_core_many: 'ядер',
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
