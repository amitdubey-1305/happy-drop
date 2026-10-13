const levelService = require('./levelService');
const scoreService = require('./scoreService');
const GameSession = require('../models/GameSession');
const LevelProgress = require('../models/LevelProgress');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const startGame = async (userId, levelId) => {
  const numericLevelId = Number(levelId);

  // 1. Verify level exists
  const level = levelService.getLevelById(numericLevelId);

  // 2. Verify level is unlocked for the user
  const unlocked = await levelService.isLevelUnlocked(userId, numericLevelId);
  if (!unlocked) {
    throw new ApiError(403, 'LEVEL_LOCKED', `Level ${numericLevelId} is locked`);
  }

  // 3. Mark any existing "active" session for this user and level as "abandoned"
  await GameSession.updateMany(
    { userId, levelId: numericLevelId, status: 'active' },
    { $set: { status: 'abandoned' } }
  );

  // 4. Create new active GameSession
  const session = await GameSession.create({
    userId,
    levelId: numericLevelId,
    status: 'active',
    startedAt: new Date(),
  });

  // 5. Increase attempts in LevelProgress (create row with stars: 0 if not present)
  await LevelProgress.findOneAndUpdate(
    { userId, levelId: numericLevelId },
    {
      $inc: { attempts: 1 },
      $setOnInsert: { stars: 0 },
    },
    { upsert: true, new: true }
  );

  // 6. Return session details
  return {
    sessionId: session._id,
    level: {
      id: level.id,
      maxInk: level.maxInk,
      parTime: level.parTime || 15,
    },
    startedAt: session.startedAt,
  };
};

const completeGame = async (userId, { sessionId, levelId, inkUsed, completionTime }) => {
  const numericLevelId = Number(levelId);

  // a. Session exists, belongs to the logged-in user and matches levelId
  const session = await GameSession.findOne({
    _id: sessionId,
    userId,
    levelId: numericLevelId,
  });

  if (!session) {
    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Game session not found');
  }

  // b. If session is already completed, return same saved result with duplicate: true.
  //    If abandoned, return 409 SESSION_NOT_ACTIVE.
  if (session.status === 'completed') {
    const existingProgress = await LevelProgress.findOne({
      userId,
      levelId: numericLevelId,
    });

    return {
      stars: session.stars,
      score: session.score,
      isNewBest: false,
      bestStars: existingProgress ? existingProgress.stars : session.stars,
      nextLevelUnlocked: numericLevelId < 20 ? numericLevelId + 1 : null,
      duplicate: true,
    };
  }

  if (session.status === 'abandoned') {
    throw new ApiError(409, 'SESSION_NOT_ACTIVE', 'This game session is abandoned');
  }

  // c. Verify inkUsed <= maxInk (read from server level data)
  const level = levelService.getLevelById(numericLevelId);
  if (inkUsed > level.maxInk) {
    throw new ApiError(400, 'INVALID_INK', `Ink used (${inkUsed}) exceeds level maximum (${level.maxInk})`);
  }

  // d. completionTime must be between 2 and 1800 seconds
  if (completionTime < 2 || completionTime > 1800) {
    throw new ApiError(400, 'INVALID_TIME', 'Completion time must be between 2 and 1800 seconds');
  }

  // e. completionTime <= seconds since session.startedAt + 3
  const elapsedSeconds = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
  if (completionTime > elapsedSeconds + 3) {
    throw new ApiError(400, 'INVALID_TIME', 'Completion time exceeds elapsed play time');
  }

  // f. Calculate stars and score on the server
  const stars = scoreService.starsFromInk(inkUsed, level.maxInk);
  const score = scoreService.scoreFor({
    stars,
    inkUsed,
    maxInk: level.maxInk,
    completionTime,
    parTime: level.parTime,
  });

  // g. Atomically complete the active session to prevent double submission
  const updatedSession = await GameSession.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        inkUsed,
        completionTime,
        stars,
        score,
      },
    },
    { new: true }
  );

  if (!updatedSession) {
    // Concurrent request completed it first -> return duplicate result
    const currentProgress = await LevelProgress.findOne({
      userId,
      levelId: numericLevelId,
    });

    return {
      stars: session.stars || stars,
      score: session.score || score,
      isNewBest: false,
      bestStars: currentProgress ? currentProgress.stars : stars,
      nextLevelUnlocked: numericLevelId < 20 ? numericLevelId + 1 : null,
      duplicate: true,
    };
  }

  // h. Update LevelProgress (keep best stars, lowest ink, lowest time, highest score)
  const existingProgress = await LevelProgress.findOne({
    userId,
    levelId: numericLevelId,
  });

  const oldBestStars = existingProgress ? (existingProgress.stars || 0) : 0;
  const oldBestScore = existingProgress && typeof existingProgress.bestScore === 'number' ? existingProgress.bestScore : 0;
  const oldBestInk = existingProgress && typeof existingProgress.bestInkUsed === 'number' ? existingProgress.bestInkUsed : Infinity;
  const oldBestTime = existingProgress && typeof existingProgress.bestTime === 'number' ? existingProgress.bestTime : Infinity;
  const isFirstCompletion = !existingProgress || !existingProgress.completedAt;

  const newBestStars = Math.max(oldBestStars, stars);
  const newBestScore = Math.max(oldBestScore, score);
  const newBestInk = Math.min(oldBestInk, inkUsed);
  const newBestTime = Math.min(oldBestTime, completionTime);

  const isNewBest = score > oldBestScore || stars > oldBestStars;

  const progressUpdates = {
    stars: newBestStars,
    bestScore: newBestScore,
    bestInkUsed: newBestInk,
    bestTime: newBestTime,
  };

  if (isFirstCompletion) {
    progressUpdates.completedAt = new Date();
  }

  await LevelProgress.findOneAndUpdate(
    { userId, levelId: numericLevelId },
    { $set: progressUpdates },
    { upsert: true, new: true }
  );

  // i. Update User counters using differences
  const starsDiff = newBestStars - oldBestStars;
  const completedLevelsInc = isFirstCompletion && stars >= 1 ? 1 : 0;
  const perfectLevelsInc = oldBestStars < 3 && newBestStars === 3 ? 1 : 0;

  if (starsDiff > 0 || completedLevelsInc > 0 || perfectLevelsInc > 0) {
    const userInc = {};
    if (starsDiff > 0) userInc.totalStars = starsDiff;
    if (completedLevelsInc > 0) userInc.completedLevels = completedLevelsInc;
    if (perfectLevelsInc > 0) userInc.perfectLevels = perfectLevelsInc;

    await User.findByIdAndUpdate(userId, { $inc: userInc });
  }

  // j. Return result
  return {
    stars,
    score,
    isNewBest,
    bestStars: newBestStars,
    nextLevelUnlocked: numericLevelId < 20 ? numericLevelId + 1 : null,
    duplicate: false,
  };
};

module.exports = {
  startGame,
  completeGame,
};
