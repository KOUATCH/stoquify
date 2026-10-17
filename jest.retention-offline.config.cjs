const nextJest = require('next/jest')

// P06: exact offline fixture suites; no application Next config or dotenv loading.
module.exports = nextJest()({
  rootDir: __dirname,
  roots: ['<rootDir>/services/pos/__tests__', '<rootDir>/lib/pos/__tests__', '<rootDir>/hooks/posHooks/__tests__'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/services/pos/__tests__/offline-sync.service.test.ts',
    '<rootDir>/lib/pos/__tests__/offline-local-queue.test.ts',
    '<rootDir>/hooks/posHooks/__tests__/offline-flush-recovery.test.ts',
    '<rootDir>/hooks/posHooks/__tests__/offline-dashboard-scope.test.ts',
  ],
  collectCoverage: false,
  testTimeout: 15000,
})
