const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
module.exports = require('next/jest')({ dir: root })({
  rootDir: root,
  roots: ['<rootDir>/hooks', '<rootDir>/services/pos', '<rootDir>/services/leakage', '<rootDir>/actions/pos', '<rootDir>/components/finance', '<rootDir>/lib'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
});
