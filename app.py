"""Main Flask application entry point.

This module initializes the Flask app instance, configures middleware (CORS),
registers route blueprints, sets up error handlers, and implements the
application factory pattern. This file replaces the Node.js server.js/app.js
and serves as the central hub for the Flask application.

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
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    # Load configuration from environment-specific config class
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)
    
    # Initialize production-specific settings if applicable
    if hasattr(config_class, 'init_app'):
        config_class.init_app(app)
    
    # Initialize SQLAlchemy with the Flask app
    db.init_app(app)
    
    # Configure CORS for cross-origin request support
    # Uses CORS_ORIGINS from config for allowed origins
    cors_origins = app.config.get('CORS_ORIGINS', '*')
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})
    
    # Register API blueprint with /api URL prefix
    # Lazy import to avoid circular dependencies
    from routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Configure logging based on config
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


# Create default application instance for WSGI servers (e.g., Gunicorn)
# This instance is used when running: gunicorn app:app
app = create_app()


if __name__ == '__main__':
    # Development server entry point
    # For production, use Gunicorn: gunicorn -w 4 -b 0.0.0.0:5000 app:app
    host = app.config.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', app.config.get('PORT', 5000)))
    debug = app.config.get('DEBUG', False)
    
    app.logger.info(f'Starting development server on {host}:{port}')
    app.run(host=host, port=port, debug=debug)


# Log statement added for testing purposes - PR update validation
app.logger.info('Application module loaded successfully - PR testing update')
