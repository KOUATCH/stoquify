const path = require('node:path');
module.exports = require('next/jest')()({
  rootDir: path.resolve(__dirname, '../../../../..'),
  roots: ['<rootDir>/services/onboarding/__tests__','<rootDir>/components/onboarding/__tests__'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/master-data-control-boundary.test.ts','**/master-data-import-guards.test.ts','**/master-data-csv.test.ts','**/opening-position-contract.test.ts','**/opening-readiness.test.ts','**/opening-readiness-access.test.ts','**/OpeningReadinessPanel.test.tsx'],
  testTimeout: 15000,
  collectCoverage: false,
});
