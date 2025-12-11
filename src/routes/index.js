/**
 * Route Aggregator Module
 *
 * This module serves as the central hub for all API routes in the Express application.
 * It imports all route modules and mounts them under appropriate paths, providing
 * clean separation of concerns and centralized route organization.
 *
 * This pattern replaces Flask's Blueprint registration system:
 * - Flask: app.register_blueprint(api_bp, url_prefix='/api')
 * - Express: app.use('/api', routes) where routes is this aggregator
 *
 * Usage in app.js:
 *   import routes from './routes/index.js';
 *   app.use('/api', routes);
 *
 * @module routes/index
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';

/**
 * Express Router instance that aggregates all route modules.
 * This router is mounted at /api prefix in app.js.
 * @type {Router}
 */
const router = Router();

/**
 * Mount health check routes at /health path.
 * Combined with /api prefix in app.js, this results in:
 * - GET /api/health - Basic health check
 * - GET /api/health/detailed - Detailed health information
 */
router.use('/health', healthRoutes);

/**
 * Future route modules can be mounted here following the same pattern:
 *
 * Example:
 *   import userRoutes from './user.routes.js';
 *   router.use('/users', userRoutes);
 *
 *   import productRoutes from './product.routes.js';
 *   router.use('/products', productRoutes);
 */

export default router;
