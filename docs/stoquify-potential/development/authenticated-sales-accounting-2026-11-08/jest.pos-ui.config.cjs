// Bounded mocked POS UI tests; no Next config/environment loading or DB writes.
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const configure = require(path.join(root, 'node_modules/next/jest'))();
module.exports = configure({
  rootDir: root,
  roots: ['<rootDir>/components/pos/__tests__'],
  modulePathIgnorePatterns: ['<rootDir>/.codex-tmp/', '<rootDir>/.next'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['<rootDir>/components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx'],
  testTimeout: 15000,
  collectCoverage: false,
});
