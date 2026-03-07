const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const { startReminderJob } = require('./jobs/reminder.job');
const { startWeeklyReportJob } = require('./jobs/weeklyReport.job');
const achievementService = require('./services/achievement.service');
const logger = require('./utils/logger');

const start = async () => {
  await connectDB();

  // Seed default achievements
  await achievementService.seed();

  startReminderJob();
  startWeeklyReportJob();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down server');
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error({ err }, 'Server startup failed');
  process.exit(1);
});
