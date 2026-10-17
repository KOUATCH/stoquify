const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
const configure = require(path.join(root, 'node_modules/next/jest'))()
// Isolated jsdom lane: no Next config/env loading; proof action mocked in suite.
module.exports = configure({
  rootDir: root,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/components/owner-war-room/__tests__', '<rootDir>/components/bi/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['<rootDir>/components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx', '<rootDir>/components/bi/__tests__/*.test.tsx'],
  collectCoverage: false,
})
