/**
 * Winston Logger Configuration Utility
 * 
 * This module provides a centralized logging configuration for the Express.js application
 * using Winston as the core logging library. It implements structured logging with multiple
 * transports optimized for different environments and use cases.
 * 
 * Features:
 * - Custom log levels: error, warn, info, http, debug
 * - Environment-based log level selection (debug for development, info for production)
 * - Console transport with colorized output for development
 * - File transports for persistent logging (combined.log and error.log)
 * - JSON formatted output for production logs
 * - Morgan stream integration for HTTP request logging
 * - Silent mode for test environment
 * 
 * This module migrates from Python/Flask's app.logger pattern to Winston,
 * providing equivalent functionality with enhanced Node.js-specific features.
 * 
 * Usage:
 *   import logger from './utils/logger.js';
 *   logger.info('Application started');
 *   logger.error('Error occurred', { error: err.message });
 * 
 * @module utils/logger
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES Module dirname equivalent
// In ES Modules, __dirname is not available, so we derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define logs directory relative to project root (../../logs from src/utils/)
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

// Ensure logs directory exists before Winston attempts to write
// Using recursive option to create parent directories if needed
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Custom log levels following npm convention with added 'http' level for Morgan integration.
 * Lower numbers indicate higher priority.
 * 
 * @constant {Object} LOG_LEVELS
 * @property {number} error - Level 0: Error conditions requiring immediate attention
 * @property {number} warn - Level 1: Warning conditions that may require attention
 * @property {number} info - Level 2: Informational messages about normal operations
 * @property {number} http - Level 3: HTTP request/response logging (Morgan integration)
 * @property {number} debug - Level 4: Debug-level messages for development troubleshooting
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Color definitions for console output.
 * These colors are applied when logging to the console transport
 * to improve readability during development.
 * 
 * @constant {Object} LOG_COLORS
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Apply custom colors to Winston
winston.addColors(LOG_COLORS);

/**
 * Environment detection for dynamic configuration.
 * Determines logging behavior based on NODE_ENV environment variable.
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv !== 'production';
const isTest = nodeEnv === 'test';

/**
 * Determine the current log level based on environment.
 * - Development: 'debug' (all levels visible)
 * - Production: 'info' (error, warn, info levels visible)
 * - Can be overridden via LOG_LEVEL environment variable
 */
const defaultLevel = isDevelopment ? 'debug' : 'info';
const currentLevel = process.env.LOG_LEVEL || defaultLevel;

/**
 * JSON format configuration for file transports.
 * Combines timestamp, error stack traces, and JSON output.
 * Used for production logging and log aggregation systems.
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Console format configuration for development output.
 * Provides colorized, human-readable output with timestamps.
 * Includes custom printf formatter for structured display.
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    // Build the base log message with timestamp and level
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Append stack trace for errors if available
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Append additional metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out Winston internal properties
      const filteredMeta = {};
      for (const key of metaKeys) {
        if (!['service', 'timestamp'].includes(key)) {
          filteredMeta[key] = metadata[key];
        }
      }
      if (Object.keys(filteredMeta).length > 0) {
        logMessage += ` ${JSON.stringify(filteredMeta)}`;
      }
    }
    
    return logMessage;
  }),
);

/**
 * Console transport configuration.
 * Used for real-time logging during development and production.
 * Colorized output improves readability in terminal environments.
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

/**
 * Combined file transport configuration.
 * Logs all messages at 'info' level and above to logs/combined.log.
 * Uses JSON format for easy parsing by log aggregation tools.
 */
const combinedFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'combined.log'),
  format: jsonFormat,
  level: 'info',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

/**
 * Error file transport configuration.
 * Logs only error-level messages to logs/error.log.
 * Useful for quickly identifying and debugging error conditions.
 */
const errorFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'error.log'),
  format: jsonFormat,
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

/**
 * Build the transports array based on environment.
 * In test environment, no transports are added (silent mode).
 * In all other environments, console and file transports are included.
 */
const transports = [];

if (!isTest) {
  // Add console transport for all non-test environments
  transports.push(consoleTransport);
  
  // Add file transports for persistent logging
  transports.push(combinedFileTransport);
  transports.push(errorFileTransport);
}

/**
 * Main Winston logger instance.
 * 
 * This logger is configured with:
 * - Custom log levels (error, warn, info, http, debug)
 * - Environment-appropriate log level threshold
 * - Multiple transports (console + file)
 * - Graceful error handling (exitOnError: false)
 * - Silent mode in test environment
 * 
 * The logger provides methods for each log level:
 * - logger.error(message, metadata) - Log error conditions
 * - logger.warn(message, metadata) - Log warning conditions
 * - logger.info(message, metadata) - Log informational messages
 * - logger.http(message, metadata) - Log HTTP requests (Morgan integration)
 * - logger.debug(message, metadata) - Log debug information
 * 
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: currentLevel,
  transports: transports,
  exitOnError: false,
  silent: isTest,
  defaultMeta: { service: 'api' },
});

/**
 * Morgan stream integration object.
 * 
 * Provides a write method that Morgan uses to pass HTTP request logs
 * to Winston. This ensures all logging goes through a single, unified
 * logging system with consistent formatting and destinations.
 * 
 * Morgan passes log messages with trailing newlines, which are trimmed
 * before being passed to Winston's http level logger.
 * 
 * Usage in requestLogger middleware:
 *   import { stream } from './utils/logger.js';
 *   app.use(morgan('combined', { stream }));
 * 
 * @type {Object}
 * @property {Function} write - Write method called by Morgan for each HTTP request
 */
const stream = {
  /**
   * Write method for Morgan stream interface.
   * Receives log messages from Morgan and passes them to Winston's http level.
   * 
   * @param {string} message - The log message from Morgan (includes trailing newline)
   */
  write: (message) => {
    // Trim the trailing newline that Morgan adds
    logger.http(message.trim());
  },
};

// Log initialization message (only in non-test environments)
if (!isTest) {
  logger.debug(`Logger initialized with level: ${currentLevel}, environment: ${nodeEnv}`);
}

// Named exports for specific use cases
export { logger, stream };

// Default export for convenience
export default logger;
