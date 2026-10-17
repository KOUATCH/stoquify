// No application environment bootstrap or mocked persistence.
module.exports = {
  rootDir: __dirname, roots: ['<rootDir>/tests/postgres/close-scope'], testEnvironment: 'node',
  moduleNameMapper: { '^@prisma/client$': '<rootDir>/.test-artifacts/close-coverage/client', '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/close-scope/server-only.cjs' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/*.postgres.test.ts'], maxWorkers: 1, testTimeout: 45000,
}
