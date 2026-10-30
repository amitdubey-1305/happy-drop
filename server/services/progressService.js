const LevelProgress = require('../models/LevelProgress');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const levelService = require('./levelService');
const ApiError = require('../utils/ApiError');

/**
 * Returns all LevelProgress records for the logged-in user,
 * sorted by levelId ascending with:
 * levelId, stars, bestInkUsed, bestTime, bestScore, attempts, completedAt.
 */
const getAllProgress = async (userId) => {
  const query = LevelProgress.find({ userId }).sort({ levelId: 1 });
  const selectQuery = typeof query.select === 'function'
    ? query.select('levelId stars bestInkUsed bestTime bestScore attempts completedAt -_id')
    : query;
  const records = await selectQuery.lean();

  return records.map((record) => {
    const { _id, userId: uid, __v, createdAt, updatedAt, ...rest } = record;
    return rest;
  });
};

/**
 * Returns the LevelProgress record for a single level.
 * If the user has no row, return { levelId, stars: 0, attempts: 0, unlocked }
 * where unlocked uses the same rule as the levels API.
 * 404 if the level does not exist, 400 if the id is not an integer.
 */
const getProgressByLevel = async (userId, levelId) => {
  const rawId = String(levelId);
  if (!/^\d+$/.test(rawId)) {
    throw new ApiError(400, 'INVALID_INPUT', 'Level ID must be an integer');
  }

  const numericLevelId = parseInt(rawId, 10);
  if (numericLevelId < 1) {
    throw new ApiError(400, 'INVALID_INPUT', 'Level ID must be a positive integer');
  }

  // 1. Verify level exists in server data (throws 404 LEVEL_NOT_FOUND if not found)
  levelService.getLevelById(numericLevelId);

  // 2. Look up user's progress row for this level
  const query = LevelProgress.findOne({ userId, levelId: numericLevelId });
  const selectQuery = typeof query.select === 'function'
    ? query.select('levelId stars bestInkUsed bestTime bestScore attempts completedAt -_id')
    : query;
  const record = await selectQuery.lean();

  const unlocked = await levelService.isLevelUnlocked(userId, numericLevelId);

  if (!record) {
    return {
      levelId: numericLevelId,
      stars: 0,
      attempts: 0,
      unlocked,
    };
  }

  const { _id, userId: uid, __v, createdAt, updatedAt, ...rest } = record;
  return {
    ...rest,
    unlocked,
  };
};

/**
 * Aggregated dashboard summary for the logged-in user.
 * Includes: totalStars, completedLevels, perfectLevels (from User doc)
 * plus the 5 most recent completed GameSessions.
 */
const getDashboard = async (userId) => {
  const [user, recentSessions] = await Promise.all([
    User.findById(userId).select('name email totalStars completedLevels perfectLevels createdAt').lean(),
    GameSession.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .select('levelId stars score completionTime inkUsed completedAt')
      .lean(),
  ]);

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return {
    name: user.name,
    email: user.email,
    totalStars: user.totalStars || 0,
    completedLevels: user.completedLevels || 0,
    perfectLevels: user.perfectLevels || 0,
    memberSince: user.createdAt,
    recentSessions,
  };
};

/**
 * Leaderboard: top 20 users ranked by totalStars DESC,
 * then completedLevels DESC, then perfectLevels DESC,
 * then createdAt ASC (longest member wins ties).
 * Never returns email or password.
 */
const getLeaderboard = async () => {
  const users = await User.find()
    .sort({ totalStars: -1, completedLevels: -1, perfectLevels: -1, createdAt: 1 })
    .limit(20)
    .select('name totalStars completedLevels perfectLevels')
    .lean();

  return users.map((u, idx) => ({
    rank: idx + 1,
    name: u.name,
    totalStars: u.totalStars || 0,
    completedLevels: u.completedLevels || 0,
    perfectLevels: u.perfectLevels || 0,
  }));
};

module.exports = {
  getAllProgress,
  getProgressByLevel,
  getDashboard,
  getLeaderboard,
};
