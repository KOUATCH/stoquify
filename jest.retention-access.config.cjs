const nextJest = require('next/jest')

// P04: exact mocked authority/export suites. Omit dir to avoid Next config/.env.
module.exports = nextJest()({
  rootDir: __dirname,
  roots: [
    '<rootDir>/services/accounting/__tests__',
    '<rootDir>/services/operating-access/__tests__',
    '<rootDir>/services/_shared/__tests__',
    '<rootDir>/services/modules/__tests__',
    '<rootDir>/services/inventory/__tests__',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/services/accounting/__tests__/accountant-access-retention-boundary.test.ts',
    '<rootDir>/services/operating-access/__tests__/operating-access-retention-boundary.test.ts',
    '<rootDir>/services/operating-access/__tests__/operating-access-scope.service.test.ts',
    '<rootDir>/services/_shared/__tests__/protect.test.ts',
    '<rootDir>/services/modules/__tests__/module-entitlement.service.test.ts',
    '<rootDir>/services/modules/__tests__/module-retention-access.test.ts',
    '<rootDir>/services/inventory/__tests__/inventory-history-background-export.service.test.ts',
  ],
  collectCoverage: false,
  testTimeout: 15000,
})
