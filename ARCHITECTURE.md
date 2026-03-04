# Habit Tracker - Technical Architecture

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Backend Structure](#4-backend-structure)
5. [Database Design](#5-database-design)
6. [Redis Usage](#6-redis-usage)
7. [Background Job System](#7-background-job-system)
8. [API Design](#8-api-design)
9. [Frontend Structure](#9-frontend-structure)
10. [Dashboard Features](#10-dashboard-features)
11. [Data Flow](#11-data-flow)
12. [Development Notes](#12-development-notes)
13. [Future Improvements](#13-future-improvements)

---

## 1. Project Overview

The Habit Tracker is a full-stack web application that helps users build and maintain daily habits. Users create habits with configurable frequencies, log completions each day, and track their progress through streaks, scores, and visual analytics.

Core capabilities:

- User registration and JWT-based authentication with refresh token rotation
- Habit creation with category, difficulty, color, and custom frequency scheduling
- Daily habit completion logging with duplicate prevention
- Automatic streak calculation via background workers
- Dashboard with stats, heatmap, weekly/monthly charts, and habit scores
- Per-habit reminder system with 15-minute time-window matching
- Pre-aggregated daily analytics snapshots for performance

The system is designed for 50K-500K users with 25K-500K daily log entries, targeting sub-200ms API latency for cached endpoints and 99.9% uptime.

---

## 2. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP framework |
| MongoDB | 7+ | Primary database |
| Mongoose | 8.0 | ODM / schema layer |
| Redis | 7+ | Caching and job queue broker |
| ioredis | 5.3 | Redis client |
| BullMQ | 5.1 | Background job queue system |
| JSON Web Tokens | 9.0 | Authentication |
| bcryptjs | 2.4 | Password hashing |
| Zod | 3.22 | Request validation |
| Pino | 8.17 | Structured logging |
| Helmet | 7.1 | Security headers |
| rate-limiter-flexible | 4.0 | Rate limiting |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI library |
| Vite | 7.3 | Build tool and dev server |
| React Router | 7.13 | Client-side routing |
| Zustand | 5.0 | State management |
| Axios | 1.13 | HTTP client with interceptors |
| react-hot-toast | 2.6 | Toast notifications |
| lucide-react | 0.577 | Icon library |

---

## 3. System Architecture

```
+-------------------+         +-------------------+         +-------------------+
|                   |  HTTPS  |                   |  TCP    |                   |
|   React SPA       +-------->+   Express API     +-------->+   MongoDB         |
|   (Vite)          |         |   Server          |         |   (Primary DB)    |
|                   |         |                   |         |                   |
+-------------------+         +--------+----------+         +-------------------+
                                       |
                                       | TCP
                                       v
                              +--------+----------+
                              |                   |
                              |   Redis           |
                              |   (Cache + Queue) |
                              |                   |
                              +--------+----------+
                                       ^
                                       | TCP
                              +--------+----------+
                              |                   |
                              |   BullMQ Workers  |
                              |   (Background)    |
                              |                   |
                              +-------------------+
```

### Layer Breakdown

**Frontend Layer** - React single-page application served by Vite in development and as static files in production. Communicates exclusively through the REST API. Manages auth state via Zustand store and handles automatic token refresh through Axios interceptors.

**API Layer** - Express server with layered middleware: request ID injection, CORS, Helmet security headers, JSON parsing, Morgan logging, rate limiting, JWT authentication, and Zod validation. Routes are organized by domain (auth, habits, logs, stats).

**Service Layer** - Business logic lives in singleton service classes. Controllers are thin wrappers that extract request parameters and delegate to services. Services handle data access, caching, cache invalidation, and job scheduling.

**Data Layer** - MongoDB via Mongoose with four collections: Users, Habits, HabitLogs, and AnalyticsSnapshots. Schemas enforce validation, indexes optimize queries, and compound unique indexes prevent duplicate entries.

**Cache Layer** - Redis stores serialized JSON with TTL-based expiration. The cache service provides get/set/del/delPattern operations with graceful degradation. If Redis is unavailable, the application falls back to direct database queries.

**Background Job System** - BullMQ manages three worker processes: streak calculation (triggered on log create/delete), daily analytics aggregation (midnight cron), and notification/reminder checks (every 15 minutes). Workers run in a separate process from the API server.

---

## 4. Backend Structure

```
server/
├── src/
│   ├── app.js                          # Express app configuration
│   ├── server.js                       # Server entry point and startup
│   ├── config/
│   │   ├── index.js                    # Environment config loader
│   │   ├── database.js                 # MongoDB connection
│   │   ├── redis.js                    # Redis connection
│   │   └── queues.js                   # BullMQ queue definitions
│   ├── controllers/
│   │   ├── auth.controller.js          # Auth request handlers
│   │   ├── habit.controller.js         # Habit CRUD handlers
│   │   ├── log.controller.js           # Habit log handlers
│   │   └── stats.controller.js         # Analytics/stats handlers
│   ├── routes/
│   │   ├── auth.routes.js              # POST /api/auth/*
│   │   ├── habit.routes.js             # /api/habits/*
│   │   ├── log.routes.js               # /api/habits/:habitId/logs/*
│   │   └── stats.routes.js             # GET /api/stats/*
│   ├── services/
│   │   ├── auth.service.js             # Registration, login, token rotation
│   │   ├── habit.service.js            # Habit CRUD with cache invalidation
│   │   ├── log.service.js              # Log creation with streak queue dispatch
│   │   ├── stats.service.js            # Dashboard, streaks, heatmap, scores
│   │   ├── cache.service.js            # Redis get/set/del wrapper
│   │   └── notification.service.js     # Notification dispatch (stub)
│   ├── models/
│   │   ├── index.js                    # Model barrel export
│   │   ├── User.js                     # User schema with password hashing
│   │   ├── Habit.js                    # Habit schema with category/difficulty
│   │   ├── HabitLog.js                 # Completion log with unique constraint
│   │   └── AnalyticsSnapshot.js        # Pre-aggregated analytics with TTL
│   ├── middleware/
│   │   ├── authenticate.js             # JWT Bearer token verification
│   │   ├── validate.js                 # Zod schema validation factory
│   │   ├── rateLimiter.js              # Per-user/IP rate limiting
│   │   ├── requestId.js                # X-Request-Id injection
│   │   └── errorHandler.js             # Global error handler
│   ├── workers/
│   │   ├── index.js                    # Worker process entry point
│   │   ├── streak.worker.js            # Streak recalculation (concurrency: 5)
│   │   ├── analytics.worker.js         # Daily snapshot generation
│   │   └── notification.worker.js      # Reminder time-window matching
│   ├── jobs/
│   │   └── scheduler.js                # Cron job registration
│   └── utils/
│       ├── AppError.js                 # Custom operational error class
│       ├── date.js                     # UTC date normalization utilities
│       ├── logger.js                   # Pino logger configuration
│       └── schemas.js                  # Zod validation schemas
├── .env
├── .env.example
└── package.json
```

### Module Responsibilities

**config/** - Loads environment variables, establishes MongoDB and Redis connections, and defines the four BullMQ queues (streak-calc, analytics, notifications, email-digest) with retry policies.

**controllers/** - Thin request handlers that extract parameters from `req.params`, `req.body`, and `req.query`, call the corresponding service method, and send the response. All errors are forwarded to the error handler via `next(err)`.

**routes/** - Define endpoint paths, attach middleware (authenticate, validate), and map to controller methods. Each route file is mounted on a base path in `app.js`.

**services/** - Contain all business logic. Each service is a singleton class instance. Services interact with Mongoose models for data access, the cache service for Redis operations, and BullMQ queues for background job dispatch.

**models/** - Mongoose schema definitions with field validation, indexes, instance methods, pre-save hooks, and JSON transforms. The models are the single source of truth for data structure.

**middleware/** - Reusable Express middleware functions. The `authenticate` middleware gates all protected routes. The `validate` middleware accepts a Zod schema and validates `req.body`. The `errorHandler` formats errors consistently and hides internal details in production.

**workers/** - BullMQ worker processors that run in a separate Node.js process. Each worker file exports a processor function. The `workers/index.js` entry point connects to MongoDB and Redis, instantiates workers, and registers scheduled cron jobs.

**utils/** - Shared utilities. `AppError` provides structured operational errors with HTTP status codes. `date.js` normalizes dates to UTC midnight for consistent streak and analytics calculations. `schemas.js` defines all Zod validation schemas used by the validate middleware.

---

## 5. Database Design

### Users Collection

Stores user accounts and authentication tokens.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `email` | String | required, unique, lowercase, indexed | Login identifier |
| `passwordHash` | String | required | bcrypt hash (excluded from JSON) |
| `name` | String | required, max 100 | Display name |
| `timezone` | String | default: 'UTC' | User timezone |
| `preferences.reminderTime` | String | default: '08:00' | Global reminder time (HH:MM) |
| `preferences.emailDigest` | Boolean | default: false | Weekly digest opt-in |
| `refreshTokens` | Array | max 5 entries | Hashed refresh tokens with expiry |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

Instance methods: `comparePassword(candidate)`, `addRefreshToken(token, expiresAt)`, `removeRefreshToken(token)`. Pre-save hook hashes password when modified. JSON transform removes `passwordHash`, `refreshTokens`, and `__v`.

### Habits Collection

Stores habit definitions owned by a user.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `userId` | ObjectId | required, ref: User, indexed | Owner |
| `name` | String | required, max 120 | Habit name |
| `description` | String | max 500, default: '' | Optional description |
| `color` | String | default: '#6366f1' | Hex color for UI display |
| `icon` | String | default: 'check' | Icon identifier |
| `frequency.type` | String | enum: daily/weekly/custom | Schedule type |
| `frequency.daysOfWeek` | [Number] | default: [0-6] | Active days (0=Sun) |
| `category` | String | enum: fitness/learning/productivity/mindfulness/health/other | Category tag |
| `difficulty` | String | enum: easy/medium/hard, default: medium | Difficulty level |
| `reminderTime` | String | HH:MM format or null | Per-habit reminder |
| `isArchived` | Boolean | default: false | Soft-delete flag |
| `currentStreak` | Number | min: 0, default: 0 | Current consecutive days |
| `bestStreak` | Number | min: 0, default: 0 | All-time best streak |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

Index: `{ userId: 1, isArchived: 1 }` (compound) for filtering active habits per user.

### HabitLogs Collection

Records individual habit completion entries. One log per habit per day.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `habitId` | ObjectId | required, ref: Habit | Which habit |
| `userId` | ObjectId | required, ref: User | Owner (denormalized) |
| `date` | Date | required | Completion date (UTC midnight) |
| `note` | String | max 500, default: '' | Optional note |
| `completedAt` | Date | default: Date.now | Actual completion time |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

Indexes:
- `{ habitId: 1, date: 1 }` (unique) - prevents duplicate daily logs
- `{ userId: 1, date: 1 }` - dashboard queries for a user on a date
- `{ habitId: 1, date: -1 }` - streak calculation (descending order)

### AnalyticsSnapshots Collection

Pre-aggregated analytics data computed by the daily background worker.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `userId` | ObjectId | required, ref: User | Owner |
| `period` | String | enum: daily/weekly/monthly | Aggregation granularity |
| `periodStart` | Date | required | Start of the period |
| `totalCompleted` | Number | default: 0 | Completions in period |
| `completionRate` | Number | 0-1, default: 0 | Rate as decimal |
| `habitBreakdown` | Array | [{habitId, count}] | Per-habit counts |
| `createdAt` / `updatedAt` | Date | auto | Timestamps |

Indexes:
- `{ userId: 1, period: 1, periodStart: -1 }` (compound) - query by user and period
- `{ createdAt: 1 }` (TTL) - daily snapshots auto-expire after 90 days

---

## 6. Redis Usage

Redis serves two purposes in the system: caching and background job queue brokering.

### Caching

The `CacheService` class provides a cache-aside pattern for expensive database queries. All cached values are stored as JSON strings with TTL-based expiration.

| Cache Key Pattern | TTL | Invalidated By | Content |
|---|---|---|---|
| `dashboard:{userId}` | 5 min | Habit create/update/delete, log create/delete | Today's completions, active habits, weekly rate |
| `streaks:{userId}` | 10 min | Log create/delete | Current and best streaks per habit |
| `heatmap:{userId}` | 10 min | Log create/delete | 365-day completion aggregation |
| `scores:{userId}` | 5 min | Log create/delete | Weighted habit scores |

When a user logs or removes a habit completion, the `LogService` invalidates all four cache keys for that user:

```
dashboard:{userId}, streaks:{userId}, heatmap:{userId}, scores:{userId}
```

When a habit is created, updated, or deleted, the `HabitService` invalidates `dashboard:{userId}`.

**Graceful degradation:** If Redis is unavailable, `CacheService.get()` returns `null` and `set()`/`del()` fail silently. Services fall back to direct database queries.

### Job Queue Broker

Redis backs all four BullMQ queues. Job data, state, and scheduling metadata are stored in Redis. Each queue uses the shared Redis connection configured in `config/redis.js`.

---

## 7. Background Job System

BullMQ manages asynchronous work through three worker processors. Workers run in a dedicated process (`npm run worker`) separate from the API server.

### Streak Worker

**Queue:** `streak-calc` | **Concurrency:** 5

Triggered when a habit log is created or deleted. Recalculates the habit's current and best streaks.

Process:
1. Fetch all logs for the habit sorted by date descending
2. Check if the most recent log is today or yesterday (otherwise streak = 0)
3. Walk backward through logs counting consecutive days
4. Update `Habit.currentStreak` and `Habit.bestStreak` (if exceeded)

### Analytics Worker

**Queue:** `analytics` | **Concurrency:** 1

Triggered daily at midnight UTC via cron: `0 0 * * *`

Process:
1. Query all distinct userIds with active habits
2. For each user: fetch habits and logs for the period
3. Calculate completion rate and per-habit breakdown
4. Upsert an `AnalyticsSnapshot` document

### Notification Worker

**Queue:** `notifications` | **Concurrency:** 1

Triggered every 15 minutes via cron: `*/15 * * * *`

Process:
1. Calculate the current 15-minute time window (e.g., 08:00-08:14)
2. Query habits where `reminderTime` falls in the current window
3. Query users with a global `preferences.reminderTime` in the window
4. Merge both sets of users
5. For each user, check which habits are incomplete today
6. Call `NotificationService.sendReminder()` for incomplete habits

### Job Configuration

All queues share the same retry policy:
- **Attempts:** 3
- **Backoff:** Exponential starting at 2000ms
- **Completed job retention:** Last 1000
- **Failed job retention:** Last 5000

### Scheduler

The `jobs/scheduler.js` module registers repeatable cron jobs at worker startup using BullMQ's `upsertJobScheduler()`. This ensures only one scheduled instance exists per job, even across restarts.

---

## 8. API Design

All API routes are prefixed with `/api`. Protected routes require a valid JWT access token in the `Authorization: Bearer <token>` header.

### Authentication Routes - `/api/auth`

Rate limited to 20 requests/minute per IP.

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/register` | No | `{ email, password, name }` | Create account, return tokens |
| POST | `/login` | No | `{ email, password }` | Authenticate, return tokens |
| POST | `/refresh` | No | `{ refreshToken }` | Rotate refresh token pair |
| POST | `/logout` | Yes | `{ refreshToken }` | Revoke refresh token |
| GET | `/me` | Yes | - | Get current user profile |

Response shape for register/login:
```json
{
  "data": {
    "user": { "id", "email", "name", "timezone", "preferences" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Habit Management Routes - `/api/habits`

| Method | Endpoint | Auth | Body/Query | Description |
|---|---|---|---|---|
| GET | `/` | Yes | `?archived=true` | List user's habits |
| GET | `/:id` | Yes | - | Get single habit |
| POST | `/` | Yes | `{ name, description, color, frequency, category, difficulty, reminderTime }` | Create habit |
| PATCH | `/:id` | Yes | Partial habit fields | Update habit |
| DELETE | `/:id` | Yes | - | Permanently delete habit |

### Habit Log Routes - `/api/habits/:habitId/logs`

| Method | Endpoint | Auth | Body/Query | Description |
|---|---|---|---|---|
| POST | `/:habitId/logs` | Yes | `{ date?, note? }` | Log completion (idempotent per day) |
| GET | `/:habitId/logs` | Yes | `?from=&to=` | Query logs with date range |
| DELETE | `/:habitId/logs/:logId` | Yes | - | Remove log entry |

### Statistics Routes - `/api/stats`

| Method | Endpoint | Auth | Description | Cache TTL |
|---|---|---|---|---|
| GET | `/dashboard` | Yes | Today's progress, weekly rate, habit status | 5 min |
| GET | `/streaks` | Yes | Current/best streaks per habit | 10 min |
| GET | `/weekly` | Yes | 7-day completion breakdown | None |
| GET | `/monthly` | Yes | 30-day breakdown with consistency score | None |
| GET | `/heatmap` | Yes | 365-day aggregation for heatmap | 10 min |
| GET | `/scores` | Yes | Weighted habit scores | 5 min |

### Health Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness check: returns `{ status: 'ok' }` |
| GET | `/ready` | Readiness check: verifies MongoDB connection |

### Error Response Format

```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "Habit not found"
  }
}
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` / `INVALID_REFRESH` / `TOKEN_REUSE` (401), `NOT_FOUND` / `HABIT_NOT_FOUND` / `LOG_NOT_FOUND` (404), `EMAIL_EXISTS` (409), `RATE_LIMIT_EXCEEDED` (429), `INTERNAL_ERROR` (500).

---

## 9. Frontend Structure

```
client/src/
├── api/
│   ├── client.js                  # Axios instance with auth interceptors
│   └── index.js                   # API endpoint definitions
├── components/
│   ├── EditHabitModal.jsx         # Modal form for editing habits
│   ├── HabitCard.jsx              # Individual habit card with actions
│   ├── HeatMap.jsx                # GitHub-style SVG heatmap (365 days)
│   ├── MonthlyChart.jsx           # 30-day grid with intensity coloring
│   ├── Navbar.jsx                 # Global sticky navigation bar
│   ├── ProtectedRoute.jsx         # Auth route guard
│   └── WeeklyChart.jsx            # 7-day bar chart
├── pages/
│   ├── Dashboard.jsx              # Main page: stats, charts, habit list
│   ├── Login.jsx                  # Login form
│   ├── Register.jsx               # Registration form
│   ├── NewHabit.jsx               # Create habit form
│   └── Streaks.jsx                # Streaks and scores view
├── store/
│   └── authStore.js               # Zustand auth state
├── App.jsx                        # Router and layout
├── App.css                        # Complete application styles
├── index.css                      # Minimal base styles
└── main.jsx                       # React root mount
```

### Routing

| Path | Component | Auth Required | Layout |
|---|---|---|---|
| `/login` | Login | No | None |
| `/register` | Register | No | None |
| `/` | Dashboard | Yes | Navbar + main-content |
| `/habits/new` | NewHabit | Yes | Navbar + main-content |
| `/streaks` | Streaks | Yes | Navbar + main-content |
| `*` | Redirect to `/` | - | - |

Protected routes are wrapped in `ProtectedRoute` which checks `isAuthenticated` from the auth store and redirects to `/login` if unauthenticated.

### API Layer

**client.js** configures an Axios instance pointing at `VITE_API_URL` (default: `http://localhost:5000/api`). A request interceptor attaches the Bearer token from localStorage. A response interceptor handles 401 errors by:

1. Queueing the failed request
2. Attempting a token refresh via `/auth/refresh`
3. Retrying all queued requests with the new token
4. Logging out and redirecting to `/login` if refresh fails

**index.js** organizes all endpoints into four groups: `authApi`, `habitsApi`, `logsApi`, and `statsApi`. Each method returns an Axios promise.

### State Management

Zustand store (`authStore.js`) manages:

| State | Type | Description |
|---|---|---|
| `user` | Object or null | Current user data |
| `isAuthenticated` | Boolean | Auth status |
| `isLoading` | Boolean | Initialization status |

Actions: `initialize()` (check stored token on app mount), `login(email, password)`, `register(name, email, password)`, `logout()`.

### Component Descriptions

**Navbar** - Sticky top bar with brand logo, navigation links (Dashboard, Streaks), user display name, and logout button. Uses React Router's `NavLink` for active state styling.

**HabitCard** - Displays a single habit with colored left border, name, description, category badge, difficulty badge, streak count, and a completion toggle button. Edit and delete action buttons appear on hover. Completion triggers a CSS pop animation.

**EditHabitModal** - Full-screen modal overlay with a form for editing habit name, description, color (6-swatch picker), category, difficulty, reminder time, and frequency with day-of-week picker.

**HeatMap** - SVG-based 365-day activity visualization. Cells are colored in 5 intensity levels based on daily completion count relative to the maximum. Displays month labels, day-of-week labels, and a legend.

**WeeklyChart** - Vertical bar chart showing 7 days of completion counts. Bar height scales to the maximum count. Each bar shows the day abbreviation and count label.

**MonthlyChart** - 7-column grid of 30 days with intensity coloring (5 levels). Header shows completion rate and consistency score. Current day is highlighted with a border.

**ProtectedRoute** - Renders children if authenticated, shows loading text during initialization, redirects to login otherwise.

### Design System

CSS custom properties define the visual language:

```css
--primary: #6366f1        /* Indigo - actions and active states */
--primary-hover: #4f46e5  /* Darker indigo for hover */
--bg: #f8fafc             /* Page background */
--surface: #ffffff        /* Card surfaces */
--text: #1e293b           /* Primary text */
--text-muted: #64748b     /* Secondary text */
--border: #e2e8f0         /* Borders and dividers */
--success: #10b981        /* Completion, easy difficulty */
--danger: #f43f5e         /* Deletion, hard difficulty */
--radius: 10px            /* Border radius */
```

Single responsive breakpoint at 640px converts multi-column grids to stacked layouts.

---

## 10. Dashboard Features

The Dashboard (`pages/Dashboard.jsx`) is the primary interface. It fetches five API endpoints in parallel on mount and re-fetches after every user action (toggle, edit, delete).

### Section Navigation

A sticky sub-navigation bar sits below the global navbar with three buttons: **Dashboard**, **Analytics**, and **Habits**. Each button scrolls to its corresponding section using `scrollIntoView({ behavior: 'smooth' })`.

### Scroll Spy

An `IntersectionObserver` watches all three section elements. When sections enter the viewport, they are tracked in a `Map` with their `boundingClientRect.top` values. The section closest to the top of the viewport is set as the active section, highlighting the corresponding nav button with a primary-color background.

Observer config: `rootMargin: '-80px 0px -30% 0px'`, `threshold: [0, 0.25]`.

### Stats Row

Four stat cards displaying:
- Done Today (completed count)
- Active Habits (total active)
- Weekly Rate (7-day completion percentage)
- Consistency (30-day consistency score)

### Heatmap

GitHub-style SVG heatmap showing 365 days of activity. Data comes from `/api/stats/heatmap` which uses a MongoDB aggregation pipeline to group logs by date and count completions.

### Charts Row

Two side-by-side charts:
- **Weekly Chart** - Bar chart with 7 days of completion counts
- **Monthly Chart** - 30-day calendar grid with intensity coloring

### Habit Scores

Score cards for each habit showing a weighted score calculated as:
```
score = (completionRate * 40) + (streakBonus * 35) + (difficultyWeight * 25)
```
Difficulty weights: easy = 60, medium = 80, hard = 100. Streak bonus caps at `Math.min(currentStreak, 30) / 30 * 100`.

### Habit List

Cards for each active habit with:
- Completion toggle (creates a log entry)
- Category and difficulty badges
- Current streak display
- Edit button (opens EditHabitModal)
- Delete button (with confirmation dialog)
- Completion animation (CSS keyframe pop effect)

---

## 11. Data Flow

### Authentication Flow

```
User submits login form
  → authStore.login(email, password)
    → POST /api/auth/login
      → authService.login(): verify credentials, generate tokens
    ← { user, accessToken, refreshToken }
  → Store tokens in localStorage
  → Set user state, isAuthenticated = true
  → Navigate to Dashboard
```

Token refresh is handled transparently by the Axios response interceptor when any API call returns 401.

### Habit Completion Flow

```
User clicks toggle on HabitCard
  → Dashboard.handleToggle(habitId)
    → POST /api/habits/:habitId/logs
      → logService.create()
        → Verify habit exists and user owns it
        → Upsert HabitLog (unique per habit + date)
        → Queue streak-calc job to BullMQ
        → Invalidate caches: dashboard, streaks, heatmap, scores
      ← HabitLog
    → Dashboard.fetchData() re-fetches all 5 endpoints
    → UI updates with new data

[Async - Worker Process]
  streak-calc queue processes job:
    → Fetch all logs for habit (desc by date)
    → Calculate current streak (consecutive days)
    → Update Habit.currentStreak and Habit.bestStreak
```

### Dashboard Load Flow

```
Dashboard mounts
  → fetchData() calls 5 endpoints in parallel:
    → GET /api/stats/dashboard    (cached 5 min)
    → GET /api/stats/weekly
    → GET /api/stats/monthly
    → GET /api/stats/heatmap      (cached 10 min)
    → GET /api/stats/scores       (cached 5 min)
  ← Set state for: dashboard, weekly, monthly, heatmap, scores
  → Render stats row, heatmap, charts, scores, habit list
  → IntersectionObserver activates scroll spy
```

### Background Job Flow

```
midnight UTC:
  → scheduler triggers daily-analytics job
    → analytics worker processes all users
      → Aggregate yesterday's logs
      → Upsert AnalyticsSnapshot documents

every 15 minutes:
  → scheduler triggers reminder-check job
    → notification worker checks time window
      → Query habits with matching reminderTime
      → Check incomplete habits for today
      → Send reminders via NotificationService
```

---

## 12. Development Notes

### Prerequisites

- Node.js 18 or higher
- MongoDB 7+ (running locally or connection string)
- Redis 7+ (running locally or connection string)

### Environment Variables

Create a `.env` file in the `server/` directory based on `.env.example`:

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/habit-tracker
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_ACCESS_SECRET=<generate-a-secure-random-string>
JWT_REFRESH_SECRET=<generate-a-different-secure-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_SEC=60
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=20
CORS_ORIGIN=http://localhost:5173
```

Create a `.env` file in the `client/` directory (optional):

```
VITE_API_URL=http://localhost:5000/api
```

### Starting the Backend

```bash
cd server
npm install
npm run dev        # Starts API server with nodemon (port 5000)
npm run worker     # Starts BullMQ workers (separate terminal)
```

### Starting the Frontend

```bash
cd client
npm install
npm run dev        # Starts Vite dev server (port 5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

### Running Order

1. Start MongoDB and Redis
2. Start the API server (`npm run dev` in server/)
3. Start the worker process (`npm run worker` in server/)
4. Start the frontend (`npm run dev` in client/)

### Key Development Notes

- All dates are normalized to UTC midnight for consistency across timezones
- The API server and workers share the same codebase but run as separate processes
- Redis is optional for development; the app degrades gracefully without it (no caching, no background jobs)
- The notification service is a stub; `sendReminder()` logs to console but does not send actual notifications
- Refresh tokens are hashed with SHA-256 before storage; a maximum of 5 are kept per user
- Token reuse detection: if a spent refresh token is used, all tokens for that user are revoked

---

## 13. Future Improvements

### Habit Categories

Categories are implemented in the schema (`fitness`, `learning`, `productivity`, `mindfulness`, `health`, `other`) and displayed as badges. Future work:

- Dashboard filtering by category
- Category-based analytics and comparison charts
- Custom user-defined categories

### Habit Difficulty

Difficulty levels (`easy`, `medium`, `hard`) are stored and displayed. Future work:

- Difficulty-weighted daily goals
- Adaptive difficulty suggestions based on completion history
- Difficulty distribution analytics

### Habit Score System

Scoring formula is implemented: `(completionRate * 40) + (streakBonus * 35) + (difficultyWeight * 25)`. Future work:

- Historical score tracking over time
- Leaderboard or social comparison features
- Score-based achievements and badges
- Score trend charts

### Reminder System

Per-habit and global reminders are implemented with 15-minute time-window matching in the notification worker. Future work:

- Push notification integration (FCM/APNs)
- Email reminders via SendGrid or SES
- SMS notifications via Twilio
- Timezone-aware reminder scheduling
- Snooze and custom repeat patterns

### Advanced Analytics

Current analytics include dashboard stats, weekly/monthly charts, heatmap, and scores. Future work:

- Habit correlation analysis (which habits tend to be completed together)
- Time-of-day completion patterns
- Weekly and monthly trend comparisons
- Exportable reports (PDF/CSV)
- Predictive streak-break warnings

### Additional Improvements

- Dark mode theme toggle
- Habit templates and presets
- Habit groups and tagging
- Data import/export
- Progressive Web App (PWA) with offline support
- WebSocket-based real-time updates
- Integration with calendar apps (Google Calendar, Apple Calendar)
- Multi-device sync indicators
- Accessibility improvements (ARIA labels, keyboard navigation)
- End-to-end and integration test suites
