/**
 * Request Logger Middleware
 *
 * This module configures Morgan HTTP request logging middleware with Winston
 * integration for centralized logging. It provides environment-appropriate
 * logging formats and includes skip logic for health check endpoints.
 *
 * Features:
 * - 'dev' format for development (colorized, concise output)
 * - 'combined' Apache-style format for production
 * - Winston stream integration for unified logging
 * - Health check endpoint exclusion to reduce log noise
 * - Silent mode in test environment
 *
 * Migration from Flask:
 * This replaces Flask's built-in request logging with Morgan middleware
 * that integrates with the Winston logging system.
 *
 * Placement in Middleware Chain:
 * - Position 6 (after body parsers, before routes)
 * - Ensures all HTTP requests are logged before route handling
 *
 * @module middleware/requestLogger
 */

import morgan from 'morgan';
import { stream } from '../utils/logger.js';

/**
 * Environment detection flags.
 * Used to determine log format and skip behavior.
 * 
 * isDevelopment: true for any non-production environment (development, staging, etc.)
 * isTest: true only for test/testing environments
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv !== 'production';
const isTest = nodeEnv === 'test' || nodeEnv === 'testing';

/**
 * Determines the Morgan log format based on environment.
 *
 * - Development: 'dev' format provides colorized, concise output
 *   Example: GET /api/health 200 12.345 ms - 45
 *
 * - Production: 'combined' format provides Apache-style logging
 *   Example: ::1 - - [11/Dec/2024:12:00:00 +0000] "GET /api/health HTTP/1.1" 200 45 "-" "Mozilla/5.0"
 *
 * @type {string}
 */
const logFormat = isDevelopment ? 'dev' : 'combined';

/**
 * Skip function for Morgan middleware.
 *
 * Determines which requests should not be logged:
 * - Health check endpoints (to reduce log noise in production)
 * - All requests in test environment (keeps test output clean)
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} _res - Express response object (unused)
 * @returns {boolean} True if request should be skipped, false otherwise
 */
function skip(req, _res) {
  // Skip all logging in test environment
  if (isTest) {
    return true;
  }

  // Skip health check endpoints to reduce log noise
  // These endpoints are called frequently by load balancers and monitoring
  const healthPaths = ['/api/health', '/health', '/api/health/detailed'];
  return healthPaths.some((path) => req.url === path || req.url.startsWith(path + '?'));
}

/**
 * Morgan HTTP request logger middleware.
 *
 * Configured with:
 * - Environment-appropriate format (dev/combined)
 * - Winston stream integration for centralized logging
 * - Skip function to exclude health checks and test requests
 *
 * The stream option pipes Morgan output to Winston's http log level,
 * ensuring all application logs go through a single unified logging system.
 *
 * @type {import('express').RequestHandler}
 */
const requestLogger = morgan(logFormat, {
  stream: stream,
  skip: skip,
});

export { requestLogger };
export default requestLogger;
