// Current orchestrator and real fixtures; child worker selects the old/current source.
module.exports = {
  rootDir: '.', roots: ['<rootDir>/services/inventory/__tests__'], testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/mixed-version.compatibility.postgres.test.ts'], testTimeout: 600000,
};
