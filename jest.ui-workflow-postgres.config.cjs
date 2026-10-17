const nextJest = require('next/jest');
module.exports = nextJest({ dir: './' })({
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/postgres/ui-workflow'],
  testMatch: ['<rootDir>/tests/postgres/ui-workflow/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: [],
  testTimeout: 45000,
  maxWorkers: 1,
});
