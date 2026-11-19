// Reviewed mocked service/action lane. No Next config, dotenv, app bootstrap,
// root client generation, database fixture, migrations or provider access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const tests = process.argv.slice(2);
const clientReceiptFile = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'), clientReceipt = JSON.parse(fs.readFileSync(clientReceiptFile, 'utf8'));
const executionFile = path.join(__dirname, 'pg-EXECUTION_CLIENTS.json'), execution = JSON.parse(fs.readFileSync(executionFile, 'utf8'));
assert(execution.passed && execution.originalsUnchanged && execution.generatedClientsEdited === false && execution.canaryRemoved);
const executionClient = execution.clients.current;
assert.equal(executionClient.originalClient, clientReceipt.client);
assert(clientReceipt.passed && clientReceipt.rootGeneration === false);
assert.equal(digest(path.join(root, 'prisma/schema.prisma')), clientReceipt.sourceSchemaSha256);
const verifyClient = () => {
  for (const file of clientReceipt.clientFiles) { assert.equal(digest(path.join(clientReceipt.client, file.path)), file.sha256, 'Original private client changed'); assert.equal(digest(path.join(executionClient.client, file.path)), file.sha256, 'Execution copy changed'); }
  for (const file of executionClient.environmentPaths) { assert(path.resolve(file.resolvedPath).startsWith(path.resolve(execution.directory) + path.sep)); assert(!fs.existsSync(file.resolvedPath), 'Execution environment file appeared'); }
};
verifyClient();
assert(tests.length && tests.every(file => /^(services|actions)\/.+\.test\.ts$/.test(file) && !file.includes('..') && !file.includes('postgres')), 'Explicit mocked service/action suites required');
const id = crypto.randomBytes(5).toString('hex'), directory = path.join(__dirname, 'unit-' + id); fs.mkdirSync(directory);
const config = { rootDir: root, roots: [...new Set(tests.map(file => path.dirname(path.join(root, file))))], testEnvironment: 'node', cache: false,
  moduleNameMapper: { '^@prisma/client$': executionClient.client, '^@/(.*)$': root.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(root, 'scripts/server-only-node-shim.js') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 20000 };
const configPath = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
const files = [...new Set([...tests,
  'services/accounting/close-assurance.service.ts', 'services/accounting/close-assurance.schemas.ts',
  'services/accounting/close-finding-assignee-authority.service.ts', 'services/accounting/close-evidence-acceptance-authority.service.ts',
  'services/accounting/managed-accountant-access.service.ts', 'services/modules/module-entitlement.service.ts',
  'services/roles/role-custodian-policy.ts', 'lib/security/rbac-permissions.ts', 'actions/accounting/close-assurance.actions.ts',
  'scripts/local-gates-network.cjs', 'prisma/schema.prisma', 'prisma/migration-catalog-manifest.json', 'prisma/migrations/20261110190000_close_scope_integrity/migration.sql', 'package-lock.json', path.relative(root, clientReceiptFile), path.relative(root, executionFile), path.relative(root, __filename), path.relative(root, configPath),
])];
const before = Object.fromEntries(files.map(file => [file.replaceAll('\\', '/'), digest(path.join(root, file))]));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const disabled = 'postgresql://close_ownership_unit_disabled@127.0.0.1:1/stoquify_close_ownership_unit_disabled?schema=public';
const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
  NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' };
const args = [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', path.join(directory, 'results.json')];
const fd = fs.openSync(path.join(directory, 'checks.log'), 'wx'), began = new Date().toISOString();
const execution = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 240000 }); fs.closeSync(fd);
const results = fs.existsSync(path.join(directory, 'results.json')) ? JSON.parse(fs.readFileSync(path.join(directory, 'results.json'), 'utf8')) : null;
const after = Object.fromEntries(files.map(file => [file.replaceAll('\\', '/'), digest(path.join(root, file))]));
const unchanged = JSON.stringify(before) === JSON.stringify(after);
verifyClient();
const report = { began, ended: new Date().toISOString(), passed: execution.status === 0 && results?.success === true && results.numPendingTests === 0 && results.numTodoTests === 0 && unchanged,
  exitCode: execution.status, error: execution.error?.code || null, args, passedTests: results?.numPassedTests, failedTests: results?.numFailedTests, skipped: results?.numPendingTests, todo: results?.numTodoTests,
  unchangedInputs: unchanged, sourceHashesBefore: before, sourceHashesAfter: after, configSha256: digest(configPath), runnerSha256: digest(__filename),
  evidenceDirectory: directory, privateClient: executionClient.client, originalPrivateClient: clientReceipt.client, privateClientReceiptSha256: digest(clientReceiptFile), executionClientReceiptSha256: digest(executionFile), privateClientFilesUnchanged: true,
  classification: 'Mocked services/action adapters with byte-identical, environment-path-contained execution copy of the private schema-123 client; no database, browser or production qualification' };
fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, passedTests: report.passedTests, failedTests: report.failedTests, skipped: report.skipped, unchangedInputs: unchanged, evidenceDirectory: directory })); process.exitCode = report.passed ? 0 : 1;
