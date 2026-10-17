// Isolated source/test lane: does not load application config or dotenv.
module.exports = require('next/jest')()({
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/s10-s11', '<rootDir>/services/pos/__tests__', '<rootDir>/hooks/posHooks/__tests__', '<rootDir>/scripts/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/s01-s03/server-only.cjs' },
  setupFiles: [], setupFilesAfterEnv: [],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
  testTimeout: 300000,
});
