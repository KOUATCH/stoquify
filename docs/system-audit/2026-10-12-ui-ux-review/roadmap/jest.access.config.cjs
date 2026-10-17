const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// No project Next configuration, environment loading, database or application setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/components/dashboard/__tests__'],
  testMatch: ['<rootDir>/components/dashboard/__tests__/DashboardPageAccess.test.tsx'],
  collectCoverage: false,
})
