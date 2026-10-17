// Explicit component-only lane; no app config, dotenv or database setup.
module.exports = require('next/jest')()({
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/components/payroll/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: ['**/PayrollPaymentReconciliationWorkbench.test.tsx'],
});
