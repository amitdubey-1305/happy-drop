/**
 * Leaderboard Ranking Rules:
 * 1) totalStars, higher first (DESC).
 * 2) completedLevels, higher first (DESC).
 * 3) perfectLevels, higher first (DESC).
 * 4) the older account first (createdAt: ASC).
 *
 * Utilizes the compound index defined on the User model:
 * { totalStars: -1, completedLevels: -1, perfectLevels: -1, createdAt: 1 }
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Returns top users ranked according to the leaderboard rules.
 * Limit must be between 1 and 100 (defaults to 20).
 * Never returns email or any private field.
 * Only includes players with totalStars > 0.
 *
 * @param {number} limit - Number of leaderboard entries to retrieve (1-100)
 * @returns {Promise<Array<{ rank: number, name: string, totalStars: number, completedLevels: number, perfectLevels: number }>>}
 */
const getTop = async (limit = 20) => {
  const users = await User.find({ totalStars: { $gt: 0 } })
    .sort({ totalStars: -1, completedLevels: -1, perfectLevels: -1, createdAt: 1 })
    .limit(limit)
    .select('name totalStars completedLevels perfectLevels')
    .lean();

  return (users || []).map((user, index) => ({
    rank: index + 1,
    name: user.name,
    totalStars: user.totalStars || 0,
    completedLevels: user.completedLevels || 0,
    perfectLevels: user.perfectLevels || 0,
  }));
};

/**
 * Returns the rank and stats of a specific user.
 * rank = 1 + the number of users that are strictly ahead using the same four ranking rules.
 * If the user has no stars yet (totalStars <= 0), rank is null.
 *
 * @param {string} userId - User ID to rank
 * @returns {Promise<{ rank: number|null, totalStars: number, completedLevels: number, perfectLevels: number }>}
 */
const getRank = async (userId) => {
  const query = User.findById(userId).select('totalStars completedLevels perfectLevels createdAt');
  const user = typeof query.lean === 'function' ? await query.lean() : await query;

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const totalStars = user.totalStars || 0;
  const completedLevels = user.completedLevels || 0;
  const perfectLevels = user.perfectLevels || 0;

  if (totalStars <= 0) {
    return {
      rank: null,
      totalStars: 0,
      completedLevels,
      perfectLevels,
    };
  }

  // Count players strictly ahead based on the 4 compound ranking rules
  const aheadCount = await User.countDocuments({
    totalStars: { $gt: 0 },
    $or: [
      { totalStars: { $gt: totalStars } },
      {
        totalStars,
        completedLevels: { $gt: completedLevels },
      },
      {
        totalStars,
        completedLevels,
        perfectLevels: { $gt: perfectLevels },
      },
      {
        totalStars,
        completedLevels,
        perfectLevels,
        createdAt: { $lt: user.createdAt },
      },
    ],
  });

  return {
    rank: aheadCount + 1,
    totalStars,
    completedLevels,
    perfectLevels,
  };
};

module.exports = {
  getTop,
  getRank,
};
