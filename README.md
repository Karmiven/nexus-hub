# ⚡ NexusHub

> **🚧 Work In Progress** — This project is under active development. Features may change, break, or be incomplete.

A self-hosted gaming server hub for managing, monitoring, and showcasing game servers running on Proxmox VMs. Built with Node.js, Express, and a custom blue-cyan neon UI.

![Node.js](https://img.shields.io/badge/Node.js-24+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18-blue?logo=express)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-WIP-orange)

---

## Features

### Public Pages
- **Homepage** — Hero section with customizable animated title (7 styles: Glitch, Gradient, Neon Pulse, Typewriter, Chrome, Retro, Hologram), latest news feed, hosted games showcase, live server stats
- **Server Browser** — Live online/offline status via TCP ping, player counts (Minecraft), redirect-to-launcher support
- **Server Detail** — Per-server info page with copy-address button and optional external launcher link
- **Community Chat** — Real-time chat powered by Socket.io with typing indicators
- **News System** — Bilingual news articles (EN/RU) with pinned articles, image cropping, and modal reading view

### Admin Panel (Russian UI)
- **Dashboard** — Stats overview (news count, server count, online servers, registered users) + server status monitor
- **News Management** — Full CRUD with bilingual editor (EN/RU side-by-side), image upload with 16:9 cropper (Cropper.js), pin/unpin, inline preview (mini card + full article)
- **Server Management** — Add/edit/delete servers, configure redirect URLs, toggle player count display, manual status refresh
- **User Management** — View all users, see last login/IP, delete accounts
- **Settings** — Two-column layout with:
  - *Site & Appearance*: site name, description, navbar title, hero title/subtitle, hero animation style (7 options with live preview)
  - *Server & Community*: status check interval, community chat toggle, max chat messages

### Internationalization (i18n)
- Full bilingual support: **English** and **Russian**
- Language switcher in the navbar — all text updates dynamically without page reload
- `data-i18n` attribute system with custom `I18n` class handling translations client-side
- News articles support separate EN/RU content with animated language switching

### Theming
- **Dark / Light mode** toggle with smooth transitions
- Blue-cyan neon color palette (Primary `#2563EB`, Accent `#06B6D4`)
- Responsive design — desktop navbar with grid layout, mobile hamburger menu

### Security
- bcrypt password hashing
- Express session authentication
- Helmet.js security headers
- Rate limiting on API endpoints
- Admin routes return 404 for non-admin users (stealth mode)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+, tested on v24) |
| Framework | Express.js 4.18 |
| Database | SQLite via **sql.js** (in-memory with file persistence) |
| Templating | EJS |
| Real-time | Socket.io 4.x |
| Auth | bcryptjs + express-session |
| Security | helmet, express-rate-limit |
| File Uploads | multer |
| Image Cropping | Cropper.js (CDN) |
| CSS | Custom CSS with CSS variables, dark/light theming |
| i18n | Custom client-side I18n class + `data-i18n` attributes |

---

## Project Structure

```
nexushub/
├── server.js                # Express app entry point
├── package.json
├── .env                     # Environment variables
│
├── config/
│   └── database.js          # sql.js setup, schema init, auto-save
│
├── middleware/
│   └── auth.js              # isAuthenticated, isAdmin, isGuest guards
│
├── routes/
│   ├── home.js              # Homepage (hero, news, games)
│   ├── servers.js           # Server listing & detail pages
│   ├── admin.js             # Admin CRUD (news/servers/users/settings)
│   ├── auth.js              # Login & logout (registration disabled)
│   ├── community.js         # Chat page
│   ├── monitoring.js        # Resource monitoring dashboard
│   └── api.js               # JSON API endpoints
│
├── sockets/
│   └── chat.js              # Socket.io chat handler
│
├── utils/
│   ├── statusChecker.js     # TCP ping, Minecraft query, periodic checks
│   └── resourceMonitor.js   # Server resource monitoring
│
├── seeds/
│   └── seed.js              # Seed admin user + sample data
│
├── data/
│   └── nexushub.db          # SQLite database file (auto-created)
│
├── uploads/
│   └── news/                # Uploaded news images
│
├── views/
│   ├── partials/
│   │   ├── header.ejs       # Navbar, theme toggle, language selector
│   │   └── footer.ejs       # Footer with quick links
│   ├── home.ejs             # Homepage with hero, news, games
│   ├── servers.ejs          # Server browser
│   ├── server-detail.ejs    # Individual server page
│   ├── community.ejs        # Real-time chat
│   ├── auth/
│   │   └── login.ejs        # Login page
│   ├── admin/
│   │   ├── dashboard.ejs    # Admin overview
│   │   ├── news-unified.ejs # Bilingual news editor with preview modal
│   │   ├── servers.ejs      # Server management table
│   │   ├── server-form.ejs  # Add/edit server form
│   │   ├── users.ejs        # User management table
│   │   └── settings.ejs     # Site settings (2-column layout)
│   ├── monitoring/
│   │   └── dashboard.ejs    # Resource monitoring
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css        # Main stylesheet (~2100 lines)
│   │   └── desktop.css      # Desktop navbar overrides
│   └── js/
│       ├── main.js          # Theme toggle, language selector, polling
│       └── translations.js  # I18n class + EN/RU translation keys
│
└── locales/                  # Reserved for future server-side i18n
```

---

## Quick Start

### Prerequisites

- **Node.js** v18+ (tested on v24)
- **npm** v9+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
PORT=3000
SESSION_SECRET=your-random-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123
```

### 3. Seed the Database

Creates the admin user and populates sample news articles & servers:

```bash
npm run seed
```

### 4. Start the Server

**Development** (auto-reload with nodemon):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

### 5. Open in Browser

| Page | URL |
|---|---|
| Homepage | `http://localhost:3000` |
| Servers | `http://localhost:3000/servers` |
| Community Chat | `http://localhost:3000/community` |
| Monitoring | `http://localhost:3000/monitoring/dashboard` |
| Admin Panel | `http://localhost:3000/admin` |
| Login | `http://localhost:3000/auth/login` |

> **Default admin credentials:** `admin` / `admin123` — change these in `.env` before running the seed script.

---

## Admin Panel

The admin panel is **hidden** from non-admin users — accessing `/admin` without admin privileges returns a 404 page (not a 403).

1. Log in at `/auth/login` with admin credentials
2. Navigate to `/admin`

### Adding a Game Server

Admin → Сервера → **+ Добавить сервер**:

| Field | Description | Example |
|---|---|---|
| Server Name | Display name | AzerothCore WoW |
| Game | Game title | World of Warcraft |
| IP Address | Server IP | 192.168.1.100 |
| Port | Game port | 8085 |
| Description | Brief info | WotLK 3.3.5a private server |
| Redirect Enabled | Opens external link instead of IP | ✅ |
| Redirect URL | External launcher URL | `https://your-launcher.com` |
| Show Player Count | Minecraft servers only | ✅ |
| Sort Order | Display priority (lower = higher) | 1 |

### Server Status Checking

- **TCP ping** (`net.Socket`) checks if `IP:PORT` is reachable
- **Minecraft** servers with player count enabled use the MC Server List Ping protocol to fetch online players
- Automatic checks run at a configurable interval (default: 60 seconds, adjustable in Settings)
- Manual refresh available from Admin → Сервера → 🔄 **Обновить статус**

### Hero Title Customization

Admin → Настройки → *Hero Title*:

Seven animation styles are available with a live preview:

| Style | Effect |
|---|---|
| **Glitch** | Cyberpunk glitch distortion |
| **Gradient** | Animated color gradient |
| **Neon Pulse** | Pulsing neon glow |
| **Typewriter** | Character-by-character typing |
| **Chrome** | Metallic chrome reflection |
| **Retro** | Pixelated retro gaming |
| **Hologram** | Holographic shimmer |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/servers` | All servers with live status | — |
| `GET` | `/api/servers/:id/status` | Single server status | — |
| `GET` | `/api/news?limit=10` | Latest news articles | — |
| `POST` | `/api/language` | Set preferred language (en/ru) | — |

---

## Database

NexusHub uses **sql.js** — a pure JavaScript SQLite implementation that runs in-memory and persists to `data/nexushub.db`.

Tables:
- `users` — id, username, email, password (bcrypt), role, last_login_at, last_login_ip
- `servers` — id, name, game, ip, port, description, status, players_online, max_players, redirect_enabled/url, show_player_count, sort_order
- `news` — id, title, content, title_ru, content_ru, image, pinned, created_at, updated_at
- `settings` — key/value pairs (site_name, hero_title, hero_style, navbar_title, etc.)
- `messages` — id, user_id, content, created_at (community chat)

The database file is auto-created on first run. Schema migrations are handled in `config/database.js`.

---

## Deployment

### PM2 (Recommended for Production)

```bash
npm install -g pm2
pm2 start server.js --name nexushub
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

Required for WebSocket (Socket.io) support:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Proxmox Tips

- Run each game server in its own **LXC container or VM** for isolation
- NexusHub itself needs minimal resources (~256–512 MB RAM)
- Use Proxmox firewall rules to expose only necessary game ports
- Set a strong `SESSION_SECRET` in production

---

## Known Limitations (WIP)

- Client-side i18n only — no server-side translation for flash messages or API responses
- No Docker image published yet
- Monitoring dashboard is basic — planned expansion for Proxmox API integration

---

## Roadmap

- [ ] telegram bot notifications for server status changes
- [ ] Discord webhook integration
- [ ] Server-side i18n (SSR translations)
- [ ] More languages beyond EN/RU
- [ ] Dashboard charts and analytics
- [ ] Docker support with docker-compose
- [ ] Automated database backups
- [ ] Proxmox API integration for VM control
- [ ] HTTPS / Let's Encrypt automation

---

## License

MIT
