// Explicit inspected mocked suites. No Next config, dotenv or global setup.
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
module.exports = {
  rootDir: root, roots: [path.join(root, 'services/accounting/__tests__'), path.join(root, 'actions/accounting/__tests__')],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': root.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(__dirname, 'server-only.cjs') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  testMatch: ['**/close-assurance-write-access.test.ts', '**/close-assurance.actions.test.ts', '**/close-evidence-acceptance-authority.service.test.ts', '**/close-assurance.service.test.ts', '**/close-assurance-pack.service.test.ts'],
  setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 15000,
};
