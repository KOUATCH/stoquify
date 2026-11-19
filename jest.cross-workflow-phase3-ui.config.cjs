// Mocked component evidence only. No application configuration or database.
const configure = require('next/jest')()
module.exports = configure({
  rootDir: __dirname,
  roots: ['<rootDir>/components/pos/__tests__', '<rootDir>/components/purchase-orders/__tests__', '<rootDir>/components/inventory/movements/__tests__'],
  testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }, testMatch: ['**/*.test.tsx'], testTimeout: 15000,
})
