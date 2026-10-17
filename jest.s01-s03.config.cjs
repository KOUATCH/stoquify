// Explicit local lanes; no Next config, dotenv loading or global Prisma mocks.
const configure = require('next/jest')();
module.exports = configure({
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/__tests__', '<rootDir>/lib/security/__tests__', '<rootDir>/services/_shared/__tests__', '<rootDir>/services/payroll/__tests__', '<rootDir>/actions/payroll/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/tests/s01-s03/server-only.cjs' },
  setupFilesAfterEnv: [],
  testMatch: [
    '<rootDir>/lib/__tests__/logger.test.ts',
    '<rootDir>/lib/security/__tests__/audit-log-fallback.test.ts',
    '<rootDir>/services/_shared/__tests__/protect.test.ts',
    '<rootDir>/services/payroll/__tests__/payment-settlement-authority.test.ts',
    '<rootDir>/services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts',
    '<rootDir>/services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts',
    '<rootDir>/services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts',
    '<rootDir>/actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts',
  ],
  testTimeout: 15000,
});
