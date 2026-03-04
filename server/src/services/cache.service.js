const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  get redis() {
    return getRedisClient();
  }

  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Cache set failed');
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Cache del failed');
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      logger.warn({ err, pattern }, 'Cache delPattern failed');
    }
  }
}

module.exports = new CacheService();
