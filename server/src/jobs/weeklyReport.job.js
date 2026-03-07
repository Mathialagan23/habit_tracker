const cron = require('node-cron');
const User = require('../models/User');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

const startWeeklyReportJob = () => {
  // Every Sunday at 9 AM
  cron.schedule('0 9 * * 0', async () => {
    logger.info('Starting weekly report job');

    try {
      const users = await User.find().select('email name').lean();
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      for (const user of users) {
        try {
          const [logs, habits] = await Promise.all([
            HabitLog.find({
              userId: user._id,
              date: { $gte: weekAgo, $lte: now },
            }).lean(),
            Habit.find({ userId: user._id, isArchived: false })
              .select('name bestStreak currentStreak')
              .lean(),
          ]);

          if (habits.length === 0) continue;

          const habitsCompleted = logs.length;
          const bestStreak = Math.max(0, ...habits.map((h) => h.currentStreak || 0));
          const topHabit = findTopHabit(logs, habits);

          await emailService.sendWeeklyReport(user.email, user.name, {
            habitsCompleted,
            bestStreak,
            topHabit,
            totalHabits: habits.length,
          });
        } catch (err) {
          logger.error({ err, userId: user._id }, 'Failed to send weekly report to user');
        }
      }

      logger.info('Weekly report job completed');
    } catch (err) {
      logger.error({ err }, 'Weekly report job failed');
    }
  });

  logger.info('Weekly report cron job scheduled (Sunday 9 AM)');
};

function findTopHabit(logs, habits) {
  if (logs.length === 0) return 'None';

  const counts = {};
  for (const log of logs) {
    const id = log.habitId.toString();
    counts[id] = (counts[id] || 0) + 1;
  }

  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const habit = habits.find((h) => h._id.toString() === topId);
  return habit?.name || 'Unknown';
}

module.exports = { startWeeklyReportJob };
