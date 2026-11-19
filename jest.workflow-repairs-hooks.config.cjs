// Explicit, local regression lane. No Next config or environment-file loading.
const configure = require('next/jest')()
module.exports = configure({
  rootDir: __dirname,
  roots: ['<rootDir>/hooks/__tests__'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '\\.postgres\\.test\\.ts$'],
  testTimeout: 15000,
  collectCoverage: false,
})
