// P03: pure fixture/CSV/static boundary tests only; no Next config, dotenv or DB.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/services/onboarding/__tests__'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/opening-position-contract.test.ts', '**/master-data-csv.test.ts', '**/master-data-control-boundary.test.ts'],
  collectCoverage: false,
  testTimeout: 15000,
}
