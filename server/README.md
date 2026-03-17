# GitGuard AI Backend Server

This is the backend API server for GitGuard AI - a GitHub repository management and AI detection platform.

## Features

- **GitHub OAuth Authentication**: Secure login with GitHub
- **JWT Token Management**: Access and refresh token system
- **Repository Management**: Sync and manage GitHub repositories
- **AI Detection**: Detect AI-generated code, issues, and pull requests
- **Rules Engine**: Create automation rules for handling AI content
- **Analytics**: View trends and statistics about AI activity
- **Webhook Support**: Receive real-time updates from GitHub

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- GitHub OAuth App credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env .env.local
# Edit .env.local with your credentials
```

3. Set up the database:
```bash
# Run migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3001) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No |
| `GITHUB_WEBHOOK_SECRET` | Secret for webhook verification | No |

## API Endpoints

### Authentication
- `POST /auth/github` - GitHub OAuth callback
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Repositories
- `GET /repositories` - List repositories
- `POST /repositories` - Add repository
- `GET /repositories/:id` - Get repository details
- `PATCH /repositories/:id` - Update repository
- `DELETE /repositories/:id` - Delete repository
- `POST /repositories/:id/sync` - Sync repository
- `GET /repositories/:id/issues` - List repository issues
- `GET /repositories/:id/pulls` - List repository PRs

### Issues
- `GET /issues/:id` - Get issue details
- `POST /issues/:id/label` - Add label to issue
- `DELETE /issues/:id/label/:label` - Remove label
- `POST /issues/bulk-action` - Bulk actions on issues

### Pull Requests
- `GET /pulls/:id` - Get PR details
- `GET /pulls/:id/files` - Get PR files
- `POST /pulls/:id/review` - Submit review

### Detections
- `GET /detections` - List detections
- `GET /detections/:id` - Get detection details
- `POST /detections/:id/feedback` - Submit feedback
- `GET /detections/stats/overview` - Get detection stats
- `POST /detections/analyze` - Analyze content

### Whitelist
- `GET /whitelist?repository_id=` - List whitelist entries for a repository
- `POST /whitelist` - Add a GitHub username to the whitelist
- `GET /whitelist/:id` - Get a whitelist entry
- `PATCH /whitelist/:id` - Update note on a whitelist entry
- `DELETE /whitelist/:id` - Remove a username from the whitelist

### Analytics
- `GET /analytics/overview` - Get overview stats
- `GET /analytics/ai-trends` - Get AI trends
- `GET /analytics/contributors` - Get contributor stats
- `POST /analytics/reports` - Generate report

### Notifications
- `GET /notifications` - List notifications
- `POST /notifications` - Mark notifications as read

### Webhooks
- `POST /webhooks/github` - GitHub webhook endpoint

## Database Schema

The database includes models for:
- Users
- Organizations & Members
- Repositories & Members
- Issues & Comments
- Pull Requests & Files
- Detections
- Rules & Executions
- Notifications
- Sync Jobs

See `prisma/schema.prisma` for the complete schema.

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Open Prisma Studio
npm run db:studio
```

## License

MIT
