// No mock setup, Next config or environment loading; runner pins all DB URLs.
module.exports = {
  rootDir: '.', roots: ['<rootDir>/services/pos/__tests__', '<rootDir>/services/inventory/__tests__'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/*.postgres.test.ts'], testTimeout: 120000,
}
