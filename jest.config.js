/**
 * Jest Configuration for Raiden Anti-Cheat Moderation Bot
 *
 * Comprehensive testing configuration supporting:
 * - TypeScript compilation with ts-jest
 * - Unit tests and integration tests separation
 * - Code coverage reporting
 * - Test environment setup
 * - Mock configurations for external dependencies
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment - use Node.js for backend testing
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/unit/**/*.test.ts',
    '**/integration/**/*.test.ts',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

// Module name mapping for path aliases
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
},

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Main entry point
    '!src/bot.ts', // Main bot file (tested via integration)
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Detect memory leaks in tests
  detectOpenHandles: true,

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // Test environment variables
  testEnvironmentOptions: {
    // Custom environment variables for testing
    NODE_ENV: 'test',
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Module directories
  moduleDirectories: ['node_modules', 'src'],

  // Transform ignore patterns (for node_modules)
  transformIgnorePatterns: [
    'node_modules/(?!(@discordjs|discord\\.js)/)',
  ],
};
