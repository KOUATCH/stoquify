// Focused mocked tests against the clean candidate and its generated SDK.
// No build, migration, fixtures, application bootstrap or provider operation.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const q = require('./qualify-database.cjs');
const tests = [
  'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/accounting/__tests__/close-finding-assignee-authority.service.test.ts',
  'services/accounting/__tests__/close-evidence-acceptance-authority.service.test.ts',
  'services/accounting/__tests__/close-evidence-recipient.service.test.ts',
  'actions/accounting/__tests__/close-assurance.actions.test.ts',
];
function sdkFiles(directory) {
  q.noLinks(directory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name); q.noLinks(file);
    return entry.isDirectory() ? sdkFiles(file) : [q.pin(file)];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
function main() {
  assert.deepEqual(process.argv.slice(2), ['run']);
  const osEnv = q.osEnvironment(); for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
  const input = q.candidateInputs(), source = input.target.candidate, output = path.join(__dirname, 'UNIT_QUALIFICATION.json');
  assert(!fs.existsSync(output), 'Preserve previous unit qualification');
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(input.target.directory, 'unit-' + id);
  fs.mkdirSync(directory);
  const config = { rootDir: source, roots: [...new Set(tests.map(file => path.dirname(path.join(source, file))))], testEnvironment: 'node', cache: false,
    moduleNameMapper: { '^@prisma/client$': input.native.defaultClient, '^@/(.*)$': source.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(source, 'scripts/server-only-node-shim.js') },
    transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(source, 'node_modules/next/dist/build/swc/jest-transformer.js') },
    setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 20000 };
  const configFile = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configFile, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
  const sdkBefore = sdkFiles(input.native.defaultClient), sources = tests.map(file => ({ path: file, sha256: q.digest(path.join(source, file)) }));
  const resultsFile = path.join(directory, 'results.private.json'), log = path.join(directory, 'checks.private.log');
  const args = [path.join(source, 'node_modules/jest/bin/jest.js'), '--config', configFile, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', resultsFile];
  const disabled = 'postgresql://unit_disabled@127.0.0.1:1/stoquify_rc_unit_disabled?schema=public';
  const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
    NODE_OPTIONS: '--require ' + JSON.stringify(path.join(source, 'scripts/local-gates-network.cjs')), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
  const fd = fs.openSync(log, 'wx'), began = new Date().toISOString();
  const execution = spawnSync(process.execPath, args, { cwd: source, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 300000 }); fs.closeSync(fd);
  const raw = fs.existsSync(resultsFile) ? q.read(resultsFile) : null;
  let unchanged = false;
  try {
    q.candidateInputs(); assert.deepEqual(sdkFiles(input.native.defaultClient), sdkBefore);
    const sharedNow = sdkFiles(path.join(q.root, 'node_modules/.prisma/client')).map(({ path, sha256 }) => ({ path, sha256 }));
    assert.deepEqual(sharedNow, input.native.sharedBefore, 'Shared root SDK membership or bytes changed');
    unchanged = true;
  } catch (error) { fs.writeFileSync(path.join(directory, 'binding-failure.private.txt'), String(error.stack || error), { flag: 'wx' }); }
  const report = { began, ended: new Date().toISOString(), passed: execution.status === 0 && !execution.error && raw?.success === true && raw.numPassedTests === 472 && raw.numPassedTestSuites === 5 && raw.numFailedTests === 0 && raw.numPendingTests === 0 && raw.numTodoTests === 0 && unchanged,
    candidate: source, sourceManifestSha256: input.manifest.manifestSha256, directory, exitCode: execution.status, error: execution.error?.code || null, signal: execution.signal,
    passedTests: raw?.numPassedTests, failedTests: raw?.numFailedTests, skipped: raw?.numPendingTests, todo: raw?.numTodoTests, suites: raw?.numPassedTestSuites,
    sourceAndSdkUnchanged: unchanged, sharedRootSdkUnchanged: unchanged, sdk: input.native.defaultClient, sdkFiles: sdkBefore, sourceInputs: sources,
    nativeReadiness: q.pin(path.join(__dirname, 'CANDIDATE_NATIVE_READINESS.json')), config: q.pin(configFile), args,
    privateResultsPin: raw ? q.pin(resultsFile) : null, privateOutput: q.pin(log), runnerSha256: q.digest(__filename),
    classification: '472 mocked service/action checks against the frozen clean candidate/default SDK; no real database, browser or deployment evidence' };
  q.write(path.join(directory, 'RESULT.json'), report); q.write(output, report);
  console.log(JSON.stringify({ passed: report.passed, passedTests: report.passedTests, suites: report.suites, unchangedInputs: unchanged }));
  assert(report.passed, 'Candidate mocked tests failed; private evidence preserved');
}
if (require.main === module) { try { main(); } catch (error) { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISABLED_DATABASE]')); process.exitCode = 1; } }
