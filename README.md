# ⚡ NexusHub

Self-hosted gaming server hub for managing, monitoring, and showcasing game servers. Built with Node.js + Express + SQLite, featuring real-time chat, Proxmox VM/LXC monitoring, DeepL-powered content translation, and 6 animated visual themes.

![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4-blue?logo=express)
![License](https://img.shields.io/badge/License-MIT-yellow)

> Actively developed. The `main` branch is production-usable; the database schema upgrades itself in place on startup (additive, non-destructive migrations).

---

## Features

- **Server Browser** — Live online/offline status (TCP ping), Minecraft player counts, redirect-to-launcher support, per-server uptime/players history chart (24h/7d)
- **News System** — Multilingual articles (EN/RU/RO/DE), pinned posts, image upload with 16:9 cropper, search, pagination, permalinks, RSS & OpenGraph
- **Auto-translation** — Write content in English once; Russian/Romanian/German are filled in automatically on save via the DeepL API (or on demand with a "Translate from EN" button). Optional — falls back to English when no key is set
- **Community Chat** — Real-time Socket.io chat with typing indicators, online users, rate limiting, and admin/GM moderation (delete messages, mute users)
- **Proxmox Monitoring** — Auto-discover LXC/QEMU guests, live CPU/RAM/disk/network stats grouped by node, plus start/stop/reboot control
- **6 Themes** — Dark, Light, Cyberpunk Purple, Matrix Green, Retro Vaporwave, Vampire — each with a unique animated canvas background and a speed slider
- **i18n** — Dynamic language system with auto-discovery (EN/RU/RO/DE out of the box), instant switching without page reload; also localizes flash messages and API responses
- **Admin Panel** — News / servers / users / settings CRUD, analytics dashboard with charts, audit log of admin actions, one-click DB backups
- **Analytics** — Buffered page-view tracking with GeoIP, charts and time-series breakdown, automatic 90-day retention
- **Accounts** — Self-service registration (admin-toggleable) with optional Cloudflare Turnstile, avatar upload, and optional TOTP two-factor auth
- **Discord Notifications** — Webhook alerts when a server goes up/down or a news article is published
- **Security & Ops** — Nonce-based CSP (no `unsafe-inline`), CSRF protection, bcrypt auth, encrypted secrets, rate limiting, bot/scanner blocking, PWA manifest, daily backups

---

## Security

NexusHub implements defence-in-depth:

| Layer | Implementation |
|---|---|
| **XSS Prevention** | EJS auto-escaping, `textContent` instead of `innerHTML`, `encodeURIComponent` for data attributes |
| **CSRF Protection** | Per-session tokens on all state-changing forms and AJAX calls (`x-csrf-token` header or `_csrf` field) |
| **Content Security Policy** | Helmet with per-request nonce, `'strict-dynamic'`, no `unsafe-inline` scripts, `script-src-attr 'none'`; all vendor JS/CSS self-hosted (no CDN) |
| **Authentication** | bcryptjs (cost 12), session-based auth with `httpOnly` + `sameSite: strict` cookies; optional TOTP 2FA (RFC 6238, `node:crypto` only) |
| **Secrets Encryption** | Proxmox API token and DeepL API key encrypted at rest with AES-256-GCM (key from `ENCRYPTION_KEY`, else derived from `SESSION_SECRET`) |
| **Session Persistence** | Auto-generated session secret persisted to `data/.session-secret` (survives restarts) |
| **Rate Limiting** | `express-rate-limit` on `/api` and `/auth`; registration and first-run setup have their own tighter limits |
| **Access Control** | Roles `user` / `gm` / `admin`; admin routes return 404 for non-admins; monitoring is staff-only or public by setting; server IPs hidden unless enabled |
| **Bot Protection** | Scanner/bot blocking middleware with an IP strike system, running before sessions and analytics |
| **Audit & Backups** | All admin/moderation actions recorded in `admin_log`; daily SQLite backups (last 7 kept, downloadable) + 90-day analytics retention |
| **Input Validation** | Server IP/hostname validation, news content size limits (50 KB/field), image upload size limit (5 MB) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Database | SQLite via **better-sqlite3** 12 (WAL mode) |
| Templates | EJS |
| Real-time | Socket.io 4 |
| Auth | bcryptjs + express-session (SQLite-backed store) |
| Security | Helmet, express-rate-limit, custom CSRF middleware, AES-256-GCM encryption |
| Uploads | Multer + Cropper.js (16:9 crop) |
| Translation | DeepL API (optional) |
| Vendor assets | Self-hosted, no CDN — Lucide icons (v0.454.0), Chart.js, Cropper.js |
| i18n | Dynamic language loader (`data-i18n` attributes, auto-discovered `public/js/lang/*.js`) |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure .env (optional — sensible defaults are used)
PORT=3000
SESSION_SECRET=your-random-secret-here    # auto-generated & persisted if omitted
ENCRYPTION_KEY=64-hex-chars               # optional, derives from SESSION_SECRET if omitted

# 3. (Optional) Seed sample data — prints a generated admin password if none is given
ADMIN_PASSWORD=your-secure-password npm run seed

# 4. Start
npm run dev    # development (nodemon)
npm start      # production
```

Open `http://localhost:3000`. On first launch you'll be redirected to `/setup` to create an admin account.

---

## Project Structure

```
├── server.js              # App entry point, middleware chain, CSP, health check
├── config/database.js     # better-sqlite3 setup, schema, in-place migrations, caches
├── middleware/
│   ├── auth.js            # isAuthenticated, isAdmin, isGuest, staff checks
│   ├── csrf.js            # CSRF token generation & validation
│   ├── botProtection.js   # Bot/scanner blocking, IP strike system
│   └── analytics.js       # Buffered page-view tracking with GeoIP
├── routes/
│   ├── home.js            # Overview page, news feed, single article, RSS, sitemap
│   ├── servers.js         # Server browser & detail pages
│   ├── community.js       # Chat page
│   ├── admin.js           # Admin CRUD (news/servers/users/settings/proxmox/system) + live translate
│   ├── admin-analytics.js # Analytics page + analytics API
│   ├── auth.js            # Login (Turnstile + 2FA), logout, register, profile, avatar
│   ├── monitoring.js      # Proxmox dashboard, stats, guest control (start/stop/reboot)
│   ├── api.js             # Public JSON API (servers, status, history, news, languages)
│   └── setup.js           # First-run setup wizard (rate-limited)
├── sockets/chat.js        # Socket.io chat (typing, online users, rate limit, moderation)
├── utils/
│   ├── statusChecker.js   # TCP ping + Minecraft query, periodic status checks
│   ├── proxmox.js         # Proxmox VE API client (token auth)
│   ├── crypto.js          # AES-256-GCM encrypt/decrypt for secrets at rest
│   ├── translate.js       # DeepL client + fill-missing-language helper
│   ├── i18nContent.js     # Per-language DB field picker with fallback chain
│   ├── discord.js         # Discord webhook notifications
│   ├── maintenance.js     # Daily DB backups + analytics retention
│   ├── adminLog.js        # Admin/moderation audit logging
│   ├── totp.js            # TOTP (RFC 6238) generate/verify
│   ├── imageUpload.js     # Shared multer config + resolveImage helper
│   └── catchAsync.js      # Promise error wrapper for async route handlers
├── views/
│   ├── partials/          # header, footer, admin-nav (shared layout)
│   ├── admin/             # Admin pages (dashboard, news, servers, users, settings, proxmox, system, analytics)
│   ├── auth/              # Login, register, profile
│   ├── monitoring/        # Proxmox dashboard
│   └── errors/            # 404, 500
├── public/
│   ├── css/
│   │   ├── style.css      # Base styles + CSS variables
│   │   ├── layout.css     # Page/component layout
│   │   ├── desktop.css / mobile.css   # Responsive breakpoints
│   │   ├── themes/        # 6 theme files
│   │   └── vendor/        # Self-hosted vendor CSS (Cropper.js)
│   └── js/
│       ├── main.js        # SPA nav, theme, i18n bootstrap, polling
│       ├── theme-effects.js # Canvas animations per theme
│       ├── translations.js  # i18n runtime (window.t, language switching)
│       ├── lang/          # Auto-discovered language files (en, ru, ro, de)
│       └── vendor/        # Self-hosted libs (lucide, chart.umd, cropper)
├── data/                  # nexushub.db + .session-secret (auto-created, gitignored)
└── uploads/               # avatars/, news/, servers/ (user uploads, gitignored)
```

---

## Routes

### Public

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Overview (stats, server/news/chat widgets) |
| `GET` | `/news` · `/news/:id` | News feed & single article (permalink, OpenGraph) |
| `GET` | `/servers` · `/servers/:id` | Server browser & detail page (with history chart) |
| `GET` | `/community` | Community chat page |
| `GET` | `/rss.xml` · `/sitemap.xml` | RSS feed (`?lang=en|ru|ro|de`) & sitemap |
| `GET` | `/health` | Health check (`{ status, uptime }`) |

### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/servers` | All servers with status (IP/port hidden for non-admins) |
| `GET` | `/api/servers/:id/status` | Single server status with latency |
| `GET` | `/api/servers/:id/history?range=24h|7d` | Uptime/players time-series for the history chart |
| `GET` | `/api/news?limit=10` | Latest news articles (multilingual) |
| `GET` | `/api/languages` | Available language codes |
| `POST` | `/api/language` | Set language preference |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/auth/login` | Login (Cloudflare Turnstile + optional TOTP second step) |
| `POST` | `/auth/logout` | Logout (POST only, CSRF-protected) |
| `GET/POST` | `/auth/register` | Registration (if enabled; rate-limited) |
| `GET` | `/auth/profile` | Profile: notifications, avatar upload, 2FA setup |

### Monitoring (staff)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/monitoring/dashboard` | Proxmox monitoring dashboard |
| `GET` | `/monitoring/resources` | Guest stats JSON (CPU/RAM/disk/network) |
| `POST` | `/monitoring/control/:vmid/:action` | Start / stop / reboot a guest (admin) |

### Admin (admin role)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Admin dashboard |
| `GET/POST` | `/admin/servers/*` | Server CRUD (multilingual descriptions) |
| `GET/POST` | `/admin/news/*` | News CRUD (EN/RU/RO/DE, auto-translated) |
| `GET/POST` | `/admin/users/*` | User management (delete, role: user / gm / admin) |
| `GET/POST` | `/admin/settings` | Site settings (branding, footer, Discord, DeepL key) |
| `GET/POST` | `/admin/proxmox/*` | Proxmox connection & guest management |
| `GET/POST` | `/admin/system` | Audit log + database backups |
| `POST` | `/admin/translate` | Live DeepL translation (powers the "Translate from EN" button) |
| `GET` | `/admin/analytics` · `/admin/analytics/api/*` | Analytics dashboard & JSON endpoints |

---

## Visual Themes

Six immersive themes, each with a unique animated canvas background and a speed slider (0.1×–3×). The speed preference is saved to `localStorage`; effects reinitialize instantly on theme switch.

| Theme | Effect | Palette |
|---|---|---|
| **Dark** | Floating glowing particles with trails and pulses | Deep blues & cyans |
| **Light** | Soft gradient blocks fading in and out | Bright whites & pastels |
| **Cyberpunk Purple** | Neon grid with glitch & chromatic distortion | Electric purples & neon pink |
| **Matrix Green** | Classic falling digital rain | Black with bright green |
| **Retro Vaporwave** | Rotating 3D-like colored cubes | Pinks, teals & sunset gradients |
| **Vampire** | Swirling fog with blood-red accents | Dark reds, blacks & crimson |

---

## Environment Variables

All optional — NexusHub runs with sensible defaults and most integrations can also be configured from the admin panel.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `SESSION_SECRET` | Auto-generated | Session signing secret (persisted to `data/.session-secret`) |
| `ENCRYPTION_KEY` | Derived from `SESSION_SECRET` | 64-char hex key for AES-256-GCM encryption |
| `NODE_ENV` | `development` | Set to `production` for view caching + static asset caching |
| `COOKIE_SECURE` | `false` | Set to `true` to mark session cookies `Secure` (requires HTTPS) |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Rate limit window |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `DEEPL_API_KEY` | — | Enables auto-translation of news & server descriptions. Free-tier keys end with `:fx` and use the free API host automatically. **Preferably set in the admin panel** (Settings → Auto-translation), where it is stored encrypted; the admin-panel key takes precedence over this variable. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `Admin` / random | Seed-script admin credentials |
| `PROXMOX_HOST` / `PROXMOX_PORT` | — / `8006` | Proxmox VE host & API port (can also be set in admin panel) |
| `PROXMOX_TOKEN_ID` / `PROXMOX_TOKEN_SECRET` | — | Proxmox API token (secret encrypted at rest) |
| `PROXMOX_NODE` | — | Proxmox node name |
| `PROXMOX_VERIFY_SSL` | `false` | Set to `true` to verify the Proxmox API TLS certificate |

---

## Deployment

### Docker

```bash
docker compose up -d
```

A `Dockerfile` and `docker-compose.yml` are included; the `data/` and `uploads/` volumes persist the database and uploads across container rebuilds.

### PM2

```bash
pm2 start server.js --name nexushub
pm2 startup && pm2 save
```

### Nginx (WebSocket-aware reverse proxy)

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

Set `COOKIE_SECURE=true` (and terminate TLS at Nginx) when serving over HTTPS.

---

## Roadmap

Shipped:

- Real-time server status monitoring (TCP ping + Minecraft protocol) and uptime/players history charts
- Community chat (Socket.io) with typing indicators, online users, and admin/GM moderation
- Multilingual news (EN/RU/RO/DE) with search, pagination, permalinks, RSS, sitemap, OpenGraph
- DeepL auto-translation of news & server descriptions, with an encrypted admin-managed API key
- Dynamic i18n with auto-discovery (drop a new `public/js/lang/*.js` file), server-side too
- 6 animated visual themes with a speed control
- Proxmox monitoring (LXC/QEMU discovery, live stats) and VM/CT control (start/stop/reboot)
- Full admin panel: CRUD, analytics (Chart.js), audit log, one-click backups
- Security: nonce-based CSP, CSRF, rate limiting, bot/scanner blocking, TOTP 2FA, encrypted secrets
- Accounts: registration with admin toggle, Cloudflare Turnstile, avatars
- Discord webhook notifications, PWA manifest, health check, Docker support, daily automated backups

Planned:

- [ ] Telegram bot notifications for server status changes
- [ ] HTTPS / Let's Encrypt automation
- [ ] Email verification for registration

---

## License

MIT
