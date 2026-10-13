const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication token required',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required',
        code: 'NO_TOKEN',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    const userId = decoded.sub || decoded.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
        code: 'INVALID_TOKEN',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = auth;
