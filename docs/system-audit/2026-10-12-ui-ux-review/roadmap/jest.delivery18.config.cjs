const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Isolated component lane: no app config, environment loading or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__', '<rootDir>/components/accounting/__tests__'],
  testMatch: ['**/trial-balance-table.test.tsx', '**/AccountantWorkDesk.test.tsx'],
  collectCoverage: false,
})
