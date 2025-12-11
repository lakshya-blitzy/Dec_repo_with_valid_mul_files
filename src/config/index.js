/**
 * Environment Configuration Module
 *
 * This module provides centralized environment-based configuration management
 * for the Express.js application. It replaces the Python class-based Config
 * hierarchy (Config, DevelopmentConfig, ProductionConfig, TestingConfig) from
 * the Flask application with a JavaScript configuration object.
 *
 * Configuration is loaded from environment variables via dotenv with sensible
 * defaults for development. Production mode enforces required variable validation.
 *
 * Usage:
 *   import config from './config/index.js';
 *   // or
 *   import { config } from './config/index.js';
 *
 *   const port = config.port;
 *   if (config.isDevelopment) { ... }
 *
 * @module config
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// ES Module __dirname Equivalent
// -----------------------------------------------------------------------------
// In ES Modules, __dirname is not available. We need to derive it from
// import.meta.url to construct paths relative to the project root.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// Load Environment Variables
// -----------------------------------------------------------------------------
// Load .env file from project root (two directories up from src/config/)
// This must be called before accessing any process.env values

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Gets an environment variable with an optional default value.
 *
 * @param {string} key - The environment variable name
 * @param {string} [defaultValue=''] - Default value if variable is not set
 * @returns {string} The environment variable value or default
 */
function getEnvVar(key, defaultValue = '') {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Gets an environment variable and parses it as an integer.
 *
 * @param {string} key - The environment variable name
 * @param {number} defaultValue - Default value if variable is not set or invalid
 * @returns {number} The parsed integer value or default
 */
function getIntEnvVar(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Gets an environment variable and parses it as a boolean.
 *
 * Handles common string representations of boolean values:
 * 'true', '1', 'yes', 'on' -> true
 * 'false', '0', 'no', 'off', '' -> false
 *
 * @param {string} key - The environment variable name
 * @param {boolean} defaultValue - Default value if variable is not set
 * @returns {boolean} The parsed boolean value or default
 */
function getBoolEnvVar(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Parses a byte size string (e.g., '10mb', '1kb') and returns it as-is.
 * This is used for body-parser and compression configuration which
 * accept string values like '10mb'.
 *
 * @param {string} value - The size string to parse
 * @param {string} defaultValue - Default value if input is invalid
 * @returns {string} The validated size string
 */
function parseByteSize(value, defaultValue) {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  // Validate format: number followed by optional unit (b, kb, mb, gb)
  const pattern = /^\d+(\.\d+)?\s*(b|kb|mb|gb)?$/i;
  if (pattern.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return defaultValue;
}

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

const nodeEnv = getEnvVar('NODE_ENV', 'development');
const isDevelopment = nodeEnv === 'development';
const isProduction = nodeEnv === 'production';
const isTesting = nodeEnv === 'testing' || nodeEnv === 'test';

// -----------------------------------------------------------------------------
// Configuration Object
// -----------------------------------------------------------------------------

/**
 * Application configuration object.
 *
 * Properties are loaded from environment variables with defaults appropriate
 * for development. Production mode requires certain variables to be explicitly set.
 *
 * @typedef {Object} Config
 * @property {number} port - HTTP server port (default: 3000)
 * @property {string} nodeEnv - Environment mode: development, production, testing
 * @property {string} logLevel - Winston log level: debug, info, warn, error
 * @property {string} corsOrigin - CORS allowed origins (* for all)
 * @property {string} secretKey - Secret key for cryptographic operations
 * @property {string} requestLimit - Maximum request body size (e.g., '10mb')
 * @property {string} compressionThreshold - Minimum size for compression (e.g., '1kb')
 * @property {boolean} isDevelopment - True if running in development mode
 * @property {boolean} isProduction - True if running in production mode
 * @property {boolean} isTesting - True if running in testing mode
 */
const config = {
  // Server Configuration
  port: getIntEnvVar('PORT', 3000),

  // Environment Mode
  nodeEnv: nodeEnv,

  // Logging Configuration
  // Development defaults to 'debug' for verbose output
  // Production/Testing defaults to 'info' for cleaner logs
  logLevel: getEnvVar('LOG_LEVEL', isDevelopment ? 'debug' : 'info'),

  // CORS Configuration
  // Default to '*' which allows all origins (suitable for development)
  // Production should specify explicit origins
  corsOrigin: getEnvVar('CORS_ORIGIN', '*'),

  // Security Configuration
  // IMPORTANT: This default is only for development!
  // Production mode validates that a real secret is provided
  secretKey: getEnvVar('SECRET_KEY', 'dev-secret-key-change-in-production'),

  // Request Body Configuration
  // Maximum size of JSON/URL-encoded request bodies
  // Passed directly to express.json() and express.urlencoded() middleware
  requestLimit: parseByteSize(getEnvVar('REQUEST_LIMIT', '10mb'), '10mb'),

  // Compression Configuration
  // Minimum response size before compression is applied
  // Passed directly to compression middleware threshold option
  compressionThreshold: parseByteSize(getEnvVar('COMPRESSION_THRESHOLD', '1kb'), '1kb'),

  // Environment Flags
  // Convenient boolean flags for environment checks
  isDevelopment: isDevelopment,
  isProduction: isProduction,
  isTesting: isTesting,
};

// -----------------------------------------------------------------------------
// Production Validation
// -----------------------------------------------------------------------------
// Validates that required environment variables are set in production mode.
// This mirrors the ProductionConfig.init_app() validation from Python config.py

if (isProduction) {
  // SECRET_KEY must be explicitly set in production environment
  // The default value indicates it was not properly configured
  if (
    !process.env.SECRET_KEY ||
    process.env.SECRET_KEY === 'dev-secret-key-change-in-production'
  ) {
    throw new Error(
      'SECRET_KEY environment variable must be set in production. ' +
        'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { config };
export default config;
