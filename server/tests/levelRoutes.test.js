const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const User = require('../models/User');
const LevelProgress = require('../models/LevelProgress');

describe('Level Routes Integration', () => {
  const mockUserId = 'user-level-test-123';
  const token = jwt.sign({ sub: mockUserId }, env.JWT_SECRET);

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Puzzle Master',
        email: 'puzzle@happydrop.com',
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/levels', () => {
    it('should return 401 NO_TOKEN when authorization header is missing', async () => {
      const res = await request(app).get('/api/levels');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should return list of levels with default stars 0 and unlocked status', async () => {
      jest.spyOn(LevelProgress, 'find').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/levels')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const level1 = res.body.find((lvl) => lvl.id === 1);
      const level2 = res.body.find((lvl) => lvl.id === 2);

      expect(level1).toMatchObject({
        id: 1,
        name: expect.any(String),
        difficulty: expect.any(String),
        maxInk: expect.any(Number),
        stars: 0,
        unlocked: true,
      });

      expect(level2).toMatchObject({
        id: 2,
        stars: 0,
        unlocked: false,
      });

      // Verify referenceSolution is never sent in any level
      res.body.forEach((lvl) => {
        expect(lvl.referenceSolution).toBeUndefined();
      });
      expect(JSON.stringify(res.body)).not.toContain('referenceSolution');
    });

    it('should show level 2 as unlocked when level 1 has stars >= 1', async () => {
      jest.spyOn(LevelProgress, 'find').mockResolvedValue([
        { userId: mockUserId, levelId: 1, stars: 2 },
      ]);

      const res = await request(app)
        .get('/api/levels')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const level1 = res.body.find((lvl) => lvl.id === 1);
      const level2 = res.body.find((lvl) => lvl.id === 2);
      const level3 = res.body.find((lvl) => lvl.id === 3);

      expect(level1.stars).toBe(2);
      expect(level1.unlocked).toBe(true);

      expect(level2.stars).toBe(0);
      expect(level2.unlocked).toBe(true);

      expect(level3.unlocked).toBe(false);
    });
  });

  describe('GET /api/levels/generated/:seed', () => {
    it('should return 401 NO_TOKEN when authorization header is missing', async () => {
      const res = await request(app).get('/api/levels/generated/42');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should return 400 when seed is not an integer', async () => {
      const res = await request(app)
        .get('/api/levels/generated/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return 200 with generated level having id "gen-<seed>"', async () => {
      const res = await request(app)
        .get('/api/levels/generated/42')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 'gen-42');
      expect(res.body).toHaveProperty('seed', 42);
      expect(res.body).toHaveProperty('tap');
      expect(res.body).toHaveProperty('glass');
      expect(res.body).toHaveProperty('obstacles');
    });
  });

  describe('GET /api/levels/:id', () => {
    it('should return 400 when id is not an integer', async () => {
      const res = await request(app)
        .get('/api/levels/not-an-integer')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return 400 when id is a floating point number', async () => {
      const res = await request(app)
        .get('/api/levels/1.5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return 404 LEVEL_NOT_FOUND when level does not exist', async () => {
      const res = await request(app)
        .get('/api/levels/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('code', 'LEVEL_NOT_FOUND');
    });

    it('should return 403 LEVEL_LOCKED when requesting locked level', async () => {
      jest.spyOn(LevelProgress, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/levels/2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('code', 'LEVEL_LOCKED');
    });

    it('should return 200 with full level data without referenceSolution for unlocked level', async () => {
      const res = await request(app)
        .get('/api/levels/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        name: 'First Drop',
        targetWater: expect.any(Number),
        maxInk: expect.any(Number),
        starThresholds: expect.any(Object),
        tap: expect.any(Object),
        glass: expect.any(Object),
      });

      expect(res.body.referenceSolution).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('referenceSolution');
    });
  });
});
