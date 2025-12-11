/**
 * 404 Not Found Middleware
 *
 * This middleware handles requests to routes that don't exist in the application.
 * It returns a JSON error response in the format matching the Flask implementation.
 *
 * Error Response Format (matching Flask app.py):
 * {
 *   "error": {
 *     "status": 404,
 *     "message": "Resource not found"
 *   }
 * }
 *
 * Placement in Middleware Chain:
 * - Position 8 (after all routes, before errorHandler)
 * - Must be registered AFTER all route handlers
 * - Must be registered BEFORE the general error handler
 *
 * Migration from Flask:
 * - Flask: @app.errorhandler(404) decorator with jsonify({'error': 'Not found'}), 404
 * - Express: Middleware function at end of route chain
 *
 * @module middleware/notFound
 */

/**
 * Not Found handler middleware.
 *
 * This middleware catches all requests that don't match any defined route
 * and returns a 404 JSON response. Unlike other error handlers, this
 * middleware does NOT call next() as it terminates the request.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} _next - Express next function (unused)
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      status: 404,
      message: 'Resource not found',
    },
  });
}

export { notFoundHandler };
export default notFoundHandler;
