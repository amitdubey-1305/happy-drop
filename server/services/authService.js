const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const validatePasswordRules = (password) => {
  if (!password || !passwordRegex.test(password)) {
    throw new ApiError(
      400,
      'WEAK_PASSWORD',
      'Password must be at least 8 characters long and contain at least one letter and one number'
    );
  }
};

const generateToken = (userId) => {
  return jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  totalStars: user.totalStars,
  completedLevels: user.completedLevels,
  perfectLevels: user.perfectLevels,
  createdAt: user.createdAt,
});

const register = async (name, email, password) => {
  validatePasswordRules(password);

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
  });

  const token = generateToken(user._id);

  return {
    user: formatUserResponse(user),
    token,
  };
};

const login = async (email, password) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const token = generateToken(user._id);

  return {
    user: formatUserResponse(user),
    token,
  };
};

module.exports = {
  register,
  login,
  validatePasswordRules,
  generateToken,
};
