const nextJest = require('next/jest')

// P05: bounded mocked checkout/recovery tests, no Next config or dotenv loading.
module.exports = nextJest()({
  rootDir: __dirname,
  roots: ['<rootDir>/services/pos/__tests__', '<rootDir>/actions/pos/__tests__'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/services/pos/__tests__/pos.service.test.ts',
    '<rootDir>/services/pos/__tests__/commit-recovery.service.test.ts',
    '<rootDir>/actions/pos/__tests__/commit-recovery.actions.test.ts',
    '<rootDir>/actions/pos/__tests__/tender.actions.test.ts',
  ],
  collectCoverage: false,
  testTimeout: 15000,
})
