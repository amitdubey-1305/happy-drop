class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message || code);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.message = message || code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code = 'BAD_REQUEST', message = 'Bad request') {
    return new ApiError(400, code, message);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Unauthorized') {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'Forbidden') {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }

  static conflict(code = 'CONFLICT', message = 'Conflict') {
    return new ApiError(409, code, message);
  }

  static internal(code = 'INTERNAL_SERVER_ERROR', message = 'Internal server error') {
    return new ApiError(500, code, message);
  }
}

module.exports = ApiError;
