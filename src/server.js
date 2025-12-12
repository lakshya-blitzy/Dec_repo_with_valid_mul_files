/**
 * HTTP Server Entry Point
 *
 * This module creates the HTTP server, binds it to a configured port, and
 * implements graceful shutdown handling for production deployments.
 *
 * Features:
 * - HTTP server creation using Node.js http module
 * - Configurable port binding from environment
 * - Graceful shutdown for SIGTERM and SIGINT signals
 * - PM2 ready signal for cluster mode deployment
 * - Uncaught exception and unhandled rejection handling
 *
 * This is the main entry point for the application and is referenced by:
 * - package.json scripts (npm start, npm run dev)
 * - ecosystem.config.js (PM2 configuration)
 * - Dockerfile CMD instruction
 *
 * Migration from Flask:
 * - Replaces Flask's app.run() development server
 * - Replaces Gunicorn WSGI server for production
 * - Maintains equivalent host/port binding behavior
 *
 * Usage:
 *   node src/server.js
 *   npm start
 *   pm2 start ecosystem.config.js
 *
 * @module server
 */

import http from 'http';
import { createApp } from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';

// -----------------------------------------------------------------------------
// Application and Server Initialization
// -----------------------------------------------------------------------------

/**
 * Create Express application instance.
 * The app is created using the factory pattern from app.js.
 * This mirrors Flask's create_app() pattern from the original Python implementation.
 */
const app = createApp();

/**
 * Create HTTP server wrapping the Express application.
 * Using http.createServer allows for:
 * - Graceful shutdown via server.close()
 * - Access to raw HTTP server events
 * - Proper signal handling for PM2 cluster mode
 *
 * This replaces Gunicorn's WSGI server from the Python implementation.
 */
const server = http.createServer(app);

/**
 * Port to bind the server to.
 * Loaded from config which reads from PORT environment variable.
 * Defaults to 3000 (vs Flask's default of 5000).
 * @type {number}
 */
const PORT = config.port;

// -----------------------------------------------------------------------------
// Shutdown Management
// -----------------------------------------------------------------------------

/**
 * Flag to track if shutdown has been initiated.
 * Prevents multiple shutdown attempts from concurrent signals.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * Graceful shutdown timeout in milliseconds.
 * Server will force close after this time if connections don't close.
 * Set to 30 seconds per Section 0.5.1 specification.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 30000;

/**
 * Gracefully shuts down the HTTP server.
 *
 * This function implements the graceful shutdown pattern required for
 * production deployments with PM2 and container orchestration:
 *
 * 1. Stops accepting new connections immediately
 * 2. Waits for existing connections to complete their requests
 * 3. Forces exit after timeout if connections don't close gracefully
 * 4. Exits with appropriate code for PM2 restart behavior
 *
 * Per Section 0.7.6 (Graceful Shutdown Handling):
 * - SIGTERM: Graceful shutdown with 30 second timeout
 * - SIGINT: Graceful shutdown with 30 second timeout
 *
 * @function shutdown
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT, etc.)
 * @returns {void}
 * 
 * @example
 * // Called automatically via signal handlers:
 * process.on('SIGTERM', () => shutdown('SIGTERM'));
 * 
 * // Shutdown behavior:
 * // 1. Logs "SIGTERM received, starting graceful shutdown..."
 * // 2. Stops accepting new connections
 * // 3. Waits up to 30s for active requests to complete
 * // 4. Logs "HTTP server closed successfully"
 * // 5. Exits with code 0 (or 1 on timeout/error)
 */
function shutdown(signal) {
  // Prevent multiple shutdown attempts from concurrent signals
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring additional signal', {
      signal,
      pid: process.pid,
    });
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`, {
    signal,
    pid: process.pid,
    environment: config.nodeEnv,
  });

  // Set a timeout for forced shutdown
  // Uses unref() so the timer doesn't keep the event loop alive
  const shutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit', {
      timeout: SHUTDOWN_TIMEOUT,
      signal,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Unref the timer so it doesn't prevent the process from exiting
  // if shutdown completes before the timeout
  shutdownTimer.unref();

  // Stop accepting new connections and wait for existing to complete
  server.close((err) => {
    if (err) {
      logger.error('Error during server close', {
        error: err.message,
        stack: err.stack,
        signal,
      });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }

    logger.info('HTTP server closed successfully', {
      signal,
      pid: process.pid,
    });
    clearTimeout(shutdownTimer);
    process.exit(0);
  });
}

// -----------------------------------------------------------------------------
// Server Event Handlers
// -----------------------------------------------------------------------------

/**
 * Handles the server 'listening' event.
 * 
 * Called when the HTTP server has successfully bound to the configured port
 * and is ready to accept incoming connections.
 *
 * This function performs two critical actions:
 * 1. Logs the successful server startup with full environment context
 * 2. Sends the PM2 'ready' signal for cluster mode coordination
 *
 * @function onListening
 * @returns {void}
 * 
 * @example
 * // Attached as event listener:
 * server.on('listening', onListening);
 * 
 * // Log output example:
 * // {"level":"info","message":"Server started successfully",
 * //  "port":3000,"environment":"production","pid":12345,"host":"0.0.0.0"}
 * 
 * @see {@link https://nodejs.org/api/net.html#event-listening} Node.js listening event
 * @see {@link https://pm2.keymetrics.io/docs/usage/signals-clean-restart/} PM2 ready signal
 */
function onListening() {
  logger.info('Server started successfully', {
    port: PORT,
    environment: config.nodeEnv,
    pid: process.pid,
    host: '0.0.0.0',
  });

  // Send ready signal to PM2 for cluster mode
  // This is used when wait_ready is enabled in ecosystem.config.js
  // per Section 0.5.6 PM2 Configuration Design
  if (typeof process.send === 'function') {
    process.send('ready');
    logger.info('Ready signal sent to PM2', {
      pid: process.pid,
    });
  }
}

/**
 * Handles the server 'error' event.
 * 
 * Provides specific, user-friendly handling for common server startup errors:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Port requires elevated privileges (typically ports < 1024)
 *
 * For other errors not related to listening (syscall !== 'listen'),
 * the error is re-thrown to be handled by the uncaughtException handler.
 *
 * @function onError
 * @param {Error} error - The error object from the server
 * @param {string} error.code - The error code (e.g., 'EADDRINUSE', 'EACCES')
 * @param {string} error.syscall - The system call that failed (e.g., 'listen')
 * @returns {void}
 * @throws {Error} Re-throws if error.syscall is not 'listen'
 * 
 * @example
 * // Attached as event listener:
 * server.on('error', onError);
 * 
 * // EADDRINUSE handling:
 * // Logs: "Port 3000 is already in use"
 * // Suggestion: "Stop the other process using this port or use a different port"
 * // Exits with code 1
 * 
 * // EACCES handling:
 * // Logs: "Port 80 requires elevated privileges"
 * // Suggestion: "Use a port >= 1024 or run with elevated privileges"
 * // Exits with code 1
 * 
 * @see {@link https://nodejs.org/api/errors.html#common-system-errors} Node.js System Errors
 */
function onError(error) {
  // Only handle listen-related errors here
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = `Port ${PORT}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    logger.error(`${bind} requires elevated privileges`, {
      port: PORT,
      errorCode: error.code,
      suggestion: 'Use a port >= 1024 or run with elevated privileges',
    });
    process.exit(1);
    break;

  case 'EADDRINUSE':
    logger.error(`${bind} is already in use`, {
      port: PORT,
      errorCode: error.code,
      suggestion: 'Stop the other process using this port or use a different port',
    });
    process.exit(1);
    break;

  default:
    // Re-throw unknown errors
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Signal Handlers
// -----------------------------------------------------------------------------

/**
 * SIGTERM handler - Triggered by:
 * - Docker stop command (docker stop container_id)
 * - Kubernetes pod termination (kubectl delete pod)
 * - PM2 stop/restart commands (pm2 stop, pm2 reload)
 * - Systemd service stop
 *
 * Per Section 0.7.6, this initiates graceful shutdown with 30s timeout.
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * SIGINT handler - Triggered by:
 * - Ctrl+C in terminal
 * - IDE stop buttons
 * - Some process managers
 *
 * Per Section 0.7.6, this initiates graceful shutdown with 30s timeout.
 */
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Uncaught exception handler.
 * Logs the error and initiates graceful shutdown.
 *
 * This catches synchronous errors that weren't caught by try-catch blocks.
 * In production, this should ideally trigger alerts/monitoring.
 *
 * Per key changes item 13, we handle uncaught exceptions to ensure
 * the server doesn't crash without proper logging and cleanup.
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
    pid: process.pid,
    environment: config.nodeEnv,
  });
  shutdown('uncaughtException');
});

/**
 * Unhandled promise rejection handler.
 * Logs the error and initiates graceful shutdown.
 *
 * This catches async errors that weren't properly caught with .catch()
 * or try-catch in async/await code.
 *
 * Per key changes item 14, we handle unhandled rejections to ensure
 * async errors are properly logged and the server shuts down cleanly.
 */
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    pid: process.pid,
    environment: config.nodeEnv,
  });
  shutdown('unhandledRejection');
});

// -----------------------------------------------------------------------------
// Server Startup
// -----------------------------------------------------------------------------

// Attach event handlers to server before starting
server.on('error', onError);
server.on('listening', onListening);

// Start listening for connections
// Binding to '0.0.0.0' allows connections from any network interface
// This is equivalent to Flask's app.run(host='0.0.0.0', port=port)
server.listen(PORT, '0.0.0.0');

/**
 * Export server and app for testing purposes.
 * 
 * These exports enable integration tests to:
 * - Access the Express app instance directly for supertest
 * - Control the HTTP server lifecycle in tests
 * - Verify server configuration and middleware
 * 
 * @example
 * // In test files:
 * import { app, server } from '../src/server.js';
 * import request from 'supertest';
 * 
 * describe('API Tests', () => {
 *   afterAll(() => server.close());
 *   
 *   it('should respond to health check', async () => {
 *     const res = await request(app).get('/api/health');
 *     expect(res.status).toBe(200);
 *   });
 * });
 */
export { app, server };

/**
 * Log server module initialization.
 * This log entry confirms the server module has been loaded and parsed successfully.
 */
logger.info('Server module loaded successfully', {
  nodeVersion: process.version,
  environment: config.nodeEnv,
});
