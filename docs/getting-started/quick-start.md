# Quick Start Guide

> **Last Updated:** December 2024  
> **Source Files:** README.md, .env.example, app.py  
> **Maintainer:** Development Team

A condensed guide to get the Flask application running quickly. This document provides the essential steps for new developers to set up and run the application with minimal configuration.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Python | 3.12+ | Runtime environment |
| pip | Latest | Package installer (included with Python 3.12+) |
| virtualenv | Latest | Isolated Python environments (recommended) |

**Download Python:** [https://www.python.org/downloads/](https://www.python.org/downloads/)

### Verify Installation

Open your terminal and run the following commands to verify your installation:

```bash
# Check Python version (should output Python 3.12.x or higher)
python --version

# Check pip version
pip --version
```

**Expected Output:**

```
Python 3.12.x
pip 23.x.x from /path/to/pip
```

> **Note:** On some systems, you may need to use `python3` and `pip3` instead of `python` and `pip`.

*Source: `/README.md:21-34`*

---

## Installation

Follow these three steps to install the application:

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ExistingProduct1-3Dec
```

### Step 2: Create and Activate Virtual Environment

A virtual environment isolates your Python dependencies from other projects.

**Linux/macOS:**

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate
```

**Windows:**

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate
```

> **Tip:** You'll know the virtual environment is active when you see `(venv)` at the beginning of your terminal prompt.

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs all required Python packages including:
- Flask (web framework)
- Flask-CORS (cross-origin resource sharing)
- Flask-SQLAlchemy (database ORM)
- python-dotenv (environment variable loading)
- Gunicorn (production WSGI server)

*Source: `/README.md:36-62`*

---

## Configuration

### Step 1: Create Environment File

Copy the environment template file to create your local configuration:

```bash
cp .env.example .env
```

### Step 2: Configure Essential Variables

Edit the `.env` file with your specific configuration. At minimum, update these values:

```bash
# Flask Configuration (required)
FLASK_APP=app.py
FLASK_ENV=development

# Secret Key (required - generate a secure key for production!)
SECRET_KEY=your-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:///app.db

# Debug Mode (development only)
DEBUG=true
```

### Generate a Secure Secret Key

For development, any string works. For production, generate a secure random key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and paste it as your `SECRET_KEY` value.

### Essential Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_APP` | `app.py` | Flask application entry point |
| `FLASK_ENV` | `development` | Environment mode (development/production/testing) |
| `SECRET_KEY` | - | **Required:** Cryptographic key for sessions |
| `DATABASE_URL` | `sqlite:///app.db` | Database connection string |
| `DEBUG` | `true` | Enable debug mode and auto-reload |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port number |

> **⚠️ Security Warning:** Never commit your `.env` file to version control. It contains sensitive information like secret keys and database credentials.

For a complete list of all configuration options, see the [Configuration Reference](../guides/configuration.md).

*Source: `/README.md:64-91`, `/.env.example:1-25`*

---

## Running the Application

### Development Server

Start the Flask development server with either of these commands:

**Using Flask CLI:**

```bash
flask run
```

**Using Python directly:**

```bash
python app.py
```

**Specifying host and port:**

```bash
flask run --host=0.0.0.0 --port=5000
```

### Expected Output

```
 * Serving Flask app 'app.py'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
 * Restarting with stat
 * Debugger is active!
```

The development server will start at **http://localhost:5000** by default.

### Development Server Features

| Feature | Description |
|---------|-------------|
| Auto-reload | Automatically restarts when code changes are detected |
| Debug mode | Displays detailed error pages with interactive debugger |
| Hot reload | Changes take effect without manual restart |

> **Note:** The development server is for local development only. For production deployments, use Gunicorn. See the [Deployment Guide](../deployment/deployment.md).

*Source: `/README.md:93-116`*

---

## Verification

### Health Check Endpoint

Verify that the application is running correctly by checking the health endpoint.

**Using curl:**

```bash
curl http://localhost:5000/api/health
```

**Using your browser:**

Navigate to: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Expected Response

A successful health check returns:

```json
{
  "status": "healthy",
  "message": "Application is running"
}
```

**HTTP Status:** `200 OK`

### Troubleshooting Verification

If the health check fails:

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Connection refused | Server not running | Start the server with `flask run` |
| 404 Not Found | Wrong endpoint path | Use `/api/health` (not `/health`) |
| 500 Server Error | Configuration issue | Check your `.env` file settings |
| Address already in use | Port conflict | Use `--port=5001` or stop the conflicting process |

For more detailed troubleshooting, see the [Troubleshooting Guide](../guides/troubleshooting.md).

For complete API documentation, see the [API Endpoints Reference](../api/endpoints.md).

*Source: `/app.py:83-86` (blueprint registration), `/README.md:265-271` (API endpoints)*

---

## Next Steps

Now that your application is running, explore these resources:

### Documentation

| Document | Description |
|----------|-------------|
| [Full README](../../README.md) | Complete project documentation |
| [API Reference](../api/endpoints.md) | Detailed API endpoint documentation |
| [Deployment Guide](../deployment/deployment.md) | Production deployment instructions |
| [Configuration Reference](../guides/configuration.md) | Complete configuration options |
| [Troubleshooting Guide](../guides/troubleshooting.md) | Common issues and solutions |

### Common Next Actions

1. **Explore the API:** Check available endpoints in the [API Reference](../api/endpoints.md)
2. **Configure for Production:** Set up proper environment variables using the [Configuration Reference](../guides/configuration.md)
3. **Deploy:** Follow the [Deployment Guide](../deployment/deployment.md) for Docker or Gunicorn deployment
4. **Run Tests:** Execute `pytest` to run the test suite

### Quick Commands Reference

```bash
# Run development server
flask run

# Run tests
pytest

# Run with Gunicorn (production)
gunicorn --workers=4 --bind=0.0.0.0:8000 app:app

# Build Docker image
docker build -t existingproduct1-3dec .

# Run Docker container
docker run -p 8000:8000 existingproduct1-3dec
```

---

## Related Documentation

- [Documentation Index](../README.md) - Full documentation navigation
- [API Endpoints](../api/endpoints.md) - Complete API reference
- [Error Responses](../api/error-responses.md) - Error handling documentation
- [Configuration](../guides/configuration.md) - Environment and configuration options
- [Deployment](../deployment/deployment.md) - Production deployment guide
- [Troubleshooting](../guides/troubleshooting.md) - Problem resolution guide

---

*This guide provides a condensed onboarding experience. For comprehensive documentation, refer to the [main README](../../README.md) or explore the [documentation index](../README.md).*
