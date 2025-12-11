/**
 * Error Handling Integration Tests
 *
 * Tests the error handling middleware of the Express.js API server.
 * Verifies 404 responses and error format consistency.
 *
 * @module tests/integration/errorHandling.test
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Error Handling', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should return JSON content type for 404', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return error format matching Flask implementation', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('status', 404);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return "Resource not found" message', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.body.error.message).toBe('Resource not found');
    });

    it('should return 404 for root path without API prefix', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid API sub-routes', async () => {
      const response = await request(app).get('/api/users/123');
      expect(response.status).toBe(404);
    });
  });

  describe('HTTP Methods', () => {
    it('should handle POST to read-only endpoint', async () => {
      const response = await request(app)
        .post('/api/health')
        .send({ test: 'data' });
      expect(response.status).toBe(404);
    });

    it('should handle PUT to read-only endpoint', async () => {
      const response = await request(app)
        .put('/api/health')
        .send({ test: 'data' });
      expect(response.status).toBe(404);
    });

    it('should handle DELETE to read-only endpoint', async () => {
      const response = await request(app).delete('/api/health');
      expect(response.status).toBe(404);
    });
  });

  describe('Request Validation', () => {
    it('should accept valid JSON body', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .set('Content-Type', 'application/json')
        .send({ valid: 'json' });
      // Should be 404 (route not found) not 400 (bad request)
      expect(response.status).toBe(404);
    });

    it('should handle empty body gracefully', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .set('Content-Type', 'application/json')
        .send();
      expect(response.status).toBe(404);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from Helmet', async () => {
      const response = await request(app).get('/api/health');
      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3001');
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');
      expect(response.status).toBe(204);
    });
  });
});
