const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'ui', 'lint', 'typecheck'].includes(phase));
const changed = [
  'services/purchasing/ap-control.service.ts', 'services/purchasing/__tests__/ap-control.service.test.ts',
  'services/purchasing/invoice-receipt-recognition.ts', 'services/purchasing/__tests__/invoice-receipt-recognition.test.ts',
  'services/purchasing/receipt-return-recognition.ts', 'services/purchasing/__tests__/receipt-return-recognition.test.ts',
  'services/purchasing/purchase-return-credit.service.ts', 'services/purchasing/__tests__/purchase-return-credit.service.test.ts',
  'components/purchasing/InvoiceLedgerRecoveryWorkbench.tsx', 'components/purchasing/__tests__/InvoiceLedgerRecoveryWorkbench.test.tsx',
];
const cash = ['components/dashboard/DashboardRouteState.tsx', 'app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',
  'components/dashboard/__tests__/DashboardRouteState.test.tsx', 'app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx', 'app/[locale]/(dashboard)/dashboard/finance/__tests__/finance-route-access.test.tsx'];
const tests = changed.filter(file => /\.test\.tsx?$/.test(file)).concat([
  'services/purchasing/__tests__/receipt-invoice-capacity.test.ts', 'services/purchasing/__tests__/supplier-payment-balance.test.ts',
  'services/purchasing/__tests__/invoice-ledger-recovery-contracts.test.ts',
  'services/purchase-order/__tests__/receipt-ledger-recovery.service.test.ts',
  'services/purchase-order/__tests__/receipt-recognition.service.test.ts',
]);
const files = [...new Set([...changed, ...cash, ...tests, 'messages/en.json', 'messages/fr.json',
  'services/purchasing/invoice-ledger-recovery.service.ts', 'services/purchasing/supplier-credit-allocation.ts',
  'services/purchasing/invoice-preparation.service.ts', 'services/purchasing/invoice-approval.service.ts',
  'services/purchasing/invoice-source-evidence.ts', 'services/inventory/receipt-cost-allocation.ts',
  'services/accounting/periods.service.ts', 'services/accounting/posting-rules.service.ts',
  'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', 'prisma/schema.prisma'])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const run = crypto.randomUUID(), stem = path.join(evidence, 'receipt-treatment-' + phase + '-' + run);
const commands = { jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  ui: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'components/purchasing/__tests__/InvoiceLedgerRecoveryWorkbench.test.tsx', '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed, ...cash], typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'] };
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes() };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 12 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replace(/\\/g, '/'); fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (['jest', 'ui'].includes(phase) && fs.existsSync(stem + '-jest.json')) { const jest = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8')); report.jest = path.relative(root, stem + '-jest.json').replace(/\\/g, '/'); report.summary = { passed: jest.numPassedTests, failed: jest.numFailedTests, suites: jest.numTotalTestSuites, pending: jest.numPendingTests }; }
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-16000));
process.exitCode = report.passed ? 0 : 1;
