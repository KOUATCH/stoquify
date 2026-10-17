// Serialized focused checks; no migration, seed, build, or database execution.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), phase = process.argv[2];
assert.ok(['jest', 'typecheck', 'lint'].includes(phase));
const changed = ["services/reconciliation/payment-suspense-workflow.service.ts","services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts"];
const tests = ["services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts","services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts","services/reconciliation/__tests__/payment-suspense-evidence.test.ts","services/reconciliation/__tests__/payment-suspense-resolution.service.test.ts","services/reconciliation/__tests__/payment-suspense-reversal-order.service.test.ts","services/reconciliation/__tests__/reconciliation-close-order.service.test.ts","services/accounting/__tests__/journal-reversal-order.service.test.ts","services/accounting/__tests__/close-assessment-order.service.test.ts","services/accounting/__tests__/close-assurance-pack.service.test.ts"];
const files = [...new Set([...changed, ...tests,
  'services/accounting/journal-reversal-order.service.ts', 'services/accounting/accounting-period-catalog.service.ts', 'services/accounting/close-assessment-order.service.ts', 'services/accounting/close-assurance-pack.service.ts',
  'services/reconciliation/payment-reconciliation-notifications.ts', 'scripts/reconciliation-sign-notification-worker.ts',
  'services/_shared/action-errors.ts', 'services/events/business-event.service.ts',
  'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', 'next.config.mjs',
  path.relative(root, __filename).replaceAll('\\', '/')])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'suspense-posting-close-' + phase + '-' + crypto.randomUUID());
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--roots', 'services', 'scripts', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes(), scope: 'Suspense posting, assessment ordering, full Close scope, authentication waits and retained replay.' };
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






