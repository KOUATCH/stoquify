// Real persistence lane. Requires the target-guarded phase2/run-postgres.cjs runner.
module.exports = {
  rootDir: '.', roots: ['<rootDir>/services/inventory/__tests__'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/*.repairs.postgres.test.ts'],
  testTimeout: 30000,
}
