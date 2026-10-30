const User = require('../models/User');
const LevelProgress = require('../models/LevelProgress');
const GameSession = require('../models/GameSession');
const levelService = require('./levelService');
const ApiError = require('../utils/ApiError');

/**
 * Returns dashboard player statistics for the authenticated user:
 * - levelsCompleted, totalStars, perfectLevels
 * - totalAttempts (sum of all attempts across levels)
 * - bestCompletion (highest stars earned on any level, 0-3)
 * - progressPercent (levelsCompleted / total levels * 100)
 * - recentLevels (last 5 completed game sessions with levelId, stars, score, completedAt)
 * - achievements (unlocked achievement badges based on progress milestones)
 */
const getStatsMe = async (userId) => {
  const query = User.findById(userId).select('completedLevels totalStars perfectLevels');
  const user = typeof query.lean === 'function' ? await query.lean() : await query;

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const [allProgress, recentSessions] = await Promise.all([
    LevelProgress.find({ userId }).lean(),
    GameSession.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .select('levelId stars score completedAt -_id')
      .lean(),
  ]);

  const levelsCompleted = user.completedLevels !== undefined
    ? user.completedLevels
    : allProgress.filter((p) => (p.stars || 0) >= 1).length;

  const totalStars = user.totalStars !== undefined
    ? user.totalStars
    : allProgress.reduce((sum, p) => sum + (p.stars || 0), 0);

  const perfectLevels = user.perfectLevels !== undefined
    ? user.perfectLevels
    : allProgress.filter((p) => p.stars === 3).length;

  const totalAttempts = allProgress.reduce((sum, p) => sum + (p.attempts || 0), 0);
  const bestCompletion = allProgress.reduce((max, p) => Math.max(max, p.stars || 0), 0);

  const TOTAL_LEVELS = 20;
  const progressPercent = TOTAL_LEVELS > 0 ? (levelsCompleted / TOTAL_LEVELS) * 100 : 0;

  const recentLevels = (recentSessions || []).map((session) => ({
    levelId: session.levelId,
    stars: session.stars,
    score: session.score,
    completedAt: session.completedAt,
  }));

  const achievements = [];
  if (levelsCompleted >= 1) {
    achievements.push('First Drop');
  }
  if (levelsCompleted >= 10) {
    achievements.push('Halfway');
  }
  if (levelsCompleted >= TOTAL_LEVELS) {
    achievements.push('All Clear');
  }
  if (perfectLevels >= 5) {
    achievements.push('Perfect Five');
  }

  return {
    levelsCompleted,
    totalStars,
    perfectLevels,
    totalAttempts,
    bestCompletion,
    progressPercent,
    recentLevels,
    achievements,
  };
};

module.exports = {
  getStatsMe,
};
