const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = process.cwd();
const files = [
  'services/purchase-order/receipt-recognition-source.ts',
  'services/purchase-order/receipt-recognition.service.ts',
  'services/purchase-order/purchase-order.service.ts',
  'services/inventory/inventory-stock-event.service.ts',
  'services/purchase-order/purchase-receipt-accounting-evidence.ts',
  'services/purchase-order/purchase-receiving-workbench.service.ts',
  'services/purchasing/invoice-receipt-recognition.ts',
  'services/purchase-order/__tests__/receipt-recognition-source.test.ts',
  'services/purchase-order/__tests__/receipt-recognition.service.test.ts',
  'services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts',
  'services/purchase-order/__tests__/purchase-receipt-accounting-evidence.test.ts',
  'services/purchasing/__tests__/invoice-receipt-recognition.test.ts',
  'services/inventory/__tests__/inventory-stock-event.service.test.ts',
  'services/purchase-order/__tests__/purchase-order.service.test.ts',
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const tests = files.filter(file => file.endsWith('.test.ts'));
const before = Object.fromEntries(files.map(file => [file, hash(file)]));
const runId = crypto.randomUUID();
const target = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence', `receipt-recognition-unit-${runId}`);
const startedAt = new Date().toISOString();
const args = ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests];
const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 5 * 1024 * 1024 });
const endedAt = new Date().toISOString();
const after = Object.fromEntries(files.map(file => [file, hash(file)]));
const receipt = { runId, scope: 'Focused receipt producer unit verification only; no database or production certification', startedAt, endedAt, command: [process.execPath, ...args], status: result.status, signal: result.signal, error: result.error?.message ?? null, before, after, sourceStable: JSON.stringify(before) === JSON.stringify(after), driverSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') };
fs.writeFileSync(`${target}.log`, (result.stdout ?? '') + (result.stderr ?? ''), { flag: 'wx' });
fs.writeFileSync(`${target}.json`, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ receipt: `${target}.json`, log: `${target}.log`, status: receipt.status, sourceStable: receipt.sourceStable }) + '\n');
process.stdout.write((result.stdout ?? '') + (result.stderr ?? ''));
process.exitCode = result.status === 0 && receipt.sourceStable ? 0 : 1;
