const path = require('node:path')
const nextJest = require('next/jest')

// No dir argument: do not load application Next config, .env, or root setup.
module.exports = nextJest()({
  rootDir: path.resolve(__dirname, '../../../../../..'),
  roots: ['<rootDir>/lib/media', '<rootDir>/app/api/uploads'],
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '<rootDir>/lib/media/__tests__/legacy-upload-storage.test.ts',
    '<rootDir>/lib/media/__tests__/legacy-upload-routing.test.ts',
    '<rootDir>/app/api/uploads/**/__tests__/route.test.ts',
  ],
  cache: false,
  collectCoverage: false,
  testTimeout: 15000,
})
