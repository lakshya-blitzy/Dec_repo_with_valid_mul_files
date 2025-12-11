"""
Database models module for Flask application.

This module initializes the Flask-SQLAlchemy database instance and provides
the foundation for defining database models. In the current implementation,
this serves as a minimal stub to support the application factory pattern.

Usage:
    from models import db
    
    # Initialize with Flask app
    db.init_app(app)
    
    # Define models (future implementation)
    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        ...

Exports:
    db: Flask-SQLAlchemy database instance for model definitions and queries
"""

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy without binding to a specific app
# The app binding happens in create_app() via db.init_app(app)
db = SQLAlchemy()
