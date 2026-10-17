// No Next application config, dotenv, global mocks, or application setup.
module.exports = require('next/jest')()({
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/s04-s05', '<rootDir>/services/pos', '<rootDir>/services/purchasing', '<rootDir>/services/events', '<rootDir>/lib/pos'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/s01-s03/server-only.cjs' },
  setupFiles: process.env.RUN_S04_S05_POSTGRES === '1' ? ['<rootDir>/tests/s04-s05/guard.cjs'] : [],
  setupFilesAfterEnv: [],
  testMatch: ['**/*.test.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
});
