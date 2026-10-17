const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Installed transform only; no Next app config, environment, DB setup or global hooks.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: [
    '<rootDir>/services/owner-war-room/__tests__',
    '<rootDir>/actions/owner-war-room/__tests__',
    '<rootDir>/app/[locale]/(dashboard)/dashboard/owner-war-room/__tests__',
  ],
  testMatch: [
    '<rootDir>/services/owner-war-room/__tests__/owner-war-room.service.test.ts',
    '<rootDir>/services/owner-war-room/__tests__/owner-signal-copy.test.ts',
    '<rootDir>/actions/owner-war-room/__tests__/owner-war-room.actions.test.ts',
    '<rootDir>/app/**/owner-war-room/__tests__/page.test.tsx',
  ],
  collectCoverage: false,
})
