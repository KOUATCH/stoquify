const path = require('node:path')
module.exports = require('next/jest')()({
  rootDir: path.resolve(__dirname, '../../../..'),
  roots: ['<rootDir>/components/pos/__tests__'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['<rootDir>/components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx'],
  collectCoverage: false,
  testTimeout: 15000,
})
