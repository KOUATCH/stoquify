// Explicit frozen-candidate mocked tests. No application/global setup or DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const id = crypto.randomBytes(5).toString('hex'), directory = path.join(target.directory, 'unit-' + id), evidence = path.join(__dirname, 'unit-' + id);
fs.mkdirSync(directory); fs.mkdirSync(evidence);
const tests = ['actions/accounting/__tests__/close-assurance-write-access.test.ts', 'actions/accounting/__tests__/close-assurance.actions.test.ts',
  'services/accounting/__tests__/close-evidence-acceptance-authority.service.test.ts', 'services/accounting/__tests__/close-assurance.service.test.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts'];
const config = { rootDir: target.candidate, roots: [path.join(target.candidate, 'actions/accounting/__tests__'), path.join(target.candidate, 'services/accounting/__tests__')], testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': target.candidate.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(target.candidate, 'scripts/server-only-node-shim.js') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(target.candidate, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  testMatch: tests.map(file => '**/' + path.basename(file)), setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 15000 };
const configFile = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configFile, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const disabled = 'postgresql://close_unit_disabled@127.0.0.1:1/stoquify_close_unit_disabled?schema=public';
const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
  NODE_OPTIONS: '--require ' + JSON.stringify(path.join(target.candidate, 'scripts/local-gates-network.cjs')), PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' };
const args = [path.join(target.candidate, 'node_modules/jest/bin/jest.js'), '--config', configFile, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', path.join(evidence, 'results.json')];
const fd = fs.openSync(path.join(evidence, 'checks.log'), 'wx'), started = new Date().toISOString();
const result = spawnSync(process.execPath, args, { cwd: target.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 180000 }); fs.closeSync(fd);
const testsResult = fs.existsSync(path.join(evidence, 'results.json')) ? JSON.parse(fs.readFileSync(path.join(evidence, 'results.json'), 'utf8')) : null;
const receipt = { started, finished: new Date().toISOString(), args, exitCode: result.status, error: result.error?.code || null,
  passed: result.status === 0 && testsResult?.success === true && testsResult.numPassedTests === 516 && testsResult.numPendingTests === 0,
  passedTests: testsResult?.numPassedTests, skipped: testsResult?.numPendingTests, evidenceDirectory: evidence, sourceManifestSha256: manifest.manifestSha256,
  suiteHashes: Object.fromEntries(tests.map(file => [file, sha(path.join(target.candidate, file))])), runnerSha256: sha(__filename), configSha256: sha(configFile), evidenceClass: 'Mocked unit / real protect-adapter boundaries on frozen candidate; no PostgreSQL/browser' };
fs.writeFileSync(path.join(evidence, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'UNIT_LATEST.json'), JSON.stringify(receipt, null, 2) + '\n');
assert(receipt.passed, 'Frozen candidate unit qualification failed; inspect retained logs');
require('./candidate-validation.cjs').verifyCandidate();
console.log(JSON.stringify({ passed: true, tests: receipt.passedTests, skipped: receipt.skipped }));
