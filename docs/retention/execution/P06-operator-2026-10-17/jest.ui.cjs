const path = require('node:path')
module.exports = require('next/jest')()({
  rootDir: path.resolve(__dirname, '../../../..'),
  roots: ['<rootDir>/components/pos/__tests__', '<rootDir>/hooks/posHooks/__tests__'],
  testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/docs/retention/execution/P06-operator-2026-10-17/ui.setup.cjs'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/ProfessionalPOSSystem.shift-close.test.tsx', '**/LocalOfflineRecovery.test.tsx', '**/offline-flush-recovery.test.ts'],
  collectCoverage: false, testTimeout: 15000,
})
