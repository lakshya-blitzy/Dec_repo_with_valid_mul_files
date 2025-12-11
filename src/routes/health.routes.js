/**
 * Health Check Routes Module
 *
 * This module provides the health check endpoint for the Express application.
 * The health endpoint is critical for:
 * - Docker HEALTHCHECK validation
 * - Load balancer health probes
 * - Monitoring system checks
 * - Kubernetes readiness/liveness probes
 *
 * The response format maintains backward compatibility with the Flask implementation.
 *
 * @module routes/health
 */

import { Router } from 'express';

/**
 * Express Router instance for health check routes.
 * @type {Router}
 */
const router = Router();

/**
 * GET / - Health check endpoint
 *
 * Returns the application health status in JSON format.
 * This endpoint should:
 * - Always return 200 when the server is responding
 * - Be fast and not require authentication
 * - Not perform any async operations
 *
 * Response format (matching Flask implementation):
 * {
 *   "status": "healthy",
 *   "service": "api",
 *   "timestamp": "ISO-8601 formatted date"
 * }
 *
 * @route GET /api/health
 * @returns {object} 200 - Health status response
 */
router.get('/', (req, res) => {
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
 * Returns extended health information including uptime and memory usage.
 * Useful for monitoring dashboards and detailed health analysis.
 *
 * @route GET /api/health/detailed
 * @returns {object} 200 - Detailed health status response
 */
router.get('/detailed', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    service: 'api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(healthStatus);
});

export default router;
