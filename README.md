# ⚡ NexusHub

> **🚧 Work In Progress** — Under active development. Some features may be incomplete.

Self-hosted gaming server hub for managing, monitoring, and showcasing game servers. Built with Node.js + Express + SQLite, featuring real-time chat, Proxmox VM/LXC monitoring, and 6 visual themes.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18-blue?logo=express)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-WIP-orange)

---

## Features

- **Server Browser** — Live online/offline status (TCP ping), Minecraft player counts, redirect-to-launcher support
- **Community Chat** — Real-time Socket.io chat with typing indicators, online users, rate limiting
- **News System** — Bilingual articles (EN/RU), image upload with 16:9 cropper, pinned posts
- **Proxmox Monitoring** — Auto-discover LXC/QEMU guests, live CPU/RAM/disk/network stats, grouped by node
- **6 Themes** — Dark, Light, Cyberpunk Purple, Matrix Green, Retro Vaporwave, Vampire — each with unique visual effects
- **i18n** — Full EN/RU support, dynamic language switching without page reload
- **Admin Panel** — News/servers/users/settings CRUD, hero animation styles (7 options), games showcase editor
- **User Registration** — Self-service registration (admin-toggleable), profile page with notification settings
- **Security** — Helmet CSP, CSRF protection, bcrypt auth, encrypted secrets, rate limiting, session-based auth

---

## Security

NexusHub implements defence-in-depth:

| Layer | Implementation |
|---|---|
| **XSS Prevention** | EJS auto-escaping, `textContent` instead of `innerHTML`, `encodeURIComponent` for data attributes |
| **CSRF Protection** | Custom per-session tokens on all state-changing forms and AJAX calls (`x-csrf-token` header) |
| **Authentication** | bcryptjs (cost factor 12), session-based auth with `httpOnly` + `sameSite: strict` cookies |
| **Secrets Encryption** | Proxmox API tokens encrypted at rest with AES-256-GCM (key derived from `SESSION_SECRET` or `ENCRYPTION_KEY` env var) |
| **Session Persistence** | Auto-generated session secret persisted to `data/.session-secret` (survives restarts) |
| **HTTP Headers** | Helmet with strict CSP (`default-src 'self'`), `X-Frame-Options`, `X-Content-Type-Options` |
| **Rate Limiting** | `express-rate-limit` on `/api`, `/auth`, `/setup`, and registration (5 attempts/hour) |
| **Access Control** | Admin routes return 404 for non-admins, monitoring requires authentication, server IPs hidden from non-admin users |
| **Input Validation** | Server IP/hostname validation, news content size limits (50KB/field), image upload size limits (5MB) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js 4 |
| Database | SQLite via **better-sqlite3** (WAL mode) |
| Templates | EJS |
| Real-time | Socket.io 4 |
| Auth | bcryptjs + express-session |
| Security | Helmet, express-rate-limit, custom CSRF middleware, AES-256-GCM encryption |
| Uploads | Multer + Cropper.js |
| Icons | Lucide (pinned v0.454.0) |
| i18n | Custom client-side class + `data-i18n` attributes |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure .env (optional — sensible defaults are used)
PORT=3000
SESSION_SECRET=your-random-secret-here    # auto-generated & persisted if omitted
ENCRYPTION_KEY=64-hex-chars               # optional, derives from SESSION_SECRET if omitted

# 3. (Optional) Seed sample data
ADMIN_PASSWORD=your-secure-password npm run seed
# If ADMIN_PASSWORD is omitted, a random password is generated and printed to stdout

# 4. Start
npm run dev    # development (nodemon)
npm start      # production
```

Open `http://localhost:3000`. On first launch you'll be redirected to `/setup` to create an admin account.

> **Note:** The seed script no longer uses a default password. Set `ADMIN_PASSWORD` env var or a secure random password will be generated for you.

---

## Project Structure

```
├── server.js              # App entry point, middleware chain, health check
├── config/database.js     # better-sqlite3 setup, schema, migrations
├── middleware/
│   ├── auth.js            # isAuthenticated, isAdmin, isGuest
│   └── csrf.js            # CSRF token generation & validation
├── routes/
│   ├── home.js            # Homepage (hero, news, stats)
│   ├── servers.js         # Server browser & detail pages
│   ├── community.js       # Chat page
│   ├── admin.js           # Admin CRUD (news/servers/users/settings/proxmox)
│   ├── auth.js            # Login, logout, register, profile
│   ├── monitoring.js      # Proxmox monitoring dashboard & API (auth required)
│   ├── api.js             # Public JSON API
│   └── setup.js           # First-run setup wizard (rate-limited)
├── sockets/chat.js        # Socket.io chat (typing, online users, rate limit)
├── utils/
│   ├── statusChecker.js   # TCP ping, Minecraft query, periodic checks (min 10s interval)
│   ├── proxmox.js         # Proxmox VE API client (token auth)
│   └── crypto.js          # AES-256-GCM encrypt/decrypt for secrets at rest
├── views/                 # EJS templates (admin/, auth/, monitoring/, errors/)
├── public/
│   ├── css/               # style.css + desktop.css + 6 theme files
│   └── js/                # main.js (client logic) + translations.js (i18n)
├── data/                  # nexushub.db + .session-secret (auto-created, gitignored)
└── uploads/news/          # Uploaded images (news article images saved as files)
```

---

## Routes

### Public

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Homepage with hero, news, and stats |
| `GET` | `/servers` | Server browser |
| `GET` | `/servers/:id` | Server detail page |
| `GET` | `/community` | Community chat page |
| `GET` | `/health` | Health check (returns `{ status, uptime }`) |

### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/servers` | All servers with status (IP/port hidden for non-admins) |
| `GET` | `/api/servers/:id/status` | Single server status with latency |
| `GET` | `/api/news?limit=10` | Latest news articles (EN/RU) |
| `POST` | `/api/language` | Set language preference (`en` / `ru`) |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/login` | Login form |
| `POST` | `/auth/login` | Process login |
| `POST` | `/auth/logout` | Logout (POST only, CSRF-protected) |
| `GET` | `/auth/register` | Registration form (if enabled in admin settings) |
| `POST` | `/auth/register` | Process registration (rate-limited: 5/hour) |
| `GET` | `/auth/profile` | User profile page |
| `POST` | `/auth/profile/notifications` | Update notification settings |

### Monitoring (auth required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/monitoring/dashboard` | Proxmox monitoring dashboard |
| `GET` | `/monitoring/resources` | Proxmox guest stats JSON (CPU/RAM/disk) |

### Admin (admin role required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Admin dashboard |
| `GET/POST` | `/admin/servers/*` | Server CRUD |
| `GET/POST` | `/admin/news/*` | News CRUD (bilingual) |
| `GET/POST` | `/admin/users/*` | User management |
| `GET/POST` | `/admin/settings` | Site settings |
| `GET/POST` | `/admin/proxmox/*` | Proxmox connection & guest management |

---

## Visual Themes

NexusHub features 6 immersive visual themes, each with unique animated background effects and an interactive speed control slider (0.1x–3x) to adjust animation speed to your preference.

| Theme | Effect | Palette |
|---|---|---|
| **Dark** | Floating glowing particles with smooth trails and pulse effects | Deep blues & cyans with glowing accents |
| **Light** | Soft gradient blocks fading in/out for subtle elegance | Bright whites, pastels, and soft shadows |
| **Cyberpunk Purple** | Neon grid lines with glitch effects and chromatic distortion | Electric purples, magentas, and neon pink |
| **Matrix Green** | Classic falling digital rain with authentic Matrix-style glyph effect | Deep blacks with bright green text |
| **Retro Vaporwave** | Rotating 3D-like colored cubes with nostalgic 90s vibes | Vibrant pinks, teals, and sunset gradients |
| **Vampire** | Eerie animated swirling fog with blood-red accents | Dark reds, blacks, and crimson highlights |

**Features:**
- **Real-time speed control slider** — Adjust animation velocity on-the-fly (0.1x–3x)
- **Persistent preferences** — Speed setting saved to browser localStorage
- **Canvas-based performance** — GPU-accelerated rendering for smooth 60fps animations
- **Seamless theme switching** — Effects reinitialize instantly when changing themes

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `SESSION_SECRET` | No | Auto-generated | Session signing secret (persisted to `data/.session-secret`) |
| `ENCRYPTION_KEY` | No | Derived from `SESSION_SECRET` | 64-char hex key for AES-256-GCM encryption |
| `NODE_ENV` | No | `development` | Set to `production` for secure cookies + HSTS |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Rate limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `ADMIN_USERNAME` | No | `Admin` | Seed script admin username |
| `ADMIN_PASSWORD` | No | Random | Seed script admin password |
| `PROXMOX_HOST` | No | — | Proxmox VE host (can also be set via admin panel) |
| `PROXMOX_PORT` | No | `8006` | Proxmox API port |
| `PROXMOX_TOKEN_ID` | No | — | Proxmox API token ID |
| `PROXMOX_TOKEN_SECRET` | No | — | Proxmox API token secret |
| `PROXMOX_NODE` | No | — | Proxmox node name |

---

## Deployment

### PM2

```bash
pm2 start server.js --name nexushub
pm2 startup && pm2 save
```

### Nginx (for WebSocket support)

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
    }
}
```

---

## Roadmap

- [x] Real-time server status monitoring (TCP ping + Minecraft protocol)
- [x] Community chat with Socket.io
- [x] Bilingual news system (EN/RU)
- [x] 6 visual themes with special effects
- [x] Proxmox monitoring (LXC/QEMU discovery, live stats)
- [x] Admin panel with full CRUD
- [x] Helmet CSP + rate limiting + session security
- [x] First-run setup wizard
- [x] CSRF protection on all forms and AJAX
- [x] User registration with admin toggle
- [x] Proxmox secrets encrypted at rest (AES-256-GCM)
- [x] Session secret persistence across restarts
- [x] Health check endpoint (`/health`)
- [ ] Telegram bot notifications for server status changes
- [ ] Discord webhook integration
- [ ] Server-side i18n (flash messages, API responses)
- [ ] More languages beyond EN/RU
- [ ] Dashboard charts and analytics
- [ ] Docker support with docker-compose
- [ ] Automated database backups
- [ ] Proxmox VM/CT control (start/stop/restart)
- [ ] HTTPS / Let's Encrypt automation
- [ ] Email verification for registration

---

## License

MIT
