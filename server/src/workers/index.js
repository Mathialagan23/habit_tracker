const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { connectRedis } = require('../config/redis');
const { createStreakWorker } = require('./streak.worker');
const { createAnalyticsWorker } = require('./analytics.worker');
const { createNotificationWorker } = require('./notification.worker');
const { registerScheduledJobs } = require('../jobs/scheduler');
const logger = require('../utils/logger');

const start = async () => {
  await connectDB();
  await connectRedis();

  const streakWorker = createStreakWorker();
  const analyticsWorker = createAnalyticsWorker();
  const notificationWorker = createNotificationWorker();

  await registerScheduledJobs();

  logger.info('All workers started');

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down workers');
    await Promise.all([
      streakWorker.close(),
      analyticsWorker.close(),
      notificationWorker.close(),
    ]);
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error({ err }, 'Worker startup failed');
  process.exit(1);
});
