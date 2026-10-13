const jwt = require('jsonwebtoken');
const { z } = require('zod');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const env = require('../config/env');
const User = require('../models/User');

describe('Validate Middleware', () => {
  const schema = z.object({
    email: z.string().email(),
    score: z.number().min(0),
  });

  it('should return 400 with VALIDATION_ERROR on invalid body', () => {
    const req = { body: { email: 'bad-email', score: -5 } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        errors: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should remove unknown fields and call next() on valid body', () => {
    const req = {
      body: {
        email: 'player@example.com',
        score: 100,
        extraHackerField: 'delete-me',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({
      email: 'player@example.com',
      score: 100,
    });
    expect(req.body.extraHackerField).toBeUndefined();
  });
});

describe('Auth Middleware', () => {
  it('should return 401 NO_TOKEN when header is missing', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NO_TOKEN' })
    );
  });

  it('should return 401 INVALID_TOKEN for invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
  });

  it('should return 401 TOKEN_EXPIRED for expired token', async () => {
    const expiredToken = jwt.sign({ id: 'any-user-id' }, env.JWT_SECRET, {
      expiresIn: '-1s',
    });
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' })
    );
  });

  it('should return 401 if user no longer exists', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const token = jwt.sign({ id: 'deleted-user-id' }, env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );

    User.findById.mockRestore();
  });

  it('should set req.user and call next on valid token and existing user', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Player One',
      email: 'player@example.com',
    };

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const token = jwt.sign({ id: 'user123' }, env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await auth(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();

    User.findById.mockRestore();
  });
});
