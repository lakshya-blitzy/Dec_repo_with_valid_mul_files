"""
API Routes module for Flask application.

This module defines the API blueprint with route handlers for the Flask application.
All API endpoints are prefixed with /api when the blueprint is registered.

The current implementation provides:
- Health check endpoint for monitoring and container orchestration
- Root endpoint for API information

Usage:
    from routes import api_bp
    
    # Register blueprint with URL prefix
    app.register_blueprint(api_bp, url_prefix='/api')

Endpoints:
    GET /api/health - Health check endpoint
    GET /api/ - API root endpoint with version info

Exports:
    api_bp: Flask Blueprint containing all API route handlers
"""

from flask import Blueprint, jsonify

# Create the API blueprint
# All routes in this blueprint will be prefixed with /api when registered
api_bp = Blueprint('api', __name__)


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring and container orchestration.
    
    This endpoint is used by load balancers, container orchestrators (Docker, K8s),
    and monitoring systems to verify the application is running and responding.
    
    Returns:
        tuple: JSON response with status and 200 status code
        
    Example Response:
        {
            "status": "healthy",
            "service": "flask-api"
        }
    """
    return jsonify({
        'status': 'healthy',
        'service': 'flask-api'
    }), 200


@api_bp.route('/', methods=['GET'])
def api_root():
    """API root endpoint providing service information.
    
    Returns basic information about the API including version and available endpoints.
    
    Returns:
        tuple: JSON response with API info and 200 status code
        
    Example Response:
        {
            "name": "Flask API",
            "version": "1.0.0",
            "status": "running"
        }
    """
    return jsonify({
        'name': 'Flask API',
        'version': '1.0.0',
        'status': 'running'
    }), 200
