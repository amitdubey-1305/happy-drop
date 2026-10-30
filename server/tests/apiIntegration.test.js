const testHelper = require('./testHelper');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const LevelProgress = require('../models/LevelProgress');

describe('Full API Integration Tests (Task 10.3)', () => {
  // Use a longer timeout for downloading or starting MongoMemoryServer
  beforeAll(async () => {
    await testHelper.connect();
  }, 120000);

  afterAll(async () => {
    await testHelper.close();
  });

  beforeEach(async () => {
    await testHelper.clear();
  });

  // Helper to register and get token
  const createPlayer = async (name, email, password = 'Password123') => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name, email, password });
    return {
      token: res.body.token,
      user: {
        ...res.body.user,
        _id: res.body.user?.id || res.body.user?._id,
      },
    };
  };

  // ─── 1. AUTH API TESTS ─────────────────────────────────────────────────────

  describe('Auth API', () => {
    it('register: creates user, returns token and sanitized user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice',
          email: 'alice@happydrop.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        name: 'Alice',
        email: 'alice@happydrop.com',
      });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('login: logs in existing user with correct credentials', async () => {
      await createPlayer('Bob', 'bob@happydrop.com', 'Password123');

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@happydrop.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        name: 'Bob',
        email: 'bob@happydrop.com',
      });
    });

    it('me: returns authenticated user profile', async () => {
      const { token } = await createPlayer('Charlie', 'charlie@happydrop.com');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({
        name: 'Charlie',
        email: 'charlie@happydrop.com',
      });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('duplicate email: returns 409 conflict when email is already registered', async () => {
      await createPlayer('Dave', 'dave@happydrop.com');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Dave Clone',
          email: 'dave@happydrop.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('code', 'EMAIL_TAKEN');
    });

    it('weak password: returns 400 VALIDATION_ERROR when password lacks numbers or is short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weakling',
          email: 'weak@happydrop.com',
          password: 'onlyletters',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('wrong password: returns 401 INVALID_CREDENTIALS for incorrect password', async () => {
      await createPlayer('Frank', 'frank@happydrop.com', 'Password123');

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'frank@happydrop.com',
          password: 'WrongPassword999',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('missing token: returns 401 NO_TOKEN when authorization header is absent', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('bad token: returns 401 INVALID_TOKEN when token is corrupted', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'INVALID_TOKEN');
    });
  });

  // ─── 2. LEVELS API TESTS ───────────────────────────────────────────────────

  describe('Levels API', () => {
    it('new user sees only level 1 unlocked', async () => {
      const { token } = await createPlayer('Gamer', 'gamer@happydrop.com');

      const res = await request(app)
        .get('/api/levels')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const level1 = res.body.find((l) => l.id === 1);
      const level2 = res.body.find((l) => l.id === 2);

      expect(level1.unlocked).toBe(true);
      expect(level2.unlocked).toBe(false);
    });

    it('level 2 returns 403 LEVEL_LOCKED for a new player', async () => {
      const { token } = await createPlayer('Gamer2', 'gamer2@happydrop.com');

      const res = await request(app)
        .get('/api/levels/2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('code', 'LEVEL_LOCKED');
    });

    it('unknown level returns 404 LEVEL_NOT_FOUND', async () => {
      const { token } = await createPlayer('Gamer3', 'gamer3@happydrop.com');

      const res = await request(app)
        .get('/api/levels/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('code', 'LEVEL_NOT_FOUND');
    });

    it('generated level is repeatable for the same seed', async () => {
      const { token } = await createPlayer('Gamer4', 'gamer4@happydrop.com');

      const res1 = await request(app)
        .get('/api/levels/generated/42')
        .set('Authorization', `Bearer ${token}`);

      const res2 = await request(app)
        .get('/api/levels/generated/42')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res1.body).toEqual(res2.body);
    });
  });

  // ─── 3. GAMES API TESTS ────────────────────────────────────────────────────

  describe('Games API', () => {
    it('start then complete gives 3 stars', async () => {
      const { token } = await createPlayer('Speedster', 'speedster@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      expect(startRes.statusCode).toBe(201);
      const sessionId = startRes.body.sessionId;

      // Backdate session startedAt so elapsed time check passes in automated test
      await GameSession.findByIdAndUpdate(sessionId, { startedAt: new Date(Date.now() - 30_000) });

      // Complete with low ink (20 <= 0.40 * 300) and valid time (5 seconds)
      const completeRes = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId,
          levelId: 1,
          inkUsed: 20,
          completionTime: 5,
        });

      expect(completeRes.statusCode).toBe(200);
      expect(completeRes.body.stars).toBe(3);
      expect(completeRes.body.isNewBest).toBe(true);
      expect(completeRes.body.nextLevelUnlocked).toBe(2);
      expect(completeRes.body.duplicate).toBe(false);
    });

    it('the same request twice returns duplicate true with no double counting', async () => {
      const { token, user } = await createPlayer('Twin', 'twin@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      await GameSession.findByIdAndUpdate(startRes.body.sessionId, {
        startedAt: new Date(Date.now() - 30_000),
      });

      const payload = {
        sessionId: startRes.body.sessionId,
        levelId: 1,
        inkUsed: 30,
        completionTime: 8,
      };

      const res1 = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.duplicate).toBe(false);

      // Repeat identical complete request
      const res2 = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.duplicate).toBe(true);

      // Verify user totalStars was only incremented once (3 stars)
      const userInDb = await User.findById(user._id);
      expect(userInDb.totalStars).toBe(3);
      expect(userInDb.completedLevels).toBe(1);
    });

    it('ink above max returns 400 INVALID_INK', async () => {
      const { token } = await createPlayer('Inky', 'inky@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      // Max ink for level 1 is 300
      const res = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: startRes.body.sessionId,
          levelId: 1,
          inkUsed: 500,
          completionTime: 10,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_INK');
    });

    it('time too short returns 400 INVALID_TIME', async () => {
      const { token } = await createPlayer('Flash', 'flash@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      // completionTime must be >= 2 seconds
      const res = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: startRes.body.sessionId,
          levelId: 1,
          inkUsed: 20,
          completionTime: 1,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_TIME');
    });

    it('time larger than real elapsed time returns 400 INVALID_TIME', async () => {
      const { token } = await createPlayer('TimeTraveler', 'traveler@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      // Move startedAt in database to 2 seconds ago
      await GameSession.findByIdAndUpdate(startRes.body.sessionId, {
        startedAt: new Date(Date.now() - 2000),
      });

      // Claiming 100 seconds when only 2 seconds elapsed
      const res = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: startRes.body.sessionId,
          levelId: 1,
          inkUsed: 20,
          completionTime: 100,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'INVALID_TIME');
    });

    it("another user's session returns 404 SESSION_NOT_FOUND", async () => {
      const playerA = await createPlayer('PlayerA', 'a@happydrop.com');
      const playerB = await createPlayer('PlayerB', 'b@happydrop.com');

      const startRes = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${playerA.token}`)
        .send({ levelId: 1 });

      // Player B tries to complete Player A's session
      const res = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${playerB.token}`)
        .send({
          sessionId: startRes.body.sessionId,
          levelId: 1,
          inkUsed: 20,
          completionTime: 10,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('code', 'SESSION_NOT_FOUND');
    });

    it('replay with worse ink does not lower stars or totals', async () => {
      const { token, user } = await createPlayer('PerfectFirst', 'perfect@happydrop.com');

      // 1. First run: flawless 3 stars
      const session1 = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      await GameSession.findByIdAndUpdate(session1.body.sessionId, {
        startedAt: new Date(Date.now() - 30_000),
      });

      await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: session1.body.sessionId,
          levelId: 1,
          inkUsed: 20, // 3 stars
          completionTime: 10,
        });

      // 2. Second run: messy 1 star (inkUsed 250 / 300 > 0.70)
      const session2 = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      await GameSession.findByIdAndUpdate(session2.body.sessionId, {
        startedAt: new Date(Date.now() - 30_000),
      });

      const res2 = await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: session2.body.sessionId,
          levelId: 1,
          inkUsed: 250,
          completionTime: 12,
        });

      expect(res2.statusCode).toBe(200);
      expect(res2.body.stars).toBe(1); // this run gave 1 star
      expect(res2.body.bestStars).toBe(3); // best stars retained
      expect(res2.body.isNewBest).toBe(false);

      // Verify LevelProgress retained best 3 stars
      const progress = await LevelProgress.findOne({ userId: user._id, levelId: 1 });
      expect(progress.stars).toBe(3);

      // Verify User totalStars was not decreased
      const userInDb = await User.findById(user._id);
      expect(userInDb.totalStars).toBe(3);
    });
  });

  // ─── 4. PROGRESS & STATS API TESTS ─────────────────────────────────────────

  describe('Progress and Stats API', () => {
    it('numbers are correct after completing two levels', async () => {
      const { token, user } = await createPlayer('MultiLevel', 'multi@happydrop.com');

      // Complete Level 1 (3 stars)
      const s1 = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 1 });

      await GameSession.findByIdAndUpdate(s1.body.sessionId, {
        startedAt: new Date(Date.now() - 30_000),
      });

      await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: s1.body.sessionId,
          levelId: 1,
          inkUsed: 20,
          completionTime: 10,
        });

      // Complete Level 2 (3 stars)
      const s2 = await request(app)
        .post('/api/games/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ levelId: 2 });

      await GameSession.findByIdAndUpdate(s2.body.sessionId, {
        startedAt: new Date(Date.now() - 30_000),
      });

      await request(app)
        .post('/api/games/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: s2.body.sessionId,
          levelId: 2,
          inkUsed: 30,
          completionTime: 12,
        });

      // Verify GET /api/progress returns both levels
      const progressRes = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(progressRes.statusCode).toBe(200);
      expect(progressRes.body).toHaveLength(2);
      expect(progressRes.body[0]).toMatchObject({ levelId: 1, stars: 3 });
      expect(progressRes.body[1]).toMatchObject({ levelId: 2, stars: 3 });

      // Verify GET /api/stats/me has accurate aggregated numbers
      const statsRes = await request(app)
        .get('/api/stats/me')
        .set('Authorization', `Bearer ${token}`);

      expect(statsRes.statusCode).toBe(200);
      expect(statsRes.body.levelsCompleted).toBe(2);
      expect(statsRes.body.totalStars).toBe(6);
      expect(statsRes.body.perfectLevels).toBe(2);
      expect(statsRes.body.totalAttempts).toBe(2);
      expect(statsRes.body.bestCompletion).toBe(3);
      // 2 / 20 * 100 = 10%
      expect(statsRes.body.progressPercent).toBe(10);
      expect(statsRes.body.recentLevels).toHaveLength(2);
      expect(statsRes.body.achievements).toContain('First Drop');
    });
  });

  // ─── 5. LEADERBOARD API TESTS ──────────────────────────────────────────────

  describe('Leaderboard API', () => {
    it('ranks players with tie-breaks and computes individual /me rank', async () => {
      // Create 5 users with specific rankings:
      // U1: 30 stars, 10 completed, 10 perfect, older
      // U2: 25 stars, 9 completed, 5 perfect, older
      // U3: 25 stars, 8 completed, 5 perfect, older
      // U4: 25 stars, 8 completed, 4 perfect, created 2026-01-01
      // U5: 25 stars, 8 completed, 4 perfect, created 2026-01-02 (younger)
      // U0: 0 stars (should not appear in getTop, /me rank should be null)
      const u1 = await User.create({
        name: 'Player 1',
        email: 'u1@test.com',
        password: 'Password123',
        totalStars: 30,
        completedLevels: 10,
        perfectLevels: 10,
        createdAt: new Date('2026-01-01'),
      });

      const u2 = await User.create({
        name: 'Player 2',
        email: 'u2@test.com',
        password: 'Password123',
        totalStars: 25,
        completedLevels: 9,
        perfectLevels: 5,
        createdAt: new Date('2026-01-01'),
      });

      const u3 = await User.create({
        name: 'Player 3',
        email: 'u3@test.com',
        password: 'Password123',
        totalStars: 25,
        completedLevels: 8,
        perfectLevels: 5,
        createdAt: new Date('2026-01-01'),
      });

      const u4 = await User.create({
        name: 'Player 4',
        email: 'u4@test.com',
        password: 'Password123',
        totalStars: 25,
        completedLevels: 8,
        perfectLevels: 4,
        createdAt: new Date('2026-01-01'),
      });

      const u5 = await User.create({
        name: 'Player 5',
        email: 'u5@test.com',
        password: 'Password123',
        totalStars: 25,
        completedLevels: 8,
        perfectLevels: 4,
        createdAt: new Date('2026-01-02'),
      });

      const u0 = await User.create({
        name: 'Player 0',
        email: 'u0@test.com',
        password: 'Password123',
        totalStars: 0,
        completedLevels: 0,
        perfectLevels: 0,
        createdAt: new Date('2026-01-01'),
      });

      // Log in as U5 to test
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'u5@test.com', password: 'Password123' });

      const token5 = loginRes.body.token;

      // Verify GET /api/leaderboard ranking order
      const boardRes = await request(app)
        .get('/api/leaderboard?limit=20')
        .set('Authorization', `Bearer ${token5}`);

      expect(boardRes.statusCode).toBe(200);
      expect(boardRes.body).toHaveLength(5);
      expect(boardRes.body[0].name).toBe('Player 1'); // rank 1
      expect(boardRes.body[1].name).toBe('Player 2'); // rank 2
      expect(boardRes.body[2].name).toBe('Player 3'); // rank 3
      expect(boardRes.body[3].name).toBe('Player 4'); // rank 4
      expect(boardRes.body[4].name).toBe('Player 5'); // rank 5
      // Player 0 with 0 stars must be excluded
      expect(boardRes.body.some((p) => p.name === 'Player 0')).toBe(false);

      // Verify GET /api/leaderboard/me for User 5 -> rank 5
      const meRes5 = await request(app)
        .get('/api/leaderboard/me')
        .set('Authorization', `Bearer ${token5}`);

      expect(meRes5.statusCode).toBe(200);
      expect(meRes5.body.rank).toBe(5);
      expect(meRes5.body.totalStars).toBe(25);

      // Log in as User 0 (0 stars) -> rank must be null
      const loginRes0 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'u0@test.com', password: 'Password123' });

      const meRes0 = await request(app)
        .get('/api/leaderboard/me')
        .set('Authorization', `Bearer ${loginRes0.body.token}`);

      expect(meRes0.statusCode).toBe(200);
      expect(meRes0.body.rank).toBeNull();
      expect(meRes0.body.totalStars).toBe(0);
    });
  });
});
