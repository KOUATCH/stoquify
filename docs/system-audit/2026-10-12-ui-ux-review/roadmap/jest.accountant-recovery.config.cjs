const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Bounded mocked page/table checks; no application configuration or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/app'],
  testMatch: ['<rootDir>/app/**/accounting/reports/trial-balance/__tests__/*.test.tsx'],
  collectCoverage: false,
})
