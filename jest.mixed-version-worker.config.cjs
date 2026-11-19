// Each child process uses one source version and its matching generated client.
const path = require('node:path');
const root = __dirname;
if (!['baseline', 'current'].includes(process.env.MIXED_SOURCE)) throw Error('Explicit source version required');
const baseline = process.env.MIXED_SOURCE === 'baseline';
module.exports = {
  rootDir: root, roots: ['<rootDir>/services/inventory/__tests__'], testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': baseline ? '<rootDir>/.codex-tmp/mixed-version-baseline/$1' : '<rootDir>/$1',
    '^@prisma/client$': baseline ? '<rootDir>/.codex-tmp/mixed-version-baseline/generated/legacy-client' : '<rootDir>/node_modules/@prisma/client',
    '^server-only$': '<rootDir>/scripts/server-only-node-shim.js',
  },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  testMatch: ['**/mixed-version.worker.postgres.test.ts'], testTimeout: 120000,
};
