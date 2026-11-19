const path = require('node:path');
const root = path.resolve(__dirname, '../../../../../..');
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root, roots: ['<rootDir>/lib/security'], testEnvironment: 'node',
  setupFilesAfterEnv: [path.join(__dirname, 'guard.cjs')],
  moduleNameMapper: {'^@/(.*)$': '<rootDir>/$1'},
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 15000, collectCoverage: false, cache: false,
  cacheDirectory: path.join(__dirname, 'cache'),
});
