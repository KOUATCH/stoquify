const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Reviewed: installed transform only; isolated mocked UI, no app env/setup or database.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/components/payroll/__tests__', '<rootDir>/components/ui/groups/inventory/__tests__'],
  testMatch: ['<rootDir>/components/payroll/__tests__/followup-localization.test.tsx',
    '<rootDir>/components/ui/groups/inventory/__tests__/ItemManagement.localization.test.tsx'],
  collectCoverage: false,
})
