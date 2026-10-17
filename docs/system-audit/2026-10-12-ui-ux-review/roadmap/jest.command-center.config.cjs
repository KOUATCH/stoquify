const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Bounded UI lane: no application Next config, environment loading or database setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  roots: ['<rootDir>/components/bi/__tests__', '<rootDir>/components/owner-war-room/__tests__'],
  testMatch: [
    '<rootDir>/components/bi/__tests__/BIActionButton.pending.test.tsx',
    '<rootDir>/components/bi/__tests__/BIActionButton.test.tsx',
    '<rootDir>/components/bi/__tests__/bi-command-primitives.test.tsx',
    '<rootDir>/components/bi/__tests__/BICommandBriefHeader.compact.test.tsx',
    '<rootDir>/components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx',
  ],
  collectCoverage: false,
})
