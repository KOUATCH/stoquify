// Prepared for the coordinated source freeze. Execute only after the root's freeze signal:
// node what-next/workflow-modernization/2026-09-05-run-01/run-operational-receipt-checks.cjs --run
// No build, migration, seed, browser, or database driver is invoked here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const runner = path.relative(root, __filename).replaceAll('\\', '/');
const groups = {
  producer: [
    'services/purchase-order/__tests__/receipt-recognition-source.test.ts',
    'services/purchase-order/__tests__/receipt-recognition.service.test.ts',
    'services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts',
    'services/purchase-order/__tests__/purchase-receipt-accounting-evidence.test.ts',
    'services/purchasing/__tests__/invoice-receipt-recognition.test.ts',
    'services/inventory/__tests__/inventory-stock-event.service.test.ts',
    'services/purchase-order/__tests__/purchase-order.service.test.ts',
    'services/purchase-order/__tests__/purchase-receiving-revision.test.ts',
    'components/purchase-orders/__tests__/PurchaseReceivingHistoryCurrency.test.tsx',
  ],
  recovery: [
    'services/purchase-order/__tests__/receipt-ledger-recovery.service.test.ts',
    'services/purchase-order/__tests__/receipt-ledger-recovery-authority.test.ts',
    'actions/purchaseOrderWorkflow/__tests__/receipt-ledger-recovery.actions.test.ts',
    'actions/purchaseOrderWorkflow/__tests__/purchase-receiving.actions.test.ts',
    'components/purchase-orders/__tests__/ReceiptLedgerRecoveryDialog.test.tsx',
  ],
  returns: [
    'services/purchasing/__tests__/receipt-return-recognition.test.ts',
    'services/purchasing/__tests__/purchase-return-credit.service.test.ts',
  ],
  kernel: ['services/purchasing/__tests__/ap-control.service.test.ts'],
  invoiceConsumers: [
    'services/purchasing/__tests__/receipt-invoice-capacity.test.ts',
    'components/purchasing/__tests__/InvoicePreparationWorkbench.test.tsx',
    'components/purchasing/__tests__/InvoiceCorrectionWorkbench.test.tsx',
  ],
  accountingBridge: [
    'services/accounting/__tests__/accounting-settings.service.test.ts',
    'services/accounting/__tests__/journal-currency-regression.service.test.ts',
    'services/accounting/__tests__/close-assurance-pack.service.test.ts',
    'services/accounting/__tests__/journal-close-invalidation.service.test.ts',
  ],
};
const tests = [...new Set(Object.values(groups).flat())];
const production = [
  'services/purchase-order/receipt-recognition-source.ts',
  'services/purchase-order/receipt-recognition.service.ts',
  'services/purchase-order/purchase-order.service.ts',
  'services/purchase-order/purchase-receipt-accounting-evidence.ts',
  'services/purchase-order/purchase-receiving-workbench.service.ts',
  'services/purchase-order/purchase-receiving-contracts.ts',
  'services/purchase-order/purchase-receiving-authority.ts',
  'services/purchase-order/receipt-ledger-recovery-contracts.ts',
  'services/purchase-order/receipt-ledger-recovery-authority.ts',
  'services/purchase-order/receipt-ledger-recovery.service.ts',
  'services/inventory/inventory-stock-event.service.ts',
  'services/purchasing/ap-control.service.ts',
  'services/purchasing/invoice-receipt-recognition.ts',
  'services/purchasing/receipt-invoice-capacity.ts',
  'services/purchasing/receipt-return-recognition.ts',
  'services/purchasing/purchase-return-credit.service.ts',
  'services/purchasing/purchase-correction-ledger.service.ts',
  'services/purchasing/invoice-preparation.service.ts',
  'services/purchasing/invoice-correction.service.ts',
  'services/purchasing/invoice-approval.service.ts',
  'services/purchasing/invoice-ledger-recovery.service.ts',
  'services/accounting/accounting-settings.service.ts',
  'services/accounting/journals.service.ts',
  'services/accounting/close-assurance-pack.service.ts',
  'services/accounting/journal-close-invalidation.service.ts',
  'services/inventory/inventory-close-invalidation.service.ts',
  'actions/purchaseOrderWorkflow/purchase-receiving.actions.ts',
  'components/purchase-orders/ReceiptLedgerRecoveryDialog.tsx',
  'components/purchase-orders/PurchaseReceivingWorkbench.tsx',
  'components/purchasing/InvoicePreparationWorkbench.tsx',
  'components/purchasing/InvoiceCorrectionWorkbench.tsx',
];
const dependencies = [
  'services/purchase-order/purchase-order.schemas.ts',
  'services/purchase-order/purchase-order-approval.ts',
  'services/accounting/posting.service.ts',
  'services/accounting/posting-rules.service.ts',
  'services/accounting/default-posting-rules.ts',
  'services/accounting/periods.service.ts',
  'services/events/business-event.service.ts',
  'services/events/business-event.schemas.ts',
  'services/events/business-event-anomaly.service.ts',
  'services/_shared/action-errors.ts',
  'services/modules/module-entitlement.service.ts',
  'services/roles/role-custodian-policy.ts',
  'lib/security/rbac.ts',
  'lib/security/rbac-permissions.ts',
  'lib/security/auth-session.ts',
  'actions/security/step-up-auth.actions.ts',
  'components/ui/dialog.tsx',
  'prisma/schema.prisma',
  'messages/en.json',
  'messages/fr.json',
];
const config = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'jest.config.ts', 'jest.setup.ts', '.eslintrc.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts'];
const files = [...new Set([...production, ...tests, ...dependencies, ...config, runner])].sort();
const lintFiles = [...new Set([...production, ...tests])];
const plan = { groups, tests, production, dependencies, config, lintFiles, runner, suiteCount: tests.length };
if (process.argv.length !== 3 || process.argv[2] !== '--run') {
  process.stdout.write(JSON.stringify({ preparedOnly: true, instruction: 'After the coordinated source freeze, pass --run to execute sequential Jest, scoped ESLint and the existing full tsc --noEmit check.', ...plan }, null, 2) + '\n');
  process.exit(0);
}

const startedAt = new Date().toISOString(), runId = crypto.randomUUID();
const prefix = path.join(__dirname, 'evidence', `operational-receipt-checks-${runId}`);
const relative = file => path.relative(__dirname, file).replaceAll('\\', '/');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(path.join(root, file)));
const snapshot = () => Object.fromEntries(files.map(file => {
  try { return [file, hash(file)]; } catch (error) { return [file, { error: error.code || error.message }]; }
}));
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  return { args, status: result.status, error: result.error?.code || null, output: result.stdout || '', stderr: result.stderr || '' };
};
const result = {
  schemaVersion: 1, runId, startedAt, workflow: 'FA-CASH-COMMAND',
  scope: 'Current explicit receipt, recovery, return, inventory, invoice consumer and accounting bridge sources; focused mocked Jest suites, scoped ESLint and repository tsc. Not database, browser, deployment or financial certification.',
  node: process.version, executable: process.execPath, plan,
  inspectedScripts: Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts).filter(([name]) => ['test', 'typecheck', 'lint', 'build'].includes(name))),
  branch: git(['branch', '--show-current']), head: git(['rev-parse', 'HEAD']),
  gitBefore: git(['status', '--porcelain=v1', '--untracked-files=normal']),
  sourceBefore: snapshot(), runnerBefore: hash(runner), steps: [],
  limitations: ['Only the explicit binding list is checked for source stability. Full tsc uses the existing tsconfig inclusions/exclusions; no broader compile coverage is implied.', 'Mocked tests cannot prove actual PostgreSQL atomicity, browser accessibility, or production readiness.', 'No environment variable values, credentials or application record contents are intentionally recorded.'],
};
const jestOutput = `${prefix}-jest.json`, lintOutput = `${prefix}-lint.json`;
const commands = [
  ['jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', `--outputFile=${jestOutput}`]],
  ['lint', ['node_modules/eslint/bin/eslint.js', ...lintFiles, '--format', 'json', '--output-file', lintOutput]],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']],
];
try {
  if (Object.values(result.sourceBefore).some(value => typeof value !== 'string')) throw new Error('An explicitly bound source is missing or unreadable; no checks executed.');
  for (const [name, args] of commands) {
    const start = new Date().toISOString(), before = snapshot();
    process.stdout.write(JSON.stringify({ runId, step: name, state: 'running', at: start }) + '\n');
    const command = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 1200000, maxBuffer: 16 * 1024 * 1024 });
    const log = `${prefix}-${name}.log`;
    fs.writeFileSync(log, (command.stdout || '') + (command.stderr || ''), { flag: 'wx' });
    const after = snapshot();
    const step = { name, args, startedAt: start, endedAt: new Date().toISOString(), status: command.status, signal: command.signal, error: command.error?.code || null, timedOut: command.error?.code === 'ETIMEDOUT', log: { file: relative(log), sha256: digest(fs.readFileSync(log)) }, sourceBefore: before, sourceAfter: after, sourceStable: JSON.stringify(before) === JSON.stringify(after) };
    if (name === 'jest' && fs.existsSync(jestOutput)) {
      const data = JSON.parse(fs.readFileSync(jestOutput, 'utf8'));
      step.results = { success: data.success, suites: data.numTotalTestSuites, passedSuites: data.numPassedTestSuites, failedSuites: data.numFailedTestSuites, tests: data.numTotalTests, passed: data.numPassedTests, failed: data.numFailedTests, skipped: data.numPendingTests, todo: data.numTodoTests };
      step.receipt = { file: relative(jestOutput), sha256: digest(fs.readFileSync(jestOutput)) };
    }
    if (name === 'lint' && fs.existsSync(lintOutput)) {
      const data = JSON.parse(fs.readFileSync(lintOutput, 'utf8'));
      step.results = { files: data.length, errors: data.reduce((sum, row) => sum + row.errorCount, 0), warnings: data.reduce((sum, row) => sum + row.warningCount, 0) };
      step.receipt = { file: relative(lintOutput), sha256: digest(fs.readFileSync(lintOutput)) };
    }
    result.steps.push(step);
    save(`${prefix}-${name}-step.json`, step);
    process.stdout.write(JSON.stringify({ runId, step: name, status: step.status, error: step.error, sourceStable: step.sourceStable, results: step.results }) + '\n');
    // Continue independent checks after a test/lint failure, but do not claim a stable run after source drift.
    if (!step.sourceStable) break;
  }
} catch (error) {
  result.runnerError = { name: error.name, message: error.message, code: error.code || null };
} finally {
  result.sourceAfter = snapshot(); result.runnerAfter = hash(runner);
  result.gitAfter = git(['status', '--porcelain=v1', '--untracked-files=normal']);
  result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  result.runnerStable = result.runnerBefore === result.runnerAfter;
  result.endedAt = new Date().toISOString();
  result.passed = !result.runnerError && result.sourceStable && result.runnerStable && result.steps.length === commands.length && result.steps.every(step => step.status === 0 && !step.error && step.sourceStable) && result.steps.find(step => step.name === 'jest')?.results?.success === true;
  result.skippedSteps = commands.map(([name]) => name).filter(name => !result.steps.some(step => step.name === name));
  const receipt = `${prefix}.json`; save(receipt, result);
  process.stdout.write(JSON.stringify({ receipt: relative(receipt), sha256: digest(fs.readFileSync(receipt)), passed: result.passed, sourceStable: result.sourceStable, runnerStable: result.runnerStable }) + '\n');
  process.exitCode = result.passed ? 0 : 1;
}
