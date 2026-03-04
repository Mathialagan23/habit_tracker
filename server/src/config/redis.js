const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redis = null;

const getRedisClient = () => {
  if (redis) return redis;

  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // required by BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));

  return redis;
};

const connectRedis = async () => {
  const client = getRedisClient();
  try {
    await client.connect();
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed — running without cache');
  }
  return client;
};

module.exports = { getRedisClient, connectRedis };
