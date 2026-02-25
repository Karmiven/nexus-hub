# ⚡ NexusHub

> **🚧 Work In Progress** — This project is under active development. Features may change, break, or be incomplete.

A self-hosted gaming server hub for managing, monitoring, and showcasing game servers running on Proxmox VMs. Built with Node.js, Express, and a multi-theme CSS system with 5 atmospheric visual themes.

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
- **Community Chat** — Real-time chat powered by Socket.io with typing indicators, online users list, nickname persistence
- **News System** — Bilingual news articles (EN/RU) with separate fields for title, short content, and full content; pinned articles, image cropping, and modal reading view with animated language switching

### Admin Panel (Russian UI)
- **Dashboard** — Stats overview (news count, server count, online servers, registered users) + server status monitor
- **News Management** — Full CRUD with bilingual editor (EN/RU side-by-side), image upload with 16:9 cropper (Cropper.js), pin/unpin, inline preview (mini card + full article)
- **Server Management** — Add/edit/delete servers, configure redirect URLs, toggle player count display, manual status refresh
- **User Management** — View all users, see last login/IP, delete accounts
- **Settings** — Two-column layout with:
  - *Site & Appearance*: site name, description, navbar title, hero title/subtitle, hero animation style (7 options with live preview)
  - *Server & Community*: status check interval, community chat toggle, max chat messages
  - *Games List*: add/remove games with name + icon upload (stored as base64 data URIs)

### Theming — 5 Visual Themes

Themes are selected via a dropdown in the navbar. Saved to `localStorage` and applied instantly via CSS custom properties (28+ variables per theme).

| Theme | Vibe |
|---|---|
| **Dark** | Blue-cyan neon — default dark gaming aesthetic |
| **Light** | Clean & bright — high-contrast light mode |
| **Cyberpunk Purple** | Night City — neon pink/cyan, animated grid overlay, glitch effects, sharp corners |
| **Matrix Green** | Wake up, Neo — terminal green, scanlines, CRT glow, monospace fonts |
| **Retro 90s Vaporwave** | Miami Sunsets — purple/pink/cyan neon, VHS noise, chromatic aberration |

Special effects per theme:
- **Cyberpunk**: Animated CSS grid background, glitch animation on button hover
- **Matrix / Retro**: Scanline overlay (animated)
- **Retro**: VHS noise via SVG `feTurbulence` filter, chromatic aberration on headings
- **All themes**: Glassmorphism navbar, smooth 0.35s transitions between themes

### Internationalization (i18n)
- Full bilingual support: **English** and **Russian**
- Language switcher in the navbar — all text updates dynamically without page reload
- `data-i18n` attribute system with custom `I18n` class handling translations client-side
- News articles support separate EN/RU content with animated language switching

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
| CSS | Custom CSS with 28+ CSS variables per theme, 5 themes, special effects (scanlines, VHS noise, glitch) |
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
│   └── database.js          # sql.js setup, schema init, auto-save every 5s
│
├── middleware/
│   └── auth.js              # isAuthenticated, isAdmin, isGuest guards
│
├── routes/
│   ├── home.js              # Homepage (hero, news, games list, stats)
│   ├── servers.js           # Server listing & detail pages
│   ├── admin.js             # Admin CRUD (news/servers/users/settings/games)
│   ├── auth.js              # Login & logout
│   ├── community.js         # Chat page
│   ├── monitoring.js        # Resource monitoring dashboard
│   └── api.js               # JSON API endpoints
│
├── sockets/
│   └── chat.js              # Socket.io chat handler (typing, online users)
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
│   │   ├── header.ejs       # Navbar, theme dropdown (5 themes), language selector
│   │   └── footer.ejs       # Footer with quick links
│   ├── home.ejs             # Homepage: hero, news, games showcase
│   ├── servers.ejs          # Server browser
│   ├── server-detail.ejs    # Individual server page
│   ├── community.ejs        # Real-time chat with online users
│   ├── auth/
│   │   ├── login.ejs        # Login page
│   │   ├── register.ejs     # Registration page
│   │   └── profile.ejs      # User profile
│   ├── admin/
│   │   ├── dashboard.ejs    # Admin overview
│   │   ├── news-unified.ejs # Bilingual news editor with preview modal
│   │   ├── servers.ejs      # Server management table
│   │   ├── server-form.ejs  # Add/edit server form
│   │   ├── users.ejs        # User management table
│   │   └── settings.ejs     # Site settings + hero styles + games list
│   ├── monitoring/
│   │   └── dashboard.ejs    # Resource monitoring
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css        # Main stylesheet (~2300 lines) — 5 theme tokens, effects, all components
│   │   └── desktop.css      # Desktop navbar overrides
│   └── js/
│       ├── main.js          # Theme switcher (dropdown), language selector, page transitions, polling
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

Admin → Servers → **+ Add Server**:

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

### Managing the Games List

Admin → Settings → **Games List**:

- Add games with a name and icon image (any format, stored as base64)
- Icons with transparent backgrounds (PNG) are fully supported
- Games appear on the homepage in a showcase grid
- Remove games with the delete button

### Server Status Checking

- **TCP ping** (`net.Socket`) checks if `IP:PORT` is reachable
- **Minecraft** servers with player count enabled use the MC Server List Ping protocol to fetch online players
- Automatic checks run at a configurable interval (default: 60 seconds, adjustable in Settings)
- Manual refresh available from Admin → Servers → 🔄 **Refresh Status**

### Hero Title Customization

Admin → Settings → *Hero Title*:

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

NexusHub uses **sql.js** — a pure JavaScript SQLite implementation that runs in-memory and persists to `data/nexushub.db`. Auto-saves every 5 seconds when changes are detected.

### Tables

| Table | Key Fields |
|---|---|
| `users` | id, username, email, password (bcrypt), role, notify_email, notify_discord, last_login, last_ip, created_at |
| `news` | id, title_en, title_ru, content_short_en, content_short_ru, content_full_en, content_full_ru, image, author, pinned, created_at, updated_at |
| `servers` | id, name, game, ip, port, description, image, redirect_enabled, redirect_url, show_player_count, player_count, max_players, status, last_checked, sort_order, created_at |
| `chat_messages` | id, username, message, channel, created_at |
| `settings` | key (PK), value — key-value store for all site configuration |

### Settings Keys

| Key | Default | Description |
|---|---|---|
| `site_name` | NexusHub | Site title |
| `site_description` | — | Site description |
| `navbar_title` | NexusHub | Brand name in navbar |
| `hero_title` | NexusHub | Hero section title |
| `hero_subtitle` | — | Hero section subtitle |
| `hero_style` | glitch | Hero title animation style |
| `status_check_interval` | 60 | Server ping interval (seconds) |
| `community_enabled` | 1 | Toggle community chat |
| `max_chat_messages` | 200 | Chat history limit |
| `registration_enabled` | 1 | Toggle user registration |
| `games_list` | [] | JSON array of `{name, icon}` objects |

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
- Hero title styles (neon-pulse, typewriter, chrome, retro, hologram) use hardcoded colors for their specific effects

---

## Roadmap

- [ ] Telegram bot notifications for server status changes
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
