/**
 * Health Endpoint Integration Tests
 *
 * Tests the health check endpoints of the Express.js API server.
 * Uses Supertest for HTTP request testing.
 *
 * Endpoints tested:
 * - GET /api/health - Basic health check
 * - GET /api/health/detailed - Detailed health information
 *
 * @module tests/integration/health.test
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Health Endpoints', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('GET /api/health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.status).toBe('healthy');
    });

    it('should return service name as api', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.service).toBe('api');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should return the exact required response format', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('timestamp');
      expect(Object.keys(response.body)).toHaveLength(3);
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.body.status).toBe('healthy');
    });

    it('should return service name as api', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.body.service).toBe('api');
    });

    it('should return uptime as a number', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory information', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeDefined();
      expect(response.body.memory.heapTotal).toBeDefined();
      expect(response.body.memory.unit).toBe('MB');
    });

    it('should return Node.js version', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.body.version).toBeDefined();
      expect(response.body.version).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should return environment setting', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(response.body.environment);
    });
  });
});
