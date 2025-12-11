/**
 * Jest Configuration
 *
 * Configuration for the Jest testing framework with ES Module support.
 * Jest is used for unit and integration testing of the Express.js application.
 *
 * @see https://jestjs.io/docs/configuration
 * @module jest.config
 */

export default {
  // Use Node.js test environment for server-side testing
  testEnvironment: 'node',

  // Enable ES Module support via experimental VM modules
  // Required for "type": "module" in package.json
  transform: {},

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],

  // Coverage thresholds (optional)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Verbose output for better debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Force exit after tests complete (useful for async cleanup)
  forceExit: true,

  // Detect open handles that prevent Jest from exiting
  detectOpenHandles: true,

  // Timeout for each test
  testTimeout: 10000,
};
