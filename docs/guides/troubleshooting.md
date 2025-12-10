# Troubleshooting Guide

> **Last Updated:** December 2024  
> **Source Files:** Dockerfile, app.py, config.py, .env.example  
> **Maintainer:** Development Team

This guide provides solutions for common issues encountered when developing, deploying, and operating the Flask application. Use the decision tree flowchart below to quickly identify and resolve problems.

## Table of Contents

- [Common Issues Overview](#common-issues-overview)
- [Troubleshooting Decision Tree](#troubleshooting-decision-tree)
- [Health Check Failures](#health-check-failures)
  - [Symptoms](#health-check-symptoms)
  - [Diagnostic Commands](#health-check-diagnostic-commands)
  - [Solutions](#health-check-solutions)
- [Configuration Problems](#configuration-problems)
  - [SECRET_KEY Validation Errors](#secret_key-validation-errors)
  - [Environment Variables Not Loaded](#environment-variables-not-loaded)
  - [Boolean Parsing Issues](#boolean-parsing-issues)
  - [Configuration Class Selection](#configuration-class-selection)
- [Database Connection Issues](#database-connection-issues)
  - [SQLite File Permission Errors](#sqlite-file-permission-errors)
  - [PostgreSQL/MySQL Connection Errors](#postgresqlmysql-connection-errors)
  - [SQLALCHEMY_TRACK_MODIFICATIONS Warnings](#sqlalchemy_track_modifications-warnings)
  - [Database Initialization Errors](#database-initialization-errors)
- [CORS Errors](#cors-errors)
  - [Origin Not Allowed](#origin-not-allowed)
  - [Preflight Request Failures](#preflight-request-failures)
  - [Security Implications](#cors-security-implications)
- [Docker Issues](#docker-issues)
  - [Build Failures](#build-failures)
  - [Container Startup Failures](#container-startup-failures)
  - [Port Mapping Issues](#port-mapping-issues)
  - [Volume Mounting Problems](#volume-mounting-problems)
  - [Non-Root User Permissions](#non-root-user-permissions)
- [Logging and Debugging](#logging-and-debugging)
  - [Enabling Debug Mode](#enabling-debug-mode)
  - [Adjusting Log Level](#adjusting-log-level)
  - [Accessing Container Logs](#accessing-container-logs)
  - [SQL Query Debugging](#sql-query-debugging)
- [Quick Reference](#quick-reference)
- [Related Documentation](#related-documentation)

---

## Common Issues Overview

The following table summarizes the most frequently encountered issues and their primary causes:

| Issue Category | Common Symptoms | Primary Cause | Quick Fix |
|----------------|-----------------|---------------|-----------|
| Health Check Failures | Container restarts, failed probes | Incorrect endpoint or port | Verify `/health` endpoint accessibility |
| Configuration Errors | App fails to start | Missing or invalid env vars | Check `.env` file and `FLASK_ENV` |
| Database Connection | Connection refused errors | Invalid connection string | Verify `DATABASE_URL` format |
| CORS Errors | Blocked requests in browser | Misconfigured origins | Update `CORS_ORIGINS` setting |
| Docker Issues | Container exits immediately | Missing dependencies | Check build logs and Dockerfile |

---

## Troubleshooting Decision Tree

Use this flowchart to systematically diagnose problems:

```mermaid
flowchart TD
    A[Application Problem] --> B{Where does it occur?}
    
    B -->|During Startup| C{Error Type?}
    B -->|At Runtime| D{Error Type?}
    B -->|In Container| E{Docker Phase?}
    
    C -->|ValueError| F[Check SECRET_KEY<br/>in production]
    C -->|ImportError| G[Verify dependencies<br/>installed]
    C -->|Database Error| H[Check DATABASE_URL<br/>format and access]
    
    D -->|404 Not Found| I[Verify endpoint path<br/>and blueprint registration]
    D -->|500 Server Error| J[Enable DEBUG mode<br/>and check logs]
    D -->|CORS Error| K[Check CORS_ORIGINS<br/>configuration]
    
    E -->|Build Fails| L[Review build logs<br/>Check requirements.txt]
    E -->|Container Exits| M[Check environment vars<br/>Review startup logs]
    E -->|Health Check Fails| N[Verify /health endpoint<br/>Check port binding]
    
    F --> O[Set SECRET_KEY env var]
    G --> P[Run pip install -r requirements.txt]
    H --> Q[Fix connection string format]
    
    I --> R[Check routes/api.py<br/>blueprint configuration]
    J --> S[Review app.logger output<br/>Check error handlers]
    K --> T[Update CORS_ORIGINS<br/>in .env or config]
    
    L --> U[Check Python version<br/>Verify package availability]
    M --> V[Use docker logs<br/>Check entrypoint]
    N --> W[Test with curl<br/>Check PORT variable]
    
    style A fill:#ffcdd2
    style O fill:#c8e6c9
    style P fill:#c8e6c9
    style Q fill:#c8e6c9
    style R fill:#c8e6c9
    style S fill:#c8e6c9
    style T fill:#c8e6c9
    style U fill:#c8e6c9
    style V fill:#c8e6c9
    style W fill:#c8e6c9
```

---

## Health Check Failures

Health check failures are one of the most common issues in containerized deployments. The Docker health check monitors application availability.

### Health Check Endpoint Configuration

> **Important Note:** There is a discrepancy between the Dockerfile health check path and the API prefix.
> - **Dockerfile uses:** `/health` (Source: /Dockerfile:85-86)
> - **API Blueprint prefix:** `/api` means health endpoint may be at `/api/health`

**Docker Health Check Configuration:**

> Source: /Dockerfile:85-86

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `--interval` | 30s | Time between health checks |
| `--timeout` | 10s | Time to wait for response |
| `--start-period` | 5s | Grace period for container startup |
| `--retries` | 3 | Failed checks before marking unhealthy |

### Health Check Symptoms

**Symptom 1: Container keeps restarting**
```
$ docker ps
CONTAINER ID   STATUS                            NAMES
abc123def456   Up 5 seconds (health: starting)   flask-app
# ... later ...
abc123def456   Restarting (1) 2 seconds ago      flask-app
```

**Symptom 2: Kubernetes readiness probe failures**
```
Warning  Unhealthy  2s (x3 over 62s)  kubelet  Readiness probe failed: 
HTTP probe failed with statuscode: 404
```

**Symptom 3: Load balancer removing instance**
- Instance marked as unhealthy in cloud provider console
- Traffic no longer routed to container

### Health Check Diagnostic Commands

**Step 1: Check container health status**
```bash
# View health check status
docker inspect --format='{{json .State.Health}}' flask-app | python -m json.tool

# Watch container logs
docker logs -f flask-app
```

**Step 2: Test health endpoint from host**
```bash
# Test from host machine (replace PORT with your mapped port)
curl -v http://localhost:8000/health

# If using /api prefix
curl -v http://localhost:8000/api/health
```

**Step 3: Test health endpoint from within container**
```bash
# Execute curl inside the container
docker exec flask-app curl -v http://localhost:8000/health
```

**Step 4: Check if application is listening**
```bash
# View listening ports inside container
docker exec flask-app netstat -tlnp

# Or using ss command
docker exec flask-app ss -tlnp
```

### Health Check Solutions

**Solution 1: Verify the health endpoint exists**

Ensure your application has a health check route. Add one to `routes/api.py` if missing:

```python
@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for container orchestration."""
    return jsonify({'status': 'healthy', 'message': 'Application is running'}), 200
```

**Solution 2: Fix port binding mismatch**

Ensure the container port matches the `PORT` environment variable:

```bash
# Check current PORT setting in container
docker exec flask-app printenv PORT

# Run container with explicit port
docker run -p 8000:8000 -e PORT=8000 flask-app
```

> Source: /Dockerfile:51 - Default PORT is 8000

**Solution 3: Increase start period for slow startup**

If your application takes longer to start (e.g., database migrations), modify the health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1
```

**Solution 4: Debug health check command**
```bash
# Run health check manually
docker exec flask-app curl --fail http://localhost:8000/health

# Check exit code
echo $?  # 0 = success, non-zero = failure
```

---

## Configuration Problems

Configuration issues typically manifest during application startup or cause unexpected behavior at runtime.

### SECRET_KEY Validation Errors

**Error Message:**
```
ValueError: SECRET_KEY environment variable must be set in production
```

**Cause:**

In production mode, the `ProductionConfig` class validates that `SECRET_KEY` is explicitly set.

> Source: /config.py:136-137

```python
@classmethod
def init_app(cls, app):
    if not os.environ.get('SECRET_KEY'):
        raise ValueError("SECRET_KEY environment variable must be set in production")
```

**Solutions:**

**Option 1: Set SECRET_KEY environment variable**
```bash
# Generate a secure key
python -c "import secrets; print(secrets.token_hex(32))"

# Set in .env file
SECRET_KEY=your-generated-64-character-hex-string

# Or pass directly to Docker
docker run -e SECRET_KEY=your-key flask-app
```

**Option 2: Switch to development mode (not recommended for production)**
```bash
# Only for debugging - NEVER use in actual production
FLASK_ENV=development
```

**Option 3: Use Docker secrets (recommended for production)**
```bash
# Create secret
echo "your-secret-key" | docker secret create flask_secret_key -

# Use in docker-compose.yml
secrets:
  flask_secret_key:
    external: true
```

### Environment Variables Not Loaded

**Symptoms:**
- Application uses default values instead of `.env` file values
- Configuration doesn't match expected settings

**Cause:**

The `load_dotenv()` function must be called before any environment variables are accessed.

> Source: /config.py:21-23

```python
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
# This must be called before accessing any environment variables
load_dotenv()
```

**Solutions:**

**Solution 1: Verify .env file location**
```bash
# .env file must be in the project root directory
ls -la .env

# Check file contents
cat .env
```

**Solution 2: Check file permissions**
```bash
# Ensure .env is readable
chmod 644 .env
```

**Solution 3: Verify python-dotenv is installed**
```bash
pip list | grep python-dotenv
# Should show: python-dotenv    1.0.0 (or similar)

# If missing, install it
pip install python-dotenv
```

**Solution 4: Debug environment loading**
```python
# Add temporary debugging to app.py
import os
from dotenv import load_dotenv

load_dotenv(verbose=True)  # Enable verbose mode

print(f"SECRET_KEY loaded: {'SECRET_KEY' in os.environ}")
print(f"FLASK_ENV: {os.environ.get('FLASK_ENV', 'not set')}")
```

### Boolean Parsing Issues

**Symptoms:**
- `DEBUG` is enabled when it shouldn't be
- `TESTING` mode active unexpectedly
- Boolean settings don't match `.env` values

**Cause:**

Boolean environment variables must use specific string values. The `_get_bool_env()` helper function parses these values.

> Source: /config.py:26-44

```python
def _get_bool_env(key: str, default: bool = False) -> bool:
    """
    Helper function to parse boolean environment variables.
    
    Handles common string representations of boolean values:
    'true', '1', 'yes', 'on' -> True
    'false', '0', 'no', 'off', '' -> False
    """
    value = os.environ.get(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')
```

**Valid Boolean Values:**

| True Values | False Values |
|-------------|--------------|
| `true` | `false` |
| `1` | `0` |
| `yes` | `no` |
| `on` | `off` |
| | `` (empty string) |

**Common Mistakes:**

```bash
# WRONG - these may not work as expected
DEBUG=True      # Capital 'T' - works due to .lower()
DEBUG="true"    # Quotes included - works
DEBUG=TRUE      # All caps - works due to .lower()

# CORRECT
DEBUG=true
DEBUG=1
DEBUG=yes

# WRONG - will evaluate to False
DEBUG=           # Empty string
DEBUG=nope       # Unrecognized value
```

**Debug Boolean Parsing:**
```python
# Test in Python shell
import os
os.environ['DEBUG'] = 'True'

def _get_bool_env(key, default=False):
    value = os.environ.get(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')

print(_get_bool_env('DEBUG'))  # Should print: True
```

### Configuration Class Selection

**Symptoms:**
- Wrong configuration applied (e.g., debug mode in production)
- Unexpected default values being used

**Cause:**

Configuration class is selected based on `FLASK_ENV` environment variable.

> Source: /app.py:62-69

```python
if config_name is None:
    config_name = os.environ.get('FLASK_ENV', 'development')

app = Flask(__name__)

# Load configuration from environment-specific config class
config_class = config.get(config_name, config['default'])
app.config.from_object(config_class)
```

**Available Configuration Classes:**

| FLASK_ENV Value | Config Class Used | Key Characteristics |
|-----------------|-------------------|---------------------|
| `development` | `DevelopmentConfig` | DEBUG=True, SQLALCHEMY_ECHO=True |
| `production` | `ProductionConfig` | DEBUG=False, SECRET_KEY required |
| `testing` | `TestingConfig` | TESTING=True, in-memory database |
| (not set) | `DevelopmentConfig` | Default fallback |
| (invalid value) | `DevelopmentConfig` | Falls back to 'default' |

**Debug Configuration Selection:**
```bash
# Check current FLASK_ENV
echo $FLASK_ENV

# In Python
python -c "import os; print(os.environ.get('FLASK_ENV', 'not set'))"

# In running application logs
# Look for: "Flask application initialized with <config_name> configuration"
```

---

## Database Connection Issues

Database connection problems can range from simple misconfiguration to more complex permission and networking issues.

### SQLite File Permission Errors

**Error Messages:**
```
sqlite3.OperationalError: unable to open database file
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file
```

**Causes:**
- Application doesn't have write permission to database directory
- Database file path doesn't exist
- Running as non-root user without proper permissions (especially in Docker)

**Solutions:**

**Solution 1: Fix file permissions**
```bash
# Check current permissions
ls -la app.db

# Fix permissions (development)
chmod 664 app.db
chmod 775 $(dirname app.db)
```

**Solution 2: Create database directory**
```bash
# Ensure directory exists
mkdir -p /path/to/database/directory

# In Docker - use a volume
docker run -v /host/data:/app/data -e DATABASE_URL=sqlite:///data/app.db flask-app
```

**Solution 3: Docker volume permissions (for non-root user)**

> Source: /Dockerfile:64-66 - Non-root user configuration

```dockerfile
# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser
```

Fix volume permissions:
```bash
# On host, ensure directory is writable
sudo chown -R 1000:1000 /host/data

# Or use named volumes (recommended)
docker volume create flask-data
docker run -v flask-data:/app/data flask-app
```

### PostgreSQL/MySQL Connection Errors

**Error Messages:**
```
psycopg2.OperationalError: could not connect to server: Connection refused
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

**Database URL Format:**

> Source: /.env.example:54-59

```bash
# Database connection URL (SQLAlchemy format)
# Examples:
#   SQLite:     sqlite:///app.db
#   PostgreSQL: postgresql://user:password@localhost:5432/dbname
#   MySQL:      mysql+pymysql://user:password@localhost:3306/dbname
```

**Common URL Format Issues:**

| Database | Correct Format | Common Mistakes |
|----------|----------------|-----------------|
| PostgreSQL | `postgresql://user:pass@host:5432/db` | Missing `postgresql://` prefix |
| MySQL | `mysql+pymysql://user:pass@host:3306/db` | Missing `+pymysql` driver |
| SQLite | `sqlite:///app.db` | Only two slashes: `sqlite://app.db` |

**Diagnostic Commands:**

```bash
# Test PostgreSQL connection
psql -h localhost -U user -d dbname -c "SELECT 1"

# Test MySQL connection
mysql -h localhost -u user -p dbname -e "SELECT 1"

# Test from container (PostgreSQL)
docker exec flask-app python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://user:pass@host:5432/db')
with engine.connect() as conn:
    print(conn.execute('SELECT 1').scalar())
"
```

**Docker Network Issues:**

When connecting from container to host database:
```bash
# Use host.docker.internal (Docker Desktop)
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db

# Or use Docker network gateway
DATABASE_URL=postgresql://user:pass@172.17.0.1:5432/db

# Or use Docker Compose service name
DATABASE_URL=postgresql://user:pass@db:5432/dbname
```

### SQLALCHEMY_TRACK_MODIFICATIONS Warnings

**Warning Message:**
```
FSADeprecationWarning: SQLALCHEMY_TRACK_MODIFICATIONS adds significant overhead 
and will be disabled by default in the future.
```

**Cause:**

`SQLALCHEMY_TRACK_MODIFICATIONS` defaults to `None`, triggering this warning.

> Source: /config.py:70

```python
SQLALCHEMY_TRACK_MODIFICATIONS = _get_bool_env('SQLALCHEMY_TRACK_MODIFICATIONS', False)
```

**Solution:**

Explicitly set to `false` in your `.env` file:
```bash
SQLALCHEMY_TRACK_MODIFICATIONS=false
```

### Database Initialization Errors

**Error Messages:**
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) relation "table_name" does not exist
```

**Causes:**
- Database tables not created
- Migrations not applied
- Wrong database selected

**Solutions:**

**Solution 1: Initialize database tables**
```python
# In Flask shell
flask shell
>>> from models import db
>>> db.create_all()
```

**Solution 2: Check database exists**
```bash
# PostgreSQL
psql -l  # List databases

# MySQL
mysql -e "SHOW DATABASES;"
```

**Solution 3: Verify correct database in connection string**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify database name at end of URL
# postgresql://user:pass@host:5432/CORRECT_DB_NAME
```

---

## CORS Errors

Cross-Origin Resource Sharing (CORS) errors occur when a web application from one origin attempts to access resources from a different origin.

### Origin Not Allowed

**Browser Console Error:**
```
Access to fetch at 'http://localhost:8000/api/endpoint' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Cause:**

The requesting origin is not in the allowed origins list.

> Source: /config.py:80

```python
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
```

> Source: /app.py:78-81

```python
# Configure CORS for cross-origin request support
# Uses CORS_ORIGINS from config for allowed origins
cors_origins = app.config.get('CORS_ORIGINS', '*')
CORS(app, resources={r"/api/*": {"origins": cors_origins}})
```

**Solutions:**

**Solution 1: Allow specific origins (recommended for production)**
```bash
# Single origin
CORS_ORIGINS=https://your-frontend.com

# Multiple origins (comma-separated may need parsing depending on implementation)
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

**Solution 2: Allow all origins (development only)**
```bash
# Warning: Not recommended for production
CORS_ORIGINS=*
```

**Solution 3: Debug CORS configuration**
```python
# Add to app.py temporarily
from flask_cors import CORS

CORS(app, 
     resources={r"/api/*": {"origins": cors_origins}},
     supports_credentials=True)

# Check response headers
# Should include: Access-Control-Allow-Origin
```

### Preflight Request Failures

**Browser Console Error:**
```
Access to fetch at 'http://localhost:8000/api/endpoint' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

**Cause:**

The OPTIONS preflight request is being rejected or not properly handled.

**Solutions:**

**Solution 1: Ensure Flask-CORS handles OPTIONS**
```python
# Flask-CORS automatically handles OPTIONS requests
# Verify it's properly initialized:
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

**Solution 2: Manually handle OPTIONS (if needed)**
```python
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
```

**Solution 3: Check for conflicting middleware**
- Ensure no other middleware is intercepting OPTIONS requests
- Verify CORS is initialized before route registration

### CORS Security Implications

**Security Warning:**

Using `CORS_ORIGINS=*` in production exposes your API to requests from any origin, which can lead to:

1. **Data Theft**: Malicious websites can make authenticated requests on behalf of users
2. **CSRF Attacks**: Cross-site request forgery becomes easier
3. **API Abuse**: Any website can access your API

**Recommended Production Configuration:**

```bash
# .env for production
CORS_ORIGINS=https://your-trusted-frontend.com

# Multiple trusted origins
CORS_ORIGINS=https://app.example.com,https://mobile.example.com
```

**Additional Security Headers:**
```python
# Add to your Flask configuration
from flask_cors import CORS

CORS(app, 
     resources={r"/api/*": {
         "origins": ["https://trusted-origin.com"],
         "methods": ["GET", "POST", "PUT", "DELETE"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "max_age": 86400  # Cache preflight for 24 hours
     }})
```

---

## Docker Issues

Docker-related problems can occur during building, starting, or running containers.

### Build Failures

**Error: Missing dependencies**
```
ERROR: Could not find a version that satisfies the requirement some-package
ERROR: No matching distribution found for some-package
```

**Solutions:**

**Solution 1: Check requirements.txt**
```bash
# Verify package exists on PyPI
pip search some-package  # Note: pip search may be disabled

# Or check PyPI website
# https://pypi.org/project/some-package/

# Verify package name spelling
pip install some-package --dry-run
```

**Solution 2: Check Python version compatibility**
```bash
# Dockerfile uses Python 3.12
# Verify package supports Python 3.12
pip install some-package --python-version 3.12 --dry-run
```

**Solution 3: Add system dependencies**
```dockerfile
# If package needs system libraries, add them to Dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \        # PostgreSQL
        libmysqlclient-dev # MySQL
```

### Container Startup Failures

**Error: Container exits immediately**
```
$ docker run flask-app
# Container exits with no output
```

**Diagnostic Commands:**
```bash
# Check container logs
docker logs flask-app

# Run with interactive terminal
docker run -it flask-app /bin/bash

# Override entrypoint for debugging
docker run -it --entrypoint /bin/bash flask-app
```

**Common Causes and Solutions:**

**Cause 1: Missing environment variables**
```bash
# Check for required variables
docker run -e SECRET_KEY=dev-key -e FLASK_ENV=development flask-app
```

**Cause 2: Import errors**
```bash
# Test imports manually
docker run -it --entrypoint python flask-app -c "from app import create_app; print('OK')"
```

**Cause 3: Permission issues**
```bash
# Run as root temporarily to debug
docker run --user root -it flask-app /bin/bash
```

### Port Mapping Issues

**Error: Connection refused on host**
```bash
$ curl http://localhost:8000/health
curl: (7) Failed to connect to localhost port 8000: Connection refused
```

**Cause:**

Port mapping mismatch between host and container.

> Source: /Dockerfile:51 - Default PORT is 8000

```dockerfile
ENV PORT=8000
```

**Solutions:**

**Solution 1: Verify port mapping**
```bash
# Check running containers and port mappings
docker ps

# Should show: 0.0.0.0:8000->8000/tcp
```

**Solution 2: Correct port mapping syntax**
```bash
# Correct syntax: -p HOST_PORT:CONTAINER_PORT
docker run -p 8000:8000 flask-app

# If using different ports
docker run -p 3000:8000 flask-app  # Access via localhost:3000
```

**Solution 3: Verify container is binding to all interfaces**
```bash
# Inside container, check Gunicorn binding
# Should bind to 0.0.0.0, not 127.0.0.1

# From Dockerfile:99
# "--bind", "0.0.0.0:8000"
```

**Solution 4: Check for port conflicts**
```bash
# Check if port is already in use on host
lsof -i :8000
netstat -tlnp | grep 8000
```

### Volume Mounting Problems

**Error: Changes not reflected in container**
```
# Files updated on host but container shows old content
```

**Solutions:**

**Solution 1: Verify volume mount path**
```bash
# Mount current directory
docker run -v $(pwd):/app flask-app

# Mount specific directory
docker run -v /path/to/code:/app flask-app
```

**Solution 2: Check file ownership in container**
```bash
# Container runs as appuser (UID 1000)
docker exec flask-app ls -la /app
```

**Solution 3: For development, use bind mounts**
```yaml
# docker-compose.yml for development
services:
  flask:
    volumes:
      - ./:/app  # Bind mount for live reload
```

### Non-Root User Permissions

**Error: Permission denied errors**
```
PermissionError: [Errno 13] Permission denied: '/app/data/app.db'
```

**Cause:**

The container runs as a non-root user for security.

> Source: /Dockerfile:64-66

```dockerfile
# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser
```

**Solutions:**

**Solution 1: Fix volume permissions on host**
```bash
# Set ownership to match container user (UID 1000)
sudo chown -R 1000:1000 /host/data/path
```

**Solution 2: Use Docker named volumes**
```bash
# Named volumes handle permissions automatically
docker volume create flask-data
docker run -v flask-data:/app/data flask-app
```

**Solution 3: Temporarily run as root (debugging only)**
```bash
# Not recommended for production
docker run --user root flask-app
```

**Solution 4: Set permissions in Dockerfile**
```dockerfile
# Ensure directories are writable
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data
```

---

## Logging and Debugging

Effective logging and debugging are essential for diagnosing issues in development and production.

### Enabling Debug Mode

**Warning:** Never enable debug mode in production. It exposes sensitive information and allows arbitrary code execution.

**Solution 1: Via environment variable**
```bash
# .env file
DEBUG=true
FLASK_ENV=development
```

**Solution 2: Via command line**
```bash
# Flask CLI
FLASK_DEBUG=1 flask run

# Direct execution
DEBUG=true python app.py
```

**Debug Mode Features:**
- Detailed error pages with tracebacks
- Interactive debugger in browser
- Auto-reload on code changes

### Adjusting Log Level

**Available Log Levels:**

| Level | Value | Description |
|-------|-------|-------------|
| DEBUG | 10 | Detailed diagnostic information |
| INFO | 20 | General operational events |
| WARNING | 30 | Unexpected events that don't prevent operation |
| ERROR | 40 | Errors that prevent specific operations |
| CRITICAL | 50 | Severe errors that may prevent app operation |

**Set Log Level:**
```bash
# .env file
LOG_LEVEL=DEBUG

# Docker run
docker run -e LOG_LEVEL=DEBUG flask-app
```

> Source: /app.py:89-90

```python
# Configure logging based on config
log_level = app.config.get('LOG_LEVEL', 'INFO')
app.logger.setLevel(log_level)
```

### Accessing Container Logs

**Docker Commands:**
```bash
# View all logs
docker logs flask-app

# Follow log output (tail -f equivalent)
docker logs -f flask-app

# Show last 100 lines
docker logs --tail 100 flask-app

# Show logs since specific time
docker logs --since 2024-01-01T00:00:00 flask-app

# Show timestamps
docker logs -t flask-app
```

**Gunicorn Log Configuration:**

> Source: /Dockerfile:103-104

```dockerfile
"--access-logfile", "-",
"--error-logfile", "-",
```

This configuration outputs logs to stdout/stderr, which Docker captures automatically.

### SQL Query Debugging

**Enable SQL Echo (Development Only):**
```bash
# .env file
SQLALCHEMY_ECHO=true
```

> Source: /config.py:104

```python
class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = _get_bool_env('SQLALCHEMY_ECHO', True)
```

**What SQL Echo Shows:**
```
INFO sqlalchemy.engine.Engine SELECT users.id, users.name 
FROM users 
WHERE users.id = ?
INFO sqlalchemy.engine.Engine [generated in 0.00015s] (1,)
```

**Disable in Production:**
```bash
# Production .env
SQLALCHEMY_ECHO=false
```

---

## Quick Reference

### Common Errors and Solutions

| Error | Likely Cause | Quick Solution |
|-------|--------------|----------------|
| `ValueError: SECRET_KEY environment variable must be set` | Missing SECRET_KEY in production | Set `SECRET_KEY` environment variable |
| `sqlite3.OperationalError: unable to open database file` | Permission issue | Check directory permissions, use UID 1000 for volumes |
| `CORS error in browser` | Origin not allowed | Update `CORS_ORIGINS` setting |
| `Connection refused` | Port not exposed/mapped | Verify `-p HOST:CONTAINER` mapping |
| `Container exits immediately` | Missing env vars or import error | Check `docker logs` for details |
| `Health check failing` | Wrong endpoint path | Verify `/health` endpoint exists |
| `ModuleNotFoundError` | Missing dependency | Run `pip install -r requirements.txt` |
| `500 Internal Server Error` | Application error | Enable `DEBUG=true` and check logs |
| `404 Not Found` | Wrong endpoint path | Check blueprint registration and URL prefix |

### Diagnostic Command Cheatsheet

```bash
# Container Health
docker ps                                    # List running containers
docker logs flask-app                        # View container logs
docker exec flask-app printenv               # View environment variables
docker inspect flask-app                     # Full container details

# Network Testing
curl -v http://localhost:8000/health         # Test health endpoint
docker exec flask-app netstat -tlnp          # Check listening ports

# Application Debugging
docker exec -it flask-app /bin/bash          # Shell into container
docker exec flask-app python -c "from app import app; print(app.config)"

# Permission Checking
docker exec flask-app ls -la /app            # Check file permissions
docker exec flask-app id                     # Check current user

# Database Testing
docker exec flask-app python -c "from models import db; print(db.engine.url)"
```

---

## Related Documentation

- **[Configuration Reference](./configuration.md)** - Complete guide to all configuration options and environment variables
- **[Deployment Guide](../deployment/deployment.md)** - Docker deployment and production setup instructions
- **[API Reference](../api/endpoints.md)** - API endpoint documentation
- **[Error Responses](../api/error-responses.md)** - Error response format documentation

[← Back to Documentation Index](../README.md)
