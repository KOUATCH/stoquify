"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'lint', 'typecheck'].includes(phase));
const run = crypto.randomUUID(), stem = path.join(evidence, 'fractional-' + phase + '-' + run);
const baselineFiles = fs.readdirSync(evidence).filter(name => /^fractional-(root|inventory|purchasing|balance)-before-.*\.json$/.test(name));
const product = [...new Set(baselineFiles.flatMap(name => {
  const record = JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
  return (Array.isArray(record) ? record : record.files || []).map(row => row.file || row.path);
}).concat(['services/inventory/receipt-cost-allocation.ts', 'services/inventory/__tests__/receipt-cost-allocation.test.ts', 'services/purchasing/supplier-credit-allocation.ts', 'services/purchasing/supplier-payment-balance.ts', 'services/purchasing/__tests__/supplier-payment-balance.test.ts', 'services/accounting/periods.service.ts', 'services/accounting/__tests__/periods.service.test.ts']))];
assert.ok(product.includes('services/purchasing/ap-control.service.ts'));
const tests = [...new Set(product.filter(file => /\.test\.tsx?$/.test(file)).concat([
  'services/purchase-order/__tests__/receipt-recognition.service.test.ts',
  'services/purchase-order/__tests__/receipt-recognition-source.test.ts',
  'services/purchase-order/__tests__/purchase-receipt-accounting-evidence.test.ts',
  'services/purchase-order/__tests__/receipt-ledger-recovery-authority.test.ts',
  'services/purchasing/__tests__/receipt-invoice-capacity.test.ts',
  'actions/purchaseOrderWorkflow/__tests__/receipt-ledger-recovery.actions.test.ts',
]))];
const files = [...new Set([...product, ...tests, 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', 'prisma/schema.prisma', 'prisma/migrations/20260930231500_supplier_credit_zero_value_evidence/migration.sql'])];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...product.filter(file => /\.[jt]sx?$/.test(file))],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceHashesBefore: sources(), baselineFiles };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 12 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceHashes = sources();
report.sourceStable = JSON.stringify(report.sourceHashesBefore) === JSON.stringify(report.sourceHashes);
report.log = path.relative(root, stem + '.log').replace(/\\/g, '/');
fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) {
  const jest = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8'));
  report.jest = path.relative(root, stem + '-jest.json').replace(/\\/g, '/');
  report.summary = { passed: jest.numPassedTests, failed: jest.numFailedTests, suites: jest.numTotalTestSuites, pending: jest.numPendingTests };
}
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary, log: report.log }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-18000));
process.exitCode = report.passed ? 0 : 1;
