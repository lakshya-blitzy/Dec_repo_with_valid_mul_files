/**
 * Express Application Factory
 *
 * This module creates and configures the Express application with a comprehensive
 * middleware stack, route registration, and error handling. It implements the
 * application factory pattern, similar to Flask's create_app() function.
 *
 * Middleware Stack (in registration order per Section 0.5.3):
 * 1. helmet() - Security headers
 * 2. cors() - CORS handling
 * 3. compression() - Response compression
 * 4. express.json() - JSON body parsing
 * 5. express.urlencoded() - URL-encoded body parsing
 * 6. requestLogger - Morgan HTTP logging
 * 7. routes - API endpoints (mounted at /api)
 * 8. notFoundHandler - 404 responses
 * 9. errorHandler - Centralized error handling
 *
 * Migration from Flask:
 * - Flask create_app(config_name) → Express createApp()
 * - CORS(app, resources={...}) → cors() middleware
 * - @app.errorhandler decorators → errorHandler middleware
 * - Blueprint registration → Express Router mounting
 *
 * Usage:
 *   import { createApp } from './app.js';
 *   const app = createApp();
 *   // or
 *   import createApp from './app.js';
 *   const app = createApp();
 *
 * @module app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

/**
 * Creates and configures the Express application.
 *
 * This factory function sets up the complete Express application with:
 * - Security middleware (Helmet, CORS)
 * - Request parsing middleware (JSON, URL-encoded)
 * - Compression middleware
 * - Request logging (Morgan with Winston)
 * - API routes
 * - Error handling middleware
 *
 * The middleware is registered in a specific order that ensures proper
 * request processing and error handling.
 *
 * @returns {import('express').Express} Configured Express application instance
 *
 * @example
 * const app = createApp();
 * app.listen(3000, () => console.log('Server running'));
 */
function createApp() {
  // Create Express application instance
  const app = express();

  // Attach logger to app.locals for access throughout the application
  app.locals.logger = logger;

  // ---------------------------------------------------------------------------
  // Security Middleware (Order 1-2)
  // ---------------------------------------------------------------------------

  /**
   * Helmet middleware - Sets various HTTP security headers
   * Protects against common vulnerabilities:
   * - XSS attacks
   * - Clickjacking
   * - MIME type sniffing
   * - And more
   */
  app.use(helmet());

  /**
   * CORS middleware - Enables Cross-Origin Resource Sharing
   * Configures allowed origins from environment config
   * Supports credentials for authenticated requests
   */
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // ---------------------------------------------------------------------------
  // Response Optimization (Order 3)
  // ---------------------------------------------------------------------------

  /**
   * Compression middleware - Gzip compression for responses
   * Only compresses responses above the configured threshold
   */
  app.use(
    compression({
      threshold: config.compressionThreshold,
    }),
  );

  // ---------------------------------------------------------------------------
  // Request Parsing Middleware (Order 4-5)
  // ---------------------------------------------------------------------------

  /**
   * JSON body parser
   * Parses incoming requests with JSON payloads
   * Limit is configurable via REQUEST_LIMIT environment variable
   */
  app.use(
    express.json({
      limit: config.requestLimit,
    }),
  );

  /**
   * URL-encoded body parser
   * Parses incoming requests with URL-encoded payloads
   * Extended mode allows rich objects and arrays
   */
  app.use(
    express.urlencoded({
      extended: true,
      limit: config.requestLimit,
    }),
  );

  // ---------------------------------------------------------------------------
  // Logging Middleware (Order 6)
  // ---------------------------------------------------------------------------

  /**
   * Request logger - Morgan HTTP request logging
   * Logs all incoming HTTP requests through Winston
   * Format varies by environment (dev/combined)
   */
  app.use(requestLogger);

  // ---------------------------------------------------------------------------
  // API Routes (Order 7)
  // ---------------------------------------------------------------------------

  /**
   * Mount all API routes under /api prefix
   * Routes are aggregated in routes/index.js
   * Results in endpoints like:
   * - GET /api/health
   * - GET /api/health/detailed
   */
  app.use('/api', routes);

  // ---------------------------------------------------------------------------
  // Error Handling Middleware (Order 8-9)
  // ---------------------------------------------------------------------------

  /**
   * Not Found handler - Catches unmatched routes
   * Returns 404 JSON response for any request that doesn't match a route
   * Must be registered after all routes
   */
  app.use(notFoundHandler);

  /**
   * Error handler - Centralized error handling
   * Catches all errors and formats them as JSON responses
   * Must be the LAST middleware registered
   */
  app.use(errorHandler);

  // Log application initialization (only in non-test environments)
  if (!config.isTesting) {
    logger.info('Express application created', {
      environment: config.nodeEnv,
      corsOrigin: config.corsOrigin,
      requestLimit: config.requestLimit,
      compressionThreshold: config.compressionThreshold,
    });
  }

  return app;
}

// Named export
export { createApp };

// Default export
export default createApp;
