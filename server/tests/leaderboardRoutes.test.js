const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const User = require('../models/User');

describe('Leaderboard Routes Integration (Task 8)', () => {
  const MOCK_USER_ID = '64a1b2c3d4e5f6a7b8c9d0ee';
  const token = jwt.sign({ sub: MOCK_USER_ID }, env.JWT_SECRET);
  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  const mockUserForAuth = () => ({
    _id: MOCK_USER_ID,
    name: 'Top Player',
    email: 'topplayer@happydrop.com',
  });

  beforeEach(() => {
    // Auth middleware mock
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockUserForAuth()),
        then: (resolve) => resolve(mockUserForAuth()),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── GET /api/leaderboard ───────────────────────────────────────────────────

  describe('GET /api/leaderboard', () => {
    it('401 NO_TOKEN when authorization header is missing', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('400 INVALID_INPUT when limit is not an integer', async () => {
      const res = await request(app)
        .get('/api/leaderboard?limit=abc')
        .set(authHeader());
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('400 INVALID_INPUT when limit is less than 1', async () => {
      const res = await request(app)
        .get('/api/leaderboard?limit=0')
        .set(authHeader());
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('400 INVALID_INPUT when limit is greater than 100', async () => {
      const res = await request(app)
        .get('/api/leaderboard?limit=101')
        .set(authHeader());
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('200 returns ranked top players using default limit 20 and totalStars > 0 filter', async () => {
      const mockPlayers = [
        { name: 'Ace', totalStars: 30, completedLevels: 10, perfectLevels: 10 },
        { name: 'Bravo', totalStars: 25, completedLevels: 9, perfectLevels: 7 },
      ];

      const limitSpy = jest.fn().mockReturnThis();
      const findSpy = jest.spyOn(User, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: limitSpy,
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPlayers),
      });

      const res = await request(app)
        .get('/api/leaderboard')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(findSpy).toHaveBeenCalledWith({ totalStars: { $gt: 0 } });
      expect(limitSpy).toHaveBeenCalledWith(20);
      expect(res.body).toEqual([
        { rank: 1, name: 'Ace', totalStars: 30, completedLevels: 10, perfectLevels: 10 },
        { rank: 2, name: 'Bravo', totalStars: 25, completedLevels: 9, perfectLevels: 7 },
      ]);
    });

    it('200 accepts custom limit between 1 and 100', async () => {
      const limitSpy = jest.fn().mockReturnThis();
      jest.spyOn(User, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: limitSpy,
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .get('/api/leaderboard?limit=5')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(limitSpy).toHaveBeenCalledWith(5);
    });

    it('never exposes email or password in leaderboard output', async () => {
      const mockPlayersWithPrivate = [
        { name: 'Charlie', totalStars: 15, completedLevels: 5, perfectLevels: 2, email: 'secret@hidden.com' },
      ];

      jest.spyOn(User, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPlayersWithPrivate),
      });

      const res = await request(app)
        .get('/api/leaderboard')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(res.body[0]).not.toHaveProperty('email');
      expect(res.body[0]).not.toHaveProperty('password');
    });
  });

  // ─── GET /api/leaderboard/me ───────────────────────────────────────────────

  describe('GET /api/leaderboard/me', () => {
    it('401 NO_TOKEN when authorization header is missing', async () => {
      const res = await request(app).get('/api/leaderboard/me');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('200 returns rank: null when user has no stars yet (totalStars = 0)', async () => {
      const userWithoutStars = {
        _id: MOCK_USER_ID,
        totalStars: 0,
        completedLevels: 0,
        perfectLevels: 0,
        createdAt: new Date('2026-01-01'),
      };

      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockImplementation(() => ({
          lean: jest.fn().mockResolvedValue(userWithoutStars),
          then: (resolve) => resolve(userWithoutStars),
        })),
      });

      const res = await request(app)
        .get('/api/leaderboard/me')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        rank: null,
        totalStars: 0,
        completedLevels: 0,
        perfectLevels: 0,
      });
    });

    it('200 returns rank: 1 when user is the #1 ranked player (0 users ahead)', async () => {
      const leaderUser = {
        _id: MOCK_USER_ID,
        totalStars: 50,
        completedLevels: 18,
        perfectLevels: 14,
        createdAt: new Date('2026-01-01'),
      };

      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockImplementation(() => ({
          lean: jest.fn().mockResolvedValue(leaderUser),
          then: (resolve) => resolve(leaderUser),
        })),
      });

      jest.spyOn(User, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/leaderboard/me')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        rank: 1,
        totalStars: 50,
        completedLevels: 18,
        perfectLevels: 14,
      });
    });

    it('200 returns rank = 1 + aheadCount applying compound ranking rules', async () => {
      const activeUser = {
        _id: MOCK_USER_ID,
        totalStars: 25,
        completedLevels: 9,
        perfectLevels: 4,
        createdAt: new Date('2026-03-01'),
      };

      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockImplementation(() => ({
          lean: jest.fn().mockResolvedValue(activeUser),
          then: (resolve) => resolve(activeUser),
        })),
      });

      // 4 users strictly ahead under the compound ranking rules
      const countSpy = jest.spyOn(User, 'countDocuments').mockResolvedValue(4);

      const res = await request(app)
        .get('/api/leaderboard/me')
        .set(authHeader());

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        rank: 5,
        totalStars: 25,
        completedLevels: 9,
        perfectLevels: 4,
      });

      // Verify countDocuments was called with the compound index query structure
      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStars: { $gt: 0 },
          $or: expect.arrayContaining([
            { totalStars: { $gt: 25 } },
            { totalStars: 25, completedLevels: { $gt: 9 } },
            { totalStars: 25, completedLevels: 9, perfectLevels: { $gt: 4 } },
            { totalStars: 25, completedLevels: 9, perfectLevels: 4, createdAt: { $lt: activeUser.createdAt } },
          ]),
        })
      );
    });
  });
});
