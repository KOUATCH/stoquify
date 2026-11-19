// Existing reviewed toolchain; frozen application aliases and private ORM only.
// No next/jest dir, application config, dotenv or shared setup/persistence mocks.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
assert.ok(process.env.UPGRADE_PHASE_CONTEXT, 'Explicit private upgrade context required');
const context = JSON.parse(fs.readFileSync(process.env.UPGRADE_PHASE_CONTEXT, 'utf8'));
assert.equal(process.env.UPGRADE_PHASE_CONTEXT, context.contextFile);
module.exports = {
  rootDir: context.candidate, roots: [__dirname], testEnvironment: 'node',
  moduleNameMapper: { '^@prisma/client$': context.client, '^@upgrade-fixture$': context.fixtureModule,
    '^@/(.*)$': context.candidate.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(context.candidate, 'scripts/server-only-node-shim.js') },
  moduleDirectories: [path.join(root, 'node_modules')],
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  setupFiles: [], setupFilesAfterEnv: [], testMatch: [path.join(__dirname, 'upgrade-financial-phase.test.ts').replaceAll('\\', '/')],
  testTimeout: 180000, collectCoverage: false,
};
