// Real PostgreSQL reads only. The explicit runner pins read-only startup settings.
if (process.env.OPEN_ITEMS_READONLY_VERIFICATION !== '1') throw new Error('Use scripts/run-open-items-readonly-verification.cjs with an explicit organization.')
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/tests/postgres/finance'],
  testMatch: ['**/open-items-readonly.test.ts'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/scripts/server-only-node-shim.js' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  setupFilesAfterEnv: [],
  collectCoverage: false,
  testTimeout: 60000,
}
