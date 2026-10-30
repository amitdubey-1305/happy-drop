const levelsData = require('../data/levels.json');
const LevelProgress = require('../models/LevelProgress');
const ApiError = require('../utils/ApiError');

const getAllLevels = () => {
  return levelsData;
};

const getLevelById = (id) => {
  const numericId = Number(id);
  const level = levelsData.find((lvl) => lvl.id === numericId);

  if (!level) {
    throw new ApiError(404, 'LEVEL_NOT_FOUND', `Level ${id} not found`);
  }

  return level;
};

const isLevelUnlocked = async (userId, levelId) => {
  const targetLevelId = Number(levelId);

  if (targetLevelId === 1) {
    return true;
  }

  if (!userId || targetLevelId < 1) {
    return false;
  }

  const prevLevelProgress = await LevelProgress.findOne({
    userId,
    levelId: targetLevelId - 1,
  });

  return Boolean(prevLevelProgress && prevLevelProgress.stars >= 1);
};

const getLevelForUser = async (userId, levelId) => {
  const numericId = Number(levelId);
  const level = levelsData.find((lvl) => lvl.id === numericId);

  if (!level) {
    throw new ApiError(404, 'LEVEL_NOT_FOUND', `Level ${levelId} not found`);
  }

  const unlocked = await isLevelUnlocked(userId, numericId);
  if (!unlocked) {
    throw new ApiError(403, 'LEVEL_LOCKED', `Level ${levelId} is locked`);
  }

  const levelDetails = { ...level };
  // Keep hint points accessible to user while keeping secret referenceSolution protected
  if (!levelDetails.hint && level.referenceSolution) {
    levelDetails.hint = { points: level.referenceSolution };
  }
  delete levelDetails.referenceSolution;

  return levelDetails;
};

const getUserLevelsSummary = async (userId) => {
  const progressList = await LevelProgress.find({ userId });
  const progressMap = new Map();
  progressList.forEach((p) => {
    progressMap.set(p.levelId, p);
  });

  const sortedLevels = [...levelsData].sort((a, b) => a.id - b.id);
  let previousCompleted = true; // Level 1 is always unlocked

  return sortedLevels.map((lvl) => {
    const progress = progressMap.get(lvl.id);
    const stars = progress ? progress.stars : 0;
    const unlocked = lvl.id === 1 ? true : previousCompleted;

    // Next level is unlocked only if this level has stars >= 1
    previousCompleted = stars >= 1;

    return {
      id: lvl.id,
      name: lvl.name,
      difficulty: lvl.difficulty || 'easy',
      maxInk: lvl.maxInk,
      stars,
      unlocked,
    };
  });
};

module.exports = {
  getAllLevels,
  getLevelById,
  getLevelForUser,
  isLevelUnlocked,
  getUserLevelsSummary,
};
