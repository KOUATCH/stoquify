// Reviewed direct Jest invocation: OS-only child environment, disabled DB URLs,
// loopback-only networking and explicit inspected tests. No app setup/generation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const tests = [
  'actions/accounting/__tests__/close-assurance-write-access.test.ts',
  'actions/accounting/__tests__/close-assurance.actions.test.ts',
  'services/accounting/__tests__/close-evidence-acceptance-authority.service.test.ts',
  'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/accounting/__tests__/close-assurance-pack.service.test.ts',
];
const owned = [...tests, 'actions/accounting/close-assurance.actions.ts', 'services/accounting/close-evidence-acceptance-authority.service.ts',
  'services/accounting/close-assurance.service.ts', 'services/accounting/close-assurance-pack.service.ts'];
const id = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(__dirname, 'unit-' + id);
fs.mkdirSync(output);
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const disabled = 'postgresql://close_unit_disabled@127.0.0.1:1/stoquify_close_unit_disabled?schema=public';
const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
  NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' };
const args = [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', path.join(__dirname, 'jest.focused.config.cjs'), '--runInBand', '--no-cache', '--runTestsByPath', ...tests,
  '--json', '--outputFile', path.join(output, 'results.json')];
const sourceHashes = Object.fromEntries(owned.map(file => [file, sha(path.join(root, file))]));
const started = new Date().toISOString(), fd = fs.openSync(path.join(output, 'checks.log'), 'wx');
const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 180000 });
fs.closeSync(fd);
const record = { started, finished: new Date().toISOString(), command: [process.execPath, ...args], exitCode: result.status, error: result.error?.code || null,
  runnerSha256: sha(__filename), configSha256: sha(path.join(__dirname, 'jest.focused.config.cjs')), sourceHashes,
  networkPreloadSha256: sha(path.join(root, 'scripts/local-gates-network.cjs')), evidenceClass: 'Mocked unit and real protect-adapter boundary tests; no PostgreSQL or browser', noPrismaGeneration: true };
fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), exitCode: result.status, error: record.error }));
process.exitCode = result.status ?? 1;
