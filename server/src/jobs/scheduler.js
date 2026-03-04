const { analyticsQueue, notificationQueue } = require('../config/queues');
const logger = require('../utils/logger');

const registerScheduledJobs = async () => {
  await analyticsQueue.upsertJobScheduler('daily-analytics', {
    pattern: '0 0 * * *',
  }, { data: {} });

  await notificationQueue.upsertJobScheduler('reminder-check', {
    pattern: '*/15 * * * *',
  }, { data: {} });

  logger.info('Scheduled jobs registered');
};

module.exports = { registerScheduledJobs };
