# Dockerfile for Node.js/Express Application
# Optimized for minimal size and security using Alpine Linux
# Uses Node.js 20 LTS and PM2 process manager for production

# -----------------------------------------------------------------------------
# Build Stage: Install dependencies in a clean environment
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install PM2 globally for production process management
RUN npm install -g pm2

# Copy package files first for better layer caching
# This allows Docker to cache the npm ci step if dependencies haven't changed
COPY package*.json ./

# Install production dependencies only
# Using npm ci for deterministic builds from package-lock.json
RUN npm ci --only=production && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Production Stage: Minimal runtime image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Labels for container metadata
LABEL maintainer="Blitzy" \
      version="1.0" \
      description="Node.js/Express API server container with PM2"

# Set environment variables for Node.js production
ENV NODE_ENV=production \
    PORT=3000

# Set working directory
WORKDIR /app

# Install curl for health checks (not included by default in alpine)
# and dumb-init for proper signal handling with PM2
RUN apk add --no-cache curl dumb-init

# Create non-root user for security using Alpine syntax
# Alpine uses addgroup/adduser instead of groupadd/useradd
RUN addgroup --gid 1000 appgroup && \
    adduser --uid 1000 --ingroup appgroup --shell /bin/sh --disabled-password --home /home/appuser appuser

# Copy PM2 from builder stage
COPY --from=builder /usr/local/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2
COPY --from=builder /usr/local/bin/pm2 /usr/local/bin/pm2
COPY --from=builder /usr/local/bin/pm2-runtime /usr/local/bin/pm2-runtime

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code with proper ownership
# This includes src/, ecosystem.config.js, package.json, etc.
COPY --chown=appuser:appgroup . .

# Create logs directory for Winston logger with proper permissions
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE ${PORT}

# Health check for container orchestration
# Checks the /api/health endpoint on the configured port
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/api/health || exit 1

# Run the application with PM2 runtime
# PM2-runtime is specifically designed for containers:
# - Keeps the process in the foreground
# - Properly handles signals (SIGTERM, SIGINT)
# - Supports cluster mode for multi-core utilization
# - Provides graceful shutdown capabilities
# Using dumb-init ensures proper signal forwarding to PM2
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pm2-runtime", "ecosystem.config.cjs"]
