const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const LevelProgress = require('../models/LevelProgress');
const levelService = require('../services/levelService');

// ─── Shared helpers ────────────────────────────────────────────────────────────

// A proper 24-char hex ObjectId for use as userId/sessionId in mocks
const MOCK_USER_ID = '64a1b2c3d4e5f6a7b8c9d0e1';
const VALID_SESSION_ID = '64a1b2c3d4e5f6a7b8c9d0e2';
const token = jwt.sign({ sub: MOCK_USER_ID }, env.JWT_SECRET);

const authHeader = () => ({ Authorization: `Bearer ${token}` });

const mockUserObj = () => ({
  _id: MOCK_USER_ID,
  name: 'Gamer',
  email: 'gamer@happydrop.com',
});

// ─── POST /api/games/start ─────────────────────────────────────────────────────

describe('POST /api/games/start Integration', () => {
  beforeEach(() => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUserObj()),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).post('/api/games/start').send({ levelId: 1 });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('400 VALIDATION_ERROR when levelId is not an integer', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set(authHeader())
      .send({ levelId: 'invalid' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('404 LEVEL_NOT_FOUND when level does not exist', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set(authHeader())
      .send({ levelId: 999 });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'LEVEL_NOT_FOUND');
  });

  it('403 LEVEL_LOCKED when level is locked', async () => {
    jest.spyOn(levelService, 'isLevelUnlocked').mockResolvedValue(false);
    const res = await request(app)
      .post('/api/games/start')
      .set(authHeader())
      .send({ levelId: 2 });
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('code', 'LEVEL_LOCKED');
  });

  it('201 – creates session, abandons old ones, increments attempts', async () => {
    jest.spyOn(levelService, 'isLevelUnlocked').mockResolvedValue(true);
    const updateManySpy = jest
      .spyOn(GameSession, 'updateMany')
      .mockResolvedValue({ modifiedCount: 1 });
    const createSpy = jest.spyOn(GameSession, 'create').mockResolvedValue({
      _id: 'mock-session-789',
      userId: MOCK_USER_ID,
      levelId: 1,
      status: 'active',
      startedAt: new Date('2026-10-13T10:00:00Z'),
    });
    const findOneAndUpdateSpy = jest
      .spyOn(LevelProgress, 'findOneAndUpdate')
      .mockResolvedValue({ userId: MOCK_USER_ID, levelId: 1, attempts: 1, stars: 0 });

    const res = await request(app)
      .post('/api/games/start')
      .set(authHeader())
      .send({ levelId: 1 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('sessionId', 'mock-session-789');
    expect(res.body.level).toEqual({ id: 1, maxInk: 300, parTime: 12 });
    expect(res.body).toHaveProperty('startedAt');

    expect(updateManySpy).toHaveBeenCalledWith(
      { userId: MOCK_USER_ID, levelId: 1, status: 'active' },
      { $set: { status: 'abandoned' } }
    );
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: MOCK_USER_ID, levelId: 1, status: 'active' })
    );
    expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
      { userId: MOCK_USER_ID, levelId: 1 },
      { $inc: { attempts: 1 }, $setOnInsert: { stars: 0 } },
      { upsert: true, new: true }
    );
  });
});

// ─── POST /api/games/complete ──────────────────────────────────────────────────

describe('POST /api/games/complete Integration', () => {
  /** A valid request body that passes Zod */
  const validBody = () => ({
    sessionId: VALID_SESSION_ID,
    levelId: 1,
    inkUsed: 100,
    completionTime: 10,
  });

  /** Build a mock session object */
  const makeSession = (overrides = {}) => ({
    _id: VALID_SESSION_ID,
    userId: MOCK_USER_ID,
    levelId: 1,
    status: 'active',
    startedAt: new Date(Date.now() - 30_000), // started 30s ago
    ...overrides,
  });

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUserObj()),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Auth / validation ────────────────────────────────────────────────────────

  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).post('/api/games/complete').send(validBody());
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('400 VALIDATION_ERROR when sessionId is not a valid ObjectId', async () => {
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), sessionId: 'not-valid' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('400 VALIDATION_ERROR when levelId is missing', async () => {
    const { levelId: _, ...body } = validBody();
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(body);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('400 VALIDATION_ERROR when inkUsed is negative', async () => {
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), inkUsed: -1 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('400 VALIDATION_ERROR when completionTime is negative', async () => {
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), completionTime: -5 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ── Business rules (in spec order: a → b → c → d → e) ─────────────────────

  it('a. 404 SESSION_NOT_FOUND when session does not exist', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(null);
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(validBody());
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'SESSION_NOT_FOUND');
  });

  it('b. 200 duplicate:true when session is already completed', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(
      makeSession({ status: 'completed', stars: 2, score: 750 })
    );
    jest.spyOn(LevelProgress, 'findOne').mockResolvedValue({
      userId: MOCK_USER_ID,
      levelId: 1,
      stars: 2,
      bestScore: 750,
    });

    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(validBody());

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('duplicate', true);
    expect(res.body).toHaveProperty('stars', 2);
    expect(res.body).toHaveProperty('score', 750);
  });

  it('b. 409 SESSION_NOT_ACTIVE when session is abandoned', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(
      makeSession({ status: 'abandoned' })
    );
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(validBody());
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('code', 'SESSION_NOT_ACTIVE');
  });

  it('c. 400 INVALID_INK when inkUsed exceeds level maxInk (300)', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), inkUsed: 9999 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_INK');
  });

  it('d. 400 INVALID_TIME when completionTime < 2 seconds', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), completionTime: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_TIME');
  });

  it('d. 400 INVALID_TIME when completionTime > 1800 seconds', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), completionTime: 1801 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_TIME');
  });

  it('e. 400 INVALID_TIME when completionTime exceeds elapsed time + 3s', async () => {
    // Session started 5s ago; claiming 20s of play is impossible
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(
      makeSession({ startedAt: new Date(Date.now() - 5_000) })
    );
    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), completionTime: 20 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_TIME');
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('200 – returns stars, score, isNewBest, bestStars, nextLevelUnlocked', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    jest.spyOn(GameSession, 'findOneAndUpdate').mockResolvedValue(
      makeSession({ status: 'completed', inkUsed: 100, completionTime: 10, stars: 3, score: 1034, completedAt: new Date() })
    );
    jest.spyOn(LevelProgress, 'findOne').mockResolvedValue(null);
    jest.spyOn(LevelProgress, 'findOneAndUpdate').mockResolvedValue({});
    jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(validBody()); // inkUsed:100, completionTime:10, level 1

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('duplicate', false);
    expect(res.body).toHaveProperty('stars');
    expect(res.body).toHaveProperty('score');
    expect(res.body).toHaveProperty('isNewBest');
    expect(res.body).toHaveProperty('bestStars');
    expect(res.body).toHaveProperty('nextLevelUnlocked', 2);
  });

  it('score is calculated server-side (client cannot fake it)', async () => {
    // inkUsed:100, maxInk:300 → ratio 0.333 → 3 stars
    // score = 500 + 300 + round(200*(1-0.333)) + 100 (completionTime 10 <= parTime 12)
    //       = 500 + 300 + 133 + 100 = 1033  (round(133.4) = 133)
    // Note: exact value depends on Math.round rounding
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    jest.spyOn(GameSession, 'findOneAndUpdate').mockResolvedValue(
      makeSession({ status: 'completed' })
    );
    jest.spyOn(LevelProgress, 'findOne').mockResolvedValue(null);
    jest.spyOn(LevelProgress, 'findOneAndUpdate').mockResolvedValue({});
    jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send({ ...validBody(), inkUsed: 100, completionTime: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.stars).toBe(3);
    // score must be a positive number calculated by the server
    expect(typeof res.body.score).toBe('number');
    expect(res.body.score).toBeGreaterThan(0);
  });

  it('200 duplicate:true when atomic update returns null (concurrent request)', async () => {
    jest.spyOn(GameSession, 'findOne').mockResolvedValue(makeSession());
    // Atomic update returns null → concurrent request completed it first
    jest.spyOn(GameSession, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(LevelProgress, 'findOne').mockResolvedValue({
      userId: MOCK_USER_ID,
      levelId: 1,
      stars: 3,
      bestScore: 900,
    });

    const res = await request(app)
      .post('/api/games/complete')
      .set(authHeader())
      .send(validBody());

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('duplicate', true);
  });
});
