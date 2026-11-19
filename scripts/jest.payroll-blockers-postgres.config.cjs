// No app configuration, dotenv loading or Prisma mocks. Target is set by the guarded runner.
module.exports = require('next/jest')()({
  rootDir: '..',
  roots: ['<rootDir>/tests/postgres/payroll-blockers'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  testMatch: ['<rootDir>/tests/postgres/payroll-blockers/**/*.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
});
