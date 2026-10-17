const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Reviewed mocked component/hook lane: no application config, env, database or server setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/components/finance/__tests__', '<rootDir>/hooks/payments/__tests__'],
  testMatch: ['<rootDir>/components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx',
    '<rootDir>/hooks/payments/__tests__/workbench-scope.test.tsx'],
  collectCoverage: false,
})
