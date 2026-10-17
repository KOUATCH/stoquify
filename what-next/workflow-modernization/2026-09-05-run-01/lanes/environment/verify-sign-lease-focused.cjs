// Serialized focused checks; no migration, seed, build, or database execution.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), phase = process.argv[2];
assert.ok(['jest', 'typecheck', 'lint'].includes(phase));
const changed = [
  'services/events/business-event-outbox.service.ts',
  'services/events/__tests__/business-event-outbox.service.test.ts',
  'services/reconciliation/reconciliation-sign-notification.worker.ts',
  'services/reconciliation/__tests__/reconciliation-sign-notification.worker.test.ts',
  'scripts/__tests__/reconciliation-sign-notification-worker.test.ts',
];
const tests = [...changed.filter(file => file.includes('.test.')),
  'services/accounting/__tests__/finance-statement-export.service.test.ts',
  'services/accounting/__tests__/finance-statement-export-operations.service.test.ts'];
const files = [...new Set([...changed, ...tests,
  'services/accounting/finance-statement-export.service.ts', 'services/accounting/finance-statement-export-operations.service.ts',
  'services/reconciliation/payment-reconciliation-notifications.ts', 'scripts/reconciliation-sign-notification-worker.ts',
  'services/_shared/action-errors.ts', 'services/events/business-event.service.ts',
  'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', 'next.config.mjs',
  path.relative(root, __filename).replaceAll('\\', '/')])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'sign-lease-' + phase + '-' + crypto.randomUUID());
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--roots', 'services', 'scripts', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes(), scope: 'Exact outbox claim ownership, signed inbox consumer, and existing finance-export consumer regression. Export artifact replay recovery remains separately unresolved.' };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
report.exitCode = result.status; report.signal = result.signal; if (result.error) report.error = result.error.message;
report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replaceAll('\\', '/');
fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) {
  const j = JSON.parse(fs.readFileSync(stem + '-jest.json'));
  report.jest = path.relative(root, stem + '-jest.json').replaceAll('\\', '/');
  report.summary = { passed: j.numPassedTests, failed: j.numFailedTests, pending: j.numPendingTests, suites: j.numTotalTestSuites, failedSuites: j.numFailedTestSuites };
}
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) console.log(((result.stdout || '') + (result.stderr || '')).slice(-10000));
process.exitCode = report.passed ? 0 : 1;
