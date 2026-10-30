const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const User = require('../models/User');
const LevelProgress = require('../models/LevelProgress');
const GameSession = require('../models/GameSession');

describe('GET /api/stats/me (Dashboard stats)', () => {
  const MOCK_USER_ID = '64a1b2c3d4e5f6a7b8c9d0e9';
  const token = jwt.sign({ sub: MOCK_USER_ID }, env.JWT_SECRET);
  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  beforeEach(() => {
    // Auth middleware mock
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: MOCK_USER_ID,
          name: 'Speedy Dropper',
          email: 'speedy@happydrop.com',
          completedLevels: 0,
          totalStars: 0,
          perfectLevels: 0,
        }),
        then: (resolve) => resolve({
          _id: MOCK_USER_ID,
          name: 'Speedy Dropper',
          email: 'speedy@happydrop.com',
          completedLevels: 0,
          totalStars: 0,
          perfectLevels: 0,
        }),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('401 NO_TOKEN when authorization header is missing', async () => {
    const res = await request(app).get('/api/stats/me');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('code', 'NO_TOKEN');
  });

  it('200 returns default 0 stats and empty achievements for fresh user', async () => {
    jest.spyOn(LevelProgress, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    jest.spyOn(GameSession, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .get('/api/stats/me')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      levelsCompleted: 0,
      totalStars: 0,
      perfectLevels: 0,
      totalAttempts: 0,
      bestCompletion: 0,
      progressPercent: 0,
      recentLevels: [],
      achievements: [],
    });
  });

  it('200 returns computed stats, progressPercent, recentLevels, and unlocked achievements', async () => {
    // User with 10 completed levels and 5 perfect ones
    const userDoc = {
      _id: MOCK_USER_ID,
      completedLevels: 10,
      totalStars: 28,
      perfectLevels: 5,
    };

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(userDoc),
        then: (resolve) => resolve(userDoc),
      })),
    });

    const mockProgress = [
      { levelId: 1, stars: 3, attempts: 2 },
      { levelId: 2, stars: 3, attempts: 3 },
      { levelId: 3, stars: 3, attempts: 1 },
      { levelId: 4, stars: 3, attempts: 4 },
      { levelId: 5, stars: 3, attempts: 2 },
      { levelId: 6, stars: 2, attempts: 3 },
      { levelId: 7, stars: 2, attempts: 5 },
      { levelId: 8, stars: 2, attempts: 1 },
      { levelId: 9, stars: 2, attempts: 2 },
      { levelId: 10, stars: 2, attempts: 2 },
    ];

    jest.spyOn(LevelProgress, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockProgress),
    });

    const mockRecentSessions = [
      { levelId: 10, stars: 2, score: 780, completedAt: '2026-10-14T11:00:00.000Z' },
      { levelId: 9, stars: 2, score: 810, completedAt: '2026-10-14T10:45:00.000Z' },
      { levelId: 8, stars: 2, score: 850, completedAt: '2026-10-14T10:30:00.000Z' },
      { levelId: 7, stars: 2, score: 790, completedAt: '2026-10-14T10:15:00.000Z' },
      { levelId: 6, stars: 2, score: 830, completedAt: '2026-10-14T10:00:00.000Z' },
    ];

    jest.spyOn(GameSession, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockRecentSessions),
    });

    const res = await request(app)
      .get('/api/stats/me')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body.levelsCompleted).toBe(10);
    expect(res.body.totalStars).toBe(28);
    expect(res.body.perfectLevels).toBe(5);
    // Total attempts sum: 2+3+1+4+2+3+5+1+2+2 = 25
    expect(res.body.totalAttempts).toBe(25);
    expect(res.body.bestCompletion).toBe(3);
    // 10 / 20 * 100 = 50%
    expect(res.body.progressPercent).toBe(50);
    expect(res.body.recentLevels).toHaveLength(5);
    expect(res.body.recentLevels[0]).toEqual({
      levelId: 10,
      stars: 2,
      score: 780,
      completedAt: '2026-10-14T11:00:00.000Z',
    });

    // Check unlocked achievements:
    // "First Drop" (>= 1), "Halfway" (>= 10), "Perfect Five" (>= 5 perfect)
    expect(res.body.achievements).toEqual(
      expect.arrayContaining(['First Drop', 'Halfway', 'Perfect Five'])
    );
    expect(res.body.achievements).not.toContain('All Clear');
  });

  it('200 unlocks "All Clear" achievement when all 20 levels are completed', async () => {
    const userDoc = {
      _id: MOCK_USER_ID,
      completedLevels: 20,
      totalStars: 60,
      perfectLevels: 20,
    };

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(userDoc),
        then: (resolve) => resolve(userDoc),
      })),
    });

    jest.spyOn(LevelProgress, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ levelId: 1, stars: 3, attempts: 20 }]),
    });

    jest.spyOn(GameSession, 'find').mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .get('/api/stats/me')
      .set(authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body.progressPercent).toBe(100);
    expect(res.body.achievements).toEqual([
      'First Drop',
      'Halfway',
      'All Clear',
      'Perfect Five',
    ]);
  });
});
