const levelService = require('../services/levelService');
const levelGenerator = require('../services/levelGenerator');
const ApiError = require('../utils/ApiError');

const getLevels = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const levels = await levelService.getUserLevelsSummary(userId);
    res.status(200).json(levels);
  } catch (error) {
    next(error);
  }
};

const getLevelById = async (req, res, next) => {
  try {
    const rawId = req.params.id;

    // Check if id is an integer (digits only)
    if (!/^\d+$/.test(rawId)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Level ID must be an integer');
    }

    const levelId = parseInt(rawId, 10);
    const userId = req.user._id;

    const level = await levelService.getLevelForUser(userId, levelId);
    res.status(200).json(level);
  } catch (error) {
    next(error);
  }
};

const getGeneratedLevel = async (req, res, next) => {
  try {
    const rawSeed = req.params.seed;

    // Validate that seed is an integer
    if (!/^-?\d+$/.test(rawSeed)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Seed must be an integer');
    }

    const seed = parseInt(rawSeed, 10);
    const level = levelGenerator.generateLevel(seed);
    level.id = `gen-${seed}`;

    res.status(200).json(level);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLevels,
  getLevelById,
  getGeneratedLevel,
};
