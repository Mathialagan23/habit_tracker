const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { todayUTC, daysBetween } = require('../utils/date');
const logger = require('../utils/logger');

const createStreakWorker = () => {
  const worker = new Worker(
    'streak-calc',
    async (job) => {
      const { habitId } = job.data;

      const logs = await HabitLog.find({ habitId }).sort({ date: -1 }).lean();

      if (logs.length === 0) {
        await Habit.findByIdAndUpdate(habitId, { currentStreak: 0 });
        return { currentStreak: 0 };
      }

      const today = todayUTC();
      const mostRecent = new Date(logs[0].date);
      mostRecent.setUTCHours(0, 0, 0, 0);

      const diffFromToday = daysBetween(mostRecent, today);
      if (diffFromToday > 1) {
        await Habit.findByIdAndUpdate(habitId, { currentStreak: 0 });
        return { currentStreak: 0 };
      }

      let streak = 1;
      for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].date);
        const curr = new Date(logs[i].date);
        prev.setUTCHours(0, 0, 0, 0);
        curr.setUTCHours(0, 0, 0, 0);

        if (daysBetween(prev, curr) === 1) {
          streak++;
        } else {
          break;
        }
      }

      const habit = await Habit.findById(habitId);
      habit.currentStreak = streak;
      if (streak > habit.bestStreak) {
        habit.bestStreak = streak;
      }
      await habit.save();

      return { currentStreak: streak };
    },
    { connection: getRedisClient(), concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Streak job failed');
  });

  return worker;
};

module.exports = { createStreakWorker };
