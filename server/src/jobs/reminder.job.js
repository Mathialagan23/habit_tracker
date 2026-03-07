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
      const habits = await Habit.find({
        reminderTime: currentTime,
        reminderEnabled: true,
        isArchived: false,
      }).populate('userId', 'email name');

      for (const habit of habits) {
        if (!habit.userId?.email) continue;
        await emailService.sendReminder(habit.userId.email, habit.name);
      }

      if (habits.length > 0) {
        logger.info({ time: currentTime, count: habits.length }, 'Processed reminder batch');
      }
    } catch (err) {
      logger.error({ err }, 'Reminder job failed');
    }
  });

  logger.info('Reminder cron job started');
};

module.exports = { startReminderJob };
