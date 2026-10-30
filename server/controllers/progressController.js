const progressService = require('../services/progressService');

/**
 * GET /api/progress
 * Returns all level progress records for the authenticated user.
 */
const getAllProgress = async (req, res, next) => {
  try {
    const records = await progressService.getAllProgress(req.user._id);
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/progress/:levelId
 * Returns progress for a single level.
 */
const getProgressByLevel = async (req, res, next) => {
  try {
    const record = await progressService.getProgressByLevel(req.user._id, req.params.levelId);
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard
 * Returns aggregated stats + recent sessions for the authenticated user.
 */
const getDashboard = async (req, res, next) => {
  try {
    const summary = await progressService.getDashboard(req.user._id);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard
 * Returns top 20 users ranked by stars (no email exposed).
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const board = await progressService.getLeaderboard();
    res.status(200).json(board);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProgress,
  getProgressByLevel,
  getDashboard,
  getLeaderboard,
};
