const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const User = require('../models/User');
const notificationService = require('../services/notification.service');
const { todayUTC } = require('../utils/date');
const logger = require('../utils/logger');

const getCurrentTimeWindow = () => {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minuteBlock = Math.floor(now.getUTCMinutes() / 15) * 15;
  const startMin = String(minuteBlock).padStart(2, '0');
  const endMin = String(minuteBlock + 14).padStart(2, '0');
  return { start: `${hours}:${startMin}`, end: `${hours}:${endMin}` };
};

const createNotificationWorker = () => {
  const worker = new Worker(
    'notifications',
    async () => {
      const { start, end } = getCurrentTimeWindow();
      const today = todayUTC();

      // Find habits with reminder in this window
      const habitsWithReminder = await Habit.find({
        isArchived: false,
        reminderTime: { $gte: start, $lte: end },
      }).lean();

      // Find users with global preference in this window
      const usersWithGlobal = await User.find({
        'preferences.reminderTime': { $gte: start, $lte: end },
      }).lean();

      // Merge user IDs
      const userIdSet = new Set();
      habitsWithReminder.forEach((h) => userIdSet.add(h.userId.toString()));
      usersWithGlobal.forEach((u) => userIdSet.add(u._id.toString()));

      let sentCount = 0;

      for (const userId of userIdSet) {
        const habits = await Habit.find({ userId, isArchived: false }).lean();
        const todayLogs = await HabitLog.find({ userId, date: today }).lean();
        const completedIds = new Set(todayLogs.map((l) => l.habitId.toString()));
        const incomplete = habits.filter((h) => !completedIds.has(h._id.toString()));

        if (incomplete.length > 0) {
          await notificationService.sendReminder(
            userId,
            incomplete.map((h) => h.name)
          );
          sentCount++;
        }
      }

      logger.info({ window: `${start}-${end}`, sentCount }, 'Reminder check completed');
    },
    { connection: getRedisClient(), concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed');
  });

  return worker;
};

module.exports = { createNotificationWorker };
