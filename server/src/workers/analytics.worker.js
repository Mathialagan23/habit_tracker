const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { normalizeDate } = require('../utils/date');
const logger = require('../utils/logger');

const createAnalyticsWorker = () => {
  const worker = new Worker(
    'analytics',
    async (job) => {
      const yesterday = normalizeDate(new Date(Date.now() - 86400000));

      const userIds = await Habit.distinct('userId', { isArchived: false });

      for (const userId of userIds) {
        const habits = await Habit.find({ userId, isArchived: false }).lean();
        const logs = await HabitLog.find({ userId, date: yesterday }).lean();

        const totalExpected = habits.length;
        const totalCompleted = logs.length;
        const completionRate = totalExpected > 0 ? totalCompleted / totalExpected : 0;

        const habitBreakdown = habits.map((h) => ({
          habitId: h._id,
          count: logs.filter((l) => l.habitId.toString() === h._id.toString()).length,
        }));

        await AnalyticsSnapshot.findOneAndUpdate(
          { userId, period: 'daily', periodStart: yesterday },
          { totalCompleted, completionRate, habitBreakdown },
          { upsert: true, new: true }
        );
      }

      logger.info({ date: yesterday }, 'Daily analytics completed');
    },
    { connection: getRedisClient(), concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Analytics job failed');
  });

  return worker;
};

module.exports = { createAnalyticsWorker };
