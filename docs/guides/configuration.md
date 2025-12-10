# Configuration Reference

> **Last Updated:** December 2024  
> **Source Files:** config.py, .env.example  
> **Maintainer:** Development Team

This comprehensive guide documents all configuration options for the Flask application, including environment variables, configuration classes, inheritance hierarchy, and best practices for different deployment environments.

## Table of Contents

- [Overview](#overview)
- [Configuration Hierarchy](#configuration-hierarchy)
  - [Class Inheritance Diagram](#class-inheritance-diagram)
  - [Configuration Selection](#configuration-selection)
  - [Value Precedence](#value-precedence)
- [Environment Variables Reference](#environment-variables-reference)
  - [Flask Core Variables](#flask-core-variables)
  - [Server Variables](#server-variables)
  - [Database Variables](#database-variables)
  - [Security Variables](#security-variables)
  - [Logging Variables](#logging-variables)
  - [Request Variables](#request-variables)
- [Configuration Classes](#configuration-classes)
  - [Config (Base Class)](#config-base-class)
  - [DevelopmentConfig](#developmentconfig)
  - [ProductionConfig](#productionconfig)
  - [TestingConfig](#testingconfig)
- [Production Configuration](#production-configuration)
  - [Production Checklist](#production-checklist)
  - [Required Environment Variables](#required-environment-variables)
  - [Security Recommendations](#security-recommendations)
- [Security Considerations](#security-considerations)
  - [SECRET_KEY Requirements](#secret_key-requirements)
  - [CORS_ORIGINS Security](#cors_origins-security)
  - [JWT Configuration](#jwt-configuration)
  - [Database URL Security](#database-url-security)
- [Boolean Environment Variables](#boolean-environment-variables)
- [Configuration Examples](#configuration-examples)
  - [Development .env Example](#development-env-example)
  - [Production .env Example](#production-env-example)
  - [Docker Environment Configuration](#docker-environment-configuration)
- [Related Documentation](#related-documentation)

---

## Overview

The Flask application uses a hierarchical configuration system that supports multiple deployment environments through Python class inheritance and environment variable overrides.

### Configuration System Architecture

The configuration system is built on three key components:

1. **python-dotenv Integration**: Automatically loads environment variables from a `.env` file at application startup.

   > Source: /config.py:21-23

   ```python
   from dotenv import load_dotenv
   
   # Load environment variables from .env file if it exists
   # This must be called before accessing any environment variables
   load_dotenv()
   ```

2. **Application Factory Pattern**: The `create_app()` function selects the appropriate configuration class based on the environment.

   > Source: /app.py:62-69

   ```python
   if config_name is None:
       config_name = os.environ.get('FLASK_ENV', 'development')
   
   app = Flask(__name__)
   
   # Load configuration from environment-specific config class
   config_class = config.get(config_name, config['default'])
   app.config.from_object(config_class)
   ```

3. **Class-Based Configuration**: Different configuration classes for development, production, and testing environments, each inheriting from a common base class.

### How Configuration Loading Works

```mermaid
flowchart TD
    A[Application Start] --> B[load_dotenv]
    B --> C[Read .env file]
    C --> D{FLASK_ENV set?}
    D -->|Yes| E[Use FLASK_ENV value]
    D -->|No| F[Default to 'development']
    E --> G[Select Config Class]
    F --> G
    G --> H[Load Class Attributes]
    H --> I[Environment Variables Override Defaults]
    I --> J[Application Configured]
```

[← Back to Documentation Index](../README.md)

---

## Configuration Hierarchy

The configuration system uses Python class inheritance to provide environment-specific settings while sharing common defaults.

### Class Inheritance Diagram

```mermaid
classDiagram
    class Config {
        +SECRET_KEY: str
        +DEBUG: bool
        +TESTING: bool
        +SQLALCHEMY_DATABASE_URI: str
        +SQLALCHEMY_TRACK_MODIFICATIONS: bool
        +JSON_SORT_KEYS: bool
        +HOST: str
        +PORT: int
        +CORS_ORIGINS: str
        +JWT_SECRET_KEY: str
        +JWT_ACCESS_TOKEN_EXPIRES: int
        +LOG_LEVEL: str
        +MAX_CONTENT_LENGTH: int
    }
    
    class DevelopmentConfig {
        +DEBUG: bool = True
        +SQLALCHEMY_ECHO: bool
    }
    
    class ProductionConfig {
        +DEBUG: bool = False
        +TESTING: bool = False
        +init_app(app) None
    }
    
    class TestingConfig {
        +TESTING: bool = True
        +DEBUG: bool = True
        +SQLALCHEMY_DATABASE_URI: str
        +WTF_CSRF_ENABLED: bool = False
    }
    
    Config <|-- DevelopmentConfig : inherits
    Config <|-- ProductionConfig : inherits
    Config <|-- TestingConfig : inherits
```

### Configuration Selection

Configuration is selected using the `config` dictionary mapping, which maps environment names to configuration classes.

> Source: /config.py:161-168

```python
# Configuration dictionary for easy environment-based selection
# Usage: app.config.from_object(config[os.getenv('FLASK_ENV', 'development')])
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
```

| Environment Name | Configuration Class | Primary Use Case |
|------------------|---------------------|------------------|
| `development` | `DevelopmentConfig` | Local development with debugging |
| `production` | `ProductionConfig` | Production deployments |
| `testing` | `TestingConfig` | Automated testing |
| `default` | `DevelopmentConfig` | Fallback when environment not specified |

### Value Precedence

Configuration values are resolved in the following order (highest to lowest priority):

```mermaid
flowchart TB
    A[1. Environment Variable] --> B{Value Set?}
    B -->|Yes| C[Use Environment Value]
    B -->|No| D[2. Subclass Override]
    D --> E{Override Exists?}
    E -->|Yes| F[Use Subclass Value]
    E -->|No| G[3. Config Base Default]
    G --> H[Use Base Class Value]
    
    style A fill:#e1f5fe
    style D fill:#fff3e0
    style G fill:#f3e5f5
```

**Precedence Rules:**

1. **Environment Variable** (Highest Priority): If set in `.env` or system environment, this value is used.
2. **Subclass Override**: If the selected config class (e.g., `DevelopmentConfig`) defines an attribute, it overrides the base.
3. **Config Base Default** (Lowest Priority): The value defined in the `Config` base class.

**Example:**

```python
# Base Config class defines:
DEBUG = _get_bool_env('DEBUG', False)  # Default: False

# DevelopmentConfig overrides:
DEBUG = True  # Always True in development

# But if DEBUG=false is set in .env:
# The environment variable wins for the base Config,
# but DevelopmentConfig hard-codes it to True
```

---

## Environment Variables Reference

All environment variables are documented below, organized by category. Each variable shows its type, default value, and source location.

### Flask Core Variables

#### FLASK_APP

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `app.py` |
| **Required** | Yes (for Flask CLI) |
| **Environment** | All |

The Flask application entry point, required for Flask CLI commands like `flask run`.

> Source: /.env.example:16

```bash
FLASK_APP=app.py
```

---

#### FLASK_ENV

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `development` |
| **Required** | Recommended |
| **Valid Values** | `development`, `production`, `testing` |
| **Environment** | All |

Controls the environment mode, which determines which configuration class is loaded. This affects debug mode, logging verbosity, and other environment-specific behavior.

> Source: /.env.example:20

```bash
FLASK_ENV=development
```

---

#### SECRET_KEY

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `dev-secret-key-change-in-production` |
| **Required** | **Yes** (Production) |
| **Environment** | All |

Secret key for session management, CSRF protection, and cryptographic operations. Must be a strong, unique, random value in production.

> Source: /config.py:64, /.env.example:25

```python
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
```

**Generate a secure key:**

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> **⚠️ Security Warning:** Never use the default value in production. Generate a unique key for each deployment.

---

#### DEBUG

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Default** | `False` |
| **Required** | No |
| **Environment** | All |

Enables Flask's debug mode, providing detailed error pages and auto-reload on code changes.

> Source: /config.py:65, /.env.example:29

```python
DEBUG = _get_bool_env('DEBUG', False)
```

**Valid values:** `true`, `1`, `yes`, `on` → `True`; all others → `False`

> **⚠️ Security Warning:** Never enable debug mode in production as it exposes sensitive information.

---

#### TESTING

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Default** | `False` |
| **Required** | No |
| **Environment** | Testing only |

Enables Flask's testing mode. When enabled, error propagation is changed to facilitate test assertions.

> Source: /config.py:66, /.env.example:33

```python
TESTING = _get_bool_env('TESTING', False)
```

---

### Server Variables

#### HOST

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `0.0.0.0` |
| **Required** | No |
| **Environment** | All |

Network interface to bind the Flask development server. Use `0.0.0.0` to accept connections from all interfaces, or `127.0.0.1` for localhost only.

> Source: /config.py:76, /.env.example:41

```python
HOST = os.environ.get('HOST', '0.0.0.0')
```

---

#### PORT

| Property | Value |
|----------|-------|
| **Type** | `integer` |
| **Default** | `5000` |
| **Required** | No |
| **Environment** | All |

Port number for the Flask server to listen on.

> Source: /config.py:77, /.env.example:44

```python
PORT = int(os.environ.get('PORT', 5000))
```

---

#### GUNICORN_WORKERS

| Property | Value |
|----------|-------|
| **Type** | `integer` |
| **Default** | `4` |
| **Required** | No |
| **Environment** | Production |

Number of Gunicorn worker processes. Recommended formula: `(2 × CPU cores) + 1`.

> Source: /.env.example:48

```bash
GUNICORN_WORKERS=4
```

> **Note:** This variable is used by Gunicorn startup scripts, not the Flask application directly.

---

### Database Variables

#### DATABASE_URL

| Property | Value |
|----------|-------|
| **Type** | `string` (SQLAlchemy URI) |
| **Default** | `sqlite:///app.db` |
| **Required** | Yes (if using database) |
| **Environment** | All |

Database connection URL in SQLAlchemy format.

> Source: /config.py:69, /.env.example:59

```python
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
```

**Format Examples:**

| Database | Connection String Format |
|----------|--------------------------|
| SQLite | `sqlite:///app.db` |
| PostgreSQL | `postgresql://user:password@localhost:5432/dbname` |
| MySQL | `mysql+pymysql://user:password@localhost:3306/dbname` |

---

#### SQLALCHEMY_TRACK_MODIFICATIONS

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Default** | `False` |
| **Required** | No |
| **Environment** | All |

Enables SQLAlchemy event tracking for model modifications. Disable for better performance.

> Source: /config.py:70, /.env.example:63

```python
SQLALCHEMY_TRACK_MODIFICATIONS = _get_bool_env('SQLALCHEMY_TRACK_MODIFICATIONS', False)
```

> **Recommendation:** Keep this `False` in production for better performance.

---

#### SQLALCHEMY_ECHO

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Default** | `True` (development), `False` (others) |
| **Required** | No |
| **Environment** | Development |

Echoes all SQL queries to the console. Useful for debugging database operations.

> Source: /config.py:104, /.env.example:66

```python
SQLALCHEMY_ECHO = _get_bool_env('SQLALCHEMY_ECHO', True)  # In DevelopmentConfig
```

---

### Security Variables

#### CORS_ORIGINS

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `*` |
| **Required** | Recommended (Production) |
| **Environment** | All |

Comma-separated list of allowed CORS origins. Use `*` for development, specific domains for production.

> Source: /config.py:80, /.env.example:74

```python
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
```

**Examples:**

```bash
# Development (allow all)
CORS_ORIGINS=*

# Production (specific origins)
CORS_ORIGINS=https://example.com,https://api.example.com
```

> **⚠️ Security Warning:** Never use `*` in production. Specify exact allowed origins.

---

#### JWT_SECRET_KEY

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | Value of `SECRET_KEY` |
| **Required** | Recommended (if using JWT) |
| **Environment** | All |

Secret key for JWT token signing. Defaults to `SECRET_KEY` if not set.

> Source: /config.py:81, /.env.example:78

```python
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
```

**Generate a secure key:**

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

#### JWT_ACCESS_TOKEN_EXPIRES

| Property | Value |
|----------|-------|
| **Type** | `integer` |
| **Default** | `3600` (1 hour) |
| **Required** | No |
| **Environment** | All |

JWT access token expiration time in seconds.

> Source: /config.py:82, /.env.example:81

```python
JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
```

| Duration | Value (seconds) |
|----------|-----------------|
| 15 minutes | `900` |
| 1 hour | `3600` |
| 24 hours | `86400` |
| 7 days | `604800` |

---

### Logging Variables

#### LOG_LEVEL

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Default** | `INFO` |
| **Required** | No |
| **Valid Values** | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| **Environment** | All |

Application logging verbosity level.

> Source: /config.py:85, /.env.example:88

```python
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
```

| Level | Description | Production Use |
|-------|-------------|----------------|
| `DEBUG` | Detailed debug information | No |
| `INFO` | General operational information | Yes |
| `WARNING` | Warning messages for potential issues | Yes |
| `ERROR` | Error events that need attention | Yes |
| `CRITICAL` | Critical events that need immediate action | Yes |

---

### Request Variables

#### MAX_CONTENT_LENGTH

| Property | Value |
|----------|-------|
| **Type** | `integer` |
| **Default** | `16777216` (16 MB) |
| **Required** | No |
| **Environment** | All |

Maximum allowed request body size in bytes. Requests exceeding this limit return a 413 error.

> Source: /config.py:88, /.env.example:117

```python
MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
```

| Size | Value (bytes) |
|------|---------------|
| 1 MB | `1048576` |
| 16 MB (default) | `16777216` |
| 50 MB | `52428800` |
| 100 MB | `104857600` |

---

## Configuration Classes

The application defines four configuration classes, each optimized for specific deployment scenarios.

### Config (Base Class)

The base configuration class provides default values that all other configurations inherit from.

> Source: /config.py:47-89

```python
class Config:
    """
    Base configuration class with default values.
    
    All configuration classes inherit from this base class.
    Values can be overridden by environment variables or subclasses.
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
```

**Key Attributes:**

| Attribute | Default Value | Description |
|-----------|---------------|-------------|
| `SECRET_KEY` | `dev-secret-key-...` | Session encryption key |
| `DEBUG` | `False` | Debug mode flag |
| `TESTING` | `False` | Testing mode flag |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///app.db` | Database connection |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

---

### DevelopmentConfig

Development configuration enables debugging features and SQL query logging.

> Source: /config.py:91-104

```python
class DevelopmentConfig(Config):
    """
    Development environment configuration.
    
    Enables debug mode and SQL query logging for easier development.
    Inherits all base configuration values from Config.
    """
    
    DEBUG = True
    SQLALCHEMY_ECHO = _get_bool_env('SQLALCHEMY_ECHO', True)
```

**Differences from Base Config:**

| Attribute | Base Config | DevelopmentConfig | Purpose |
|-----------|-------------|-------------------|---------|
| `DEBUG` | `False` | `True` | Enable detailed error pages |
| `SQLALCHEMY_ECHO` | N/A | `True` | Log SQL queries to console |

**When to Use:**
- Local development
- Debugging application issues
- Database query optimization

---

### ProductionConfig

Production configuration disables debugging and includes validation for required settings.

> Source: /config.py:107-138

```python
class ProductionConfig(Config):
    """
    Production environment configuration.
    
    Disables debug mode and testing mode for security and performance.
    Inherits all base configuration values from Config.
    """
    
    DEBUG = False
    TESTING = False
    
    @classmethod
    def init_app(cls, app):
        """
        Production-specific initialization.
        
        Validates that required environment variables are set.
        Called when the application is initialized with production config.
        
        Raises:
            ValueError: If SECRET_KEY is not set in environment
        """
        if not os.environ.get('SECRET_KEY'):
            raise ValueError("SECRET_KEY environment variable must be set in production")
```

**Differences from Base Config:**

| Attribute | Base Config | ProductionConfig | Purpose |
|-----------|-------------|------------------|---------|
| `DEBUG` | `False` | `False` (enforced) | Prevent accidental debug mode |
| `TESTING` | `False` | `False` (enforced) | Prevent testing mode |

**Key Feature - `init_app()` Method:**

The `init_app()` classmethod is called during application initialization and performs production-specific validation:

```python
# This validation runs when using ProductionConfig
if not os.environ.get('SECRET_KEY'):
    raise ValueError("SECRET_KEY environment variable must be set in production")
```

> **Security Note:** The application will fail to start in production if `SECRET_KEY` is not explicitly set in the environment.

---

### TestingConfig

Testing configuration provides an isolated environment for automated tests.

> Source: /config.py:140-158

```python
class TestingConfig(Config):
    """
    Testing environment configuration.
    
    Enables testing mode with an in-memory SQLite database.
    Disables CSRF protection for easier API testing.
    """
    
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    WTF_CSRF_ENABLED = False
```

**Differences from Base Config:**

| Attribute | Base Config | TestingConfig | Purpose |
|-----------|-------------|---------------|---------|
| `TESTING` | `False` | `True` | Enable test mode |
| `DEBUG` | `False` | `True` | Detailed error messages |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///app.db` | `sqlite:///:memory:` | In-memory test database |
| `WTF_CSRF_ENABLED` | N/A | `False` | Simplify form testing |

**Key Features:**

1. **In-Memory Database**: Uses SQLite in-memory database (`sqlite:///:memory:`) for test isolation and speed.
2. **CSRF Disabled**: `WTF_CSRF_ENABLED = False` allows form testing without CSRF tokens.
3. **Debug Enabled**: Provides detailed error messages during test failures.

**When to Use:**
- Running pytest tests
- CI/CD pipeline testing
- Integration testing

---

## Production Configuration

This section provides guidance for configuring the application for production deployment.

### Production Checklist

Before deploying to production, ensure the following items are completed:

| Item | Status | Description |
|------|--------|-------------|
| ☐ | Required | Set `FLASK_ENV=production` |
| ☐ | Required | Generate and set unique `SECRET_KEY` |
| ☐ | Required | Configure `DATABASE_URL` for production database |
| ☐ | Required | Set `CORS_ORIGINS` to specific allowed domains |
| ☐ | Recommended | Generate separate `JWT_SECRET_KEY` |
| ☐ | Recommended | Set `LOG_LEVEL=INFO` or `WARNING` |
| ☐ | Recommended | Disable `DEBUG` explicitly |
| ☐ | Recommended | Configure `GUNICORN_WORKERS` based on CPU cores |
| ☐ | Optional | Adjust `MAX_CONTENT_LENGTH` based on requirements |
| ☐ | Optional | Set `JWT_ACCESS_TOKEN_EXPIRES` based on security policy |

### Required Environment Variables

The following environment variables **must** be set for production:

```bash
# Required
SECRET_KEY=<generated-secure-key>
FLASK_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Strongly Recommended
CORS_ORIGINS=https://your-domain.com
JWT_SECRET_KEY=<generated-secure-key>
```

**Generate SECRET_KEY:**

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Example output:
```
a3f5c7e9b1d2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6b8c0d2e4f6a8b0c2d4
```

### Security Recommendations

| Setting | Development | Production | Reason |
|---------|-------------|------------|--------|
| `DEBUG` | `true` | `false` | Prevents exposure of stack traces |
| `TESTING` | `false` | `false` | Ensures production behavior |
| `SECRET_KEY` | Any value | Unique, random | Prevents session hijacking |
| `CORS_ORIGINS` | `*` | Specific domains | Prevents unauthorized API access |
| `LOG_LEVEL` | `DEBUG` | `INFO`/`WARNING` | Reduces log verbosity |
| `SQLALCHEMY_ECHO` | `true` | `false` | Prevents query logging overhead |

---

## Security Considerations

### SECRET_KEY Requirements

The `SECRET_KEY` is critical for application security:

**Requirements:**
- Minimum 32 characters (64 hexadecimal characters recommended)
- Cryptographically random
- Unique per deployment
- Never committed to version control

**Generation Methods:**

```bash
# Method 1: Using Python secrets module (recommended)
python -c "import secrets; print(secrets.token_hex(32))"

# Method 2: Using OpenSSL
openssl rand -hex 32

# Method 3: Using /dev/urandom
head -c 32 /dev/urandom | xxd -p -c 64
```

**Consequences of Weak SECRET_KEY:**
- Session hijacking
- CSRF bypass
- Cookie tampering
- Security token prediction

### CORS_ORIGINS Security

Cross-Origin Resource Sharing (CORS) controls which domains can access your API.

> Source: /config.py:80, /.env.example:74

**Development Configuration:**

```bash
CORS_ORIGINS=*  # Allow all origins (development only)
```

**Production Configuration:**

```bash
# Single origin
CORS_ORIGINS=https://example.com

# Multiple origins (comma-separated)
CORS_ORIGINS=https://example.com,https://app.example.com,https://admin.example.com
```

> **⚠️ Security Warning:** Using `*` (wildcard) in production allows any website to make API requests, potentially exposing sensitive data to malicious sites.

### JWT Configuration

If using JWT for authentication:

**Best Practices:**

1. **Separate JWT_SECRET_KEY**: Use a different key from SECRET_KEY
   ```bash
   JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
   ```

2. **Token Expiration**: Set appropriate expiration times
   ```bash
   # Short-lived tokens (15-60 minutes) for sensitive applications
   JWT_ACCESS_TOKEN_EXPIRES=900
   
   # Longer tokens (1-24 hours) for general applications
   JWT_ACCESS_TOKEN_EXPIRES=3600
   ```

3. **Rotation Strategy**: Implement token refresh mechanism and rotate keys periodically

### Database URL Security

The `DATABASE_URL` may contain sensitive credentials:

**Best Practices:**

1. **Never commit credentials** to version control
2. **Use environment variables** for all database credentials
3. **Use SSL/TLS connections** in production:
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
   ```
4. **Consider connection pooling** for production deployments
5. **Use read-only credentials** where appropriate

---

## Boolean Environment Variables

The configuration system uses a helper function to parse boolean environment variables consistently.

> Source: /config.py:26-44

```python
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
```

### Parsing Rules

| Environment Value | Parsed Result | Notes |
|-------------------|---------------|-------|
| `true` | `True` | Case-insensitive |
| `True` | `True` | Case-insensitive |
| `TRUE` | `True` | Case-insensitive |
| `1` | `True` | Numeric true |
| `yes` | `True` | Alternative syntax |
| `on` | `True` | Alternative syntax |
| `false` | `False` | Explicit false |
| `0` | `False` | Numeric false |
| `no` | `False` | Alternative syntax |
| `off` | `False` | Alternative syntax |
| `""` (empty) | `False` | Empty string |
| (not set) | `default` | Uses provided default |
| `random` | `False` | Any other value |

### Boolean Variables in Application

The following configuration variables use boolean parsing:

| Variable | Default |
|----------|---------|
| `DEBUG` | `False` |
| `TESTING` | `False` |
| `SQLALCHEMY_TRACK_MODIFICATIONS` | `False` |
| `JSON_SORT_KEYS` | `False` |
| `SQLALCHEMY_ECHO` | `True` (in DevelopmentConfig) |

---

## Configuration Examples

### Development .env Example

Create a `.env` file for local development:

```bash
# =============================================================================
# Development Environment Configuration
# =============================================================================

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-for-local-development-only

# Debug Settings
DEBUG=true
TESTING=false

# Server Configuration
HOST=127.0.0.1
PORT=5000

# Database Configuration
DATABASE_URL=sqlite:///app.db
SQLALCHEMY_TRACK_MODIFICATIONS=false
SQLALCHEMY_ECHO=true

# Security Configuration (relaxed for development)
CORS_ORIGINS=*
JWT_SECRET_KEY=dev-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES=86400

# Logging Configuration
LOG_LEVEL=DEBUG

# Request Configuration
MAX_CONTENT_LENGTH=16777216
```

### Production .env Example

Create a `.env` file for production deployment:

```bash
# =============================================================================
# Production Environment Configuration
# =============================================================================

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=a3f5c7e9b1d2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6b8c0d2e4f6a8b0c2d4

# Debug Settings (MUST be false in production)
DEBUG=false
TESTING=false

# Server Configuration
HOST=0.0.0.0
PORT=8000
GUNICORN_WORKERS=4

# Database Configuration
DATABASE_URL=postgresql://dbuser:dbpassword@db-host:5432/production_db?sslmode=require
SQLALCHEMY_TRACK_MODIFICATIONS=false
SQLALCHEMY_ECHO=false

# Security Configuration (strict for production)
CORS_ORIGINS=https://example.com,https://api.example.com
JWT_SECRET_KEY=b2d4f6a8c0e2f4a6b8d0e2f4a6b8c0d2e4f6a8b0c2d4f6a8c0e2f4a6b8d0e2f4
JWT_ACCESS_TOKEN_EXPIRES=3600

# Logging Configuration
LOG_LEVEL=INFO

# Request Configuration
MAX_CONTENT_LENGTH=16777216
```

### Docker Environment Configuration

For Docker deployments, pass environment variables using the `-e` flag or `--env-file`:

**Using individual environment variables:**

```bash
docker run -d \
  -e FLASK_ENV=production \
  -e SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  -e DATABASE_URL="postgresql://user:pass@db:5432/app" \
  -e CORS_ORIGINS="https://example.com" \
  -e JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  -e LOG_LEVEL=INFO \
  -p 8000:8000 \
  existingproduct1-3dec
```

**Using an environment file:**

```bash
docker run -d \
  --env-file .env.production \
  -p 8000:8000 \
  existingproduct1-3dec
```

**Docker Compose example:**

```yaml
version: '3.8'
services:
  web:
    image: existingproduct1-3dec
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - CORS_ORIGINS=${CORS_ORIGINS}
    env_file:
      - .env.production
```

---

## Related Documentation

- **[Deployment Guide](../deployment/deployment.md)** - Comprehensive deployment instructions for Docker and Gunicorn
- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[API Endpoints Reference](../api/endpoints.md)** - API documentation
- **[Environment Template](.env.example)** - Template file with all available variables
- **[Back to Documentation Index](../README.md)**

---

> **Document Information:**
> - **Created:** December 2024
> - **Source Files:** config.py, .env.example, app.py
> - **Target Audience:** Developers, DevOps Engineers
