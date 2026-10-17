// Real Prisma, explicitly isolated target, no Next config or dotenv loading.
module.exports = require('next/jest')()({
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/postgres/ui-workflow'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/s01-s03/server-only.cjs' },
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/postgres/ui-workflow/payroll-settlement.test.ts', '<rootDir>/tests/postgres/ui-workflow/target.test.ts'],
  testTimeout: 45000,
  maxWorkers: 1,
});
