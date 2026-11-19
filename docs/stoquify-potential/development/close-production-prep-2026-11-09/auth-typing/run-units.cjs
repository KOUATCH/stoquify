// Explicit mocked auth units only; no Next configuration, env files or network.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
assert.deepEqual(process.argv.slice(2), ['run']);
const proof = read(path.join(__dirname, 'proof-c8b1c6a182/RESULT.json'));
assert(proof.passed && proof.emittedJavaScriptIdentical);
assert.equal(digest(path.join(root, 'lib/auth.ts')), proof.proposedSourceSha256);
const tests = ['auth-current-authority', 'auth-session', 'auth-deactivation', 'credential-sign-in-outcome'].map(name => 'lib/security/__tests__/' + name + '.test.ts');
const reviewed = 'plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1/unit';
const preload = path.join(root, reviewed, 'preload.cjs'), guard = path.join(root, reviewed, 'guard.cjs');
const inputFiles = ['lib/auth.ts', 'lib/security/auth-session.ts', 'lib/security/credential-sign-in-outcome.ts', 'lib/security/trusted-origins.ts', ...tests, reviewed + '/preload.cjs', reviewed + '/guard.cjs', 'package-lock.json'];
const before = Object.fromEntries(inputFiles.map(file => [file, digest(path.join(root, file))]));
const id = crypto.randomBytes(5).toString('hex'), directory = path.join(__dirname, 'unit-' + id); fs.mkdirSync(directory);
const config = { rootDir: root, roots: [path.join(root, 'lib/security')], testEnvironment: 'node', cache: false,
  moduleNameMapper: { '^@/(.*)$': root.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(root, 'scripts/server-only-node-shim.js') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  setupFiles: [], setupFilesAfterEnv: [guard], collectCoverage: false, testTimeout: 20000 };
const configPath = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
Object.assign(env, { NODE_ENV: 'test', CI: 'true', NEXT_TELEMETRY_DISABLED: '1', AUTH_SECRET: 'close-typing-mocked-unit-synthetic-secret-only' });
const args = ['--require', preload, path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', path.join(directory, 'results.json')];
const fd = fs.openSync(path.join(directory, 'checks.log'), 'wx'), started = new Date().toISOString();
const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 240000 }); fs.closeSync(fd);
const data = fs.existsSync(path.join(directory, 'results.json')) ? read(path.join(directory, 'results.json')) : null;
const unchanged = inputFiles.every(file => before[file] === digest(path.join(root, file)));
const receipt = { started, finished: new Date().toISOString(), passed: result.status === 0 && !result.error && data?.success === true && data.numPassedTests === 87 && data.numFailedTests === 0 && data.numPendingTests === 0 && unchanged,
  args, exitCode: result.status, signal: result.signal, error: result.error?.code || null, passedTests: data?.numPassedTests, failedTests: data?.numFailedTests, skipped: data?.numPendingTests, unchangedInputs: unchanged,
  sourceHashes: before, runnerSha256: digest(__filename), configSha256: digest(configPath), directory,
  classification: 'Mocked identity/session/database auth regression only; no actual authentication, database, browser, app, Next config, environment-file loading or provider evidence' };
fs.writeFileSync(path.join(directory, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
