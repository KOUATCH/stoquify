// Existing table tests only; real actions/imports are mocked, no app configuration.
module.exports = require('next/jest')()({
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/components/dashboard/Tables/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/spreadsheet-import.test.tsx'],
});
