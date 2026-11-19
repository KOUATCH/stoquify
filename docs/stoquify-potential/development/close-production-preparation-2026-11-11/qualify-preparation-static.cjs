// Owned E: temporary output only; scoped CLI mocks or no-emit static checks.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const candidate = path.join(root, '.codex-tmp/close-integrity-release-20261110-cdebf2df2e/candidate');
const mode = process.argv[2]; assert(['cli', 'static'].includes(mode));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pin = file => ({ path: file, sha256: hash(file), bytes: fs.statSync(file).size });
const inputs = ['services/communication/accountant-client-invite-worker.service.ts', 'services/communication/accountant-client-invite.provider.ts', 'scripts/referral-delivery-worker.ts', 'scripts/__tests__/referral-delivery-worker.test.ts', 'scripts/server-only-node-shim.js', 'package.json', 'package-lock.json', 'prisma/schema.prisma', 'tsconfig.json', 'scripts/local-gates-network.cjs'];
const bound = (mode === 'cli' ? inputs.filter(name => !name.startsWith('services/')) : inputs).map(name => pin(path.join(root, name)));
const directory = path.join(root, '.codex-tmp/close-production-' + mode + '-20261111-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory); const temporary = path.join(directory, 'temp'); fs.mkdirSync(temporary);
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|USERPROFILE|LOCALAPPDATA|APPDATA)$/i.test(key)));
Object.assign(environment, { TEMP: temporary, TMP: temporary, NODE_ENV: 'test', NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), DATABASE_URL: 'postgresql://disabled@127.0.0.1:1/disabled', DIRECT_URL: 'postgresql://disabled@127.0.0.1:1/disabled', SHADOW_DATABASE_URL: 'postgresql://disabled@127.0.0.1:1/disabled', STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' });
const executions = [];
function run(label, args, timeout = 180000) { const log = path.join(directory, label + '.private.log'), fd = fs.openSync(log, 'wx'); const began = new Date().toISOString(); const result = spawnSync(process.execPath, args, { cwd: root, env: environment, stdio: ['ignore', fd, fd], windowsHide: true, timeout }); fs.closeSync(fd); const item = { label, began, ended: new Date().toISOString(), args, exitCode: result.status, error: result.error?.code || null, signal: result.signal, privateOutput: pin(log) }; executions.push(item); return result.status === 0 && !result.error && !result.signal; }
let passed;
if (mode === 'cli') {
  const config = { rootDir: root, roots: [path.join(root, 'scripts/__tests__')], testEnvironment: 'node', cache: false, cacheDirectory: path.join(directory, 'cache'), transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(candidate, 'node_modules/next/dist/build/swc/jest-transformer.js') }, setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false };
  const configFile = path.join(directory, 'jest.config.cjs'); fs.writeFileSync(configFile, 'module.exports=' + JSON.stringify(config) + ';\n', { flag: 'wx' });
  const results = path.join(directory, 'results.private.json'); passed = run('cli-mocked', [path.join(candidate, 'node_modules/jest/bin/jest.js'), '--config', configFile, '--runInBand', '--no-cache', '--runTestsByPath', path.join(root, 'scripts/__tests__/referral-delivery-worker.test.ts'), '--json', '--outputFile', results]);
  const raw = fs.existsSync(results) ? JSON.parse(fs.readFileSync(results, 'utf8')) : null; passed = passed && raw?.success === true && raw.numFailedTests === 0 && raw.numPendingTests === 0 && raw.numTodoTests === 0;
  executions.push({ rawResults: raw ? pin(results) : null, passedTests: raw?.numPassedTests, suites: raw?.numPassedTestSuites, skipped: raw?.numPendingTests, todo: raw?.numTodoTests });
} else {
  const configFile = path.join(directory, 'tsconfig.json');
  fs.writeFileSync(configFile, JSON.stringify({ extends: path.join(root, 'tsconfig.json'), compilerOptions: { noEmit: true, incremental: false, skipLibCheck: true, baseUrl: root, paths: { '@/*': [root.replaceAll('\\', '/') + '/*'], '@prisma/client': [path.join(candidate, 'node_modules/.prisma/client/index.d.ts')] }, types: ['node'], typeRoots: [path.join(candidate, 'node_modules/@types')] }, files: inputs.filter(name => name.endsWith('.ts') && !name.includes('__tests__')).map(name => path.join(root, name)), include: [], exclude: [] }, null, 2), { flag: 'wx' });
  passed = run('typecheck', [path.join(candidate, 'node_modules/typescript/bin/tsc'), '--project', configFile, '--noEmit', '--incremental', 'false'], 300000);
  passed = run('lint', [path.join(candidate, 'node_modules/eslint/bin/eslint.js'), ...inputs.filter(name => name.endsWith('.ts') && !name.includes('__tests__'))], 180000) && passed;
}
const unchanged = bound.every(item => hash(item.path) === item.sha256); passed = Boolean(passed && unchanged);
const receipt = { checkedAt: new Date().toISOString(), mode, passed, classification: mode === 'cli' ? 'Mocked CLI tests; injected queue services, no application/database/provider execution' : 'Scoped no-emit TypeScript and lint; no full web build or deployment qualification', directory, temporaryDirectory: temporary, dependencies: candidate, newCleanInstallClaimed: false, inputs: bound, unchangedInputs: unchanged, executions, runner: pin(__filename) };
fs.writeFileSync(path.join(__dirname, mode.toUpperCase() + '_QUALIFICATION.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ mode, passed, executions: executions.map(({ label, exitCode, passedTests }) => ({ label, exitCode, passedTests })), unchangedInputs: unchanged })); assert(passed, 'Scoped preparation qualification failed; private evidence preserved');
