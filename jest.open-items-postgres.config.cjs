// Explicit disposable PostgreSQL evidence. No Next env/bootstrap or persistence mocks.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/tests/postgres/finance'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/open-items.postgres.test.ts'],
  testTimeout: 45000,
  maxWorkers: 1,
}
