const statsService = require('../services/stats.service');

exports.dashboard = async (req, res, next) => {
  try {
    const data = await statsService.getDashboard(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.streaks = async (req, res, next) => {
  try {
    const data = await statsService.getStreaks(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.weekly = async (req, res, next) => {
  try {
    const data = await statsService.getWeekly(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.monthly = async (req, res, next) => {
  try {
    const data = await statsService.getMonthly(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.heatmap = async (req, res, next) => {
  try {
    const data = await statsService.getHeatmap(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.scores = async (req, res, next) => {
  try {
    const data = await statsService.getScores(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
