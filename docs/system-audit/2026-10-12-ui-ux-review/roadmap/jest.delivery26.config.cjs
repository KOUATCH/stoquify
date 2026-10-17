const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Component-only lane; no app config, environment setup, database or server actions.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js',
  },
  roots: ['<rootDir>/components/dashboard/__tests__'],
  testMatch: ['**/DashboardAppearance.test.tsx'],
  collectCoverage: false,
})
