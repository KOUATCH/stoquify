const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
// Installed SWC transform only. No app configuration, environment or DB setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  roots: ['<rootDir>/services/owner-war-room/__tests__'],
  testMatch: ['<rootDir>/services/owner-war-room/__tests__/owner-war-room.service.test.ts'],
  collectCoverage: false,
})
