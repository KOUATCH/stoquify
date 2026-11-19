const nextJest = require('next/jest')
module.exports = nextJest()({ rootDir: __dirname, testEnvironment: 'node', roots: ['<rootDir>/.codex-tmp/af16-tests'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^@prisma/client$': '<rootDir>/.codex-tmp/af16-prisma/client' },
  testMatch: ['**/*.postgres.test.ts'], testTimeout: 90000, collectCoverage: false })
