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
- **Security** — Helmet CSP, bcrypt auth, rate limiting, admin routes hidden as 404, session-based auth

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
| Security | Helmet, express-rate-limit |
| Uploads | Multer + Cropper.js |
| i18n | Custom client-side class + `data-i18n` attributes |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure .env
PORT=3000
SESSION_SECRET=your-random-secret-here

# 3. (Optional) Seed sample data
npm run seed

# 4. Start
npm run dev    # development (nodemon)
npm start      # production
```

Open `http://localhost:3000`. On first launch you'll be redirected to `/setup` to create an admin account.

If you used `npm run seed`, default credentials are `Admin` / `admin123`.

---

## Project Structure

```
├── server.js              # App entry point
├── config/database.js     # better-sqlite3 setup, schema, migrations
├── middleware/auth.js      # isAuthenticated, isAdmin, isGuest
├── routes/
│   ├── home.js            # Homepage (hero, news, stats)
│   ├── servers.js         # Server browser & detail pages
│   ├── community.js       # Chat page
│   ├── admin.js           # Admin CRUD (news/servers/users/settings)
│   ├── auth.js            # Login & logout
│   ├── monitoring.js      # Proxmox monitoring dashboard & API
│   ├── api.js             # Public JSON API
│   └── setup.js           # First-run setup wizard
├── sockets/chat.js        # Socket.io chat (typing, online users, rate limit)
├── utils/
│   ├── statusChecker.js   # TCP ping, Minecraft query, periodic checks
│   └── proxmox.js         # Proxmox VE API client (token auth)
├── views/                 # EJS templates (admin/, auth/, monitoring/, errors/)
├── public/
│   ├── css/               # style.css + desktop.css + 6 theme files
│   └── js/                # main.js (client logic) + translations.js (i18n)
├── data/                  # nexushub.db (auto-created)
└── uploads/news/          # Uploaded images
```

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/servers` | All servers with status (IP/port hidden for non-admins) |
| `GET` | `/api/servers/:id/status` | Single server status with latency |
| `GET` | `/api/news?limit=10` | Latest news articles (EN/RU) |
| `POST` | `/api/language` | Set language preference (`en` / `ru`) |
| `GET` | `/monitoring/resources` | Proxmox guest stats (CPU/RAM/disk) |

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
- [ ] User registration with email verification
- [ ] Telegram bot notifications for server status changes
- [ ] Discord webhook integration
- [ ] Server-side i18n (flash messages, API responses)
- [ ] More languages beyond EN/RU
- [ ] Dashboard charts and analytics
- [ ] Docker support with docker-compose
- [ ] Automated database backups
- [ ] Proxmox VM/CT control (start/stop/restart)
- [ ] HTTPS / Let's Encrypt automation

---

## License

MIT
