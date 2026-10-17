// Explicit test paths only. No Next application configuration or dotenv loading.
module.exports = require('next/jest')()({
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/s12', '<rootDir>/services/assurance/__tests__', '<rootDir>/scripts/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/s01-s03/server-only.cjs' },
  setupFiles: [], setupFilesAfterEnv: [], testTimeout: 120000,
  testMatch: ['**/*.test.ts', '**/*.test.js'],
});
