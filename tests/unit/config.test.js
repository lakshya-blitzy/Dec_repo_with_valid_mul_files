/**
 * Configuration Module Unit Tests
 *
 * Tests the configuration module functionality.
 *
 * @module tests/unit/config.test
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration Module', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules before each test
    jest.resetModules();
    // Create a fresh copy of env
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Default Values', () => {
    it('should have default port of 3000', async () => {
      delete process.env.PORT;
      const { default: config } = await import('../../src/config/index.js');
      expect(config.port).toBe(3000);
    });

    it('should detect test environment', async () => {
      process.env.NODE_ENV = 'test';
      const { default: config } = await import('../../src/config/index.js');
      expect(config.isTesting).toBe(true);
    });

    it('should have default CORS origin of *', async () => {
      delete process.env.CORS_ORIGIN;
      const { default: config } = await import('../../src/config/index.js');
      expect(config.corsOrigin).toBe('*');
    });

    it('should have default request limit of 10mb', async () => {
      delete process.env.REQUEST_LIMIT;
      const { default: config } = await import('../../src/config/index.js');
      expect(config.requestLimit).toBe('10mb');
    });

    it('should have default compression threshold of 1kb', async () => {
      delete process.env.COMPRESSION_THRESHOLD;
      const { default: config } = await import('../../src/config/index.js');
      expect(config.compressionThreshold).toBe('1kb');
    });
  });

  describe('Environment Detection', () => {
    it('should detect development environment', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { default: config } = await import('../../src/config/index.js');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should detect test environment correctly', async () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const { default: config } = await import('../../src/config/index.js');
      expect(config.isTesting).toBe(true);
    });
  });

  describe('Environment Variable Override', () => {
    it('should use PORT from environment', async () => {
      process.env.PORT = '8080';
      jest.resetModules();
      const { default: config } = await import('../../src/config/index.js');
      expect(config.port).toBe(8080);
    });

    it('should use LOG_LEVEL from environment', async () => {
      process.env.LOG_LEVEL = 'error';
      jest.resetModules();
      const { default: config } = await import('../../src/config/index.js');
      expect(config.logLevel).toBe('error');
    });

    it('should use CORS_ORIGIN from environment', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:3001';
      jest.resetModules();
      const { default: config } = await import('../../src/config/index.js');
      expect(config.corsOrigin).toBe('http://localhost:3001');
    });
  });
});
