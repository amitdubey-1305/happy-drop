const gameService = require('../services/gameService');

const start = async (req, res, next) => {
  try {
    const { levelId } = req.body;
    const result = await gameService.startGame(req.user._id, levelId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const complete = async (req, res, next) => {
  try {
    const { sessionId, levelId, inkUsed, completionTime } = req.body;
    const result = await gameService.completeGame(req.user._id, {
      sessionId,
      levelId,
      inkUsed,
      completionTime,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  start,
  complete,
};
