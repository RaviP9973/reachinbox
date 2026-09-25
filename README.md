# ReachInbox — Email Scheduler

A production-grade email scheduling service with a React dashboard, built with **BullMQ + Redis** for persistent job scheduling and **Ethereal Email** for fake SMTP testing.

> Built as an assignment for ReachInbox / Outbox Labs.

---

## 🏗️ Architecture

```
┌─────────────────────┐     REST API     ┌──────────────────────────┐
│                     │ ◀──────────────▶ │                          │
│  Next.js 16 (:3000) │                  │  Express.js API (:4000)  │
│  + NextAuth (OAuth)  │                  │  + BullMQ Worker         │
│  + Tailwind CSS 4    │                  │  + Prisma ORM            │
│                     │                  │                          │
└─────────────────────┘                  └──────┬──────┬────────────┘
                                                │      │
                                         ┌──────▼──┐ ┌─▼──────────┐
                                         │ Redis 7 │ │ PostgreSQL │
                                         │ (:6379) │ │   (:5432)  │
                                         └─────────┘ └────────────┘
                                                         │
                                                  ┌──────▼──────┐
                                                  │  Ethereal   │
                                                  │    SMTP     │
                                                  └─────────────┘
```

## ✅ Features

- **Email Scheduling**: Schedule emails via API with BullMQ delayed jobs (no cron)
- **Persistent Queue**: Jobs survive server restarts via Redis persistence
- **Idempotency**: Job IDs = email IDs → no duplicate sends
- **Per-Sender Rate Limiting**: Redis Lua script atomically enforces hourly limits
- **Configurable Concurrency**: BullMQ worker processes N jobs in parallel
- **Minimum Send Delay**: 2-second gap between individual sends (configurable)
- **CSV Upload**: Parse email leads from CSV/text files
- **Google OAuth**: Real Google login via NextAuth.js
- **Ethereal SMTP**: All emails sent via Ethereal with preview URLs
- **Real-time Dashboard**: Auto-refreshing scheduled/sent email views

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker Desktop** (for Redis + PostgreSQL)
- **Google OAuth Credentials** (see below)

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port `5432`
- Redis 7 on port `6379`

### 2. Setup Backend

```bash
cd server
npm install
cp .env .env.local  # Edit if needed

# Run database migration
npx prisma migrate dev --name init

# Start the server
npm run dev
```

The backend starts at `http://localhost:4000`.

### 3. Setup Frontend

```bash
# From root directory
npm install

# Configure Google OAuth (see section below)
# Edit .env.local with your credentials

npm run dev
```

The frontend starts at `http://localhost:3000`.

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **APIs & Services** → **Credentials**
3. Create an **OAuth 2.0 Client ID** (Web Application)
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_SECRET=any-random-string-for-session-encryption
```

---

## 📁 Project Structure

```
├── docker-compose.yml          # Redis + PostgreSQL
├── .env.local                  # Frontend env (Google OAuth)
├── auth.ts                     # NextAuth configuration
├── middleware.ts                # Route protection
├── app/                        # Next.js 16 App Router
│   ├── page.tsx               # Login page
│   ├── dashboard/page.tsx     # Main dashboard
│   └── api/auth/[...nextauth] # OAuth handler
├── components/                 # React components
│   ├── ui/                    # Reusable primitives
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── ComposeEmail.tsx       # Email compose form
│   ├── ScheduledEmails.tsx    # Scheduled tab
│   └── SentEmails.tsx         # Sent tab
├── lib/api.ts                  # API client
├── types/index.ts              # Shared TypeScript types
│
└── server/                     # Express.js backend
    ├── prisma/schema.prisma   # Database schema
    └── src/
        ├── index.ts           # Server entry
        ├── config/env.ts      # Environment config
        ├── lib/
        │   ├── prisma.ts      # DB client
        │   ├── redis.ts       # Redis client
        │   ├── queue.ts       # BullMQ queue
        │   └── mailer.ts      # Ethereal SMTP
        ├── routes/
        │   ├── auth.routes.ts # Google auth
        │   └── email.routes.ts# Schedule + list emails
        ├── services/
        │   ├── email.service.ts      # Scheduling logic
        │   └── rateLimit.service.ts  # Rate limiter
        ├── workers/
        │   └── email.worker.ts       # BullMQ worker
        ├── middleware/
        │   └── auth.middleware.ts     # JWT middleware
        └── types/index.ts
```

---

## ⚙️ Configuration

All values are configurable via environment variables (`server/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `WORKER_CONCURRENCY` | `5` | Number of parallel BullMQ workers |
| `MIN_DELAY_BETWEEN_SENDS_MS` | `2000` | Minimum 2s gap between sends |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Per-sender hourly rate limit |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `ETHEREAL_EMAIL` | `auto` | Ethereal credentials (auto-generates) |

---

## 📧 Scheduling & Rate Limiting

### How Scheduling Works

1. **API receives request** with recipients (CSV or direct), subject, body, scheduled time
2. **Email records** are created in PostgreSQL with `SCHEDULED` status
3. **BullMQ delayed jobs** are enqueued with `delay = scheduledAt - now`
4. **Job ID = Email ID** — prevents duplicate enqueuing (idempotency)
5. On server restart, BullMQ automatically resumes delayed jobs from Redis

### Minimum Delay Between Sends

The BullMQ worker is configured with a rate limiter:
```typescript
limiter: { max: 1, duration: 2000 } // 1 job per 2 seconds
```
This ensures a **minimum 2-second gap** between individual email sends, mimicking real SMTP provider throttling. This is configurable via `MIN_DELAY_BETWEEN_SENDS_MS`.

### Per-Sender Hourly Rate Limiting

Rate limiting uses **Redis atomic counters via Lua scripts** for safety across concurrent workers:

```
Key:    ratelimit:{senderEmail}:{hourBucket}
TTL:    3600 seconds (1 hour)
Script: Atomically INCR + check against limit
```

**When the hourly limit is reached:**
- The job is **NOT dropped or permanently failed**
- It is **rescheduled** to the start of the next hour window via `job.moveToDelayed()`
- Order is preserved as much as possible

**Pre-staggering:** When scheduling a large batch, delays are pre-calculated:
- First N emails (N = hourly limit) → scheduled at `startTime + (i × delay)`
- Next N emails → pushed to `startTime + 1 hour + (i × delay)`
- This avoids overwhelming the rate limiter at processing time

### Behavior Under Load (1000+ emails)

When 1000+ emails are scheduled for the same time:
1. **Pre-staggering** distributes them across hour windows at scheduling time
2. **Worker concurrency** (default: 5) processes jobs in parallel
3. **BullMQ rate limiter** enforces the 2-second minimum gap
4. **Redis rate limiter** enforces the per-sender hourly cap
5. Any overflow is **automatically rescheduled** to the next available window

### Why NOT Cron

- **No `node-cron`, `agenda`, or OS cron** is used
- All scheduling is done via **BullMQ delayed jobs** stored in Redis
- Jobs are persisted in Redis sorted sets and survive restarts
- The BullMQ scheduler is built into the library (no external `QueueScheduler` needed since v2.0+)

---

## 🔄 Restart Resilience

BullMQ stores all delayed jobs in Redis (with AOF persistence enabled in Docker).

**After a restart:**
- ✅ Future scheduled emails still send at the correct time
- ✅ No emails are re-sent (idempotency via `jobId = emailId`)
- ✅ No emails are lost (Redis persists the queue state)
- ✅ Worker reconnects and resumes processing automatically

---

## 🎨 Frontend Design

The frontend closely follows the provided Figma design:
- **Light theme** with white background
- **Sidebar** with logo, user profile, Compose button, Scheduled/Sent navigation
- **Email list** with recipient, status badge, subject preview
- **Compose page** with From, To (+ Upload List), Subject, Delay, Hourly Limit, Body
- **Send Later** picker with quick options and custom date/time
- **Google OAuth** login with real authentication

---

## 🧪 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/google` | No | Exchange Google ID token for JWT |
| POST | `/api/emails/schedule` | JWT | Schedule email batch (multipart) |
| GET | `/api/emails?status=scheduled` | JWT | List scheduled emails |
| GET | `/api/emails?status=sent` | JWT | List sent emails |
| GET | `/api/emails/stats` | JWT | Get email statistics |
| GET | `/api/health` | No | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Auth | NextAuth.js (Google OAuth) |
| Backend | Express.js, TypeScript |
| Queue | BullMQ (Redis-backed) |
| Database | PostgreSQL 16 (Prisma ORM) |
| SMTP | Ethereal Email (Nodemailer) |
| Infra | Docker Compose |

---

## License

MIT
