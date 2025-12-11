# API Reference

**Version:** 1.0.0  
**Last Updated:** December 2024

A comprehensive API reference for the ExistingProduct1-3Dec Flask application. This document provides detailed specifications for all API endpoints, request/response schemas, error handling, and usage examples.

---

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check-endpoint)
- [Error Responses](#error-responses)
  - [400 Bad Request](#400-bad-request)
  - [404 Not Found](#404-not-found)
  - [405 Method Not Allowed](#405-method-not-allowed)
  - [500 Internal Server Error](#500-internal-server-error)
- [Rate Limiting](#rate-limiting)
- [Request Examples](#request-examples)
- [HTTP Status Codes](#http-status-codes)
- [Response Format](#response-format)
- [Configuration Reference](#configuration-reference)
- [Additional Resources](#additional-resources)

---

## Overview

This API provides a RESTful JSON interface for the ExistingProduct1-3Dec application. All endpoints follow REST conventions and return JSON responses.

### API Characteristics

| Characteristic | Value |
|----------------|-------|
| **Content-Type** | `application/json` |
| **Character Encoding** | UTF-8 |
| **API Protocol** | RESTful HTTP/HTTPS |
| **Response Format** | JSON |

### CORS Policy

Cross-Origin Resource Sharing (CORS) is enabled for all API endpoints under the `/api/*` path. The allowed origins are configured via the `CORS_ORIGINS` environment variable.

| Environment | Default CORS Origins |
|-------------|---------------------|
| Development | `*` (all origins) |
| Production | Configure specific domains |

**Configuration:**
- Set `CORS_ORIGINS` environment variable to control allowed origins
- Use comma-separated values for multiple origins: `https://app.example.com,https://admin.example.com`
- See [Configuration Reference](#configuration-reference) for details

*(Source: config.py:80, app.py:78-81)*

---

## Base URL

### Development

```
http://localhost:5000/api
```

The development server runs on port 5000 by default. Use `flask run` or `python app.py` to start the server.

### Production

```
http://your-domain.com/api
```

In production, the application typically runs behind a reverse proxy (nginx, etc.) on port 8000 via Gunicorn.

### URL Structure

All API endpoints are prefixed with `/api`. This prefix is configured through the Flask blueprint registration.

```
{base_url}/api/{endpoint}
```

**Examples:**
- Development: `http://localhost:5000/api/health`
- Production: `https://api.example.com/api/health`

*(Source: app.py:83-86, README.md:258-265)*

---

## Authentication

### Current Status

Authentication is **not yet implemented** but the application is pre-configured with JWT (JSON Web Token) support.

### JWT Configuration

The following JWT settings are available in the configuration:

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| Secret Key | `JWT_SECRET_KEY` | Uses `SECRET_KEY` | Secret key for signing JWT tokens |
| Token Expiration | `JWT_ACCESS_TOKEN_EXPIRES` | `3600` (1 hour) | Token validity period in seconds |

*(Source: config.py:81-82)*

### Future Authentication Headers

When authentication is implemented, requests to protected endpoints will require the following header:

```
Authorization: Bearer <token>
```

**Example Authenticated Request:**

```bash
curl -X GET http://localhost:5000/api/protected-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Authentication Response Codes

| Code | Description |
|------|-------------|
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Valid token but insufficient permissions |

---

## Endpoints

### Endpoints Summary Table

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/health` | Health check endpoint | No |

*Additional endpoints will be documented as they are implemented.*

---

### Health Check Endpoint

Provides a health status check for the application. Used by container orchestrators (Docker, Kubernetes) and monitoring systems to verify application availability.

#### Request

```
GET /api/health
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *None* | - | - | No parameters required |

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| Accept | No | `application/json` (optional) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "status": "healthy"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Health status indicator |

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| 500 | Internal Server Error - Application unhealthy |

#### Example

```bash
# Request
curl -X GET http://localhost:5000/api/health

# Response (200 OK)
{
  "status": "healthy"
}
```

#### Important Note: Health Endpoint Path Discrepancy

There is a documented path discrepancy between the API blueprint and Docker configuration:

| Context | Path | Description |
|---------|------|-------------|
| API Blueprint | `/api/health` | Standard API endpoint under blueprint prefix |
| Dockerfile HEALTHCHECK | `/health` | Root-level endpoint for container orchestration |

**Implications:**

- The API blueprint registers endpoints under `/api` prefix
- Docker health checks (configured in Dockerfile) target `/health` at the root level
- For container orchestration to work correctly, the application may need to expose both:
  - `/api/health` - For API consumers
  - `/health` - For container health checks

**Recommendation:** Implement a root-level `/health` endpoint in addition to `/api/health` to ensure Docker health checks function correctly.

*(Source: app.py:83-86, Dockerfile:85-86)*

---

## Error Responses

All error responses follow a consistent JSON format. The application implements custom error handlers for common HTTP error codes.

### Error Response Schema

```json
{
  "error": "Error type description",
  "message": "Detailed error message (when applicable)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error` | string | Yes | Brief error type description |
| `message` | string | No | Additional details about the error (included for 400 errors) |

---

### 400 Bad Request

Returned when the request is malformed, contains invalid JSON, or is missing required fields.

**Response Format:**

```json
{
  "error": "Bad request",
  "message": "Description of what was invalid"
}
```

**Triggered By:**
- Malformed request body
- Invalid JSON syntax
- Missing required fields
- Invalid data types
- Request validation failures

**Example:**

```bash
# Request with invalid JSON
curl -X POST http://localhost:5000/api/resource \
  -H "Content-Type: application/json" \
  -d '{"invalid json'

# Response (400 Bad Request)
{
  "error": "Bad request",
  "message": "Failed to decode JSON object"
}
```

*(Source: app.py:111-124)*

---

### 404 Not Found

Returned when the requested resource doesn't exist or the endpoint is invalid.

**Response Format:**

```json
{
  "error": "Not found"
}
```

**Triggered By:**
- Resource with specified ID doesn't exist
- Invalid endpoint URL
- Resource has been deleted

**Example:**

```bash
# Request to non-existent endpoint
curl -X GET http://localhost:5000/api/nonexistent

# Response (404 Not Found)
{
  "error": "Not found"
}
```

*(Source: app.py:126-138)*

---

### 405 Method Not Allowed

Returned when the HTTP method is not supported for the requested endpoint.

**Response Format:**

```json
{
  "error": "Method not allowed"
}
```

**Triggered By:**
- Using POST on a GET-only endpoint
- Using DELETE on an endpoint that doesn't support deletion
- Any unsupported HTTP method for the given endpoint

**Example:**

```bash
# POST request to GET-only health endpoint
curl -X POST http://localhost:5000/api/health

# Response (405 Method Not Allowed)
{
  "error": "Method not allowed"
}
```

*(Source: app.py:140-152)*

---

### 500 Internal Server Error

Returned when an unexpected server-side error occurs. For security reasons, detailed error information is not exposed to clients.

**Response Format:**

```json
{
  "error": "Internal server error"
}
```

**Triggered By:**
- Unhandled exceptions
- Database connection failures
- Server-side processing errors
- External service failures

**Note:** Detailed error information is logged server-side for debugging purposes but is not included in the client response for security reasons.

**Example:**

```bash
# Response (500 Internal Server Error)
{
  "error": "Internal server error"
}
```

*(Source: app.py:154-168, app.py:170-185)*

---

## Rate Limiting

### Current Status

Rate limiting is **not currently implemented** in this application. However, the following content size limit is enforced:

| Limit | Value | Configuration |
|-------|-------|---------------|
| Maximum Request Size | 16 MB | `MAX_CONTENT_LENGTH` |

**Configuration:**

The `MAX_CONTENT_LENGTH` setting limits the maximum size of incoming request data:

```bash
# Default: 16 MB (16777216 bytes)
MAX_CONTENT_LENGTH=16777216
```

Requests exceeding this limit will receive a `413 Request Entity Too Large` response.

*(Source: config.py:88, .env.example:115-117)*

### Future Rate Limiting

When implemented, rate limiting will typically include:

- Per-endpoint rate limits
- Per-user/API-key limits
- Response headers indicating rate limit status:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Time when the limit resets

---

## Request Examples

### cURL Examples

#### Health Check

```bash
# Basic health check
curl -X GET http://localhost:5000/api/health

# With verbose output
curl -v -X GET http://localhost:5000/api/health

# With response headers
curl -i -X GET http://localhost:5000/api/health
```

**Expected Response:**

```json
{"status": "healthy"}
```

#### Request with JSON Body (Example Pattern)

```bash
# POST request with JSON data
curl -X POST http://localhost:5000/api/resource \
  -H "Content-Type: application/json" \
  -d '{"key": "value", "name": "example"}'
```

#### Request with Query Parameters (Example Pattern)

```bash
# GET request with query parameters
curl -X GET "http://localhost:5000/api/resources?page=1&limit=10"
```

### Python Examples

#### Using requests library

```python
import requests

# Health check
response = requests.get('http://localhost:5000/api/health')
print(response.json())
# Output: {'status': 'healthy'}

# POST request example pattern
response = requests.post(
    'http://localhost:5000/api/resource',
    json={'key': 'value', 'name': 'example'},
    headers={'Content-Type': 'application/json'}
)
```

### JavaScript Examples

#### Using fetch API

```javascript
// Health check
fetch('http://localhost:5000/api/health')
  .then(response => response.json())
  .then(data => console.log(data));
// Output: { status: 'healthy' }

// POST request example pattern
fetch('http://localhost:5000/api/resource', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value', name: 'example' })
})
  .then(response => response.json())
  .then(data => console.log(data));
```

---

## HTTP Status Codes

The API uses standard HTTP status codes to indicate the success or failure of requests.

### Success Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource successfully created |
| 204 | No Content | Request succeeded, no content to return |

### Client Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Malformed request or invalid data |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Authentication succeeded but access denied |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | HTTP method not supported for endpoint |
| 413 | Request Entity Too Large | Request exceeds MAX_CONTENT_LENGTH |
| 422 | Unprocessable Entity | Request understood but contains semantic errors |
| 429 | Too Many Requests | Rate limit exceeded (when implemented) |

### Server Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Invalid response from upstream server |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream server timeout |

*(Source: README.md:292-302)*

---

## Response Format

### Success Response Format

Successful API responses follow this general structure:

```json
{
  "data": {},
  "message": "Success"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | object/array | The requested data or resource |
| `message` | string | Human-readable success message |

**Example - Single Resource:**

```json
{
  "data": {
    "id": 1,
    "name": "Example Resource",
    "created_at": "2024-12-11T10:00:00Z"
  },
  "message": "Resource retrieved successfully"
}
```

**Example - Collection:**

```json
{
  "data": [
    {"id": 1, "name": "Resource 1"},
    {"id": 2, "name": "Resource 2"}
  ],
  "message": "Resources retrieved successfully"
}
```

### Error Response Format

Error responses follow this structure:

```json
{
  "error": "Error type",
  "message": "Detailed error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Brief error type identifier |
| `message` | string | Detailed error description (optional) |

*(Source: README.md:273-290)*

---

## Configuration Reference

### API-Related Environment Variables

The following environment variables affect API behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated for multiple) |
| `JWT_SECRET_KEY` | `SECRET_KEY` value | Secret key for JWT token signing |
| `JWT_ACCESS_TOKEN_EXPIRES` | `3600` | JWT token expiration in seconds |
| `MAX_CONTENT_LENGTH` | `16777216` | Maximum request body size in bytes (16 MB) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `JSON_SORT_KEYS` | `false` | Sort keys in JSON responses |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port number |
| `DEBUG` | `false` | Enable debug mode |
| `FLASK_ENV` | `development` | Environment mode (development, production, testing) |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///app.db` | Database connection URI |
| `SQLALCHEMY_TRACK_MODIFICATIONS` | `false` | Track SQLAlchemy object modifications |
| `SQLALCHEMY_ECHO` | `false` | Echo SQL queries to console |

For a complete list of all configuration options, see [.env.example](../.env.example).

*(Source: config.py:47-89, .env.example:1-118)*

---

## Additional Resources

### Related Documentation

- [README.md](../README.md) - Project overview and setup instructions
- [CONTRIBUTING.md](../CONTRIBUTING.md) - API development guidelines
- [.env.example](../.env.example) - Complete environment variable reference

### External Resources

- [Flask Documentation](https://flask.palletsprojects.com/) - Flask framework documentation
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/) - Database ORM documentation
- [Gunicorn Documentation](https://docs.gunicorn.org/) - Production server documentation

### Support

For issues, questions, or contributions, please open an issue in the repository.

---

*This API documentation was generated for ExistingProduct1-3Dec Flask application.*

*Last updated: December 2024*
