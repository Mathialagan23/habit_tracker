const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const { startReminderJob } = require('./jobs/reminder.job');
const logger = require('./utils/logger');

const start = async () => {
  await connectDB();

  startReminderJob();

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
