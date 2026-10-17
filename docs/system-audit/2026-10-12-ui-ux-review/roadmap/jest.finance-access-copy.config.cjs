const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Mocked route/component lane; no application config, environment, server or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/app'],
  testMatch: [
    '<rootDir>/app/**/finance/__tests__/finance-route-access.test.tsx',
    '<rootDir>/app/**/finance/reconciliation/__tests__/page.test.tsx',
    '<rootDir>/app/**/finance/cash-command/__tests__/page.test.tsx',
  ],
  collectCoverage: false,
})
