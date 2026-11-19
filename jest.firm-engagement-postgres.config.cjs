// Real database suite; no dotenv, application setup, seeding hooks or Next config.
const nextJest = require('next/jest')
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: 'node',
  roots: ['<rootDir>/services/accounting/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/firm-engagement.postgres.test.ts'],
  testTimeout: 30000, collectCoverage: false,
})
