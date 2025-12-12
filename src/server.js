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
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT, etc.)
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
 * Handles server listening event.
 * Called when server is successfully bound to port.
 *
 * This function:
 * - Logs the successful server startup with environment context
 * - Sends the PM2 'ready' signal for cluster mode wait_ready
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
 * Handles server error event.
 * Provides specific handling for common errors like EADDRINUSE and EACCES.
 *
 * Per key changes items 17-19:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Port requires elevated privileges (typically ports < 1024)
 *
 * @param {Error} error - The error that occurred
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

// Export for testing purposes
// Note: No exports are required per schema, but these are useful for testing
export { app, server };

// Log for testing purposes - added per Refine PR instruction
logger.info('Server module loaded successfully', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  environment: config.nodeEnv,
});

// Additional log added per Refine PR update request - testing purposes only
logger.debug('Server initialization complete - Refine PR test update', {
  timestamp: new Date().toISOString(),
  modulePath: import.meta.url,
});

// Log added at end of code per user Refine PR instruction - testing purposes
logger.info('Express API server module fully initialized and ready for connections', {
  timestamp: new Date().toISOString(),
  pid: process.pid,
});

// Additional log at end of code - Refine PR update for testing purposes (no functional changes)
logger.info('Refine PR test log - code update validation complete', {
  timestamp: new Date().toISOString(),
  updatePurpose: 'testing',
});
