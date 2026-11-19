// Reviewed focused mocked regression only. No build/generation, application,
// database, dotenv or provider execution. All writable paths are owned E: paths.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process'), { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const originalDirectory = path.join(root, '.codex-tmp/close-invite-hardening-20261111-c4e86903e2');
const r2 = path.join(root, 'docs/stoquify-potential/development/close-integrity-release-candidate-2026-11-10-r2');
const tests = ['services/communication/__tests__/accountant-client-invite-worker.service.test.ts', 'services/communication/__tests__/accountant-client-invite.provider.test.ts'];
const product = ['services/communication/accountant-client-invite-worker.service.ts', 'services/communication/accountant-client-invite.provider.ts'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function noLinks(file) { const full = path.resolve(file); let cursor = path.parse(full).root; for (const part of full.slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Linked qualification input refused'); } }
function pin(file) { noLinks(file); const bytes = fs.readFileSync(file); return { path: file, sha256: sha(bytes), bytes: bytes.length }; }
function read(file) { noLinks(file); return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
function sdkFiles(directory) { noLinks(directory); return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => { const file = path.join(directory, entry.name); noLinks(file); return entry.isDirectory() ? sdkFiles(file) : [pin(file)]; }).sort((a,b) => a.path.localeCompare(b.path)); }
function main() {
  const mode = process.argv[2]; assert(['before','after'].includes(mode) && process.argv.length === 3);
  assert.equal(path.parse(root).root.toUpperCase(), 'E:\\');
  const osEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
  for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnvironment);
  const target = read(path.join(r2, 'CANDIDATE_TARGET.json')), install = read(path.join(r2, 'CLEAN_INSTALL_RESULT.json')), native = read(path.join(r2, 'CANDIDATE_NATIVE_READINESS.json'));
  assert.equal(target.candidate, path.join(root, '.codex-tmp/close-integrity-release-20261110-cdebf2df2e/candidate'));
  assert(install.passed && native.passed && native.generatedEnvironmentPathsOwnedAndAbsent);
  assert.equal(install.candidate, target.candidate); assert.equal(native.candidate, target.candidate);
  assert.equal(install.sourceManifestSha256, 'cfcac6d0dfa217f3ad18ff27d16e46a55aa002bcbf77c91afc7e0b7082bfd544');
  const sourceFiles = [...product, ...tests, 'services/events/business-event.service.ts', 'services/events/business-event.schemas.ts', 'services/accounting/accountant-client-invite-envelope.ts', 'services/accounting/accountant-client-invite.service.ts', 'services/_shared/action-errors.ts', 'scripts/local-gates-network.cjs', 'prisma/schema.prisma'];
  const sourcesBefore = sourceFiles.map(file => pin(path.join(root, file)));
  const defaultSdk = path.join(target.candidate, 'node_modules/.prisma/client'); assert.equal(native.defaultClient, defaultSdk);
  const sdkBefore = sdkFiles(defaultSdk), sharedBefore = sdkFiles(path.join(root, 'node_modules/.prisma/client'));
  const paths = fs.readFileSync(path.join(defaultSdk, 'index.js'), 'utf8').match(/"relativeEnvPaths"\s*:\s*(\{[^}]*\})/); assert(paths);
  for (const value of Object.values(JSON.parse(paths[1]))) if (value) { const file = path.resolve(defaultSdk, value), relative = path.relative(target.directory, file); assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative)); assert(!fs.existsSync(file)); }
  const suffix = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-invitation-unit-20261111-' + suffix), evidence = path.join(__dirname, 'invitation-mocked-' + mode + '-' + suffix);
  assert(!fs.existsSync(directory) && !fs.existsSync(evidence)); fs.mkdirSync(directory); fs.mkdirSync(evidence);
  const temporary = path.join(directory, 'temp'), cache = path.join(directory, 'cache'); fs.mkdirSync(temporary); fs.mkdirSync(cache);
  const requireCandidate = createRequire(path.join(target.candidate, 'package.json'));
  const mapper = { '^@prisma/client$': defaultSdk, '^zod$': requireCandidate.resolve('zod'), '^resend$': requireCandidate.resolve('resend'), '^@/(.*)$': root.replaceAll('\\','/') + '/$1', '^server-only$': path.join(root, 'scripts/server-only-node-shim.js') };
  const originals = product.map(file => { const original = path.join(originalDirectory, path.basename(file) + '.before'); assert.equal(pin(original).sha256, pin(path.join(target.candidate, file)).sha256); return pin(original); });
  if (mode === 'before') {
    const baseline = path.join(directory, 'baseline'); fs.mkdirSync(baseline);
    product.forEach((file,index) => { const copy = path.join(baseline, path.basename(file)); fs.copyFileSync(originals[index].path, copy, fs.constants.COPYFILE_EXCL); mapper['^\\.\\./' + path.basename(file, '.ts').replaceAll('.', '\\.') + '$'] = copy; });
  }
  const config = { rootDir: root, roots: [...new Set(tests.map(file => path.dirname(path.join(root,file))))], testEnvironment: 'node', cache: false, cacheDirectory: cache, moduleNameMapper: mapper,
    transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(target.candidate,'node_modules/next/dist/build/swc/jest-transformer.js') }, setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false, testTimeout: 15000 };
  const configFile = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configFile, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
  const resultsFile = path.join(directory, 'results.private.json'), log = path.join(directory, 'checks.private.log');
  const disabled = 'postgresql://unit_disabled@127.0.0.1:1/stoquify_invitation_unit_disabled?schema=public';
  const env = { ...osEnvironment, TMP: temporary, TEMP: temporary, NODE_ENV: 'test', CI: '1', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
    NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root,'scripts/local-gates-network.cjs')), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', NEXT_TELEMETRY_DISABLED: '1',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
  const args = [path.join(target.candidate,'node_modules/jest/bin/jest.js'), '--config', configFile, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', resultsFile];
  const fd = fs.openSync(log, 'wx'), began = new Date().toISOString();
  const execution = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore',fd,fd], timeout: 300000 }); fs.closeSync(fd);
  const raw = fs.existsSync(resultsFile) ? read(resultsFile) : null;
  const unchanged = JSON.stringify(sourceFiles.map(file => pin(path.join(root,file)))) === JSON.stringify(sourcesBefore)
    && JSON.stringify(sdkFiles(defaultSdk)) === JSON.stringify(sdkBefore)
    && JSON.stringify(sdkFiles(path.join(root,'node_modules/.prisma/client'))) === JSON.stringify(sharedBefore);
  const expectedResult = mode === 'before' ? execution.status === 1 && raw?.success === false && raw.numFailedTests > 0 : execution.status === 0 && raw?.success === true && raw.numPassedTests === 46 && raw.numPassedTestSuites === 2;
  const passed = expectedResult && !execution.error && unchanged && raw?.numPendingTests === 0 && raw?.numTodoTests === 0;
  const report = { began, ended: new Date().toISOString(), mode, passed, classification: mode === 'before' ? 'Expected mocked regression failure against exact preserved original worker/provider; no database, app or sends' : 'Focused mocked invitation worker/provider checks; changed root source, read-only qualified R2 test dependencies/SDK, no fresh install/build/database/provider qualification',
    candidateDependencies: target.candidate, sourceManifestForDependenciesOnly: install.sourceManifestSha256, directory, evidenceDirectory: evidence, exitCode: execution.status, error: execution.error?.code || null, signal: execution.signal,
    passedTests: raw?.numPassedTests ?? null, failedTests: raw?.numFailedTests ?? null, suites: raw?.numPassedTestSuites ?? null, skipped: raw?.numPendingTests ?? null, todo: raw?.numTodoTests ?? null, sourcesAndClientsUnchanged: unchanged,
    sourceInputs: sourcesBefore, preservedOriginalInputs: originals, sourceSdkFiles: sdkBefore, sharedSdkFiles: sharedBefore, config: pin(configFile), args, privateResults: raw ? pin(resultsFile) : null, privateOutput: pin(log),
    runnerSha256: pin(__filename).sha256, writablePathsOnOwnedWorkspaceVolume: true, applicationEnvironmentLoaded: false, liveMessagesSent: false, sdkGenerated: false };
  write(path.join(evidence,'RESULT.json'), report);
  if (passed) write(path.join(__dirname, mode === 'before' ? 'INVITATION_REGRESSION_BASELINE.json' : 'INVITATION_UNIT_QUALIFICATION.json'), report);
  console.log(JSON.stringify({ passed, mode, passedTests: report.passedTests, failedTests: report.failedTests, evidenceDirectory: evidence }));
  assert(passed, 'Invitation mocked qualification did not meet expected outcome; evidence preserved');
}
if (require.main === module) { try { main(); } catch { console.error('INVITATION_UNIT_QUALIFICATION_FAILED: inspect retained owned evidence; no private diagnostic values printed.'); process.exitCode = 1; } }
