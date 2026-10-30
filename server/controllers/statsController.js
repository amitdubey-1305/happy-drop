const statsService = require('../services/statsService');

/**
 * GET /api/stats/me
 * Returns player stats summary, progress percentage, recent levels, and unlocked achievements.
 */
const getStatsMe = async (req, res, next) => {
  try {
    const stats = await statsService.getStatsMe(req.user._id);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatsMe,
};
