const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Mocked UI/page lane, without application config, env or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^lucide-react$': require.resolve('lucide-react', { paths: [root] }) },
  roots: ['<rootDir>/components/accounting/__tests__'],
  testMatch: ['**/AccountantAccessManager.test.tsx', '**/AccountantPortal.localization.test.tsx', '**/AccountantAccessPage.localization.test.tsx'],
  collectCoverage: false,
})
