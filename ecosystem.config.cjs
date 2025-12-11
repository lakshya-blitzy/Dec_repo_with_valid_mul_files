/**
 * PM2 Ecosystem Configuration
 *
 * This is the PM2 process management configuration file that defines how the
 * Node.js/Express application runs in production environments. PM2 provides
 * advanced process management features including cluster mode for multi-core
 * utilization, automatic restart on crashes, memory limits, and zero-downtime
 * deployments.
 *
 * This configuration replaces Gunicorn's process management from the original
 * Python/Flask implementation with equivalent Node.js production capabilities.
 *
 * Key Features:
 * - Cluster mode: Utilizes all available CPU cores for load balancing
 * - Auto-restart: Automatically restarts processes on crash or memory limits
 * - Zero-downtime reloads: Uses `pm2 reload` for seamless deployments
 * - Environment configuration: Separate configs for dev, production, and test
 * - Structured logging: Centralized log management with timestamps
 * - Graceful shutdown: Proper signal handling for clean process termination
 *
 * Usage Examples:
 *   Development:
 *     pm2 start ecosystem.config.cjs
 *
 *   Production:
 *     pm2 start ecosystem.config.cjs --env production
 *
 *   Test Environment:
 *     pm2 start ecosystem.config.cjs --env test
 *
 *   Zero-Downtime Reload (Production):
 *     pm2 reload ecosystem.config.cjs
 *
 *   Stop All Processes:
 *     pm2 stop ecosystem.config.cjs
 *
 *   Delete All Processes:
 *     pm2 delete ecosystem.config.cjs
 *
 *   View Logs:
 *     pm2 logs api-server
 *
 *   Monitor Processes:
 *     pm2 monit
 *
 *   Save Process List (for startup):
 *     pm2 save
 *
 *   Generate Startup Script:
 *     pm2 startup
 *
 * Migration Notes:
 * - This configuration replaces Gunicorn's worker-based concurrency model
 *   (gunicorn -w 4 -b 0.0.0.0:8000 app:app) with PM2's cluster mode
 * - Environment variables match patterns from the original Python config.py
 * - Port defaults to 3000 (vs Flask's 5000) per Node.js conventions
 *
 * Configuration Hierarchy:
 * - Base 'env' object: Development settings (default)
 * - 'env_production': Production overrides (--env production)
 * - 'env_test': Testing environment (--env test)
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 * @see src/server.js - The entry point this configuration executes
 *
 * @module ecosystem.config
 */

/**
 * PM2 Application Configuration
 *
 * Exports the apps array containing application configurations.
 * Each object in the apps array defines a separate application
 * that PM2 will manage.
 *
 * @type {Object}
 * @property {Array<Object>} apps - Array of application configurations
 */
module.exports = {
  /**
   * Application Definitions Array
   *
   * Contains one or more application configurations. Each application
   * can have its own process settings, environment variables, and
   * log configurations.
   *
   * @type {Array<Object>}
   */
  apps: [
    {
      // =========================================================================
      // APPLICATION IDENTIFICATION
      // =========================================================================

      /**
       * Application name for PM2 process identification.
       *
       * This name is used in:
       * - PM2 process list (pm2 list)
       * - Log file prefixes
       * - Monitoring dashboard (pm2 monit)
       * - Process management commands (pm2 stop api-server)
       *
       * @type {string}
       */
      name: 'api-server',

      /**
       * Path to the application entry point script.
       *
       * This is the main file that PM2 will execute. The server.js file:
       * - Creates the HTTP server using http.createServer
       * - Wraps the Express application from app.js
       * - Implements graceful shutdown handling
       * - Sends the PM2 'ready' signal when fully started
       *
       * Path is relative to the directory where PM2 is started.
       *
       * @type {string}
       */
      script: './src/server.js',

      // =========================================================================
      // CLUSTER MODE CONFIGURATION
      // =========================================================================

      /**
       * Number of instances to run in cluster mode.
       *
       * - 'max': Spawns as many workers as there are CPU cores
       * - number: Spawns a specific number of workers
       * - 0: Equivalent to 'max'
       * - -1: max CPUs - 1
       *
       * Using 'max' ensures optimal utilization of server resources
       * in production environments with multiple CPU cores.
       *
       * Equivalent to Gunicorn's -w (workers) flag:
       *   gunicorn -w 4 --> instances: 4
       *   gunicorn -w $(nproc) --> instances: 'max'
       *
       * @type {string|number}
       */
      instances: 'max',

      /**
       * Execution mode for the application.
       *
       * - 'cluster': Enables Node.js cluster mode with load balancing
       *   across multiple instances. Recommended for production.
       * - 'fork': Runs the application in fork mode (single process)
       *   Useful for applications that cannot be clustered.
       *
       * Cluster mode provides:
       * - Built-in load balancing across instances
       * - Zero-downtime reloads via pm2 reload
       * - Better utilization of multi-core systems
       * - Fault isolation between instances
       *
       * @type {string}
       */
      exec_mode: 'cluster',

      // =========================================================================
      // PROCESS MANAGEMENT
      // =========================================================================

      /**
       * Enable automatic restart on process crash or exit.
       *
       * When true, PM2 will automatically restart the application if:
       * - The process crashes with an error
       * - The process exits with a non-zero exit code
       * - Memory limit is exceeded (max_memory_restart)
       *
       * Essential for production reliability to ensure high availability.
       *
       * @type {boolean}
       */
      autorestart: true,

      /**
       * Enable/disable file watching for automatic restart.
       *
       * When true, PM2 will restart the application when files change.
       * This is useful for development but should be DISABLED in production
       * to prevent unexpected restarts and performance overhead.
       *
       * For development with file watching, use nodemon instead:
       *   npm run dev (uses nodemon)
       *
       * @type {boolean}
       */
      watch: false,

      /**
       * Maximum memory threshold before automatic restart.
       *
       * When a process exceeds this memory limit, PM2 will restart it.
       * This prevents memory leaks from causing system-wide issues.
       *
       * Supported units:
       * - 'K' or 'KB': Kilobytes
       * - 'M' or 'MB': Megabytes
       * - 'G' or 'GB': Gigabytes
       *
       * Example: '500M', '1G', '2048M'
       *
       * Set based on:
       * - Available system memory
       * - Expected application memory footprint
       * - Number of instances running
       *
       * @type {string}
       */
      max_memory_restart: '500M',

      // =========================================================================
      // GRACEFUL SHUTDOWN CONFIGURATION
      // =========================================================================

      /**
       * Time in milliseconds before sending SIGKILL after SIGTERM.
       *
       * When stopping a process, PM2:
       * 1. Sends SIGTERM to allow graceful shutdown
       * 2. Waits for kill_timeout milliseconds
       * 3. Sends SIGKILL if process hasn't exited
       *
       * This value should allow enough time for:
       * - In-flight requests to complete
       * - Database connections to close
       * - Log buffers to flush
       *
       * Must be less than the application's shutdown timeout
       * (server.js uses 30000ms / 30s as per specification).
       *
       * @type {number}
       */
      kill_timeout: 3000,

      /**
       * Wait for the application to send the 'ready' signal.
       *
       * When true, PM2 waits for process.send('ready') before
       * considering the application as successfully started.
       *
       * This ensures:
       * - Server is actually listening before marking as 'online'
       * - Zero-downtime reloads work correctly
       * - Health checks pass after startup
       *
       * The server.js file sends this signal after successful
       * HTTP server binding.
       *
       * @type {boolean}
       */
      wait_ready: true,

      /**
       * Maximum time in milliseconds to wait for the ready signal.
       *
       * If the application doesn't send 'ready' within this timeout:
       * - PM2 will consider the startup failed
       * - The process may be restarted based on restart settings
       *
       * Should account for:
       * - Application initialization time
       * - Database connection establishment
       * - Cache warming (if applicable)
       *
       * @type {number}
       */
      listen_timeout: 10000,

      // =========================================================================
      // LOG CONFIGURATION
      // =========================================================================

      /**
       * Path to the error log file.
       *
       * PM2 captures stderr output and writes it to this file.
       * This captures:
       * - Application errors logged to stderr
       * - Uncaught exceptions
       * - Unhandled promise rejections
       *
       * Note: Application logging via Winston writes to separate files.
       * This file captures PM2-level process output.
       *
       * Directory must exist or PM2 will create it.
       *
       * @type {string}
       */
      error_file: './logs/error.log',

      /**
       * Path to the combined output log file.
       *
       * PM2 captures stdout output and writes it to this file.
       * This captures:
       * - Console.log output
       * - Application logs written to stdout
       * - PM2 process events
       *
       * Note: Application logging via Winston has separate transports.
       * This file captures PM2-level process output.
       *
       * Directory must exist or PM2 will create it.
       *
       * @type {string}
       */
      out_file: './logs/combined.log',

      /**
       * Date format for log entries.
       *
       * Uses moment.js date format tokens:
       * - YYYY: 4-digit year
       * - MM: 2-digit month (01-12)
       * - DD: 2-digit day (01-31)
       * - HH: 24-hour hour (00-23)
       * - mm: Minutes (00-59)
       * - ss: Seconds (00-59)
       * - Z: Timezone offset from UTC
       *
       * Example output: "2024-12-11 10:30:45 +0000"
       *
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Merge logs from all cluster instances into single files.
       *
       * When true:
       * - All instances write to the same log files
       * - Log entries include instance ID for differentiation
       * - Simplifies log management in cluster mode
       *
       * When false:
       * - Each instance has separate log files
       * - File names include instance ID (e.g., error-0.log, error-1.log)
       *
       * @type {boolean}
       */
      merge_logs: true,

      // =========================================================================
      // ENVIRONMENT CONFIGURATION - DEVELOPMENT (DEFAULT)
      // =========================================================================

      /**
       * Default environment variables (Development mode).
       *
       * These environment variables are applied when starting without
       * the --env flag: `pm2 start ecosystem.config.cjs`
       *
       * Development settings include:
       * - Debug logging for verbose output
       * - Standard development port
       * - NODE_ENV=development for dev-specific behaviors
       *
       * Additional variables can be added here and will be available
       * via process.env in the application.
       *
       * @type {Object}
       */
      env: {
        /**
         * Node.js environment mode.
         * Affects Express.js behavior and many npm packages.
         * @type {string}
         */
        NODE_ENV: 'development',

        /**
         * HTTP server port.
         * The port the Express server listens on.
         * @type {number}
         */
        PORT: 3000,

        /**
         * Application logging level.
         * Controls Winston logger output verbosity.
         * Levels: error, warn, info, http, debug
         * @type {string}
         */
        LOG_LEVEL: 'debug',
      },

      // =========================================================================
      // ENVIRONMENT CONFIGURATION - PRODUCTION
      // =========================================================================

      /**
       * Production environment variables.
       *
       * Applied when starting with: `pm2 start ecosystem.config.cjs --env production`
       *
       * Production settings include:
       * - Info-level logging for performance
       * - NODE_ENV=production for optimized behaviors
       * - Same port as development for consistency
       *
       * Production mode enables:
       * - Express.js view caching
       * - Minified error messages
       * - Performance optimizations
       *
       * @type {Object}
       */
      env_production: {
        /**
         * Node.js environment mode.
         * Production mode enables various optimizations.
         * @type {string}
         */
        NODE_ENV: 'production',

        /**
         * HTTP server port.
         * Consistent port across environments for load balancers.
         * @type {number}
         */
        PORT: 3000,

        /**
         * Application logging level.
         * Info level for production - less verbose than debug.
         * @type {string}
         */
        LOG_LEVEL: 'info',
      },

      // =========================================================================
      // ENVIRONMENT CONFIGURATION - TESTING
      // =========================================================================

      /**
       * Test environment variables.
       *
       * Applied when starting with: `pm2 start ecosystem.config.cjs --env test`
       *
       * Test settings include:
       * - Error-only logging to reduce noise
       * - Different port to avoid conflicts with dev server
       * - NODE_ENV=test for test-specific behaviors
       *
       * Test mode enables:
       * - Faster execution (skips non-essential operations)
       * - Deterministic behavior
       * - Isolated port to run alongside development
       *
       * @type {Object}
       */
      env_test: {
        /**
         * Node.js environment mode.
         * Test mode for running automated tests.
         * @type {string}
         */
        NODE_ENV: 'test',

        /**
         * HTTP server port.
         * Different port (3001) to avoid conflicts with development server.
         * @type {number}
         */
        PORT: 3001,

        /**
         * Application logging level.
         * Error-only logging for cleaner test output.
         * @type {string}
         */
        LOG_LEVEL: 'error',
      },
    },
  ],
};
