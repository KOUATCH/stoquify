// Bounded mocked action/service and jsdom component checks. No Next config,
// application environment loading, database connection or Prisma generation.
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const configure = require(path.join(root, 'node_modules/next/jest'))();
module.exports = configure({
  rootDir: root,
  roots: [
    '<rootDir>/actions/finance/__tests__',
    '<rootDir>/services/accounting/__tests__',
    '<rootDir>/components/finance/__tests__',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.codex-tmp/', '<rootDir>/.next'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^server-only$': '<rootDir>/scripts/server-only-node-shim.js',
  },
  testMatch: [
    '<rootDir>/actions/finance/__tests__/customer-settlement.actions.test.ts',
    '<rootDir>/services/accounting/__tests__/customer-settlement-workbench.service.test.ts',
    '<rootDir>/components/finance/__tests__/CustomerSettlementControls.test.tsx',
    '<rootDir>/components/finance/__tests__/AROpenItemsHistoryWorkbench.test.tsx',
  ],
  testTimeout: 15000,
  collectCoverage: false,
});
