// Scoped isolated unit/UI lane: no app config, dotenv, global Prisma mocks or DB.
module.exports = require('next/jest')()({
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/s08-s09', '<rootDir>/components/purchasing/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
});
