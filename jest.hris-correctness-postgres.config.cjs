// Real PostgreSQL lane: no application config, dotenv wrapper or Prisma mocks.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/services/hris/__tests__'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^server-only$': '<rootDir>/scripts/server-only-node-shim.js',
  },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/hris-correctness.postgres.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
}
