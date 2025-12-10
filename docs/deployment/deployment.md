# Deployment Guide

> **Last Updated:** December 2024  
> **Source:** Dockerfile, README.md, config.py, .env.example  
> **Maintainer:** Development Team

This comprehensive guide covers all deployment options for the Flask application, including Docker containerization, production Gunicorn WSGI server configuration, environment setup for different deployment scenarios, and operational considerations.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
  - [Multi-Stage Build Architecture](#multi-stage-build-architecture)
  - [Building the Docker Image](#building-the-docker-image)
  - [Running the Container](#running-the-container)
  - [Docker Compose](#docker-compose)
- [Production with Gunicorn](#production-with-gunicorn)
  - [Gunicorn Configuration](#gunicorn-configuration)
  - [Worker Configuration](#worker-configuration)
  - [Logging Configuration](#logging-configuration)
- [Environment Configuration](#environment-configuration)
  - [Configuration Class Hierarchy](#configuration-class-hierarchy)
  - [Required vs Optional Variables](#required-vs-optional-variables)
  - [Database Configuration](#database-configuration)
- [Health Monitoring](#health-monitoring)
  - [Health Check Endpoint](#health-check-endpoint)
  - [Docker Health Check](#docker-health-check)
  - [Container Orchestration Integration](#container-orchestration-integration)
- [Scaling Considerations](#scaling-considerations)
- [Security Checklist](#security-checklist)
- [Deployment Workflow](#deployment-workflow)
- [Container Architecture](#container-architecture)
- [Troubleshooting Deployment Issues](#troubleshooting-deployment-issues)
- [Related Documentation](#related-documentation)

---

## Overview

The Flask application supports multiple deployment strategies to accommodate different environments and requirements:

| Deployment Method | Use Case | Complexity |
|-------------------|----------|------------|
| Development Server | Local development, debugging | Low |
| Gunicorn (Direct) | Production without containerization | Medium |
| Docker Container | Containerized production deployments | Medium |
| Docker Compose | Multi-service orchestration | Medium-High |
| Kubernetes | Enterprise-scale container orchestration | High |

This guide focuses primarily on Docker and Gunicorn deployments, which are the recommended approaches for production environments.

[← Back to Documentation Index](../README.md)

---

## Prerequisites

Before deploying the application, ensure you have the following requirements met:

### Software Requirements

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| Python | 3.12+ | Application runtime |
| Docker | 17.05+ | Multi-stage build support |
| Gunicorn | 21.2.0 | WSGI production server |
| pip | Latest | Package management |

> **Source:** Dockerfile:8, Dockerfile:38 - The Dockerfile uses `python:3.12-slim` as the base image for both builder and production stages.

### Verify Installation

```bash
# Check Python version
python --version  # Should output Python 3.12.x or higher

# Check Docker version
docker --version  # Should be 17.05+ for multi-stage build support

# Check pip version
pip --version
```

### Required Environment Variables

For production deployments, the following environment variables **must** be set:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | **Yes** (Production) | Cryptographic secret for sessions |
| `FLASK_ENV` | Recommended | Environment mode (production) |
| `DATABASE_URL` | If using database | Database connection string |

Generate a secure `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Docker Deployment

Docker deployment provides a consistent, reproducible environment for running the Flask application. The provided Dockerfile implements a multi-stage build for optimal image size and security.

### Multi-Stage Build Architecture

The Dockerfile uses a two-stage build process to minimize the final image size and improve security:

```mermaid
flowchart LR
    subgraph "Stage 1: Builder"
        A[python:3.12-slim] --> B[Install build tools]
        B --> C[Create virtualenv]
        C --> D[Install dependencies]
    end
    
    subgraph "Stage 2: Production"
        E[python:3.12-slim] --> F[Install runtime deps only]
        F --> G[Copy virtualenv from builder]
        G --> H[Copy application code]
        H --> I[Configure non-root user]
        I --> J[Set up health check]
        J --> K[Run Gunicorn]
    end
    
    D -.->|Copy /opt/venv| G
```

#### Stage 1: Builder (Dockerfile:1-37)

The builder stage installs all build dependencies and Python packages:

```dockerfile
FROM python:3.12-slim AS builder

# Set environment variables for Python optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better layer caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install -r requirements.txt
```

> **Key Optimizations:**
> - `PYTHONDONTWRITEBYTECODE=1`: Prevents Python from writing .pyc files
> - `PIP_NO_CACHE_DIR=1`: Reduces image size by not caching pip downloads
> - Virtual environment isolation ensures clean dependency management

#### Stage 2: Production (Dockerfile:38-107)

The production stage creates a minimal runtime environment:

```dockerfile
FROM python:3.12-slim AS production

LABEL maintainer="Blitzy" \
      version="1.0" \
      description="Python/Flask application container"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=8000

WORKDIR /app

# Install minimal runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        curl && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE ${PORT}
```

> **Security Features:**
> - Non-root user execution (uid/gid 1000)
> - Minimal runtime dependencies
> - No build tools in final image

### Building the Docker Image

Build the Docker image using the following command:

```bash
# Standard build
docker build -t existingproduct1-3dec .

# Build with specific tag
docker build -t existingproduct1-3dec:v1.0 .

# Build with no cache (force rebuild)
docker build --no-cache -t existingproduct1-3dec .

# Build with build arguments
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t existingproduct1-3dec .
```

#### Build Optimization Tips

| Tip | Benefit |
|-----|---------|
| Order Dockerfile commands by change frequency | Better layer caching |
| Copy `requirements.txt` before application code | Dependency layer cached separately |
| Use `.dockerignore` file | Exclude unnecessary files from build context |
| Enable BuildKit | Parallel builds and better caching |

Enable BuildKit for improved builds:

```bash
DOCKER_BUILDKIT=1 docker build -t existingproduct1-3dec .
```

### Running the Container

#### Basic Container Run

```bash
# Simple run (foreground)
docker run -p 8000:8000 existingproduct1-3dec

# Run in detached mode
docker run -d -p 8000:8000 --name flask-app existingproduct1-3dec

# Run with restart policy
docker run -d \
  -p 8000:8000 \
  --name flask-app \
  --restart unless-stopped \
  existingproduct1-3dec
```

#### Environment Variable Injection

```bash
# Using -e flags
docker run -p 8000:8000 \
  -e FLASK_ENV=production \
  -e SECRET_KEY=your-secure-secret-key \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  existingproduct1-3dec

# Using environment file
docker run -p 8000:8000 \
  --env-file .env.production \
  existingproduct1-3dec
```

#### Volume Mounting

```bash
# Mount for persistent data
docker run -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  existingproduct1-3dec

# Mount for SQLite database persistence
docker run -p 8000:8000 \
  -v flask-db:/app/instance \
  existingproduct1-3dec
```

#### View Container Logs

```bash
# View logs
docker logs flask-app

# Follow logs in real-time
docker logs -f flask-app

# View last 100 lines
docker logs --tail 100 flask-app
```

### Docker Compose

For orchestrating the application with additional services (database, cache, etc.), use Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: existingproduct1-3dec:latest
    container_name: flask-app
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/appdb
      - CORS_ORIGINS=https://yourdomain.com
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  db:
    image: postgres:15-alpine
    container_name: flask-db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Docker Compose commands:

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f app
```

---

## Production with Gunicorn

Gunicorn (Green Unicorn) is a Python WSGI HTTP Server for Unix. It's a pre-fork worker model, which means it forks multiple worker processes to handle requests.

### Gunicorn Configuration

The recommended production configuration from Dockerfile:98-107:

```bash
gunicorn \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --threads 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --capture-output \
  --enable-stdio-inheritance \
  app:app
```

| Option | Value | Description |
|--------|-------|-------------|
| `--bind` | `0.0.0.0:8000` | Listen on all interfaces, port 8000 |
| `--workers` | `4` | Number of worker processes |
| `--threads` | `2` | Threads per worker |
| `--timeout` | `120` | Worker timeout in seconds |
| `--access-logfile` | `-` | Log access to stdout |
| `--error-logfile` | `-` | Log errors to stderr |
| `--capture-output` | - | Capture stdout/stderr from workers |
| `--enable-stdio-inheritance` | - | Allow proper logging propagation |

> **Source:** README.md:119-143 describes the basic Gunicorn commands; Dockerfile:98-107 shows the full production configuration.

### Worker Configuration

#### Worker Count Formula

The recommended number of workers is calculated using:

```
workers = (2 × CPU_cores) + 1
```

| CPU Cores | Recommended Workers |
|-----------|---------------------|
| 1 | 3 |
| 2 | 5 |
| 4 | 9 |
| 8 | 17 |

For containers with limited CPU, use:

```bash
# Auto-calculate based on available CPUs
gunicorn --workers $(( 2 * $(nproc) + 1 )) app:app

# Or set explicitly for containerized environments
gunicorn --workers 4 --threads 2 app:app
```

#### Worker Types

| Worker Type | Flag | Use Case |
|-------------|------|----------|
| sync (default) | `--worker-class sync` | CPU-bound workloads |
| gevent | `--worker-class gevent` | I/O-bound, many connections |
| eventlet | `--worker-class eventlet` | Similar to gevent |
| gthread | `--worker-class gthread` | Threading support |

### Logging Configuration

For production logging, configure Gunicorn to output to stdout/stderr for container logging systems:

```bash
gunicorn \
  --access-logfile - \
  --error-logfile - \
  --log-level info \
  --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s' \
  app:app
```

Log format tokens:
- `%(h)s` - Remote address
- `%(t)s` - Timestamp
- `%(r)s` - Request line
- `%(s)s` - Status code
- `%(b)s` - Response length
- `%(D)s` - Request time in microseconds

---

## Environment Configuration

The application uses a hierarchical configuration system with environment-specific classes.

### Configuration Class Hierarchy

```mermaid
classDiagram
    class Config {
        +SECRET_KEY
        +DEBUG
        +TESTING
        +SQLALCHEMY_DATABASE_URI
        +CORS_ORIGINS
        +LOG_LEVEL
    }
    
    class DevelopmentConfig {
        +DEBUG = True
        +SQLALCHEMY_ECHO = True
    }
    
    class ProductionConfig {
        +DEBUG = False
        +TESTING = False
        +init_app(app)
    }
    
    class TestingConfig {
        +TESTING = True
        +DEBUG = True
        +SQLALCHEMY_DATABASE_URI = sqlite:///:memory:
    }
    
    Config <|-- DevelopmentConfig
    Config <|-- ProductionConfig
    Config <|-- TestingConfig
```

> **Source:** config.py:47-168 defines the configuration class hierarchy.

### Required vs Optional Variables

#### Required for Production

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | None (must set) | Cryptographic secret for sessions |
| `FLASK_ENV` | `development` | Set to `production` |
| `DATABASE_URL` | `sqlite:///app.db` | Production database connection |

#### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `False` | Enable debug mode |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `JWT_SECRET_KEY` | `SECRET_KEY` | JWT signing key |
| `JWT_ACCESS_TOKEN_EXPIRES` | `3600` | Token expiry (seconds) |
| `MAX_CONTENT_LENGTH` | `16777216` | Max request size (16MB) |

> **Source:** .env.example:1-118 provides a complete template of all environment variables.

### Database Configuration

The application supports multiple database backends via SQLAlchemy:

```bash
# SQLite (development)
DATABASE_URL=sqlite:///app.db

# PostgreSQL (recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# MySQL
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/dbname
```

> **Note:** For PostgreSQL, uncomment `psycopg2-binary` in requirements.txt. For MySQL, uncomment `pymysql`.

---

## Health Monitoring

### Health Check Endpoint

The application exposes a health check endpoint for monitoring and orchestration systems.

> **Important:** There is a path discrepancy in the codebase:
> - **Dockerfile** (line 85-86) uses: `/health`
> - **README** references: `/api/health`
> 
> The actual implementation should be verified in the routes module. For Docker health checks, the Dockerfile configuration takes precedence.

### Docker Health Check

The Dockerfile configures a health check at lines 85-86:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `--interval` | 30s | Time between health checks |
| `--timeout` | 10s | Maximum time for check to complete |
| `--start-period` | 5s | Grace period for container startup |
| `--retries` | 3 | Consecutive failures before unhealthy |

Health check states:
- **starting**: Container is starting up (within start-period)
- **healthy**: Health check passed
- **unhealthy**: Health check failed (retries exceeded)

View health status:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' flask-app

# View health check logs
docker inspect --format='{{json .State.Health}}' flask-app | jq
```

### Container Orchestration Integration

#### Kubernetes Probes

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: flask-app
      image: existingproduct1-3dec:latest
      ports:
        - containerPort: 8000
      livenessProbe:
        httpGet:
          path: /health
          port: 8000
        initialDelaySeconds: 10
        periodSeconds: 30
        timeoutSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /health
          port: 8000
        initialDelaySeconds: 5
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
```

#### Docker Swarm

```yaml
version: '3.8'
services:
  app:
    image: existingproduct1-3dec:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

---

## Scaling Considerations

### Horizontal Scaling

For horizontal scaling with container orchestration:

```mermaid
flowchart TB
    LB[Load Balancer] --> C1[Container 1<br/>Gunicorn: 4 workers]
    LB --> C2[Container 2<br/>Gunicorn: 4 workers]
    LB --> C3[Container 3<br/>Gunicorn: 4 workers]
    
    C1 --> DB[(Database)]
    C2 --> DB
    C3 --> DB
    
    C1 --> CACHE[(Redis Cache)]
    C2 --> CACHE
    C3 --> CACHE
```

### Scaling Recommendations

| Aspect | Recommendation |
|--------|----------------|
| **Containers** | Scale horizontally with orchestration |
| **Workers per container** | 4-9 depending on CPU allocation |
| **Database connections** | Use connection pooling |
| **Session storage** | Use Redis for distributed sessions |
| **Static files** | Serve from CDN or separate service |

### Gunicorn Worker Scaling

```bash
# For a 2-CPU container
gunicorn --workers 5 --threads 2 app:app

# For a 4-CPU container  
gunicorn --workers 9 --threads 2 app:app
```

### Stateless Application Design

For horizontal scaling, ensure the application is stateless:

1. **Session Storage**: Use Redis or database-backed sessions instead of local file sessions
2. **File Uploads**: Store in object storage (S3, GCS) not local filesystem
3. **Cache**: Use distributed cache (Redis) not local memory
4. **Configuration**: Load from environment variables, not local files

### Database Connection Pooling

For high-traffic scenarios, configure connection pooling:

```python
# In config.py
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'max_overflow': 20
}
```

---

## Security Checklist

Before deploying to production, complete this security checklist:

### Container Security

| Item | Status | Details |
|------|--------|---------|
| ☐ Non-root user | Required | Container runs as uid/gid 1000 |
| ☐ Minimal base image | Required | Using python:3.12-slim |
| ☐ No dev dependencies | Required | Build tools not in production image |
| ☐ Read-only filesystem | Recommended | Mount volumes for writable paths |

> **Source:** Dockerfile:64-79 configures the non-root user (`appuser:appgroup` with uid/gid 1000).

### Application Security

| Item | Status | Details |
|------|--------|---------|
| ☐ SECRET_KEY set | **Critical** | Must be set in production |
| ☐ DEBUG disabled | **Critical** | `FLASK_ENV=production` or `DEBUG=false` |
| ☐ CORS restricted | Required | Set specific origins, not `*` |
| ☐ HTTPS enabled | Required | Use TLS termination at load balancer |

> **Source:** config.py:107-138 - `ProductionConfig.init_app()` validates that SECRET_KEY is set.

### SECRET_KEY Generation

```bash
# Generate a secure SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Example output (DO NOT USE THIS VALUE):
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678
```

### CORS Configuration

For production, restrict CORS to specific origins:

```bash
# Development (permissive)
CORS_ORIGINS=*

# Production (restrictive)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### HTTPS/TLS Configuration

TLS should be terminated at the load balancer or reverse proxy (nginx, Traefik, etc.):

```nginx
# nginx configuration example
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://flask-app:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Production Security Summary

```bash
# Minimum production environment variables
FLASK_ENV=production
SECRET_KEY=<generated-secure-key>
DEBUG=false
CORS_ORIGINS=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/db
```

---

## Deployment Workflow

### Deployment Process Flowchart

```mermaid
flowchart TD
    A[Start] --> B[Code Changes]
    B --> C[Run Tests Locally]
    C --> D{Tests Pass?}
    D -->|No| B
    D -->|Yes| E[Build Docker Image]
    E --> F[Run Container Tests]
    F --> G{Tests Pass?}
    G -->|No| B
    G -->|Yes| H[Tag Image]
    H --> I[Push to Registry]
    I --> J[Deploy to Staging]
    J --> K[Run Smoke Tests]
    K --> L{Tests Pass?}
    L -->|No| M[Rollback]
    M --> B
    L -->|Yes| N[Deploy to Production]
    N --> O[Health Check]
    O --> P{Healthy?}
    P -->|No| Q[Rollback Production]
    Q --> R[Investigate]
    P -->|Yes| S[Deployment Complete]
```

### Step-by-Step Deployment

1. **Build and Test Locally**
   ```bash
   # Run tests
   pytest -v
   
   # Build image
   docker build -t existingproduct1-3dec:$(git rev-parse --short HEAD) .
   
   # Test container locally
   docker run -d -p 8000:8000 --name test-app existingproduct1-3dec:$(git rev-parse --short HEAD)
   curl http://localhost:8000/health
   docker stop test-app && docker rm test-app
   ```

2. **Push to Registry**
   ```bash
   # Tag for registry
   docker tag existingproduct1-3dec:$(git rev-parse --short HEAD) \
     registry.example.com/existingproduct1-3dec:$(git rev-parse --short HEAD)
   
   # Push
   docker push registry.example.com/existingproduct1-3dec:$(git rev-parse --short HEAD)
   ```

3. **Deploy to Environment**
   ```bash
   # Update deployment (Kubernetes example)
   kubectl set image deployment/flask-app \
     flask-app=registry.example.com/existingproduct1-3dec:$(git rev-parse --short HEAD)
   
   # Or with Docker Compose
   docker-compose pull
   docker-compose up -d
   ```

4. **Verify Deployment**
   ```bash
   # Check health
   curl https://yourdomain.com/health
   
   # Check logs
   docker logs flask-app
   # or
   kubectl logs -f deployment/flask-app
   ```

---

## Container Architecture

### Architecture Diagram

```mermaid
flowchart TB
    subgraph "External"
        CLIENT[Client Browser/API Consumer]
    end
    
    subgraph "Edge Layer"
        LB[Load Balancer<br/>TLS Termination]
    end
    
    subgraph "Container Runtime"
        subgraph "Docker Container"
            direction TB
            GUNICORN[Gunicorn WSGI Server<br/>4 workers, 2 threads each]
            FLASK[Flask Application<br/>app.py]
            USER[Non-root User<br/>appuser:1000]
        end
    end
    
    subgraph "Data Layer"
        DB[(Database<br/>PostgreSQL/MySQL/SQLite)]
        CACHE[(Redis Cache<br/>Optional)]
    end
    
    CLIENT -->|HTTPS:443| LB
    LB -->|HTTP:8000| GUNICORN
    GUNICORN --> FLASK
    FLASK -.->|uid/gid 1000| USER
    FLASK --> DB
    FLASK -.-> CACHE
    
    style USER fill:#f9f,stroke:#333,stroke-width:2px
    style GUNICORN fill:#9cf,stroke:#333,stroke-width:2px
    style FLASK fill:#9f9,stroke:#333,stroke-width:2px
```

### Container Layer Details

| Layer | Component | Details |
|-------|-----------|---------|
| **Base Image** | python:3.12-slim | Minimal Debian-based Python runtime |
| **Runtime Deps** | libpq5, curl | PostgreSQL client libs, health check tool |
| **Virtual Env** | /opt/venv | Isolated Python environment |
| **Application** | /app | Application code directory |
| **User** | appuser (1000:1000) | Non-root execution context |
| **Port** | 8000 | Exposed application port |

### Port Mapping

```
Host:8000 → Container:8000 → Gunicorn:8000 → Flask Application
```

---

## Troubleshooting Deployment Issues

### Common Issues and Solutions

#### Container Won't Start

**Symptoms:** Container exits immediately or fails to start.

**Diagnosis:**
```bash
# Check container logs
docker logs flask-app

# Check exit code
docker inspect flask-app --format='{{.State.ExitCode}}'
```

**Common Causes:**
| Exit Code | Cause | Solution |
|-----------|-------|----------|
| 1 | Application error | Check logs for Python errors |
| 137 | OOM killed | Increase container memory |
| 139 | Segmentation fault | Check native dependencies |

#### Health Check Failures

**Symptoms:** Container marked as unhealthy.

**Diagnosis:**
```bash
# Check health status
docker inspect --format='{{json .State.Health}}' flask-app | jq

# Test health endpoint manually
docker exec flask-app curl -v http://localhost:8000/health
```

**Solutions:**
1. Verify the health endpoint path (`/health` vs `/api/health`)
2. Increase `--start-period` if application needs more startup time
3. Check application logs for startup errors

#### Permission Denied Errors

**Symptoms:** File access errors in container.

**Diagnosis:**
```bash
# Check file ownership
docker exec flask-app ls -la /app

# Check current user
docker exec flask-app id
```

**Solutions:**
1. Ensure files are owned by `appuser:appgroup` (1000:1000)
2. For mounted volumes, match host permissions to container user
3. Use `--chown` flag when copying files in Dockerfile

#### Database Connection Issues

**Symptoms:** Application can't connect to database.

**Diagnosis:**
```bash
# Test database connectivity from container
docker exec flask-app python -c "
from flask import Flask
from config import config
app = Flask(__name__)
app.config.from_object(config['production'])
print(f'DATABASE_URL: {app.config.get(\"SQLALCHEMY_DATABASE_URI\")}')"
```

**Solutions:**
1. Verify `DATABASE_URL` environment variable is set correctly
2. Check network connectivity between containers
3. Ensure database is running and accepting connections
4. Verify database credentials

For more detailed troubleshooting, see the [Troubleshooting Guide](../guides/troubleshooting.md).

---

## Related Documentation

- **[Configuration Reference](../guides/configuration.md)** - Complete environment variable reference and configuration class documentation
- **[API Documentation](../api/endpoints.md)** - API endpoint reference with request/response examples
- **[Troubleshooting Guide](../guides/troubleshooting.md)** - Common issues and solutions
- **[Main Documentation Index](../README.md)** - Documentation navigation hub

---

> **Source Citations:**
> - Dockerfile:1-108 - Container configuration
> - README.md:119-143 - Gunicorn configuration
> - README.md:179-218 - Docker deployment commands
> - config.py:47-168 - Configuration classes
> - .env.example:1-118 - Environment variable template
> - requirements.txt:1-36 - Python dependencies
