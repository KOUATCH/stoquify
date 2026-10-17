// P02 only: installed SWC, no Next config, dotenv, global app setup or DB bootstrap.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/services/analytics/__tests__'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/retention-outcomes.test.ts', '**/retention-outcomes.service.test.ts', '**/retention-cohorts.test.ts'],
  collectCoverage: false,
  testTimeout: 15000,
}
