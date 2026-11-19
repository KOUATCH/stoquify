const path = require('node:path');
const nextJest = require('next/jest');
const root = path.resolve(__dirname, '../../../../../..');
module.exports = nextJest()({
  rootDir: root, roots: [__dirname], testEnvironment: 'node',
  setupFilesAfterEnv: [path.join(__dirname, 'isolation-guard.cjs')],
  moduleNameMapper: {
    '^@prisma/client$': path.join(root, '.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/index.js'),
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [path.join(__dirname, 'item-errors-retry01.postgres.test.ts').replaceAll('\\', '/')],
  testTimeout: 60000, collectCoverage: false,
  cacheDirectory: path.join(root, '.codex-tmp/p04r03-qualification-20261104-r2/jest-cache'),
});
