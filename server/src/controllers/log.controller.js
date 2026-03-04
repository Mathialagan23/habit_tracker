const logService = require('../services/log.service');

exports.create = async (req, res, next) => {
  try {
    const log = await logService.create(req.params.habitId, req.user.id, req.body);
    res.status(201).json({ data: log });
  } catch (err) {
    next(err);
  }
};

exports.getByHabit = async (req, res, next) => {
  try {
    const logs = await logService.getByHabit(req.params.habitId, req.user.id, {
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await logService.remove(req.params.logId, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};
