/**
 * Centralized Error Handling Middleware
 *
 * This module provides comprehensive error handling for the Express application,
 * implementing the same error response format as the Flask implementation.
 *
 * Error Response Format (matching Flask app.py):
 * {
 *   "error": {
 *     "status": 404,
 *     "message": "Resource not found"
 *   }
 * }
 *
 * Features:
 * - Custom AppError class for operational errors
 * - Handles validation errors, HTTP errors, and unhandled exceptions
 * - Environment-aware stack trace inclusion (development only)
 * - Centralized logging through Winston
 *
 * Migration from Flask:
 * - Flask @app.errorhandler(400) → AppError with statusCode 400
 * - Flask @app.errorhandler(404) → Handled by notFound.js middleware
 * - Flask @app.errorhandler(405) → AppError with statusCode 405
 * - Flask @app.errorhandler(500) → Default error handling
 * - Flask @app.errorhandler(Exception) → Unhandled exception handling
 *
 * @module middleware/errorHandler
 */

import logger from '../utils/logger.js';

/**
 * Determines if the current environment is development.
 * Stack traces are only included in error responses during development.
 * @type {boolean}
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Custom error class for operational (expected) application errors.
 *
 * Use this class to create errors with specific HTTP status codes and messages.
 * These errors are considered "operational" meaning they are expected to occur
 * during normal application operation (validation failures, not found, etc.).
 *
 * @class AppError
 * @extends Error
 *
 * @example
 * throw new AppError('User not found', 404);
 * throw new AppError('Invalid input data', 400);
 */
class AppError extends Error {
  /**
   * Creates a new AppError instance.
   *
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (400, 404, 500, etc.)
   */
  constructor(message, statusCode) {
    super(message);

    /**
     * HTTP status code for this error.
     * @type {number}
     */
    this.statusCode = statusCode;

    /**
     * Error status string. Always 'error' for operational errors.
     * @type {string}
     */
    this.status = 'error';

    /**
     * Flag indicating this is an operational (expected) error.
     * Non-operational errors are programming bugs that should be fixed.
     * @type {boolean}
     */
    this.isOperational = true;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Gets a user-friendly error message based on status code.
 *
 * @param {number} statusCode - HTTP status code
 * @returns {string} Human-readable error message
 */
function getDefaultMessage(statusCode) {
  const messages = {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Resource not found',
    405: 'Method not allowed',
    408: 'Request timeout',
    409: 'Conflict',
    422: 'Unprocessable entity',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Gateway timeout',
  };
  return messages[statusCode] || 'An unexpected error occurred';
}

/**
 * Centralized error handling middleware.
 *
 * This middleware catches all errors that propagate through the Express
 * middleware chain and formats them as JSON responses. It must be
 * registered LAST in the middleware chain (after all routes).
 *
 * Features:
 * - Extracts status code from error object or defaults to 500
 * - Formats error response in consistent JSON format
 * - Logs errors appropriately (warn for 4xx, error for 5xx)
 * - Includes stack trace only in development mode
 * - Handles express-validator errors
 * - Handles http-errors package errors
 *
 * @param {Error} err - Error object thrown or passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Extract status code from error object
  // Support err.statusCode (AppError, http-errors) or err.status
  let statusCode = err.statusCode || err.status || 500;

  // Ensure statusCode is a valid number
  if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }

  // Get error message
  let message = err.message || getDefaultMessage(statusCode);

  // Handle express-validator errors (array of validation errors)
  if (err.errors && Array.isArray(err.errors)) {
    statusCode = 400;
    message = err.errors.map((e) => e.msg || e.message).join(', ');
  }

  // Log the error appropriately
  const logData = {
    statusCode,
    message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  if (statusCode >= 500) {
    // Server errors: log as error with stack trace
    logger.error('Server error occurred', {
      ...logData,
      stack: err.stack,
      error: err,
    });
  } else if (statusCode >= 400) {
    // Client errors: log as warning
    logger.warn('Client error occurred', logData);
  }

  // Build error response object
  const errorResponse = {
    error: {
      status: statusCode,
      message: message,
    },
  };

  // Include stack trace in development mode only
  if (isDevelopment && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send JSON error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper for Express route handlers.
 *
 * Wraps async route handlers to automatically catch promise rejections
 * and pass them to the error handling middleware.
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export { errorHandler, AppError, asyncHandler };
export default errorHandler;
