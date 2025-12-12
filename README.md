# Express API Server

A production-ready Node.js/Express.js web server application providing RESTful API endpoints with comprehensive middleware, logging, and PM2 process management.

Created by Blitzy

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Development Server](#development-server)
  - [Production Server](#production-server)
- [Running Tests](#running-tests)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Logging](#logging)
- [Contributing](#contributing)

## Features

- **Express.js 5.x** - Modern web framework with async/await support
- **Modular Architecture** - Organized routes, middleware, and utilities
- **Security Middleware** - Helmet for HTTP security headers
- **CORS Support** - Configurable cross-origin resource sharing
- **Request Compression** - Gzip compression for responses
- **Structured Logging** - Winston logger with console and file transports
- **HTTP Request Logging** - Morgan middleware integration
- **Environment Configuration** - dotenv-based configuration management
- **PM2 Process Management** - Cluster mode for production deployments
- **Docker Support** - Multi-stage build with Node.js Alpine base
- **Graceful Shutdown** - Proper signal handling for zero-downtime deployments

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20 LTS** (v20.10.0 or higher) - [Download Node.js](https://nodejs.org/en/download/)
- **npm 10.x** - Node package manager (included with Node.js 20 LTS)
- **PM2** (for production) - Process manager for Node.js applications

Verify your Node.js installation:

```bash
node --version  # Should output v20.x.x or higher
npm --version   # Should output 10.x.x or higher
```

Install PM2 globally (optional, for production deployments):

```bash
npm install -g pm2
pm2 --version  # Should output 6.x.x
```

## Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd express-api-server
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create environment file:**

```bash
cp .env.example .env
```

## Configuration

Configure your application by editing the `.env` file:

```bash
# Application Configuration
NODE_ENV=development  # Use 'production' for production deployments
PORT=3000

# Logging Configuration
LOG_LEVEL=debug  # Options: error, warn, info, http, debug

# Security Configuration
CORS_ORIGIN=*  # Comma-separated list of allowed origins, or * for all
SECRET_KEY=your-secret-key-here

# Request Limits
REQUEST_LIMIT=10mb
COMPRESSION_THRESHOLD=1kb
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment mode (development, production, test) |
| `PORT` | No | `3000` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Winston logging level (error, warn, info, http, debug) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins (comma-separated or `*` for all) |
| `SECRET_KEY` | No | - | Application secret key for signing |
| `REQUEST_LIMIT` | No | `10mb` | Maximum request body size |
| `COMPRESSION_THRESHOLD` | No | `1kb` | Minimum response size for compression |

**Important:** Never commit your `.env` file to version control. It may contain sensitive information.

## Running the Application

### Development Server

Run the development server with hot-reload enabled using nodemon:

```bash
# Start development server with auto-reload
npm run dev

# The server will start at http://localhost:3000
```

**Development server features:**
- Auto-reload on code changes (nodemon)
- Debug-level logging
- Colorized console output
- Detailed error messages

### Production Server

For production deployments, use PM2 as the process manager:

```bash
# Start with PM2 using ecosystem configuration
npm run start:prod

# Or directly with PM2
pm2 start ecosystem.config.cjs --env production

# View process status
pm2 list

# View logs
pm2 logs

# Monitor processes
pm2 monit

# Graceful restart (zero-downtime)
pm2 reload all

# Stop all processes
npm run stop:prod
# Or: pm2 stop ecosystem.config.cjs
```

**PM2 Features:**
- Cluster mode for multi-core utilization
- Automatic restart on crash
- Zero-downtime reloads
- Built-in load balancer
- Log management
- Process monitoring

**Configure PM2 startup on system boot:**

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

### Running Without PM2

For simple production deployments:

```bash
# Set production environment and start
NODE_ENV=production npm start

# Or with environment variables
NODE_ENV=production PORT=3000 node src/server.js
```

## Running Tests

This project uses **Jest** for testing with **Supertest** for HTTP assertions.

### Run all tests:

```bash
npm test
```

### Run tests with watch mode:

```bash
npm run test:watch
```

### Run tests with coverage report:

```bash
npm run test:coverage
```

### Run specific test file:

```bash
npm test -- tests/health.test.js
```

### Run tests matching a pattern:

```bash
npm test -- --testNamePattern="health"
```

## Docker Deployment

### Build the Docker image:

```bash
docker build -t express-api-server .
```

### Run the Docker container:

```bash
# Basic run
docker run -p 3000:3000 express-api-server

# With environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e SECRET_KEY=your-secret-key \
  express-api-server

# With environment file
docker run -p 3000:3000 --env-file .env express-api-server

# Run in detached mode
docker run -d -p 3000:3000 --name express-api express-api-server

# With volume mount for logs (optional)
docker run -d -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  --name express-api \
  express-api-server
```

### Docker Compose (if applicable):

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

### View container logs:

```bash
docker logs express-api

# Follow logs
docker logs -f express-api
```

### Health check:

```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

## Project Structure

```
express-api-server/
├── src/
│   ├── app.js                    # Express application factory
│   ├── server.js                 # HTTP server entry point
│   ├── config/
│   │   └── index.js              # Environment configuration
│   ├── routes/
│   │   ├── index.js              # Route aggregator
│   │   └── health.routes.js      # Health check endpoints
│   ├── middleware/
│   │   ├── errorHandler.js       # Centralized error handling
│   │   ├── notFound.js           # 404 handler
│   │   └── requestLogger.js      # Morgan HTTP logging
│   └── utils/
│       └── logger.js             # Winston logger configuration
├── logs/                         # Log files (gitignored)
│   ├── combined.log              # All log levels
│   └── error.log                 # Error-level logs only
├── tests/                        # Test files
│   ├── setup.js                  # Test configuration
│   └── health.test.js            # Health endpoint tests
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json             # Dependency lock file
├── ecosystem.config.cjs          # PM2 configuration
├── Dockerfile                    # Docker container definition
├── .dockerignore                 # Docker build exclusions
├── .env.example                  # Environment variable template
├── .env                          # Local environment (gitignored)
├── .gitignore                    # Git exclusions
├── .eslintrc.js                  # ESLint configuration
└── README.md                     # This file
```

## Code Architecture and Inline Explanations

This section provides detailed explanations of each core component's implementation and design decisions.

### Entry Point: `src/server.js`

The server module is the application's entry point, responsible for:

```javascript
// 1. Create Express app using factory pattern (mirrors Flask's create_app())
const app = createApp();

// 2. Wrap Express app in Node.js HTTP server for graceful shutdown support
const server = http.createServer(app);

// 3. Bind server to configured port (default: 3000)
server.listen(PORT, '0.0.0.0');
```

**Key Functions:**

| Function | Purpose | Inline Explanation |
|----------|---------|-------------------|
| `shutdown(signal)` | Graceful shutdown handler | Stops accepting new connections, waits for existing requests to complete (30s timeout), then exits cleanly. Essential for zero-downtime deployments with PM2/Docker. |
| `onListening()` | Server startup callback | Logs startup info and sends PM2 'ready' signal for cluster mode coordination. |
| `onError(error)` | Error event handler | Handles port-in-use (EADDRINUSE) and permission (EACCES) errors with friendly messages. |

**Signal Handlers:**

```javascript
// SIGTERM: Triggered by Docker stop, PM2 restart, Kubernetes termination
process.on('SIGTERM', () => shutdown('SIGTERM'));

// SIGINT: Triggered by Ctrl+C in terminal
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled errors and shutdown gracefully
process.on('uncaughtException', (error) => { /* log and shutdown */ });
process.on('unhandledRejection', (reason) => { /* log and shutdown */ });
```

### Application Factory: `src/app.js`

The Express application factory implements the **middleware composition pattern**:

```javascript
/**
 * Middleware registration order is CRITICAL for proper request processing:
 * 1. Security headers (Helmet) - Must be first for protection
 * 2. CORS - Cross-origin requests handled early
 * 3. Compression - Compress responses before sending
 * 4. Body parsing - Parse JSON/URL-encoded before routes
 * 5. Request logging - Log after body is parsed
 * 6. Routes - Application endpoints
 * 7. 404 handler - Catch unmatched routes
 * 8. Error handler - Must be LAST to catch all errors
 */
export function createApp() {
  const app = express();
  
  // Security middleware (order 1)
  app.use(helmet());
  
  // CORS middleware (order 2)
  app.use(cors({ origin: config.corsOrigin }));
  
  // ... remaining middleware in order
  
  // Error handlers must be LAST
  app.use(notFoundHandler);    // Order 7: Catch 404s
  app.use(errorHandler);       // Order 8: Handle all errors
  
  return app;
}
```

### Configuration: `src/config/index.js`

Environment-based configuration using dotenv pattern:

```javascript
// Load .env file FIRST before accessing process.env
import 'dotenv/config';

// Configuration object with defaults and validation
const config = {
  // Environment detection
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Server settings with defaults
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Security settings
  corsOrigin: process.env.CORS_ORIGIN || '*',
  secretKey: process.env.SECRET_KEY || 'development-secret',
  
  // Request limits
  requestLimit: process.env.REQUEST_LIMIT || '10mb',
  compressionThreshold: process.env.COMPRESSION_THRESHOLD || '1kb',
};

export default config;
```

### Route Organization: `src/routes/`

Routes follow **Express Router modular pattern**:

```javascript
// src/routes/index.js - Aggregates all route modules
import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Mount health routes at /health (becomes /api/health in app.js)
router.use('/health', healthRoutes);

export default router;
```

```javascript
// src/routes/health.routes.js - Health check implementation
import { Router } from 'express';

const router = Router();

// GET /api/health - Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

### Error Handling: `src/middleware/errorHandler.js`

Centralized error handling follows Express 5.x async pattern:

```javascript
/**
 * Error handler middleware - MUST be last in middleware chain
 * 
 * Express identifies error handlers by their 4-parameter signature:
 * (err, req, res, next) - The 'err' parameter is key
 */
export function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const status = err.status || err.statusCode || 500;
  
  // Return consistent JSON error format (matches Flask implementation)
  res.status(status).json({
    error: {
      status,
      message: err.message || 'Internal Server Error',
    },
  });
}
```

### Logging: `src/utils/logger.js`

Winston configuration with multiple transports:

```javascript
import winston from 'winston';

// Create logger with environment-specific settings
const logger = winston.createLogger({
  // Log level based on environment
  level: config.isProduction ? 'info' : 'debug',
  
  // Structured JSON format for production
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  
  // Multiple transports for different outputs
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format: config.isDevelopment
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          )
        : undefined,
    }),
    
    // File transports (production only)
    ...(config.isProduction ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});

export default logger;
```

### PM2 Configuration: `ecosystem.config.cjs`

Production process management configuration:

```javascript
module.exports = {
  apps: [{
    name: 'api-server',
    script: './src/server.js',
    
    // Cluster mode for multi-core utilization
    instances: 'max',        // Use all CPU cores
    exec_mode: 'cluster',    // Enable load balancing
    
    // Reliability settings
    autorestart: true,       // Auto-restart on crash
    max_memory_restart: '500M', // Restart if memory exceeds limit
    
    // Environment configuration
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    // Log configuration
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
  }],
};
```

### Directory Descriptions

| Directory/File | Description |
|----------------|-------------|
| `src/` | Application source code |
| `src/app.js` | Express application factory with middleware and routes |
| `src/server.js` | HTTP server with graceful shutdown handling |
| `src/config/` | Environment-based configuration management |
| `src/routes/` | Express Router modules for API endpoints |
| `src/middleware/` | Custom Express middleware functions |
| `src/utils/` | Shared utility functions and helpers |
| `logs/` | Application log files (auto-created) |
| `tests/` | Jest test specifications |
| `ecosystem.config.cjs` | PM2 process management configuration |

## API Documentation

### Base URL

- Development: `http://localhost:3000`
- Production: `http://your-domain.com`

### Available Endpoints

All API endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |

### Health Check Endpoint

**Request:**
```bash
GET /api/health
```

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "api",
  "timestamp": "2024-12-11T12:00:00.000Z"
}
```

### Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": {},
  "message": "Success"
}
```

**Error Response:**
```json
{
  "error": {
    "status": 404,
    "message": "Resource not found"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource does not exist |
| 405 | Method Not Allowed - Invalid HTTP method |
| 500 | Internal Server Error - Server-side error |

## Logging

The application uses Winston for structured logging with Morgan for HTTP request logging.

### Log Levels

| Level | Description |
|-------|-------------|
| `error` | Error messages and exceptions |
| `warn` | Warning messages |
| `info` | Informational messages |
| `http` | HTTP request logs (Morgan) |
| `debug` | Debug-level messages |

### Log Files

In production, logs are written to files:

| File | Contents |
|------|----------|
| `logs/combined.log` | All log messages (info level and above) |
| `logs/error.log` | Error-level messages only |

### Log Format

**Console (Development):**
```
2024-12-11 12:00:00 [info]: Server started on port 3000
```

**File (Production - JSON):**
```json
{
  "level": "info",
  "message": "Server started on port 3000",
  "timestamp": "2024-12-11T12:00:00.000Z"
}
```

### Viewing Logs

```bash
# View combined logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log

# PM2 logs
pm2 logs

# Docker logs
docker logs -f express-api
```

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Install dependencies: `npm install`
4. Make your changes
5. Run linting: `npm run lint`
6. Run tests: `npm test`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to the branch: `git push origin feature/your-feature-name`
9. Submit a pull request

### Code Style

This project follows JavaScript best practices with ESLint:

- **ESLint** - JavaScript linting with recommended rules
- **ES Modules** - Modern import/export syntax
- **Async/Await** - Use async/await for asynchronous operations
- **JSDoc Comments** - Document public functions and classes
- **Consistent Naming** - camelCase for variables, PascalCase for classes

### Running Linters:

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Commit Message Format

Follow conventional commit format:

```
type(scope): description

Examples:
feat(routes): add user authentication endpoint
fix(middleware): resolve CORS header issue
docs(readme): update installation instructions
```

## Security

The application implements several security best practices:

- **Helmet** - Sets various HTTP headers for security
- **CORS** - Configurable cross-origin resource sharing
- **Request Size Limits** - Prevents large payload attacks
- **Environment Variables** - Sensitive data kept out of code
- **Non-Root Docker User** - Container runs as non-privileged user

## License

This project is proprietary software. All rights reserved.

## Support

For issues, questions, or contributions, please open an issue in the repository.

---

**Technology Stack:**
- Runtime: Node.js 20 LTS
- Framework: Express.js 5.x
- Process Manager: PM2 6.x
- Logging: Winston + Morgan
- Container: Docker (Node.js Alpine)
