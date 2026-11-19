// Scoped workspace tests: explicit no-setup transform, no app/.env/bootstrap.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const tests = process.argv.slice(2);
assert(tests.length && tests.every(file => /^(services|actions|components|hooks)\/.+\.test\.tsx?$/.test(file) && !file.includes('..') && !file.includes('postgres')), 'Explicit unit files only');
const id = crypto.randomBytes(5).toString('hex'), dir = path.join(__dirname, 'unit-' + id); fs.mkdirSync(dir);
const isUI = tests.some(file => file.startsWith('components/') || file.startsWith('hooks/'));
const config = { rootDir: root, roots: [...new Set(tests.map(file => path.dirname(path.join(root, file))))], testEnvironment: isUI ? 'jsdom' : 'node',
  moduleNameMapper: { ...(isUI ? { '\\.module\\.css$': path.join(root, 'node_modules/next/dist/build/jest/object-proxy.js') } : {}),
    '^@/(.*)$': root.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(root, 'scripts/server-only-node-shim.js') },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
  setupFiles: [], setupFilesAfterEnv: isUI ? [require.resolve('@testing-library/jest-dom', { paths: [root] })] : [], collectCoverage: false, testTimeout: 20000 };
const configFile = path.join(dir, 'jest.config.cjs'); fs.writeFileSync(configFile, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const disabled = 'postgresql://close_unit_disabled@127.0.0.1:1/stoquify_close_unit_disabled?schema=public';
const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
  NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' };
const sourceFiles = ['services/accounting/customer-settlement.service.ts', 'services/payments/customer-settlement-payment-authority.service.ts',
  'services/payments/pos-electronic-tender-authority.service.ts', 'services/pos/pos.service.ts', 'services/accounting/customer-settlement.schemas.ts'];
const runnerFile = path.relative(root, __filename).replaceAll('\\', '/'), configPath = path.relative(root, configFile).replaceAll('\\', '/');
const inputFiles = [...new Set([...tests, ...sourceFiles, 'scripts/local-gates-network.cjs', 'package-lock.json', runnerFile, configPath])];
const before = Object.fromEntries(inputFiles.map(file => [file, hash(path.join(root, file))]));
const args = [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configFile, '--runInBand', '--no-cache', '--runTestsByPath', ...tests, '--json', '--outputFile', path.join(dir, 'results.json')];
const fd = fs.openSync(path.join(dir, 'checks.log'), 'wx'), started = new Date().toISOString();
const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 240000 }); fs.closeSync(fd);
const data = fs.existsSync(path.join(dir, 'results.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')) : null;
const after = Object.fromEntries(inputFiles.map(file => [file, hash(path.join(root, file))]));
const unchanged = inputFiles.every(file => before[file] === after[file]);
const receipt = { started, finished: new Date().toISOString(), args, exitCode: result.status, error: result.error?.code || null,
  passed: result.status === 0 && data?.success === true && data.numPendingTests === 0 && unchanged,
  passedTests: data?.numPassedTests, failedTests: data?.numFailedTests, skipped: data?.numPendingTests, unchangedInputs: unchanged,
  evidenceDirectory: dir, suiteHashes: Object.fromEntries(tests.map(file => [file, before[file]])), sourceHashes: Object.fromEntries(sourceFiles.map(file => [file, before[file]])),
  inputHashesBefore: before, inputHashesAfter: after, runnerSha256: before[runnerFile], configSha256: before[configPath],
  evidenceClass: isUI ? 'jsdom components/mocked actions; no browser or DB' : 'Mocked unit / protect adapter boundaries; no PostgreSQL/browser' };
fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
