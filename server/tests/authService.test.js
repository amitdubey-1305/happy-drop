const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const User = require('../models/User');
const env = require('../config/env');

describe('Auth Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Password rules', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => authService.validatePasswordRules('Short1')).toThrow(
        expect.objectContaining({ code: 'WEAK_PASSWORD' })
      );
    });

    it('should reject passwords with letters only', () => {
      expect(() => authService.validatePasswordRules('OnlyLettersLong')).toThrow(
        expect.objectContaining({ code: 'WEAK_PASSWORD' })
      );
    });

    it('should reject passwords with numbers only', () => {
      expect(() => authService.validatePasswordRules('1234567890')).toThrow(
        expect.objectContaining({ code: 'WEAK_PASSWORD' })
      );
    });

    it('should accept valid passwords containing letters and numbers', () => {
      expect(() => authService.validatePasswordRules('ValidPass123')).not.toThrow();
    });
  });

  describe('register', () => {
    it('should throw 409 EMAIL_TAKEN if email already exists', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue({ _id: 'existing123' });

      await expect(
        authService.register('Alice', 'alice@example.com', 'ValidPass123')
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_TAKEN',
      });
    });

    it('should register a new user and return user and valid JWT with sub', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const mockCreatedUser = {
        _id: 'newuser123',
        name: 'Alice',
        email: 'alice@example.com',
        totalStars: 0,
        completedLevels: 0,
        perfectLevels: 0,
        createdAt: new Date(),
      };
      jest.spyOn(User, 'create').mockResolvedValue(mockCreatedUser);

      const result = await authService.register('Alice', 'alice@example.com', 'ValidPass123');

      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('id', 'newuser123');
      expect(result.user).toHaveProperty('name', 'Alice');

      const decoded = jwt.verify(result.token, env.JWT_SECRET);
      expect(decoded.sub).toBe('newuser123');
    });
  });

  describe('login', () => {
    it('should return 401 with "Invalid email or password" when user not found', async () => {
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        authService.login('notfound@example.com', 'ValidPass123')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should return 401 with "Invalid email or password" when password is wrong', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'alice@example.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        authService.login('alice@example.com', 'WrongPassword123')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should return user and token when credentials are correct', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Alice',
        email: 'alice@example.com',
        totalStars: 5,
        completedLevels: 2,
        perfectLevels: 1,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.login('alice@example.com', 'CorrectPass123');

      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('id', 'user123');
      const decoded = jwt.verify(result.token, env.JWT_SECRET);
      expect(decoded.sub).toBe('user123');
    });
  });
});
