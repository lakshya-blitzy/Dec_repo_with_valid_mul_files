"""
Flask Application Configuration Module

This module provides environment-based configuration management for the Flask application.
It implements a class hierarchy for different environments (development, production, testing)
using Flask's built-in config object pattern with environment variable overrides.

Configuration is loaded from environment variables with sensible defaults.
Use python-dotenv to load variables from a .env file in development.

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
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = _get_bool_env('DEBUG', False)
    TESTING = _get_bool_env('TESTING', False)
    
    # SQLAlchemy Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = _get_bool_env('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # JSON Response Configuration
    JSON_SORT_KEYS = _get_bool_env('JSON_SORT_KEYS', False)
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    
    # Security Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Request Configuration
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
    
    DEBUG = True
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
    
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    WTF_CSRF_ENABLED = False


# Configuration dictionary for easy environment-based selection
# Usage: app.config.from_object(config[os.getenv('FLASK_ENV', 'development')])
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
