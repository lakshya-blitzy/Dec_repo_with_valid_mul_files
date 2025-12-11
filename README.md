# ExistingProduct1-3Dec

A Python/Flask web server application providing RESTful API endpoints.

Created by Blitzy

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration Classes](#configuration-classes)
- [Running the Application](#running-the-application)
  - [Development Server](#development-server)
  - [Production Server](#production-server)
- [Running Tests](#running-tests)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
  - [Base URL](#base-url)
  - [Available Endpoints](#available-endpoints)
  - [Error Responses](#error-responses)
  - [HTTP Status Codes](#http-status-codes)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## Quick Start

Get up and running in 5 steps:

```bash
# 1. Clone the repository
git clone <repository-url> && cd ExistingProduct1-3Dec

# 2. Create and activate virtual environment
python -m venv venv && source venv/bin/activate  # Linux/macOS
# Or on Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env  # Edit .env with your settings

# 5. Run the application
flask run
```

The application will be available at `http://localhost:5000`.

For detailed configuration options, see [.env.example](.env.example).

---

## Architecture Overview

This application follows the Flask Application Factory pattern for modularity and testability.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        A[API Consumer]
        B[Frontend App]
        C[Health Monitor]
    end
    
    subgraph Docker["Docker Container"]
        D[Gunicorn WSGI<br/>Port 8000]
    end
    
    subgraph Flask["Flask Application"]
        E[Application Factory<br/>create_app]
        F[CORS Middleware]
        G[API Blueprint<br/>/api prefix]
        H[Error Handlers<br/>JSON responses]
    end
    
    subgraph Config["Configuration"]
        I[Environment Variables]
        J[Config Classes<br/>Dev/Prod/Test]
    end
    
    subgraph Data["Data Layer"]
        K[SQLAlchemy ORM]
        L[(Database<br/>SQLite/PostgreSQL)]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    I --> J
    J --> E
    E --> F
    F --> G
    E --> H
    E --> K
    K --> L
```

### Component Overview

| Component | File | Description |
|-----------|------|-------------|
| Application Factory | `app.py` | Creates and configures Flask instances with `create_app()` |
| Configuration | `config.py` | Environment-based configuration classes (Dev/Prod/Test) |
| Error Handlers | `app.py` | JSON error responses for 400, 404, 405, 500 errors |
| Database ORM | `models/` | SQLAlchemy models (planned) |
| API Routes | `routes/` | API endpoint blueprints (planned) |

*(Source: app.py:1-24, config.py:1-16)*

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.12+** - [Download Python](https://www.python.org/downloads/)
- **pip** - Python package installer (included with Python 3.12+)
- **virtualenv** (recommended) - For isolated Python environments

Verify your Python installation:

```bash
python --version  # Should output Python 3.12.x or higher
pip --version
```

## Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd ExistingProduct1-3Dec
```

2. **Create and activate a virtual environment (recommended):**

```bash
# Create virtual environment
python -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

## Configuration

1. **Create environment file:**

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

2. **Configure environment variables:**

Edit the `.env` file with your specific configuration:

```bash
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development  # Use 'production' for production deployments
SECRET_KEY=your-secret-key-here

# Database Configuration (if applicable)
DATABASE_URL=sqlite:///app.db

# Additional configuration as needed
DEBUG=True
```

**Important:** Never commit your `.env` file to version control. It contains sensitive information.

### Environment Variables

The application supports extensive configuration via environment variables. See [.env.example](.env.example) for all available options.

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_APP` | `app.py` | Flask application entry point |
| `FLASK_ENV` | `development` | Environment mode (development/production/testing) |
| `SECRET_KEY` | `dev-secret-key...` | **Required in production** - Cryptographic key for sessions |
| `DEBUG` | `false` | Enable debug mode |
| `DATABASE_URL` | `sqlite:///app.db` | Database connection URI |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `PORT` | `5000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `JWT_SECRET_KEY` | (uses SECRET_KEY) | JWT token signing key |
| `JWT_ACCESS_TOKEN_EXPIRES` | `3600` | Token expiration in seconds |
| `MAX_CONTENT_LENGTH` | `16777216` | Max request body size (16MB) |

*(Source: config.py:47-89, .env.example)*

### Configuration Classes

The application uses environment-specific configuration classes defined in `config.py`:

| Environment | Class | Key Settings |
|-------------|-------|--------------|
| **Development** | `DevelopmentConfig` | `DEBUG=True`, `SQLALCHEMY_ECHO=True` (SQL logging) |
| **Production** | `ProductionConfig` | `DEBUG=False`, `TESTING=False`, validates SECRET_KEY |
| **Testing** | `TestingConfig` | `TESTING=True`, uses in-memory SQLite, CSRF disabled |

**Usage in code:**
```python
from config import config

# Get config class by environment name
config_class = config['development']  # or 'production', 'testing'
app.config.from_object(config_class)
```

**Production Note:** The `ProductionConfig.init_app()` method validates that `SECRET_KEY` is set via environment variable. The application will raise a `ValueError` if this is not configured.

*(Source: config.py:91-168)*

---

## Running the Application

### Development Server

Run the Flask development server with hot-reload enabled:

```bash
# Using Flask CLI
flask run

# Or using Python directly
python app.py

# Specify host and port
flask run --host=0.0.0.0 --port=5000
```

The development server will start at `http://localhost:5000` by default.

**Development server features:**
- Auto-reload on code changes
- Debug mode with detailed error pages
- Interactive debugger

### Production Server

For production deployments, use Gunicorn as the WSGI server:

```bash
# Basic Gunicorn startup
gunicorn app:app

# With workers and binding configuration
gunicorn --workers=4 --bind=0.0.0.0:8000 app:app

# With logging
gunicorn --workers=4 --bind=0.0.0.0:8000 --access-logfile=- --error-logfile=- app:app
```

**Recommended production configuration:**

```bash
gunicorn \
  --workers=4 \
  --threads=2 \
  --bind=0.0.0.0:8000 \
  --timeout=120 \
  --access-logfile=- \
  --error-logfile=- \
  app:app
```

## Running Tests

This project uses **pytest** for testing.

### Run all tests:

```bash
pytest
```

### Run tests with verbose output:

```bash
pytest -v
```

### Run tests with coverage report:

```bash
pytest --cov=. --cov-report=html
```

### Run specific test file:

```bash
pytest tests/test_api.py
```

### Run tests matching a pattern:

```bash
pytest -k "test_user"
```

## Docker Deployment

### Build the Docker image:

```bash
docker build -t existingproduct1-3dec .
```

### Run the Docker container:

```bash
# Basic run
docker run -p 8000:8000 existingproduct1-3dec

# With environment variables
docker run -p 8000:8000 \
  -e FLASK_ENV=production \
  -e SECRET_KEY=your-secret-key \
  existingproduct1-3dec

# With environment file
docker run -p 8000:8000 --env-file .env existingproduct1-3dec

# Run in detached mode
docker run -d -p 8000:8000 --name flask-app existingproduct1-3dec
```

### Docker Compose (if applicable):

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

### View container logs:

```bash
docker logs flask-app
```

## Project Structure

```
ExistingProduct1-3Dec/
├── app.py                 # Main Flask application entry point and WSGI target
├── config.py              # Environment-based configuration classes
├── requirements.txt       # Python dependencies
├── Dockerfile             # Multi-stage Docker container build
├── .env.example           # Environment variable template (40+ options)
├── README.md              # This documentation file
├── CONTRIBUTING.md        # Contribution guidelines
├── CHANGELOG.md           # Version history and release notes
└── docs/
    └── API.md             # Comprehensive API reference
```

### File Descriptions

| File | Purpose |
|------|---------|
| `app.py` | Flask application factory, error handlers, WSGI entry point |
| `config.py` | Config classes for Development, Production, Testing environments |
| `requirements.txt` | Python package dependencies (Flask, SQLAlchemy, etc.) |
| `Dockerfile` | Multi-stage build with Gunicorn WSGI server |
| `.env.example` | Complete environment variable template with documentation |
| `CONTRIBUTING.md` | Development setup and contribution guidelines |
| `CHANGELOG.md` | Project version history following Keep a Changelog format |
| `docs/API.md` | Complete API reference with request/response schemas |

> **Note:** The `routes/`, `models/`, `services/`, `middleware/`, `utils/`, and `tests/` directories are planned for future implementation. The application currently uses the application factory pattern with error handlers defined in `app.py`.

## API Documentation

For complete API reference documentation, see [docs/API.md](docs/API.md).

### Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:5000/api` |
| Production | `http://your-domain.com/api` |

All API endpoints are prefixed with `/api` via the Flask Blueprint registration.

### Available Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Health check endpoint | No |

*Additional endpoints will be documented as they are implemented.*

#### Health Check Endpoint

Check if the application is running and healthy.

**Request:**
```bash
curl -X GET http://localhost:5000/api/health
```

**Success Response (200 OK):**
```json
{
  "status": "healthy"
}
```

> **⚠️ Docker Health Check Note:** The Dockerfile HEALTHCHECK command uses `/health` (root level) instead of `/api/health`. Ensure your health endpoint is accessible at the correct path for container orchestration. See Dockerfile line 85-86.
>
> *(Source: Dockerfile:85-86)*

### Error Responses

All error responses follow a consistent JSON format. The application includes comprehensive error handlers defined in `app.py`.

#### 400 Bad Request

Returned when the request is malformed or contains invalid data.

```bash
curl -X POST http://localhost:5000/api/endpoint -H "Content-Type: application/json" -d "invalid"
```

```json
{
  "error": "Bad request",
  "message": "The browser (or proxy) sent a request that this server could not understand."
}
```

*(Source: app.py:111-124)*

#### 404 Not Found

Returned when the requested resource doesn't exist.

```bash
curl -X GET http://localhost:5000/api/nonexistent
```

```json
{
  "error": "Not found"
}
```

*(Source: app.py:126-138)*

#### 405 Method Not Allowed

Returned when using an unsupported HTTP method on an endpoint.

```bash
curl -X DELETE http://localhost:5000/api/health
```

```json
{
  "error": "Method not allowed"
}
```

*(Source: app.py:140-152)*

#### 500 Internal Server Error

Returned for server-side errors. Details are logged but not exposed to clients.

```json
{
  "error": "Internal server error"
}
```

*(Source: app.py:154-168, 170-185)*

### HTTP Status Codes

| Code | Description | When Returned |
|------|-------------|---------------|
| 200 | Success | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST that creates a resource |
| 400 | Bad Request | Invalid request syntax, malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported for endpoint |
| 500 | Internal Server Error | Server-side error occurred |

### Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": {},
  "message": "Success"
}
```

**Error Response:**
```json
{
  "error": "Error type",
  "message": "Detailed description (when available)"
}
```

---

## Troubleshooting

### Common Setup Issues

#### Virtual Environment Not Activating

**Problem:** `source venv/bin/activate` fails or Python still uses system Python.

**Solution:**
```bash
# Ensure venv was created successfully
python -m venv venv --clear

# Verify activation (Linux/macOS)
source venv/bin/activate
which python  # Should show: /path/to/project/venv/bin/python

# On Windows PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

#### ModuleNotFoundError

**Problem:** `ModuleNotFoundError: No module named 'flask'` or similar.

**Solution:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep Flask
```

#### Database Connection Issues

**Problem:** `OperationalError: unable to open database file` or connection failures.

**Solution:**
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# For SQLite, ensure directory exists
mkdir -p instance

# For PostgreSQL/MySQL, verify connection string format:
# PostgreSQL: postgresql://user:password@localhost:5432/dbname
# MySQL: mysql+pymysql://user:password@localhost:3306/dbname
```

#### Port Already In Use

**Problem:** `OSError: [Errno 98] Address already in use`

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000  # Linux/macOS
netstat -ano | findstr :5000  # Windows

# Kill the process or use a different port
flask run --port=5001

# Or set in .env
PORT=5001
```

#### SECRET_KEY Warning in Production

**Problem:** Application raises `ValueError: SECRET_KEY environment variable must be set in production`

**Solution:**
```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Add to .env or environment
export SECRET_KEY="your-generated-secret-key"
```

*(Source: config.py:122-137)*

#### Docker Health Check Failing

**Problem:** Container shows unhealthy status.

**Solution:**
The Dockerfile uses `/health` endpoint for health checks (line 86), but the API blueprint registers endpoints under `/api`. Ensure your health endpoint is accessible:

```bash
# Test health endpoint from inside container
docker exec flask-app curl http://localhost:8000/health

# Or check the API health endpoint
docker exec flask-app curl http://localhost:8000/api/health
```

### Getting Help

If you encounter issues not covered here:

1. Check the [CHANGELOG.md](CHANGELOG.md) for recent changes
2. Review the [API Documentation](docs/API.md) for endpoint details
3. Open an issue in the repository with error details and steps to reproduce

---

## Contributing

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `pytest`
5. Commit your changes: `git commit -m "Add your feature"`
6. Push to the branch: `git push origin feature/your-feature-name`
7. Submit a pull request

### Code Style

This project follows Python best practices:

- **PEP 8** - Python style guide
- **Type hints** - Use type annotations for function signatures
- **Docstrings** - Document all public functions and classes (Google-style)

### Running Linters (if configured):

```bash
# Flake8
flake8 .

# Black formatter
black .

# isort for imports
isort .
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for complete code review guidelines and commit message format.

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For issues, questions, or contributions:

- 📖 Check the [API Documentation](docs/API.md) for endpoint details
- 🔧 Review the [Troubleshooting](#troubleshooting) section for common issues
- 📋 See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- 📝 Read the [CHANGELOG.md](CHANGELOG.md) for version history
- 🐛 Open an issue in the repository for bugs or feature requests

---

*Created by Blitzy | [Documentation generated from source files](app.py)*
