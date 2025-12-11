/**
 * PM2 Ecosystem Configuration
 * 
 * Production process manager configuration for Node.js application.
 * Configures cluster mode, environment variables, and log management.
 * 
 * Usage:
 * - Start: pm2 start ecosystem.config.js
 * - Start (production): pm2 start ecosystem.config.js --env production
 * - Stop: pm2 stop ecosystem.config.js
 * - Reload (zero-downtime): pm2 reload ecosystem.config.js
 */
export default {
  apps: [{
    // Application identification
    name: 'api-server',
    script: './src/server.js',

    // Cluster mode configuration
    instances: 'max',
    exec_mode: 'cluster',

    // Process management
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',

    // Graceful shutdown
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,

    // Log configuration
    error_file: './logs/error.log',
    out_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Development environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },

    // Production environment
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },

    // Test environment
    env_test: {
      NODE_ENV: 'test',
      PORT: 3001,
      LOG_LEVEL: 'error'
    }
  }]
};
