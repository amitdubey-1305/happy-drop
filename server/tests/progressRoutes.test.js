const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const LevelProgress = require('../models/LevelProgress');

// ─── Shared helpers ──────────────────────────────────────────────────────────

const MOCK_USER_ID = '64a1b2c3d4e5f6a7b8c9d0e3';
const token = jwt.sign({ sub: MOCK_USER_ID }, env.JWT_SECRET);
const authHeader = () => ({ Authorization: `Bearer ${token}` });

const mockUser = () => ({
  _id: MOCK_USER_ID,
  name: 'Test Player',
  email: 'player@happydrop.com',
  totalStars: 6,
  completedLevels: 2,
  perfectLevels: 1,
  createdAt: new Date('2026-01-01'),
});

const mockUserForAuth = () => ({
  _id: MOCK_USER_ID,
  name: 'Test Player',
  email: 'player@happydrop.com',
});

beforeEach(() => {
  // Auth middleware calls: User.findById(id).select('-password')  → resolves user
  // getDashboard calls:   User.findById(id).select(...).lean()    → resolves user
  // Both are satisfied by the same chainable mock below.
  const selectMock = jest.fn().mockImplementation(() => ({
    lean: jest.fn().mockResolvedValue(mockUserForAuth()),
    then: (resolve) => resolve(mockUserForAuth()), // makes select() itself awaitable
  }));
  jest.spyOn(User, 'findById').mockReturnValue({ select: selectMock });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── GET /api/progress ───────────────────────────────────────────────────────

describe('GET /api/progress', () => {
  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).get('/api/progress');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('200 returns empty array when user has no progress records', async () => {
    jest.spyOn(LevelProgress, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app).get('/api/progress').set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('200 returns all progress records sorted by levelId', async () => {
    const mockRecords = [
      { userId: MOCK_USER_ID, levelId: 1, stars: 3, bestScore: 1033, bestInkUsed: 100, bestTime: 10 },
      { userId: MOCK_USER_ID, levelId: 2, stars: 2, bestScore: 820, bestInkUsed: 200, bestTime: 20 },
    ];

    jest.spyOn(LevelProgress, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockRecords),
      }),
    });

    const res = await request(app).get('/api/progress').set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ levelId: 1, stars: 3 });
    expect(res.body[1]).toMatchObject({ levelId: 2, stars: 2 });
  });
});

// ─── GET /api/progress/:levelId ──────────────────────────────────────────────

describe('GET /api/progress/:levelId', () => {
  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).get('/api/progress/1');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('400 INVALID_INPUT when levelId is not an integer string', async () => {
    const res = await request(app)
      .get('/api/progress/abc')
      .set(authHeader());
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
  });

  it('400 INVALID_INPUT when levelId is a float', async () => {
    const res = await request(app)
      .get('/api/progress/1.5')
      .set(authHeader());
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
  });

  it('404 LEVEL_NOT_FOUND when level does not exist in game data', async () => {
    const res = await request(app)
      .get('/api/progress/999')
      .set(authHeader());

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'LEVEL_NOT_FOUND');
  });

  it('200 returns default { levelId, stars: 0, attempts: 0, unlocked: true } for level 1 when user has no row', async () => {
    jest.spyOn(LevelProgress, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .get('/api/progress/1')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      levelId: 1,
      stars: 0,
      attempts: 0,
      unlocked: true,
    });
  });

  it('200 returns unlocked: false for level 2 when user has no row and previous level not beaten', async () => {
    // Neither level 2 nor level 1 progress exist
    jest.spyOn(LevelProgress, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .get('/api/progress/2')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      levelId: 2,
      stars: 0,
      attempts: 0,
      unlocked: false,
    });
  });

  it('200 returns unlocked: true for level 2 when user has no row but level 1 has stars >= 1', async () => {
    // When checking level 2, user has no row for level 2, but has stars >= 1 on level 1
    jest.spyOn(LevelProgress, 'findOne').mockImplementation((filter) => {
      if (filter.levelId === 2) {
        return {
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(null),
        };
      }
      if (filter.levelId === 1) {
        return Promise.resolve({ userId: MOCK_USER_ID, levelId: 1, stars: 2 });
      }
      return Promise.resolve(null);
    });

    const res = await request(app)
      .get('/api/progress/2')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      levelId: 2,
      stars: 0,
      attempts: 0,
      unlocked: true,
    });
  });

  it('200 returns the progress record with unlocked: true when user has a row', async () => {
    const mockRecord = {
      levelId: 1,
      stars: 3,
      bestScore: 1033,
      bestInkUsed: 100,
      bestTime: 10,
      attempts: 2,
      completedAt: '2026-10-14T10:00:00.000Z',
    };

    jest.spyOn(LevelProgress, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockRecord),
    });

    const res = await request(app)
      .get('/api/progress/1')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      levelId: 1,
      stars: 3,
      bestScore: 1033,
      bestInkUsed: 100,
      bestTime: 10,
      attempts: 2,
      unlocked: true,
    });
  });
});

// ─── GET /api/dashboard ───────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('200 returns aggregated user stats and recent sessions', async () => {
    // Override findById to return the FULL user (with totalStars etc.) for
    // both auth middleware and getDashboard — using the same chainable pattern.
    const selectMock = jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(mockUser()),
      then: (resolve) => resolve(mockUser()),
    }));
    jest.spyOn(User, 'findById').mockReturnValue({ select: selectMock });

    const recentSessions = [
      { levelId: 1, stars: 3, score: 1033, completionTime: 10, inkUsed: 100, completedAt: new Date() },
      { levelId: 2, stars: 2, score: 820, completionTime: 25, inkUsed: 200, completedAt: new Date() },
    ];

    jest.spyOn(GameSession, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(recentSessions),
    });

    const res = await request(app).get('/api/dashboard').set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Test Player',
      totalStars: 6,
      completedLevels: 2,
      perfectLevels: 1,
    });
    expect(Array.isArray(res.body.recentSessions)).toBe(true);
    expect(res.body.recentSessions).toHaveLength(2);
    expect(res.body).not.toHaveProperty('password');
  });
});

// ─── GET /api/leaderboard ────────────────────────────────────────────────────

describe('GET /api/leaderboard', () => {
  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('200 returns ranked list without exposing emails', async () => {
    const mockUsers = [
      { name: 'Alice', totalStars: 20, completedLevels: 7, perfectLevels: 3 },
      { name: 'Bob', totalStars: 15, completedLevels: 5, perfectLevels: 1 },
      { name: 'Charlie', totalStars: 10, completedLevels: 4, perfectLevels: 0 },
    ];

    jest.spyOn(User, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });

    const res = await request(app).get('/api/leaderboard').set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);

    // Rank is injected server-side
    expect(res.body[0]).toMatchObject({ rank: 1, name: 'Alice', totalStars: 20 });
    expect(res.body[1]).toMatchObject({ rank: 2, name: 'Bob', totalStars: 15 });
    expect(res.body[2]).toMatchObject({ rank: 3, name: 'Charlie', totalStars: 10 });

    // No email or password must be present in any entry
    res.body.forEach((entry) => {
      expect(entry).not.toHaveProperty('email');
      expect(entry).not.toHaveProperty('password');
    });
  });

  it('200 returns empty array when no users exist', async () => {
    jest.spyOn(User, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app).get('/api/leaderboard').set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });
});
