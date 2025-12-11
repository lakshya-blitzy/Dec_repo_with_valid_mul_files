"""Main Flask application entry point.

This module initializes the Flask app instance, configures middleware (CORS),
registers route blueprints, sets up error handlers, and implements the
application factory pattern. This file replaces the Node.js server.js/app.js
and serves as the central hub for the Flask application.

Migration Note:
    This file is the Python/Flask equivalent of what would have been server.js
    or app.js in a Node.js/Express application. Key parallels include:
    - create_app() is similar to Express's app = express() with middleware setup
    - Error handlers replace Express's app.use((err, req, res, next) => {...})
    - Blueprint registration is analogous to Express Router mounting
    - The 'app' module-level variable serves the same role as module.exports = app

The application factory pattern allows creating multiple app instances
with different configurations, which is essential for testing.

Usage:
    # Development server
    python app.py
    
    # Production with Gunicorn
    gunicorn -w 4 -b 0.0.0.0:5000 app:app
    
    # Testing
    app = create_app('testing')

Exports:
    create_app: Application factory function for creating configured Flask instances
    app: Default Flask application instance ready for WSGI servers
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config, config
from models import db


def create_app(config_name: str = None) -> Flask:
    """Application factory for creating Flask app instances.
    
    Creates and configures a Flask application instance with all necessary
    extensions initialized, blueprints registered, and error handlers set up.
    This factory pattern enables creating multiple instances for testing
    and supports different configurations per environment.
    
    Args:
        config_name: Configuration environment name. Valid options are
                    'development', 'production', 'testing', or 'default'.
                    If None, uses FLASK_ENV environment variable,
                    falling back to 'development'.
    
    Returns:
        Flask: Fully configured Flask application instance with:
            - CORS enabled for cross-origin requests
            - API blueprint registered at /api prefix
            - Error handlers for 400, 404, 405, 500, and unhandled exceptions
    
    Example:
        >>> app = create_app('development')
        >>> app.config['DEBUG']
        True
        >>> app = create_app('testing')
        >>> app.config['TESTING']
        True
    """
    # FLASK_ENV lookup provides runtime flexibility for different deployment contexts.
    # This allows the same code to run in dev, test, or production based on environment
    # variable without code changes. Falls back to 'development' for local development.
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    # Load configuration from environment-specific config class.
    # The config dictionary maps string names ('development', 'production', 'testing')
    # to configuration classes. Falls back to 'default' (DevelopmentConfig) if unknown.
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)
    
    # Initialize production-specific settings if applicable.
    # ProductionConfig.init_app() validates critical settings like SECRET_KEY
    # to prevent accidental deployment with insecure defaults.
    if hasattr(config_class, 'init_app'):
        config_class.init_app(app)
    
    # Database initialization must precede blueprint registration to ensure models
    # are available when route handlers are imported. SQLAlchemy uses the app's
    # SQLALCHEMY_DATABASE_URI config to establish the database connection.
    db.init_app(app)
    
    # Configure CORS (Cross-Origin Resource Sharing) for cross-origin request support.
    # CORS is configured to allow cross-origin requests ONLY for /api/* routes,
    # protecting other routes from cross-origin access while enabling API consumption
    # from different domains (e.g., frontend on port 3000, API on port 5000).
    # 
    # SECURITY NOTE: In production, set CORS_ORIGINS to specific trusted domains
    # instead of '*' (all origins). Example: CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
    # The '*' default is convenient for development but insecure in production.
    cors_origins = app.config.get('CORS_ORIGINS', '*')
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})
    
    # Register API blueprint with /api URL prefix for REST API organization.
    # Lazy import pattern: Importing routes inside create_app() (rather than at module
    # level) prevents circular dependency issues. Route handlers may import models
    # which depend on db, which is initialized above. Module-level import would fail
    # because db wouldn't be initialized yet during import resolution.
    # 
    # The /api prefix groups all API endpoints (e.g., /api/health, /api/users)
    # making it easy to apply API-specific middleware and separate from static routes.
    from routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Configure logging level from config, which sources from LOG_LEVEL environment
    # variable (see config.py). Valid values: DEBUG, INFO, WARNING, ERROR, CRITICAL.
    # In development, DEBUG shows detailed request/response info. In production,
    # INFO or WARNING reduces log volume while capturing important events.
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    app.logger.setLevel(log_level)
    
    # Register error handlers for consistent JSON error responses
    _register_error_handlers(app)
    
    app.logger.info(f'Flask application initialized with {config_name} configuration')
    
    return app


def _register_error_handlers(app: Flask) -> None:
    """Register error handlers on the Flask application.
    
    Sets up error handlers for common HTTP errors and unhandled exceptions.
    All error responses follow a consistent JSON format matching the original
    Node.js API behavior for backward compatibility.
    
    Args:
        app: Flask application instance to register handlers on
    
    Note:
        This pattern ensures all HTTP errors return JSON instead of Flask's
        default HTML error pages. This is essential for API consumers (frontend
        apps, mobile clients) who expect JSON responses they can parse.
        
        Error response format: {"error": "<error_type>", "message": "<details>"}
        
        Without custom error handlers, Flask returns HTML like:
        <!DOCTYPE HTML><html><head><title>404 Not Found</title>...
        
        With these handlers, clients always receive parseable JSON:
        {"error": "Not found"}
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors.
        
        Returns JSON response for malformed requests or invalid data.
        
        Args:
            error: The error that triggered this handler
            
        Returns:
            tuple: JSON response with error message and 400 status code
        """
        app.logger.warning(f'Bad Request: {error}')
        return jsonify({'error': 'Bad request', 'message': str(error.description) if hasattr(error, 'description') else 'Invalid request'}), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors.
        
        Returns JSON response when requested resource doesn't exist.
        
        Args:
            error: The error that triggered this handler
            
        Returns:
            tuple: JSON response with error message and 404 status code
        """
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors.
        
        Returns JSON response when HTTP method is not supported for the endpoint.
        
        Args:
            error: The error that triggered this handler
            
        Returns:
            tuple: JSON response with error message and 405 status code
        """
        return jsonify({'error': 'Method not allowed'}), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors.
        
        Logs the error details and returns a generic error response
        to avoid exposing internal details to clients.
        
        Args:
            error: The error that triggered this handler
            
        Returns:
            tuple: JSON response with error message and 500 status code
        """
        app.logger.error(f'Server Error: {error}')
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle unhandled exceptions.
        
        Catches any exception not handled by specific error handlers.
        Logs the full exception details for debugging while returning
        a safe generic error response to clients.
        
        Args:
            error: The unhandled exception
            
        Returns:
            tuple: JSON response with error message and 500 status code
        """
        app.logger.error(f'Unhandled exception: {type(error).__name__}: {error}')
        return jsonify({'error': 'Internal server error'}), 500


# Default app instance created at module level for WSGI servers like Gunicorn to import.
# When running "gunicorn app:app", Gunicorn imports this module and uses the 'app'
# variable as the WSGI application. This is similar to Node.js's module.exports = app.
#
# Why module-level instantiation? WSGI servers expect to import a ready-to-use
# application object. They don't call create_app() directly - they just grab 'app'.
# The create_app() factory is exposed for testing and custom configurations.
app = create_app()


if __name__ == '__main__':
    # Development server entry point - ONLY runs when executing: python app.py
    # This block does NOT execute when imported by Gunicorn (which imports the 'app'
    # variable above directly). This separation allows the same file to serve both
    # development (Flask's built-in server) and production (Gunicorn) use cases.
    #
    # For production, use Gunicorn which imports the 'app' variable above:
    #   gunicorn -w 4 -b 0.0.0.0:5000 app:app
    #
    # Flask's built-in server is NOT suitable for production because:
    # - Single-threaded by default (can't handle concurrent requests efficiently)
    # - No worker process management (crashes don't auto-restart)
    # - Development-focused features add overhead (e.g., reloader file watching)
    host = app.config.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', app.config.get('PORT', 5000)))
    debug = app.config.get('DEBUG', False)
    
    # debug=True enables two key development features:
    # 1. Hot reload: Auto-restarts server when code changes are detected
    # 2. Interactive debugger: Shows detailed error pages with in-browser debugging
    # WARNING: Never enable debug=True in production - it exposes sensitive info!
    app.logger.info(f'Starting development server on {host}:{port}')
    app.run(host=host, port=port, debug=debug)

# Log message added as per testing requirements - confirms module was loaded successfully
print("[INFO] app.py module loaded successfully - Flask application ready")
