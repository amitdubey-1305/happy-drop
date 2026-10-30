const leaderboardService = require('../services/leaderboardService');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/leaderboard?limit=20
 * Returns top users ranked by stars, completed levels, perfect levels, and account age.
 * Query param limit: integer 1 to 100 (defaults to 20).
 */
const getTop = async (req, res, next) => {
  try {
    let limit = 20;
    if (req.query.limit !== undefined) {
      const rawLimit = String(req.query.limit);
      if (!/^\d+$/.test(rawLimit)) {
        throw new ApiError(400, 'INVALID_INPUT', 'limit must be an integer between 1 and 100');
      }

      const parsed = parseInt(rawLimit, 10);
      if (parsed < 1 || parsed > 100) {
        throw new ApiError(400, 'INVALID_INPUT', 'limit must be an integer between 1 and 100');
      }

      limit = parsed;
    }

    const leaderboard = await leaderboardService.getTop(limit);
    res.status(200).json(leaderboard);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard/me
 * Returns current user's rank and stats. Rank is null if user has 0 stars.
 */
const getRank = async (req, res, next) => {
  try {
    const rankInfo = await leaderboardService.getRank(req.user._id);
    res.status(200).json(rankInfo);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTop,
  getRank,
};
