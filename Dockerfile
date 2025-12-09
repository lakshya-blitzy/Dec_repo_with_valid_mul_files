# Dockerfile for Python/Flask Application
# Optimized for minimal size and security
# Uses Python 3.12 slim base image and Gunicorn WSGI server

# -----------------------------------------------------------------------------
# Build Stage: Install dependencies in a clean environment
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Set environment variables for Python optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
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

# -----------------------------------------------------------------------------
# Production Stage: Minimal runtime image
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS production

# Labels for container metadata
LABEL maintainer="Blitzy" \
      version="1.0" \
      description="Python/Flask application container"

# Set environment variables for Python and Flask
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=8000

# Set working directory
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

# Remove unnecessary files from the container
RUN rm -rf __pycache__ .pytest_cache .git .gitignore *.md tests/ 2>/dev/null || true

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE ${PORT}

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1

# Run the application with Gunicorn WSGI server
# Configuration:
# - bind: Listen on all interfaces at specified PORT
# - workers: Number of worker processes (default: 4, should be 2*CPU+1)
# - threads: Number of threads per worker
# - timeout: Worker timeout in seconds
# - access-logfile: Log access to stdout for container logging
# - error-logfile: Log errors to stderr for container logging
# - capture-output: Capture stdout/stderr from workers
# - enable-stdio-inheritance: Allow proper logging propagation
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--threads", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--capture-output", \
     "--enable-stdio-inheritance", \
     "app:app"]
