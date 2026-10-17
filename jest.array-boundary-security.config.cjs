const nextJest = require('next/jest')

// No application dir, Next config, dotenv loading, global setup or persistence.
module.exports = nextJest()({
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/lib/validation/__tests__', '<rootDir>/lib/imports/__tests__', '<rootDir>/components/dashboard/Tables/__tests__', '<rootDir>/services/purchasing/__tests__', '<rootDir>/services/hris/__tests__', '<rootDir>/actions/modules/__tests__'],
  testMatch: [
    '<rootDir>/lib/validation/__tests__/remaining-array-boundaries.test.ts',
    '<rootDir>/services/hris/__tests__/operational-time.service.test.ts',
    '<rootDir>/actions/modules/__tests__/module-composition.actions.test.ts',
    '<rootDir>/services/purchasing/__tests__/invoice-preparation-contracts.test.ts',
    '<rootDir>/services/purchasing/__tests__/payment-request-contracts.test.ts',
    '<rootDir>/lib/validation/__tests__/input-array-limits.test.ts',
    '<rootDir>/lib/imports/__tests__/read-spreadsheet.test.ts',
    '<rootDir>/components/dashboard/Tables/__tests__/spreadsheet-import.test.tsx',
  ],
  testTimeout: 15000,
  collectCoverage: false,
})
