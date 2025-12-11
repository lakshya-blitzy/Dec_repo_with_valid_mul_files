/**
 * ESLint Configuration
 *
 * This configuration file is for ESLint v9.x flat config format.
 * It configures JavaScript/ES Module linting for the Express.js application.
 *
 * @type {import('eslint').Linter.Config[]}
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  // Recommended JavaScript rules
  js.configs.recommended,

  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Error prevention
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',

      // Code style
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'indent': ['warn', 2],
      'comma-dangle': ['warn', 'always-multiline'],
      'eol-last': ['warn', 'always'],

      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '*.config.js',
      'blitzy_adhoc_test_*',
    ],
  },
];
