const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Pure definition checks and mocked RBAC. No seed imports, app setup, env or DB.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  roots: ['<rootDir>/prisma/__tests__', '<rootDir>/lib/security', '<rootDir>/scripts/__tests__'],
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/prisma/__tests__/accountant-lookup-permissions.test.ts',
    '<rootDir>/lib/security/__tests__/rbac.test.ts',
    '<rootDir>/scripts/__tests__/compliance-hris-role-seed-contract.test.js',
  ],
  collectCoverage: false,
})
