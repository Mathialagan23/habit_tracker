# Habit Tracker - Development Guide

A practical guide for developers working on the Habit Tracker application. Covers project setup, local development, and how to extend the codebase.

---

## 1. Project Overview

The Habit Tracker is a full-stack MERN application that lets users create daily habits, log completions, and track progress through streaks, scores, and visual analytics.

The system consists of three independently running processes:

- **API Server** - Express REST API serving the frontend and handling all business logic
- **Worker Process** - BullMQ background workers for streak calculations, analytics snapshots, and reminders
- **Frontend** - React single-page application built with Vite

Users register, create habits with configurable frequency/category/difficulty, mark habits complete each day, and view their progress on a dashboard with stats, heatmaps, charts, and habit scores.

---

## 2. Project Structure

```
project-root/
├── server/                         # Backend application
│   ├── src/
│   │   ├── config/                 # Environment, database, Redis, queue setup
│   │   │   ├── index.js            # Loads .env, exports all config
│   │   │   ├── database.js         # MongoDB connection via Mongoose
│   │   │   ├── redis.js            # Redis connection via ioredis
│   │   │   └── queues.js           # BullMQ queue definitions
│   │   ├── controllers/            # Request handlers (thin, delegate to services)
│   │   │   ├── auth.controller.js
│   │   │   ├── habit.controller.js
│   │   │   ├── log.controller.js
│   │   │   └── stats.controller.js
│   │   ├── routes/                 # Express route definitions with middleware
│   │   │   ├── auth.routes.js      # POST /api/auth/*
│   │   │   ├── habit.routes.js     # /api/habits/*
│   │   │   ├── log.routes.js       # /api/habits/:habitId/logs/*
│   │   │   └── stats.routes.js     # GET /api/stats/*
│   │   ├── services/               # Business logic (singleton classes)
│   │   │   ├── auth.service.js     # Registration, login, token rotation
│   │   │   ├── habit.service.js    # Habit CRUD, cache invalidation
│   │   │   ├── log.service.js      # Log creation, streak job dispatch
│   │   │   ├── stats.service.js    # Dashboard, streaks, heatmap, scores
│   │   │   ├── cache.service.js    # Redis get/set/del wrapper
│   │   │   └── notification.service.js  # Notification dispatch (stub)
│   │   ├── models/                 # Mongoose schema definitions
│   │   │   ├── User.js             # User accounts, password hashing, tokens
│   │   │   ├── Habit.js            # Habit definitions with category/difficulty
│   │   │   ├── HabitLog.js         # Daily completion entries
│   │   │   └── AnalyticsSnapshot.js # Pre-aggregated analytics (TTL)
│   │   ├── middleware/             # Express middleware functions
│   │   │   ├── authenticate.js     # JWT Bearer token verification
│   │   │   ├── validate.js         # Zod schema validation factory
│   │   │   ├── rateLimiter.js      # Per-user/IP rate limiting
│   │   │   ├── requestId.js        # X-Request-Id header injection
│   │   │   └── errorHandler.js     # Global error formatter
│   │   ├── workers/                # BullMQ worker processors
│   │   │   ├── index.js            # Worker process entry point
│   │   │   ├── streak.worker.js    # Streak recalculation
│   │   │   ├── analytics.worker.js # Daily snapshot generation
│   │   │   └── notification.worker.js  # Reminder time-window checks
│   │   ├── jobs/
│   │   │   └── scheduler.js        # Cron job registration
│   │   ├── utils/
│   │   │   ├── AppError.js         # Custom operational error class
│   │   │   ├── date.js             # UTC date normalization helpers
│   │   │   ├── logger.js           # Pino logger setup
│   │   │   └── schemas.js          # Zod validation schemas
│   │   ├── app.js                  # Express app setup (middleware, routes)
│   │   └── server.js               # Entry point (connects DB/Redis, starts listening)
│   ├── .env                        # Local environment variables
│   ├── .env.example                # Template with all required variables
│   └── package.json
│
├── client/                         # Frontend application
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js           # Axios instance with auth interceptors
│   │   │   └── index.js            # API endpoint definitions by domain
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Global sticky navigation bar
│   │   │   ├── ProtectedRoute.jsx  # Auth route guard
│   │   │   ├── HabitCard.jsx       # Habit card with toggle/edit/delete
│   │   │   ├── EditHabitModal.jsx  # Habit editing modal form
│   │   │   ├── WeeklyChart.jsx     # 7-day bar chart
│   │   │   ├── MonthlyChart.jsx    # 30-day intensity grid
│   │   │   └── HeatMap.jsx         # 365-day SVG activity heatmap
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main page: stats, charts, habit list
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Register.jsx        # Registration form
│   │   │   ├── NewHabit.jsx        # Create habit form
│   │   │   └── Streaks.jsx         # Streaks and scores view
│   │   ├── store/
│   │   │   └── authStore.js        # Zustand auth state management
│   │   ├── App.jsx                 # Router configuration and layout
│   │   ├── App.css                 # Application styles and design tokens
│   │   ├── index.css               # Base styles
│   │   └── main.jsx                # React root mount point
│   ├── vite.config.js
│   └── package.json
│
├── ARCHITECTURE.md                 # Technical architecture documentation
└── DEVELOPMENT_GUIDE.md            # This file
```

### Directory Responsibilities

| Directory | Purpose |
|---|---|
| `server/src/config/` | Environment variable loading, MongoDB connection, Redis connection, BullMQ queue definitions with retry policies |
| `server/src/controllers/` | Thin request handlers that extract params and delegate to services. Never contain business logic |
| `server/src/routes/` | Map URL paths to controller methods. Attach authentication, validation, and rate limiting middleware |
| `server/src/services/` | All business logic lives here. Singleton classes handling data access, caching, cache invalidation, and job dispatch |
| `server/src/models/` | Mongoose schemas with field validation, indexes, instance methods, pre-save hooks, and JSON transforms |
| `server/src/middleware/` | Reusable Express middleware for auth, validation, rate limiting, request tracing, and error handling |
| `server/src/workers/` | BullMQ processor functions that run in a separate Node.js process from the API server |
| `server/src/utils/` | Shared utilities: custom errors, date normalization, logging, Zod schemas |
| `client/src/api/` | Axios HTTP client with automatic token refresh and organized API endpoint functions |
| `client/src/components/` | Reusable React components (cards, charts, modals, navigation) |
| `client/src/pages/` | Top-level page components mapped to routes |
| `client/src/store/` | Zustand state management for authentication |

---

## 3. Prerequisites

Install the following before working on the project:

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 18 or higher | Runtime for both server and client |
| **npm** | 9+ (ships with Node 18) | Package manager |
| **MongoDB** | 7+ | Primary database |
| **Redis** | 7+ | Caching and job queue broker |
| **Git** | Any recent version | Version control |

### Installing Prerequisites

**Node.js** - Download from [nodejs.org](https://nodejs.org/) or use a version manager like nvm.

**MongoDB** - Options:
- Install locally: [mongodb.com/docs/manual/installation](https://www.mongodb.com/docs/manual/installation/)
- Use MongoDB Atlas (free tier) for a cloud instance
- Run via Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`

**Redis** - Options:
- Windows: Install via WSL2 or use [Memurai](https://www.memurai.com/) (Redis-compatible for Windows)
- macOS: `brew install redis && brew services start redis`
- Linux: `sudo apt install redis-server && sudo systemctl start redis`
- Docker: `docker run -d -p 6379:6379 --name redis redis:7`

---

## 4. Environment Variables

The backend reads configuration from `server/.env`. A template with defaults is provided in `server/.env.example`.

### Setup

```bash
cd server
cp .env.example .env
```

Then edit `server/.env` with your actual values.

### Variable Reference

#### Required

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb://localhost:27017/habit-tracker` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | (example value) | Secret key for signing access tokens. **Generate a unique value** |
| `JWT_REFRESH_SECRET` | (example value) | Secret key for signing refresh tokens. **Generate a unique value** |

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `127.0.0.1` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | (empty) | Redis password if required |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token expiry duration |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry duration |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Rate limit window in seconds |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window (general) |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `20` | Max requests per window (auth endpoints) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (Vite dev server) |
| `EMAIL_SERVICE` | (empty) | Email provider (future feature) |
| `EMAIL_API_KEY` | (empty) | Email API key (future feature) |
| `EMAIL_FROM` | (empty) | Sender email address (future feature) |

#### Frontend Environment

The client optionally reads one variable from a `client/.env` file:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |

This is typically not needed for local development since the default points to the standard backend port.

---

## 5. Running the Backend

### Install Dependencies

```bash
cd server
npm install
```

### Start the API Server

Development mode (auto-restart on file changes):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server starts on the port defined by `PORT` (default: 5000). On startup it:
1. Connects to MongoDB (exits with error if connection fails)
2. Connects to Redis (logs a warning and continues if connection fails)
3. Starts listening for HTTP requests

### Verify the Server

```bash
# Liveness check
curl http://localhost:5000/health
# Expected: {"status":"ok"}

# Readiness check (verifies MongoDB connection)
curl http://localhost:5000/ready
# Expected: {"ready":true}
```

### Start the Worker Process

The worker process runs separately from the API server. Open a second terminal:

Development mode:
```bash
cd server
npm run worker:dev
```

Production mode:
```bash
cd server
npm run worker
```

The worker process:
1. Connects to MongoDB and Redis
2. Starts three BullMQ workers (streak, analytics, notification)
3. Registers cron-based scheduled jobs
4. Logs "All workers started" when ready

Both the API server and workers must be running for full functionality. The API server works without workers, but streaks will not update and reminders will not fire.

---

## 6. Running the Frontend

### Install Dependencies

```bash
cd client
npm install
```

### Start the Development Server

```bash
npm run dev
```

Vite starts on `http://localhost:5173` by default. The React app communicates with the API server at `http://localhost:5000/api`.

### Build for Production

```bash
npm run build
```

Output goes to `client/dist/`. Preview the production build with:

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## 7. Database

### MongoDB Usage

MongoDB is the primary data store. The application connects via Mongoose and uses four collections:

| Collection | Model | Purpose |
|---|---|---|
| `users` | User | User accounts, hashed passwords, refresh tokens |
| `habits` | Habit | Habit definitions with category, difficulty, frequency, streaks |
| `habitlogs` | HabitLog | Individual daily completion entries |
| `analyticssnapshots` | AnalyticsSnapshot | Pre-aggregated daily/weekly/monthly analytics |

### Key Indexes

- `users.email` (unique) - Fast login lookups
- `habits.{userId, isArchived}` (compound) - Dashboard habit queries
- `habitlogs.{habitId, date}` (unique compound) - Prevents duplicate daily logs
- `habitlogs.{userId, date}` (compound) - User's daily completions
- `habitlogs.{habitId, date}` (descending) - Streak calculation
- `analyticssnapshots.createdAt` (TTL) - Auto-expires daily snapshots after 90 days

### Date Convention

All dates in the database are normalized to UTC midnight (00:00:00.000Z). This ensures consistent streak calculations and analytics across timezones. The `utils/date.js` module provides `normalizeDate()`, `todayUTC()`, and `daysBetween()` helpers for this purpose.

### Connecting to a Different Database

Change `MONGODB_URI` in `server/.env`:

```
# Local instance
MONGODB_URI=mongodb://localhost:27017/habit-tracker

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/habit-tracker

# Custom replica set
MONGODB_URI=mongodb://host1:27017,host2:27017/habit-tracker?replicaSet=rs0
```

---

## 8. Redis

### Why Redis Is Used

Redis serves two distinct roles:

1. **Caching** - Frequently accessed dashboard data, streaks, heatmaps, and scores are cached with TTL-based expiration (5-10 minutes). This avoids expensive MongoDB queries on every page load.

2. **Job Queue Broker** - BullMQ uses Redis to store job data, scheduling metadata, and processing state for background workers.

### Cache Keys

| Key Pattern | TTL | Description |
|---|---|---|
| `dashboard:{userId}` | 5 min | Today's completions, active habits, weekly rate |
| `streaks:{userId}` | 10 min | Current and best streaks per habit |
| `heatmap:{userId}` | 10 min | 365-day completion aggregation |
| `scores:{userId}` | 5 min | Weighted habit scores |

### Starting Redis Locally

```bash
# Linux/macOS
redis-server

# Docker
docker run -d -p 6379:6379 --name redis redis:7

# Verify it's running
redis-cli ping
# Expected: PONG
```

### Running Without Redis

Redis is optional for development. If Redis is unavailable:
- The API server logs a warning and starts normally
- Cache reads return `null`, so every request hits MongoDB directly
- Background workers will not process jobs (streaks will not auto-update)
- The application remains fully functional for basic usage, just slower

---

## 9. Background Workers

### Overview

BullMQ manages three worker processors that run in a dedicated Node.js process, separate from the API server.

| Worker | Queue | Trigger | What It Does |
|---|---|---|---|
| **Streak** | `streak-calc` | Log created or deleted | Recalculates `currentStreak` and `bestStreak` for the affected habit |
| **Analytics** | `analytics` | Cron: daily at midnight UTC | Aggregates previous day's data into AnalyticsSnapshot documents for all users |
| **Notification** | `notifications` | Cron: every 15 minutes | Checks for habits with reminders due in the current time window, finds incomplete habits, triggers notifications |

### How Jobs Are Dispatched

**Event-driven jobs** - When a habit log is created or deleted, `LogService` adds a `recalc` job to the `streak-calc` queue:
```
streakQueue.add('recalc', { habitId, userId })
```

**Scheduled jobs** - The `jobs/scheduler.js` module registers cron patterns at worker startup:
- `0 0 * * *` (midnight UTC) - daily analytics
- `*/15 * * * *` (every 15 min) - reminder checks

### Retry Policy

All queues retry failed jobs up to 3 times with exponential backoff starting at 2 seconds. Completed jobs are retained (last 1000) and failed jobs are retained (last 5000) for debugging.

### Monitoring

BullMQ stores all job state in Redis. You can inspect queues using:
- [Bull Board](https://github.com/felixmosh/bull-board) - Web UI for BullMQ
- `redis-cli` - Inspect keys directly with `KEYS bull:*`

---

## 10. Development Workflow

### Recommended Process

**1. Understand the existing code first**

Before making changes, read the relevant files. The codebase follows a consistent layered pattern:

```
Route → Middleware → Controller → Service → Model
```

Every feature follows this flow. Find the route, trace to the controller, then the service, then the model.

**2. Plan changes before coding**

Identify all files that need modification. For a typical feature, expect to touch:
- A Mongoose model (if new fields are needed)
- A Zod schema in `utils/schemas.js` (if validation changes)
- A service (business logic)
- A controller (request handling)
- A route file (endpoint definition)
- Frontend API definitions in `client/src/api/index.js`
- One or more React components or pages

**3. Implement incrementally**

Make one change at a time and verify it works before moving to the next:
- Backend model change → test with a direct MongoDB query
- New endpoint → test with `curl` or an API client
- Frontend integration → test in the browser

**4. Verify builds**

After making changes, check that both sides compile:

```bash
# Backend syntax check (loads all modules)
cd server && node -e "require('./src/app')"

# Frontend build
cd client && npm run build
```

**5. Test the full flow**

With all three processes running (API server, workers, frontend), walk through the user flow end to end:
- Register/login
- Create a habit
- Complete a habit (verify streak updates after worker processes)
- Check dashboard analytics

### Code Conventions

- **Services are singletons** - Each service file exports `new ServiceClass()`. Do not instantiate multiple times.
- **Controllers are thin** - Extract request data, call service, send response. No business logic.
- **All dates use UTC midnight** - Use `normalizeDate()` and `todayUTC()` from `utils/date.js`.
- **Errors use AppError** - Throw `new AppError(message, statusCode, code)` for operational errors.
- **Cache invalidation is explicit** - When data changes, invalidate all affected cache keys in the service layer.

---

## 11. Adding New Features

### Adding a New API Endpoint

Follow this order:

**Step 1: Model** (if needed)
- Add new fields to the relevant Mongoose schema in `server/src/models/`
- Use defaults for backward compatibility with existing data
- Add indexes if the field will be queried frequently

**Step 2: Validation**
- Add or update Zod schemas in `server/src/utils/schemas.js`
- Keep validation at the API boundary only

**Step 3: Service**
- Add the business logic method to the appropriate service in `server/src/services/`
- Handle caching: check cache first, compute on miss, store result
- Handle cache invalidation: clear stale keys when data changes

**Step 4: Controller**
- Add a handler function in the relevant controller in `server/src/controllers/`
- Extract params from `req.params`, `req.body`, `req.query`
- Call the service method, send the response
- Pass errors to `next(err)`

**Step 5: Route**
- Register the new endpoint in the appropriate route file in `server/src/routes/`
- Attach middleware: `authenticate` for protected routes, `validate(schema)` for request validation

**Step 6: Frontend API**
- Add the API call to the appropriate group in `client/src/api/index.js`

**Step 7: UI**
- Build or update React components in `client/src/components/` or `client/src/pages/`
- Add styles to `client/src/App.css`

### Adding a New Background Job

**Step 1:** Define a new queue in `server/src/config/queues.js`

**Step 2:** Create a worker file in `server/src/workers/` that exports a `createXWorker()` function

**Step 3:** Import and start the worker in `server/src/workers/index.js`

**Step 4:** If the job needs scheduling, add a cron entry in `server/src/jobs/scheduler.js`

**Step 5:** If the job is event-driven, dispatch it from the relevant service using `queue.add()`

### Adding a New Frontend Page

**Step 1:** Create the page component in `client/src/pages/`

**Step 2:** Add the route in `client/src/App.jsx` - wrap in `ProtectedRoute` if authentication is required

**Step 3:** Add a navigation link in `client/src/components/Navbar.jsx` if the page should appear in the main nav

---

## 12. Troubleshooting

### Redis Connection Errors

**Symptom:** `Redis connection failed - running without cache` warning at startup, or `ECONNREFUSED 127.0.0.1:6379` in logs.

**Cause:** Redis is not running or not reachable.

**Fix:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server                          # Linux/macOS foreground
sudo systemctl start redis            # Linux systemd
brew services start redis             # macOS Homebrew
docker start redis                    # Docker

# If using a remote Redis, verify host/port/password in .env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**Note:** The API server runs without Redis. Caching is disabled and background jobs will not process, but the core application works.

### MongoDB Connection Errors

**Symptom:** `MongoDB connection error` and the process exits with code 1.

**Cause:** MongoDB is not running or the connection string is incorrect.

**Fix:**
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand({ping:1})"

# Start MongoDB
sudo systemctl start mongod           # Linux systemd
brew services start mongodb-community # macOS Homebrew
docker start mongo                    # Docker

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/habit-tracker
```

Unlike Redis, MongoDB is required. The server will not start without it.

### Environment Variable Problems

**Symptom:** Server starts but authentication fails, tokens are rejected, or CORS errors appear.

**Common causes:**

| Issue | Check |
|---|---|
| Auth always fails | `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be consistent between server restarts. Changing them invalidates all existing tokens |
| CORS errors in browser | `CORS_ORIGIN` must match the frontend URL exactly (default: `http://localhost:5173`) |
| Token refresh fails | `JWT_REFRESH_SECRET` must match the secret used when the token was issued |
| Rate limiting too aggressive | Increase `RATE_LIMIT_MAX_REQUESTS` or `AUTH_RATE_LIMIT_MAX_REQUESTS` |

**Verify your env is loaded:**
```bash
cd server
node -e "const c = require('./src/config'); console.log(c.port, c.cors.origin)"
```

### Port Conflicts

**Symptom:** `EADDRINUSE: address already in use :::5000`

**Fix:**
```bash
# Find the process using the port
# Windows
netstat -ano | findstr :5000
# Linux/macOS
lsof -i :5000

# Kill it, or change PORT in .env
PORT=5001
```

If you change the backend port, update `VITE_API_URL` in the client or `CORS_ORIGIN` in the server accordingly.

### Workers Not Processing Jobs

**Symptom:** Habit streaks don't update after logging completions. Analytics snapshots are not generated.

**Cause:** The worker process is not running, or Redis is down.

**Fix:**
1. Verify Redis is running (workers require Redis)
2. Start the worker process: `cd server && npm run worker:dev`
3. Check worker logs for errors

### Frontend Build Fails

**Symptom:** `npm run build` in the client fails with compilation errors.

**Fix:**
```bash
cd client

# Clear cache and reinstall
rm -rf node_modules
npm install

# Try building again
npm run build
```

Check the error output for specific file and line numbers. Common issues are import typos, missing dependencies, or JSX syntax errors.
