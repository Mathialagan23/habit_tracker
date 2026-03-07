const User = require('../models/User');
const logger = require('../utils/logger');

class XpService {
  /**
   * Add XP to a user and check for level up.
   * @param {string} userId
   * @param {number} amount
   * @returns {{ xp: number, level: number, leveledUp: boolean }}
   */
  async addXP(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return null;

    const oldLevel = user.level;
    user.xp += amount;
    user.level = this.calculateLevel(user.xp);
    await user.save();

    const leveledUp = user.level > oldLevel;
    if (leveledUp) {
      logger.info({ userId, newLevel: user.level, xp: user.xp }, 'User leveled up');
    }

    return { xp: user.xp, level: user.level, leveledUp };
  }

  /**
   * Level = floor(xp / 100) + 1
   */
  calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
  }
}

module.exports = new XpService();
