// Explicit, local regression lane. No Next config or environment-file loading.
const configure = require('next/jest')()
module.exports = configure({
  rootDir: __dirname,
  roots: ['<rootDir>/actions', '<rootDir>/services', '<rootDir>/lib'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.postgres\\.test\\.ts$'],
  testTimeout: 15000,
  collectCoverage: false,
})
