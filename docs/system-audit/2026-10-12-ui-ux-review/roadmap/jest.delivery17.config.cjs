const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Isolated mocked layout checks; no app env, database setup or server imports execute.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/app/[locale]/(dashboard)/dashboard/__tests__', '<rootDir>/components/i18n/__tests__', '<rootDir>/components/accounting/__tests__'],
  testMatch: ['**/dashboard/__tests__/layout.test.tsx', '**/DocumentLanguage.test.tsx', '**/AccountantAccessManager.test.tsx'],
  collectCoverage: false,
})
