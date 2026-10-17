// Mocked hook/component regressions; no Next environment or database bootstrap.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/hooks/posHooks/__tests__', '<rootDir>/components/pos/__tests__'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer' },
  testMatch: ['**/checkout-lifecycle-races.test.tsx', '**/ProfessionalPOSSystem.shift-close.test.tsx'],
  collectCoverage: false,
}
