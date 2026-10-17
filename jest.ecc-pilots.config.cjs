const nextJest = require('next/jest')

// Deliberately omit `dir`: retain the installed Next/SWC Jest transform without
// loading next.config or application .env files. Persistence/auth are mocked by
// the inspected suites and the existing setup; this is not PostgreSQL evidence.
const configure = nextJest()
const shared = {
  rootDir: __dirname,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testTimeout: 15000,
  collectCoverage: false,
}

module.exports = async () => ({
  projects: await Promise.all([
    configure({
      ...shared,
      displayName: 'ecc-unit',
      testEnvironment: 'node',
      roots: [
        '<rootDir>/lib/security/__tests__',
        '<rootDir>/services/pos/__tests__',
        '<rootDir>/services/purchasing/__tests__',
        '<rootDir>/services/inventory/__tests__',
        '<rootDir>/services/accounting/__tests__',
        '<rootDir>/services/payroll/__tests__',
        '<rootDir>/scripts/__tests__',
      ],
      testMatch: [
        '<rootDir>/lib/security/__tests__/rbac.test.ts',
        '<rootDir>/services/pos/__tests__/checkout-lifecycle.service.test.ts',
        '<rootDir>/services/purchasing/__tests__/payment-release-evidence.test.ts',
        '<rootDir>/services/inventory/__tests__/inventory-stock-event.service.test.ts',
        '<rootDir>/services/accounting/__tests__/close-assurance-current-proof.test.ts',
        '<rootDir>/services/payroll/__tests__/payroll-immutability-migration.test.ts',
        '<rootDir>/scripts/__tests__/public-color-contract.test.js',
      ],
    })(),
    configure({
      ...shared,
      displayName: 'ecc-component',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/components/dashboard/__tests__', '<rootDir>/components/auth/__tests__', '<rootDir>/components/auth/v2/__tests__'],
      testMatch: [
        '<rootDir>/components/dashboard/__tests__/DashboardRouteState.test.tsx',
        '<rootDir>/components/auth/__tests__/LoginSubmissionSafety.test.tsx',
        '<rootDir>/components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx',
      ],
    })(),
  ]),
})
