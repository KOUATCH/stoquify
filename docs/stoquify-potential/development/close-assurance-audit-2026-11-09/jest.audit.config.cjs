// Two inspected pure/mocked suites; no Next config, dotenv or application setup.
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
module.exports = {
  rootDir: root, roots: [path.join(root, 'services/accounting/__tests__')], testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': root.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(__dirname, 'server-only.cjs') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  testMatch: ['**/close-assurance-current-proof.test.ts', '**/close-assessment-order.service.test.ts'],
  setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 15000,
};
