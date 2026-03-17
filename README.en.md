<div align="center">

# GitGuard AI

**The GitHub PR gatekeeper for open-source maintainers and enterprise teams**

Automatically flag pull requests from non-whitelisted users, bulk-close them in one click, and stop AI bots and unknown accounts from polluting your repository.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](docker-compose.yml)

**English** · [中文](README.md)

</div>

---

## Why GitGuard AI?

As AI coding tools explode in popularity, open-source repositories and GitHub organizations are facing a new problem: **floods of pull requests from unknown accounts and AI bots**. Maintainers are forced to review each one manually, spending precious time on noise instead of real contributions.

GitGuard AI takes a direct approach: **maintain a trusted-user whitelist per repository, automatically flag PRs from anyone outside it, and let you bulk-close or approve them in seconds**. No complex ML models, no expensive SaaS subscriptions — self-hosted and fully in your control.

---

## Features

| Feature | Description |
|---------|-------------|
| **Whitelist management** | Maintain a per-repository list of trusted GitHub usernames; PRs from anyone outside are automatically flagged |
| **Bulk close** | Select multiple flagged PRs and close them all in a single click |
| **One-click approve** | Click Approve to add the author to the whitelist and dismiss the flag |
| **PR scan** | Run an on-demand scan of all existing open PRs against the current whitelist |
| **Live dashboard** | See monitored repos, pending PR count, and a 7-day detection trend chart at a glance |
| **GitHub Webhook** | New PRs trigger detection automatically — no manual action needed |
| **GitHub OAuth login** | Sign in with your GitHub account, no separate registration required |
| **Multi-repo support** | Monitor multiple repositories, each with its own independent whitelist |

---

## Screenshots

**Dashboard**

![Dashboard](docs/screenshots/dashboard.png)

**Flagged Pull Requests**

![Detections](docs/screenshots/detections.png)

**Whitelist Management**

![Whitelist](docs/screenshots/whitelist.png)

---

## How It Works

```
1. Sign in with GitHub OAuth
        ↓
2. Add the repositories you want to monitor
        ↓
3. Add trusted contributor usernames to the Whitelist
        ↓
4. Click "Scan PRs" to check all existing open PRs
        ↓
5. Review flagged PRs in the Detections page
   ├─ Click "Approve" → adds author to whitelist, dismisses flag
   └─ Click "Close PR" → closes the PR on GitHub immediately

For new PRs going forward, the GitHub Webhook handles detection automatically.
```

---

## Tech Stack

**Frontend**
- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS + shadcn/ui
- Zustand state management
- Recharts
- React Router DOM

**Backend**
- Node.js 20 + Express.js
- Prisma ORM
- JWT + GitHub OAuth
- GitHub Webhook integration
- Background sync worker

**Infrastructure**
- PostgreSQL 16
- Redis 7
- Docker Compose
- Nginx reverse proxy

---

## Getting Started

### Option 1: Docker Compose (recommended)

**1. Clone the repository**

```bash
git clone https://github.com/your-username/gitguard-ai.git
cd gitguard-ai
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# GitHub OAuth App (create one at GitHub Settings → Developer settings → OAuth Apps)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://your-domain:3001/auth/github/callback

# Webhook secret (any random string)
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# JWT secret (any random string)
JWT_SECRET=your_jwt_secret

# Public URLs
FRONTEND_URL=http://your-domain:80
VITE_API_URL=http://your-domain:3001
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

**3. Start all services**

```bash
docker compose up -d
```

Once running:
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:3001`

---

### Option 2: Local development

**Prerequisites**
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

**1. Start the backend**

```bash
cd server
npm install

cp .env.example .env
# Edit .env with your database URL and GitHub OAuth credentials

npm run db:migrate
npm run db:seed   # optional sample data
npm run dev       # runs on port 3001
```

**2. Start the frontend**

```bash
cd ..
npm install

cp .env.local.example .env.local
# Fill in VITE_API_URL and VITE_GITHUB_CLIENT_ID

npm run dev       # runs on port 5173
```

**3. Set up a GitHub OAuth App**

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL**: `http://localhost:5173`
3. **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Copy the Client ID and Client Secret into `.env.local` (frontend) and `server/.env` (backend)

**4. Configure a GitHub Webhook (optional — enables automatic detection on new PRs)**

1. Go to your repository → Settings → Webhooks → Add webhook
2. **Payload URL**: `http://your-domain:3001/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: must match `GITHUB_WEBHOOK_SECRET` in your `.env`
5. Select the **Pull requests** event

---

## Project Structure

```
github_detect/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Overview dashboard
│   │   ├── Detections.tsx  # Flagged PR list
│   │   ├── Whitelist.tsx   # Whitelist management
│   │   └── Repositories.tsx
│   ├── lib/                # API client
│   ├── store/              # Zustand stores
│   └── types/              # TypeScript types
├── server/                 # Backend Express server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, error handling
│   │   ├── services/       # Business logic (sync worker, etc.)
│   │   └── utils/
│   └── prisma/
│       └── schema.prisma   # Database schema
├── docker-compose.yml      # One-command deployment
├── Dockerfile.frontend     # Frontend image
└── nginx.conf              # Nginx config
```

---

## API Reference

| Endpoint | Description |
|----------|-------------|
| `POST /auth/github` | GitHub OAuth login |
| `GET /repositories` | List monitored repositories |
| `POST /repositories` | Add a repository |
| `GET /detections` | List flagged PR detections |
| `POST /detections/bulk-close` | Bulk close PRs |
| `POST /detections/:id/resolve` | Approve author and dismiss flag |
| `GET /whitelist` | Get whitelist for a repository |
| `POST /whitelist` | Add a trusted username |
| `DELETE /whitelist/:id` | Remove a whitelist entry |
| `POST /whitelist/scan` | Scan existing open PRs |
| `POST /webhooks/github` | GitHub Webhook receiver |

---

## Contributing

Issues and pull requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

[MIT](LICENSE)
