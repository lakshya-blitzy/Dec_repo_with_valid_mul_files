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

/**
 * Create Express application instance.
 * The app is created using the factory pattern from app.js.
 */
const app = createApp();

/**
 * Create HTTP server wrapping the Express application.
 * Using http.createServer allows for:
 * - Graceful shutdown via server.close()
 * - Access to raw HTTP server events
 * - Proper signal handling for PM2
 */
const server = http.createServer(app);

/**
 * Port to bind the server to.
 * Loaded from config which reads from PORT environment variable.
 * @type {number}
 */
const PORT = config.port;

/**
 * Flag to track if shutdown has been initiated.
 * Prevents multiple shutdown attempts.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * Graceful shutdown timeout in milliseconds.
 * Server will force close after this time if connections don't close.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds

/**
 * Gracefully shuts down the HTTP server.
 *
 * This function:
 * 1. Stops accepting new connections
 * 2. Waits for existing connections to complete
 * 3. Forces exit after timeout if connections don't close
 * 4. Exits with appropriate code
 *
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT, etc.)
 */
function shutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring additional signal');
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Set a timeout for forced shutdown
  const shutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Clear the timer on successful shutdown
  shutdownTimer.unref();

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { error: err.message });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }

    logger.info('HTTP server closed successfully');
    clearTimeout(shutdownTimer);
    process.exit(0);
  });
}

/**
 * Handles server listening event.
 * Called when server is successfully bound to port.
 */
function onListening() {
  logger.info('Server started successfully', {
    port: PORT,
    environment: config.nodeEnv,
    pid: process.pid,
  });

  // Send ready signal to PM2 for cluster mode
  // This is used when wait_ready is enabled in ecosystem.config.js
  if (typeof process.send === 'function') {
    process.send('ready');
    logger.debug('Ready signal sent to PM2');
  }
}

/**
 * Handles server error event.
 * Provides specific handling for common errors like EADDRINUSE.
 *
 * @param {Error} error - The error that occurred
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = `Port ${PORT}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    logger.error(`${bind} requires elevated privileges`);
    process.exit(1);
    break;
  case 'EADDRINUSE':
    logger.error(`${bind} is already in use`);
    process.exit(1);
    break;
  default:
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Signal Handlers
// ---------------------------------------------------------------------------

/**
 * SIGTERM handler - Triggered by:
 * - Docker stop command
 * - Kubernetes pod termination
 * - PM2 stop/restart commands
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * SIGINT handler - Triggered by:
 * - Ctrl+C in terminal
 * - IDE stop buttons
 */
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Uncaught exception handler.
 * Logs the error and initiates graceful shutdown.
 * In production, this should ideally trigger alerts/monitoring.
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

/**
 * Unhandled promise rejection handler.
 * Logs the error and initiates graceful shutdown.
 * This catches async errors that aren't properly caught.
 */
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  shutdown('unhandledRejection');
});

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

// Attach event handlers to server
server.on('error', onError);
server.on('listening', onListening);

// Start listening for connections
server.listen(PORT, '0.0.0.0');

// Export for testing purposes
export { app, server };
