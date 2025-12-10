"""
Flask Application Configuration Module

This module provides environment-based configuration management for the Flask application.
It implements a class hierarchy for different environments (development, production, testing)
using Flask's built-in config object pattern with environment variable overrides.

Configuration is loaded from environment variables with sensible defaults.
Use python-dotenv to load variables from a .env file in development.

Configuration Inheritance Hierarchy:
    Config (base class)
    ├── DevelopmentConfig  - Development-specific overrides (DEBUG=True, SQL echo enabled)
    ├── ProductionConfig   - Production-specific settings (DEBUG=False, SECRET_KEY validation)
    └── TestingConfig      - Test-specific settings (in-memory DB, CSRF disabled)

Environment Variable Precedence (highest to lowest):
    1. Environment variable explicitly set (e.g., export SECRET_KEY=...)
    2. Value in .env file (loaded via python-dotenv)
    3. Subclass default (e.g., DevelopmentConfig.DEBUG = True)
    4. Config base class default (e.g., Config.DEBUG = False)

Usage:
    from config import config
    app.config.from_object(config['development'])
    # or
    app.config.from_object(config[os.getenv('FLASK_ENV', 'development')])
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
# This must be called before accessing any environment variables
load_dotenv()


def _get_bool_env(key: str, default: bool = False) -> bool:
    """
    Helper function to parse boolean environment variables.
    
    Handles common string representations of boolean values:
    'true', '1', 'yes', 'on' -> True
    'false', '0', 'no', 'off', '' -> False
    
    Args:
        key: Environment variable name
        default: Default value if variable is not set
        
    Returns:
        Boolean value parsed from environment variable
    """
    value = os.environ.get(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')


class Config:
    """
    Base configuration class with default values.
    
    All configuration classes inherit from this base class.
    Values can be overridden by environment variables or subclasses.
    
    Attributes:
        SECRET_KEY: Secret key for session management and cryptographic operations
        DEBUG: Enable/disable debug mode
        TESTING: Enable/disable testing mode
        SQLALCHEMY_DATABASE_URI: Database connection URI
        SQLALCHEMY_TRACK_MODIFICATIONS: Track modifications of objects (performance impact)
        JSON_SORT_KEYS: Sort keys in JSON responses
    """
    
    # Flask Core Configuration
    # SECRET_KEY has a development fallback but MUST be overridden in production via
    # environment variable. ProductionConfig.init_app() validates this requirement.
    # Generate secure key: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    # DEBUG and TESTING flags are parsed as booleans from env vars using _get_bool_env().
    # Accepts: 'true', '1', 'yes', 'on' (True) or 'false', '0', 'no', 'off' (False)
    DEBUG = _get_bool_env('DEBUG', False)
    TESTING = _get_bool_env('TESTING', False)
    
    # SQLAlchemy Database Configuration
    # DATABASE_URL supports multiple database backends via SQLAlchemy connection strings:
    #   SQLite (default): sqlite:///app.db
    #   PostgreSQL:       postgresql://user:password@localhost:5432/dbname
    #   MySQL:            mysql+pymysql://user:password@localhost:3306/dbname
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    # Disable modification tracking for performance (emits signals on every change otherwise)
    SQLALCHEMY_TRACK_MODIFICATIONS = _get_bool_env('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # JSON Response Configuration
    JSON_SORT_KEYS = _get_bool_env('JSON_SORT_KEYS', False)
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    
    # Security Configuration
    # CORS_ORIGINS defaults to '*' (all origins) for development convenience.
    # SECURITY: Restrict to specific domains in production (e.g., 'https://myapp.com')
    # Multiple origins can be comma-separated: 'https://app.com,https://admin.app.com'
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    # JWT_SECRET_KEY falls back to SECRET_KEY if not explicitly set.
    # Best practice: Use a separate key for JWT tokens in production environments.
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    # JWT token expiration in seconds (default: 3600 = 1 hour)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Request Configuration
    # MAX_CONTENT_LENGTH limits request body size to prevent large payload attacks.
    # Default: 16MB (16 * 1024 * 1024 bytes). Requests exceeding this return 413 error.
    # Adjust based on your application's file upload requirements.
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))


class DevelopmentConfig(Config):
    """
    Development environment configuration.
    
    Enables debug mode and SQL query logging for easier development.
    Inherits all base configuration values from Config.
    
    Attributes:
        DEBUG: Always True in development
        SQLALCHEMY_ECHO: Echo SQL queries to console for debugging
    """
    
    # DevelopmentConfig always enables DEBUG regardless of environment variable.
    # This ensures developers get detailed error pages, auto-reload, and debugger access.
    # The class-level override takes precedence over the base class's env var lookup.
    DEBUG = True
    # SQLALCHEMY_ECHO logs all SQL queries to console for debugging database operations.
    # Useful for identifying N+1 queries, understanding ORM behavior, and query optimization.
    # Defaults to True in development; can be disabled via SQLALCHEMY_ECHO=false env var.
    SQLALCHEMY_ECHO = _get_bool_env('SQLALCHEMY_ECHO', True)


class ProductionConfig(Config):
    """
    Production environment configuration.
    
    Disables debug mode and testing mode for security and performance.
    Inherits all base configuration values from Config.
    
    Attributes:
        DEBUG: Always False in production
        TESTING: Always False in production
    """
    
    # Production explicitly disables debug and testing modes for security.
    # DEBUG=True would expose sensitive information via error pages and enable debugger.
    # TESTING=True would disable login requirements and other security features.
    DEBUG = False
    TESTING = False
    
    @classmethod
    def init_app(cls, app):
        """
        Production-specific initialization.
        
        Validates that required environment variables are set.
        Called when the application is initialized with production config.
        
        Args:
            app: Flask application instance
            
        Raises:
            ValueError: If SECRET_KEY is not set in environment
        """
        # The init_app() pattern is called by Flask during create_app() when using
        # app.config.from_object(). This hook allows environment-specific validation
        # and initialization that requires access to the Flask app instance.
        
        # SECRET_KEY validation is critical: prevents accidental deployment with the
        # default dev key ('dev-secret-key-change-in-production'), which would make
        # session tokens predictable and enable session hijacking attacks.
        if not os.environ.get('SECRET_KEY'):
            raise ValueError("SECRET_KEY environment variable must be set in production")


class TestingConfig(Config):
    """
    Testing environment configuration.
    
    Enables testing mode with an in-memory SQLite database.
    Disables CSRF protection for easier API testing.
    Inherits all base configuration values from Config.
    
    Attributes:
        TESTING: Always True in testing
        DEBUG: Enabled for detailed error messages in tests
        SQLALCHEMY_DATABASE_URI: Uses in-memory SQLite for test isolation
        WTF_CSRF_ENABLED: Disabled to simplify form testing
    """
    
    # TESTING=True enables Flask's testing mode, which:
    # - Disables error catching during request handling (exceptions propagate to tests)
    # - Enables test client features like cookie tracking and session transactions
    TESTING = True
    # DEBUG enabled in tests for detailed error messages and stack traces in test failures
    DEBUG = True
    # In-memory SQLite database provides complete test isolation:
    # - Each test run starts with a fresh database (no leftover data)
    # - Faster than file-based databases (no disk I/O)
    # - Database is destroyed when test process ends
    # Override with TEST_DATABASE_URL to test against a specific database.
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    # WTF_CSRF_ENABLED=False simplifies API testing by disabling Flask-WTF CSRF protection.
    # This allows tests to make POST/PUT/DELETE requests without including CSRF tokens.
    # SECURITY: This should never be disabled in production configurations.
    WTF_CSRF_ENABLED = False


# Configuration dictionary maps environment names to their configuration classes.
# This dictionary enables environment-based configuration selection in create_app():
#
# Usage pattern:
#     from config import config
#     app.config.from_object(config['development'])
#     # or dynamically:
#     env = os.getenv('FLASK_ENV', 'development')
#     app.config.from_object(config[env])
#
# The 'default' key provides a fallback for unknown environment names,
# ensuring the application can start even if FLASK_ENV is misconfigured.
config = {
    'development': DevelopmentConfig,  # Local development with debug enabled
    'production': ProductionConfig,    # Production deployment with security validation
    'testing': TestingConfig,          # Automated tests with in-memory database
    'default': DevelopmentConfig       # Fallback for unrecognized environment names
}
