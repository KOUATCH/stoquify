// Actual SQL, real authority, event/outbox and lifecycle services. Synthetic data only.
const nextJest = require('next/jest')
module.exports = nextJest()({ rootDir: __dirname, testEnvironment: 'node',
  roots: ['<rootDir>/services/accounting/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^@prisma/client$': '<rootDir>/.codex-tmp/af04-prisma/client' },
  testMatch: ['**/firm-engagement-authority.postgres.test.ts'], testTimeout: 30000, collectCoverage: false })
