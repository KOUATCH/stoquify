const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Isolated component lane: setup/actions/access mocked; no app config or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/app/[locale]/(dashboard)/dashboard/accounting/journals/new/__tests__'],
  testMatch: ['**/journals/new/__tests__/page.test.tsx'],
  collectCoverage: false,
})
