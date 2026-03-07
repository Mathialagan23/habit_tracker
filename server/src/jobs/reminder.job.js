const cron = require('node-cron');
const Habit = require('../models/Habit');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

const startReminderJob = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      // Single-reminder habits (legacy): match reminderTime
      const singleHabits = await Habit.find({
        reminderTime: currentTime,
        reminderEnabled: true,
        isArchived: false,
        $or: [{ schedule: { $exists: false } }, { schedule: { $size: 0 } }, { schedule: { $size: 1 } }],
      }).populate('userId', 'email name');

      // Multi-schedule habits: match any time in the schedule array
      const multiHabits = await Habit.find({
        isArchived: false,
        'schedule.1': { $exists: true }, // schedule has at least 2 items
        schedule: currentTime,
      }).populate('userId', 'email name');

      const allHabits = [...singleHabits, ...multiHabits];

      for (const habit of allHabits) {
        if (!habit.userId?.email) continue;
        await emailService.sendReminder(habit.userId.email, habit.name);
      }

      if (allHabits.length > 0) {
        logger.info({ time: currentTime, count: allHabits.length }, 'Processed reminder batch');
      }
    } catch (err) {
      logger.error({ err }, 'Reminder job failed');
    }
  });

  logger.info('Reminder cron job started');
};

module.exports = { startReminderJob };
