const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Reviewed isolated component lane: mocked actions, no app config/env, migrations or DB.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/components/payroll/__tests__'],
  testMatch: ['<rootDir>/components/payroll/__tests__/PayrollCommandCenter.test.tsx',
    '<rootDir>/components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx',
    '<rootDir>/components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx',
    '<rootDir>/components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx',
    '<rootDir>/components/payroll/__tests__/PayrollPilotCertificationPanel.test.tsx',
    '<rootDir>/components/payroll/__tests__/destination-localization.test.tsx'],
  collectCoverage: false,
})
