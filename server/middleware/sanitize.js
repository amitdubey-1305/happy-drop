const ApiError = require('../utils/ApiError');

/**
 * Recursively scans an object, array, or primitive to detect
 * any prohibited key containing '.' or starting with '$'.
 * Protects against NoSQL operator injection and path traversal attacks.
 */
const hasProhibitedKey = (target) => {
  if (!target || typeof target !== 'object') {
    return false;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      if (hasProhibitedKey(item)) {
        return true;
      }
    }
    return false;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (typeof target[key] === 'object' && target[key] !== null) {
      if (hasProhibitedKey(target[key])) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Middleware that rejects any request where req.body, req.query, or req.params
 * contains keys starting with '$' or containing '.'
 */
const sanitizeNoSql = (req, res, next) => {
  if (
    hasProhibitedKey(req.body) ||
    hasProhibitedKey(req.query) ||
    hasProhibitedKey(req.params)
  ) {
    return next(new ApiError(400, 'INVALID_INPUT', 'Prohibited character in input keys'));
  }
  next();
};

module.exports = sanitizeNoSql;
