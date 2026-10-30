const rateLimit = require('express-rate-limit');

/**
 * Central configuration for all rate limits across the application.
 * Easily adjust windows and max requests from this single location.
 */
const rateLimitConfig = {
  // Auth endpoints (/api/auth/login, /api/auth/register): 10 requests per 15 mins per IP
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  // Game session actions (/api/games): 60 requests per 1 minute per IP
  games: {
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many game actions, please slow down',
  },
  // General API routes (all other /api routes): 200 requests per 15 mins per IP
  api: {
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again later',
  },
};

/**
 * Helper to construct an express-rate-limit middleware instance
 * with standard JSON 429 error format and test-environment bypass.
 */
const createLimiter = (options, customSkip) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
      // Always bypass during test runs
      if (process.env.NODE_ENV === 'test') {
        return true;
      }
      if (typeof customSkip === 'function') {
        return customSkip(req, res);
      }
      return false;
    },
    handler: (req, res, next, opts) => {
      res.status(opts.statusCode || 429).json({
        message: options.message || 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
      });
    },
  });
};

const authLimiter = createLimiter(rateLimitConfig.auth);
const gamesLimiter = createLimiter(rateLimitConfig.games);

// General limiter for other /api routes — skips auth login/register and games routes
// so each rate-limited section has its own independent bucket.
const apiLimiter = createLimiter(rateLimitConfig.api, (req) => {
  const path = req.originalUrl || req.path;
  if (path.startsWith('/api/games')) {
    return true;
  }
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')) {
    return true;
  }
  return false;
});

module.exports = {
  rateLimitConfig,
  createLimiter,
  authLimiter,
  gamesLimiter,
  apiLimiter,
};
