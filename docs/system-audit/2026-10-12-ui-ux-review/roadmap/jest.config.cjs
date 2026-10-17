const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
const configure = require(path.join(root, 'node_modules/next/jest'))()
// Scoped component/pure lane; no Next config or environment loading.
module.exports = configure({
  rootDir: root,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/components/dashboard/__tests__', '<rootDir>/config/__tests__', '<rootDir>/components/bi/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/components/dashboard/__tests__/DashboardLanguageLink.test.tsx',
    '<rootDir>/components/dashboard/__tests__/DashboardMobileNavigation.test.tsx',
    '<rootDir>/components/dashboard/__tests__/Sidebar-current.test.tsx',
    '<rootDir>/components/dashboard/__tests__/dashboard-localization.test.tsx',
    '<rootDir>/config/__tests__/sidebar.test.ts',
    '<rootDir>/components/bi/__tests__/bi-command-primitives.test.tsx',
  ],
  collectCoverage: false,
})
