const HabitLog = require('../models/HabitLog');
const Habit = require('../models/Habit');
const streakService = require('./streak.service');
const xpService = require('./xp.service');
const achievementService = require('./achievement.service');
const cacheService = require('./cache.service');
const { normalizeDate, todayUTC } = require('../utils/date');
const AppError = require('../utils/AppError');

class LogService {
  async create(habitId, userId, { date, note } = {}) {
    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) throw new AppError('Habit not found', 404, 'HABIT_NOT_FOUND');

    const logDate = date ? normalizeDate(date) : todayUTC();

    const log = await HabitLog.findOneAndUpdate(
      { habitId, date: logDate },
      { habitId, userId, date: logDate, note: note || '', completedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const { currentStreak } = await streakService.recalculate(habitId);

    // XP: +10 for completion, +5 bonus if streak >= 3
    let xpEarned = 10;
    if (currentStreak >= 3) xpEarned += 5;
    await xpService.addXP(userId, xpEarned);

    // Check achievements
    await achievementService.checkAchievements(userId);

    await Promise.all([
      cacheService.del(`dashboard:${userId}`),
      cacheService.del(`streaks:${userId}`),
      cacheService.del(`heatmap:${userId}`),
      cacheService.del(`scores:${userId}`),
    ]);

    return log;
  }

  async remove(logId, userId) {
    const log = await HabitLog.findOne({ _id: logId, userId });
    if (!log) throw new AppError('Log not found', 404, 'LOG_NOT_FOUND');

    await HabitLog.deleteOne({ _id: logId });

    await streakService.recalculate(log.habitId);

    await Promise.all([
      cacheService.del(`dashboard:${userId}`),
      cacheService.del(`streaks:${userId}`),
      cacheService.del(`heatmap:${userId}`),
      cacheService.del(`scores:${userId}`),
    ]);

    return { deleted: true };
  }

  async getByHabit(habitId, userId, { from, to } = {}) {
    const filter = { habitId, userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = normalizeDate(from);
      if (to) filter.date.$lte = normalizeDate(to);
    }
    return HabitLog.find(filter).sort({ date: -1 });
  }

  async getByDate(userId, date) {
    return HabitLog.find({ userId, date: normalizeDate(date) });
  }
}

module.exports = new LogService();
