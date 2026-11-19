const nextJest = require('next/jest')
// Pure P09 only. No project dir, app configuration, dotenv, setup, DB or mocks.
module.exports = nextJest()({
  rootDir: __dirname,
  roots: ['<rootDir>/services/organization/__tests__'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/services/organization/__tests__/authorized-archive-contract.test.ts'],
  collectCoverage: false,
})
