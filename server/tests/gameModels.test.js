const mongoose = require('mongoose');
const LevelProgress = require('../models/LevelProgress');
const GameSession = require('../models/GameSession');

describe('LevelProgress Model', () => {
  it('should validate a valid LevelProgress document with defaults', async () => {
    const progress = new LevelProgress({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
    });

    await expect(progress.validate()).resolves.toBeUndefined();
    expect(progress.stars).toBe(0);
    expect(progress.attempts).toBe(0);
  });

  it('should fail validation if userId or levelId is missing', async () => {
    const progress = new LevelProgress({});
    await expect(progress.validate()).rejects.toThrow();
  });

  it('should reject stars greater than 3 or less than 0', async () => {
    const invalidHigh = new LevelProgress({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      stars: 4,
    });
    await expect(invalidHigh.validate()).rejects.toThrow();

    const invalidLow = new LevelProgress({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      stars: -1,
    });
    await expect(invalidLow.validate()).rejects.toThrow();
  });

  it('should have a unique compound index on (userId, levelId)', () => {
    const indexes = LevelProgress.schema.indexes();
    const uniqueCompoundIndex = indexes.find(
      ([fields, options]) =>
        fields.userId === 1 && fields.levelId === 1 && options && options.unique === true
    );

    expect(uniqueCompoundIndex).toBeDefined();
  });
});

describe('GameSession Model', () => {
  it('should validate a valid GameSession with default status active', async () => {
    const session = new GameSession({
      userId: new mongoose.Types.ObjectId(),
      levelId: 2,
    });

    await expect(session.validate()).resolves.toBeUndefined();
    expect(session.status).toBe('active');
    expect(session.startedAt).toBeInstanceOf(Date);
  });

  it('should fail validation if status is not active, completed, or abandoned', async () => {
    const session = new GameSession({
      userId: new mongoose.Types.ObjectId(),
      levelId: 2,
      status: 'paused',
    });

    await expect(session.validate()).rejects.toThrow();
  });

  it('should have an index on (userId, levelId, status)', () => {
    const indexes = GameSession.schema.indexes();
    const sessionIndex = indexes.find(
      ([fields]) =>
        fields.userId === 1 && fields.levelId === 1 && fields.status === 1
    );

    expect(sessionIndex).toBeDefined();
  });
});
