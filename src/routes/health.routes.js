/**
 * Health Check Routes Module
 *
 * Express Router module implementing the health check endpoint at GET /health.
 * Returns JSON response with status ('healthy'), service name ('api'), and
 * ISO-8601 timestamp. Critical for container health checks, load balancer probes,
 * and monitoring systems.
 *
 * This module is mounted by the routes aggregator (index.js) at the /health path,
 * which combined with the /api prefix in app.js results in: GET /api/health
 *
 * Response format maintains backward compatibility with Flask implementation
 * as specified in Section 0.8.2 of the Agent Action Plan.
 *
 * @module routes/health
 * @requires express
 */

import { Router } from 'express';

/**
 * Express Router instance for health check routes.
 * Handles all health-related endpoints for the API.
 * @type {Router}
 */
const router = Router();

/**
 * GET / - Health check endpoint
 *
 * Returns the application health status in JSON format.
 * This endpoint is designed to be:
 * - Fast and lightweight (no async operations)
 * - Unauthenticated (accessible without credentials)
 * - Reliable (always returns 200 when server is responding)
 *
 * Used by:
 * - Docker HEALTHCHECK directive for container health validation
 * - Load balancer health probes for traffic routing decisions
 * - Monitoring systems for uptime tracking
 * - Kubernetes readiness/liveness probes for pod lifecycle management
 *
 * Response format (EXACT match per Section 0.8.2):
 * {
 *   "status": "healthy",
 *   "service": "api",
 *   "timestamp": "2024-12-11T12:00:00.000Z"
 * }
 *
 * @route GET /api/health
 * @group Health - Application health check operations
 * @returns {object} 200 - Health status response with status, service, and timestamp
 * @example
 * // Response example
 * {
 *   "status": "healthy",
 *   "service": "api",
 *   "timestamp": "2024-12-11T12:00:00.000Z"
 * }
 */
router.get('/', (req, res) => {
  /**
   * Health status response object
   * @type {Object}
   * @property {string} status - Application health status (always 'healthy' when responding)
   * @property {string} service - Service identifier for this API
   * @property {string} timestamp - Current server time in ISO-8601 format
   */
  const healthStatus = {
    status: 'healthy',
    service: 'api',
    timestamp: new Date().toISOString(),
  };

  res.json(healthStatus);
});

/**
 * GET /detailed - Detailed health check endpoint
 *
 * Returns extended health information including system metrics.
 * Useful for monitoring dashboards, detailed health analysis,
 * and debugging production issues.
 *
 * This endpoint provides additional system information beyond
 * the basic health check, including:
 * - Process uptime in seconds
 * - Memory usage statistics (heap used/total)
 * - Node.js version
 * - Current environment setting
 *
 * @route GET /api/health/detailed
 * @group Health - Application health check operations
 * @returns {object} 200 - Detailed health status response
 * @example
 * // Response example
 * {
 *   "status": "healthy",
 *   "service": "api",
 *   "timestamp": "2024-12-11T12:00:00.000Z",
 *   "uptime": 3600.5,
 *   "memory": {
 *     "heapUsed": 50,
 *     "heapTotal": 100,
 *     "unit": "MB"
 *   },
 *   "version": "v20.10.0",
 *   "environment": "production"
 * }
 */
router.get('/detailed', (req, res) => {
  /**
   * Get current memory usage and convert to megabytes
   * @type {NodeJS.MemoryUsage}
   */
  const memoryUsage = process.memoryUsage();

  /**
   * Detailed health status response object
   * Extends basic health status with system metrics
   * @type {Object}
   */
  const healthStatus = {
    status: 'healthy',
    service: 'api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(healthStatus);
});

/**
 * Default export of the health routes router.
 * This router is imported by src/routes/index.js and mounted
 * at the /health path, resulting in endpoints:
 * - GET /api/health - Basic health check
 * - GET /api/health/detailed - Detailed health information
 *
 * @exports router
 */
export default router;
