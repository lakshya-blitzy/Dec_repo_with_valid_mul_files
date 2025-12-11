"""
Unit tests for the Flask application.

This module tests the Flask application factory, error handlers,
and basic configuration functionality.

Test Categories:
    - Application Factory Tests: Verify create_app() creates configured instances
    - Error Handler Tests: Verify JSON error responses for HTTP errors
    - Configuration Tests: Verify different environments load correctly
"""

import pytest
from flask import Flask

from app import create_app
from config import DevelopmentConfig, ProductionConfig, TestingConfig


class TestApplicationFactory:
    """Tests for the create_app() application factory."""
    
    def test_create_app_returns_flask_instance(self, app):
        """Test that create_app returns a Flask application instance."""
        assert isinstance(app, Flask)
    
    def test_create_app_development_config(self):
        """Test that development config enables debug mode."""
        app = create_app('development')
        assert app.config['DEBUG'] is True
    
    def test_create_app_testing_config(self, app):
        """Test that testing config enables testing mode."""
        assert app.config['TESTING'] is True
    
    def test_create_app_default_config(self):
        """Test that default config works when None is passed."""
        import os
        original_env = os.environ.get('FLASK_ENV')
        os.environ['FLASK_ENV'] = 'development'
        try:
            app = create_app(None)
            assert isinstance(app, Flask)
        finally:
            if original_env:
                os.environ['FLASK_ENV'] = original_env
            else:
                os.environ.pop('FLASK_ENV', None)


class TestErrorHandlers:
    """Tests for the JSON error handlers."""
    
    def test_404_returns_json(self, client):
        """Test that 404 errors return JSON response."""
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404
        assert response.content_type == 'application/json'
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Not found'
    
    def test_405_returns_json(self, client):
        """Test that 405 errors return JSON response."""
        # POST to GET-only health endpoint
        response = client.post('/api/health')
        assert response.status_code == 405
        assert response.content_type == 'application/json'
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Method not allowed'


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_endpoint_returns_200(self, client):
        """Test that health endpoint returns 200 OK."""
        response = client.get('/api/health')
        assert response.status_code == 200
    
    def test_health_endpoint_returns_json(self, client):
        """Test that health endpoint returns JSON response."""
        response = client.get('/api/health')
        assert response.content_type == 'application/json'
        data = response.get_json()
        assert 'status' in data
        assert data['status'] == 'healthy'
    
    def test_health_endpoint_includes_service_name(self, client):
        """Test that health endpoint includes service name."""
        response = client.get('/api/health')
        data = response.get_json()
        assert 'service' in data
        assert data['service'] == 'flask-api'


class TestAPIRootEndpoint:
    """Tests for the API root endpoint."""
    
    def test_api_root_returns_200(self, client):
        """Test that API root endpoint returns 200 OK."""
        response = client.get('/api/')
        assert response.status_code == 200
    
    def test_api_root_returns_json(self, client):
        """Test that API root endpoint returns JSON response."""
        response = client.get('/api/')
        assert response.content_type == 'application/json'
        data = response.get_json()
        assert 'name' in data
        assert 'version' in data
        assert 'status' in data


class TestConfiguration:
    """Tests for configuration classes."""
    
    def test_development_config_debug_enabled(self):
        """Test that development config has debug enabled."""
        assert DevelopmentConfig.DEBUG is True
    
    def test_production_config_debug_disabled(self):
        """Test that production config has debug disabled."""
        assert ProductionConfig.DEBUG is False
    
    def test_testing_config_testing_enabled(self):
        """Test that testing config has testing mode enabled."""
        assert TestingConfig.TESTING is True
    
    def test_testing_config_uses_memory_db(self):
        """Test that testing config uses in-memory SQLite."""
        assert 'memory' in TestingConfig.SQLALCHEMY_DATABASE_URI.lower()
