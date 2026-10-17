const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Isolated mocked UI lane: no app config, environment loading or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^lucide-react$': require.resolve('lucide-react', { paths: [root] }) },
  roots: ['<rootDir>/components/dashboard/__tests__'],
  testMatch: ['**/Delivery16-loading.test.tsx', '**/Sidebar-current.test.tsx'],
  collectCoverage: false,
})
