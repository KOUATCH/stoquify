// Bounded existing release controls on the frozen candidate. Fixtures/mocks only.
// No Next configuration, dotenv, application setup, database setup or migration.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { root, priorEvidence, digest, read, osEnvironment, assertNoLinks, verifyCandidate } = require('./candidate-validation.cjs');
const suites = [
  { path: 'tests/s10-s11/release-artifact.test.js', expectedPassed: 17, prior: 'artifact-control-unit.results.json' },
  { path: 'tests/s10-s11/release-artifact-private-uploads.test.js', expectedPassed: 67, prior: 'artifact-private-assets-unit-qualified.results.json' },
];
const inspectedInputs = [...suites.map(item => item.path), 'scripts/release-artifact.cjs', 'scripts/promote-release-schema.cjs',
  'scripts/prisma-production-migration-gate.js', 'scripts/prisma-migration-catalog-gate.js', 'scripts/prisma-migration-history-health-check.js',
  'scripts/release-secret-preflight.js', 'scripts/candidate-snapshot.cjs', 'scripts/local-gates-network.cjs', 'package.json', 'package-lock.json'];
function write(directory, name, value) { fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
function main() {
  assert.equal(process.argv.length, 2, 'No target/environment overrides accepted');
  const { target, manifest } = verifyCandidate(), dependencyReceipt = path.join(__dirname, 'CANDIDATE_DEPENDENCIES.json'), dependencies = read(dependencyReceipt);
  assert(dependencies.passed && dependencies.independentRegularFileCopy && dependencies.sourceAndDestinationChecksumsEqual);
  assert.equal(dependencies.candidate, target.candidate); assert.equal(dependencies.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(dependencies.cleanInstallPerformed, false); assert.equal(dependencies.fileManifest.path, 'DEPENDENCY_COPY_MANIFEST.json');
  assert.equal(digest(path.join(__dirname, dependencies.fileManifest.path)), dependencies.fileManifest.sha256);
  const captured = new Map(manifest.files.map(file => [file.path, file.sha256]));
  const files = inspectedInputs.map(relative => {
    const candidateFile = path.join(target.candidate, relative); assertNoLinks(candidateFile);
    assert.equal(digest(candidateFile), captured.get(relative), 'Control source differs from frozen candidate');
    assert.equal(digest(path.join(root, relative)), captured.get(relative), 'Reviewed control source changed in workspace');
    return { path: relative, sha256: captured.get(relative) };
  });
  const priorResults = suites.map(suite => {
    const absolute = path.join(priorEvidence, suite.prior), result = read(absolute);
    assert.equal(result.numPassedTests, suite.expectedPassed); assert.equal(result.numFailedTests, 0); assert.equal(result.numPendingTests, 0);
    return { path: absolute, sha256: digest(absolute), suite: suite.path, expectedPassed: suite.expectedPassed };
  });
  const nonce = crypto.randomBytes(5).toString('hex'), directory = path.join(__dirname, 'control-unit-' + nonce), privateDirectory = path.join(target.directory, 'control-unit-private-' + nonce);
  assertNoLinks(directory, true); assertNoLinks(privateDirectory, true); assert(!fs.existsSync(directory) && !fs.existsSync(privateDirectory));
  fs.mkdirSync(directory); fs.mkdirSync(privateDirectory);
  const config = { rootDir: target.candidate, roots: [path.join(target.candidate, 'tests/s10-s11')], testEnvironment: 'node',
    transform: {}, setupFiles: [], setupFilesAfterEnv: [], testMatch: suites.map(suite => '<rootDir>/' + suite.path),
    collectCoverage: false, cacheDirectory: path.join(privateDirectory, 'jest-cache') };
  const disabledUrl = 'postgresql://synthetic@127.0.0.1:1/stoquify_control_unit_disabled?schema=public';
  const env = { ...osEnvironment(), TEMP: privateDirectory, TMP: privateDirectory, NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: disabledUrl, DIRECT_URL: disabledUrl, SHADOW_DATABASE_URL: disabledUrl, TEST_DATABASE_URL: disabledUrl,
    NEXTAUTH_URL: 'http://127.0.0.1:1', NEXT_PUBLIC_BASE_URL: 'http://127.0.0.1:1',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0',
    NODE_OPTIONS: '--max-old-space-size=2048 --require ' + JSON.stringify(path.join(target.candidate, 'scripts/local-gates-network.cjs')) };
  const resultFile = path.join(directory, 'results.json'), args = [path.join(target.candidate, 'node_modules/jest/bin/jest.js'),
    '--config', JSON.stringify(config), '--runInBand', '--no-cache', '--runTestsByPath', ...suites.map(suite => suite.path), '--json', '--outputFile', resultFile];
  write(directory, 'SOURCE_AND_COMMAND.json', { utc: new Date().toISOString(), candidate: target.candidate, sourceManifestSha256: manifest.manifestSha256,
    runnerSha256: digest(__filename), files, priorResults, dependencyReceiptSha256: digest(dependencyReceipt), command: { executable: process.execPath, args, cwd: target.candidate },
    environmentVariableNames: Object.keys(env).sort(), databaseTargets: 'Explicit disabled loopback port1 synthetic URLs; no application credentials inherited',
    networkPolicy: 'Existing reviewed preload refuses non-loopback socket/DNS connections; selected tests inject all PostgreSQL clients and builds',
    configuration: config, evidenceClass: 'Filesystem fixtures and injected build/migration/locking collaborators; no real build/database/browser certification' });
  const fd = fs.openSync(path.join(directory, 'execution.log'), 'wx'), began = Date.now();
  const execution = spawnSync(process.execPath, args, { cwd: target.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 300000 }); fs.closeSync(fd);
  write(directory, 'execution.json', { utc: new Date().toISOString(), exitCode: execution.status, signal: execution.signal, error: execution.error?.code || null, elapsedMs: Date.now() - began });
  const result = fs.existsSync(resultFile) ? read(resultFile) : null;
  const current = verifyCandidate(); assert.equal(current.manifest.manifestSha256, manifest.manifestSha256);
  const summaries = suites.map(suite => {
    const item = result?.testResults?.find(entry => path.resolve(entry.name) === path.join(target.candidate, suite.path));
    return { path: suite.path, expectedPassed: suite.expectedPassed, status: item?.status || 'not-reported',
      passed: item?.assertionResults?.filter(entry => entry.status === 'passed').length || 0,
      failed: item?.assertionResults?.filter(entry => entry.status === 'failed').length || 0 };
  });
  const passed = execution.status === 0 && result?.success === true && result.numPassedTests === 84 && result.numFailedTests === 0 && result.numPendingTests === 0 &&
    result.numPassedTestSuites === 2 && result.testResults.length === 2 && summaries.every(item => item.status === 'passed' && item.passed === item.expectedPassed && item.failed === 0);
  write(directory, 'VERIFICATION.json', { utc: new Date().toISOString(), passed, sourceManifestSha256: manifest.manifestSha256,
    runnerSha256: digest(__filename), candidate: target.candidate, frozenSourceUnchanged: true, suites: summaries,
    counts: { passed: result?.numPassedTests ?? 0, failed: result?.numFailedTests ?? 0, pending: result?.numPendingTests ?? 0 },
    results: fs.existsSync(resultFile) ? { path: 'results.json', sha256: digest(resultFile) } : null,
    commandReceiptSha256: digest(path.join(directory, 'SOURCE_AND_COMMAND.json')), executionReceiptSha256: digest(path.join(directory, 'execution.json')),
    evidenceClass: 'Mocked promotion/locking and injected compilation with real owned filesystem/junction/tamper fixtures; one intentional broken-JavaScript node--check child',
    noApplicationBuildDatabaseMigrationOrBrowser: true, dependenciesReusedFromPriorInstallation: true });
  assert(passed, 'Release control tests failed or expected84/0/0 counts differ; immutable attempt evidence retained');
  write(__dirname, 'CONTROL_UNIT_SELECTED.json', { utc: new Date().toISOString(), directory, verification: { path: path.relative(__dirname, path.join(directory, 'VERIFICATION.json')).replaceAll('\\', '/'), sha256: digest(path.join(directory, 'VERIFICATION.json')) }, passed: true, sourceManifestSha256: manifest.manifestSha256 });
  console.log(JSON.stringify({ passed: true, tests: 84, suites: 2, directory, evidenceClass: 'Filesystem/mocked release controls only' }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
