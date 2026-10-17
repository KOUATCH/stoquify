// Explicit, serialized verification only; no migration, seed, build or database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), phase = process.argv[2];
if (!['jest', 'typecheck', 'lint'].includes(phase)) throw new Error('Select jest, typecheck or lint');
const sources = [
  ...fs.readdirSync(path.join(root, 'services/purchasing')).filter(n => n.startsWith('payment-reconciliation-') && n.endsWith('.ts')).map(n => 'services/purchasing/' + n),
  ...fs.readdirSync(path.join(root, 'services/purchasing/__tests__')).filter(n => n.startsWith('payment-reconciliation-') && n.endsWith('.test.ts')).map(n => 'services/purchasing/__tests__/' + n),
  ...fs.readdirSync(path.join(root, 'components/purchasing')).filter(n => n.startsWith('payment-reconciliation-') || n.startsWith('PaymentReconciliationHandoff')).map(n => 'components/purchasing/' + n),
  ...fs.readdirSync(path.join(root, 'components/purchasing/__tests__')).filter(n => n.startsWith('PaymentReconciliationHandoff') && n.endsWith('.test.tsx')).map(n => 'components/purchasing/__tests__/' + n),
  ...fs.readdirSync(path.join(root, 'actions/purchasing/__tests__')).filter(n => n.startsWith('payment-reconciliation') && n.endsWith('.test.ts')).map(n => 'actions/purchasing/__tests__/' + n),
  'services/accounting/close-assurance-pack.service.ts', 'services/accounting/data-trust.service.ts', 'services/accounting/close-assurance.service.ts',
  'services/reconciliation/payment-exception-closure-evidence.service.ts',
  'services/accounting/__tests__/data-trust.service.test.ts', 'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/reconciliation/__tests__/payment-exception-closure.service.test.ts',
  'actions/purchasing/payment-reconciliation.actions.ts', 'components/purchasing/PaymentExecutionWorkbench.tsx', 'components/purchasing/APHistoryWorkbench.tsx',
  'app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/payments/reconcile/page.tsx',
];
const tests = sources.filter(n => /\.test\.tsx?$/.test(n));
const bindings = [...new Set([...sources, 'package.json', 'jest.config.ts', 'jest.setup.ts', 'next.config.mjs', 'tsconfig.json',
  'services/purchasing/payment-release-evidence.ts', 'services/purchasing/ap-control.service.ts', 'services/events/business-event.service.ts',
  'services/modules/module-entitlement.service.ts', 'services/accounting/accounting-period-catalog.service.ts', 'services/accounting/close-assessment-order.service.ts',
  path.relative(root, __filename).replaceAll('\\', '/')])];
const hashes = () => Object.fromEntries(bindings.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'payment-handoff-' + phase + '-' + crypto.randomUUID());
const command = phase === 'typecheck' ? ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'] : phase === 'lint' ? ['node_modules/eslint/bin/eslint.js', ...sources] :
  ['node_modules/jest/bin/jest.js', '--roots', 'services', 'components', 'actions', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'];
const result = { startedAt: new Date().toISOString(), phase, command, sourceBefore: hashes() };
const child = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 24 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
Object.assign(result, { finishedAt: new Date().toISOString(), exitCode: child.status, signal: child.signal, sourceAfter: hashes(), error: child.error?.message });
result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) { const j = JSON.parse(fs.readFileSync(stem + '-jest.json')); result.summary = { passed: j.numPassedTests, failed: j.numFailedTests, pending: j.numPendingTests, suites: j.numTotalTestSuites, failedSuites: j.numFailedTestSuites }; }
result.passed = child.status === 0 && result.sourceStable;
result.log = path.relative(root, stem + '.log').replaceAll('\\', '/');
fs.writeFileSync(stem + '.log', (child.stdout || '') + (child.stderr || ''), { flag: 'wx' });
fs.writeFileSync(stem + '.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt: stem + '.json', passed: result.passed, exitCode: result.exitCode, sourceStable: result.sourceStable, summary: result.summary }));
if (!result.passed) console.log(((child.stdout || '') + (child.stderr || '')).slice(-14000));
process.exitCode = result.passed ? 0 : 1;
