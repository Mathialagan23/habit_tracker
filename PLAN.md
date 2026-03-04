# PLANNING MODE — UPGRADE PLAN

## STEP 1: Files That Must Change

### Backend — Models
- `server/src/models/Habit.js` — add category, difficulty fields
- `server/src/models/HabitLog.js` — no schema changes needed
- `server/src/utils/schemas.js` — update Zod schemas for category, difficulty, reminder, edit

### Backend — Services
- `server/src/services/stats.service.js` — add getMonthly(), getHeatmap(), getHabitScore()
- `server/src/services/habit.service.js` — no changes needed (edit/delete already exist)
- `server/src/services/log.service.js` — no changes needed
- `server/src/services/notification.service.js` — enhance reminder logic

### Backend — Controllers
- `server/src/controllers/stats.controller.js` — add monthly, heatmap, score endpoints

### Backend — Routes
- `server/src/routes/stats.routes.js` — register new endpoints

### Backend — Workers
- `server/src/workers/notification.worker.js` — enhance with per-user reminder scheduling
- `server/src/jobs/scheduler.js` — no changes needed (already runs every 15min)

### Frontend — Pages
- `client/src/pages/Dashboard.jsx` — integrate heatmap, monthly chart, edit/delete, categories, scores
- `client/src/pages/NewHabit.jsx` — add category/difficulty selectors
- `client/src/pages/Streaks.jsx` — enhance with difficulty badge and score

### Frontend — Components (new + modified)
- `client/src/components/HabitCard.jsx` — add edit/delete buttons, category badge, difficulty, animation
- `client/src/components/WeeklyChart.jsx` — no change
- NEW `client/src/components/MonthlyChart.jsx`
- NEW `client/src/components/HeatMap.jsx`
- NEW `client/src/components/EditHabitModal.jsx`
- `client/src/components/Navbar.jsx` — no change

### Frontend — API
- `client/src/api/index.js` — add monthly, heatmap, score API calls

### Frontend — CSS
- `client/src/App.css` — add styles for all new components

---

## STEP 2: Schema Updates (Backward Compatible)

### Habit Model — New Fields (all with defaults)
```
category:   String, enum ['fitness','learning','productivity','mindfulness','health','other'], default 'other'
difficulty: String, enum ['easy','medium','hard'], default 'medium'
reminderTime: String (HH:MM format), default null (no reminder)
```
All existing habits without these fields will use defaults — no migration needed.

### No changes to HabitLog or AnalyticsSnapshot schemas.

---

## STEP 3: New API Endpoints

| Method | Endpoint             | Purpose                     |
|--------|----------------------|-----------------------------|
| GET    | /api/stats/monthly   | Monthly day-by-day counts   |
| GET    | /api/stats/heatmap   | 365-day heatmap data        |
| GET    | /api/stats/score     | Per-habit weighted scores   |

Edit habit: already exists (PATCH /api/habits/:id)
Delete habit: already exists (DELETE /api/habits/:id)

---

## STEP 4: Reminder System Design

Current state: notification worker runs every 15 min, checks ALL users.
Enhancement: use the User.preferences.reminderTime + Habit.reminderTime to compare
against current time window. The worker already runs on cron — we just need to
filter habits where reminderTime falls in the current 15-min window.

No new queues needed. The existing notification worker + BullMQ cron is sufficient.

---

## STEP 5: Score System Design

Score = (completionRate * 40) + (streakBonus * 35) + (difficultyWeight * 25)

Where:
- completionRate = logs in last 30 days / expected completions (0-1 scaled to 100)
- streakBonus = min(currentStreak / 30, 1) * 100
- difficultyWeight = easy:60, medium:80, hard:100

Final score is 0-100.

---

## STEP 6: Performance Review

Potential issues and mitigations:
1. Heatmap (365 days of logs) — use MongoDB aggregation pipeline with $group by date, add index
2. Monthly chart — simple 30-day query, similar to existing weekly, low risk
3. Score calculation — computed on-the-fly per habit, can be cached
4. Streak worker already handles async updates — no change needed
5. Notification worker scans all users every 15min — acceptable at current scale

No Redis misuse. No unnecessary complexity. All additions follow existing patterns.

---

## IMPLEMENTATION ORDER

1. Backend: Habit model + Zod schema updates (category, difficulty, reminderTime)
2. Backend: Stats service (monthly, heatmap, score methods)
3. Backend: Stats controller + routes for new endpoints
4. Backend: Notification worker enhancement
5. Frontend: API layer additions
6. Frontend: EditHabitModal component
7. Frontend: HeatMap component
8. Frontend: MonthlyChart component
9. Frontend: HabitCard upgrades (edit, delete, category, difficulty, animation)
10. Frontend: Dashboard integration
11. Frontend: NewHabit page (category, difficulty, reminder)
12. Frontend: Streaks page enhancements
13. Frontend: CSS for all new components
