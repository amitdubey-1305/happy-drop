const ApiError = require('../utils/ApiError');

// 404 handler for routes that do not exist
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

// Global centralized error handler
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';

  // 1. Mongoose Validation Error -> 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const issues = err.errors ? Object.values(err.errors).map((e) => e.message) : [];
    message = issues.length > 0 ? issues.join(', ') : err.message;
  }
  // 2. Mongoose CastError (bad ObjectId or invalid type conversion) -> 400
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_INPUT';
    message = `Invalid ${err.path || 'identifier'}: ${err.value}`;
  }
  // 3. Mongo Duplicate Key Error (11000) -> 409
  else if (err.code === 11000 || (err.errorResponse && err.errorResponse.code === 11000)) {
    statusCode = 409;
    code = 'CONFLICT';
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    message = `Duplicate value for ${field}`;
  }
  // 4. Body too large (express.json limit) -> 413
  else if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload too large';
  }
  // 5. Custom operational ApiError (explicit statusCode & code)
  else if (err instanceof ApiError || (err.statusCode && err.code)) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message || code;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const response = {
    message,
    code,
  };

  // Only expose stack traces outside production for non-500 or debug purposes
  if (!isProduction && err.stack && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
