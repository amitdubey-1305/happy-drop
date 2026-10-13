const request = require('supertest');
const app = require('../app');
const authService = require('../services/authService');
const User = require('../models/User');

describe('Auth Routes Integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token and user without password', async () => {
      jest.spyOn(authService, 'register').mockResolvedValue({
        token: 'mock-jwt-token-abc',
        user: {
          id: 'mock-id-123',
          name: 'Super Player',
          email: 'player@happydrop.com',
          totalStars: 0,
          completedLevels: 0,
          perfectLevels: 0,
        },
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Super Player',
          email: 'player@happydrop.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token', 'mock-jwt-token-abc');
      expect(res.body.user).toHaveProperty('id', 'mock-id-123');
      expect(res.body.user).toHaveProperty('email', 'player@happydrop.com');
      expect(res.body.user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Password123');
    });

    it('should return 400 VALIDATION_ERROR on invalid or weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Super Player',
          email: 'player@happydrop.com',
          password: 'short',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user and return token and user without password', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue({
        token: 'mock-jwt-token-login',
        user: {
          id: 'user-login-123',
          name: 'Logged In Player',
          email: 'login@happydrop.com',
          totalStars: 10,
          completedLevels: 4,
          perfectLevels: 2,
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@happydrop.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token', 'mock-jwt-token-login');
      expect(res.body.user).toHaveProperty('email', 'login@happydrop.com');
      expect(res.body.user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Password123');
    });

    it('should return 400 VALIDATION_ERROR when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 NO_TOKEN when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should return the current user without password when valid token is sent', async () => {
      const jwt = require('jsonwebtoken');
      const env = require('../config/env');
      const token = jwt.sign({ sub: 'user-me-123' }, env.JWT_SECRET);

      const mockDbUser = {
        _id: 'user-me-123',
        name: 'Me Player',
        email: 'me@happydrop.com',
        totalStars: 15,
        completedLevels: 5,
        perfectLevels: 3,
        toObject: () => ({
          _id: 'user-me-123',
          name: 'Me Player',
          email: 'me@happydrop.com',
          totalStars: 15,
          completedLevels: 5,
          perfectLevels: 3,
        }),
      };

      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockDbUser),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'me@happydrop.com');
      expect(res.body.user.password).toBeUndefined();
    });
  });
});
