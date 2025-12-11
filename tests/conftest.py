"""
Pytest configuration and fixtures for Flask application tests.

This module provides pytest fixtures for testing the Flask application,
including application instances, test clients, and database setup.

Usage:
    # Fixtures are automatically available in test functions
    def test_example(app, client):
        response = client.get('/api/health')
        assert response.status_code == 200
"""

import pytest
from app import create_app
from models import db


@pytest.fixture(scope='function')
def app():
    """Create application for testing.
    
    Creates a Flask application configured for testing with an in-memory
    SQLite database. The database tables are created before each test
    and dropped after each test for isolation.
    
    Yields:
        Flask: Configured Flask application instance for testing
    """
    application = create_app('testing')
    
    with application.app_context():
        db.create_all()
        yield application
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client.
    
    Creates a Flask test client for making requests to the application
    without running a server.
    
    Args:
        app: Flask application fixture
        
    Returns:
        FlaskClient: Test client for the application
    """
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create CLI test runner.
    
    Creates a Flask CLI test runner for testing CLI commands.
    
    Args:
        app: Flask application fixture
        
    Returns:
        FlaskCliRunner: CLI test runner for the application
    """
    return app.test_cli_runner()
