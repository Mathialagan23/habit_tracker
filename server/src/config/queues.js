const { Queue } = require('bullmq');
const { getRedisClient } = require('./redis');

const defaultJobOpts = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

const createQueue = (name) =>
  new Queue(name, {
    connection: getRedisClient(),
    defaultJobOptions: defaultJobOpts,
  });

const streakQueue = createQueue('streak-calc');
const analyticsQueue = createQueue('analytics');
const notificationQueue = createQueue('notifications');
const emailDigestQueue = createQueue('email-digest');

module.exports = { streakQueue, analyticsQueue, notificationQueue, emailDigestQueue };
