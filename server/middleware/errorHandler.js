const ApiError = require('../utils/ApiError');

// 404 handler for routes that do not exist
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    message: isProduction && !err.statusCode ? 'Internal server error' : (err.message || 'Something went wrong'),
    code,
  };

  // Only include stack trace outside production
  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
