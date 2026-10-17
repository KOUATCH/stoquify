// Focused current-assessment/count regression; no migrations, seeds or database writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'inventory', 'ui', 'lint', 'typecheck', 'boundary', 'ledger'].includes(phase));
const changed = [
  'services/snapshots/close-readiness-snapshot.service.ts', 'services/snapshots/__tests__/close-readiness-snapshot.service.test.ts',
  'services/snapshots/snapshot-contracts.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts', 'lib/dashboard/__tests__/snapshot-blocker-presentation.test.ts',
  'services/accounting/close-assurance.service.ts', 'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/cash-command/cash-command.service.ts', 'services/cash-command/__tests__/cash-command.service.test.ts',
  'services/inventory/inventory-count.service.ts', 'services/inventory/__tests__/inventory-count.service.test.ts',
  'services/inventory/inventory-close-invalidation.service.ts', 'services/accounting/close-assurance-pack.service.ts',
  'components/accounting/CloseAssuranceCenter.tsx', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx',
];
const tests = changed.filter(file => /\.test\.tsx?$/.test(file)).concat([
  'services/accounting/__tests__/close-assurance-current-proof.test.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'services/evidence/__tests__/close-proof-invalidation.service.test.ts', 'services/accounting/__tests__/journal-close-invalidation.service.test.ts',
  'components/accounting/__tests__/CloseAssuranceCenter.test.tsx', 'hooks/__tests__/useCloseAssurance.export.test.tsx',
]);
const files = [...new Set([...changed, ...tests,
  'services/accounting/close-assurance-current-proof.ts', 'services/accounting/close-assurance-pack.service.ts',
  'services/inventory/inventory-close-invalidation.service.ts', 'services/inventory/inventory-reconciliation.service.ts',
  'services/evidence/evidence-grade.service.ts', 'services/evidence/proof-trail.service.ts',
  'services/accounting/journal-close-invalidation.service.ts', 'services/cash-command/cash-command-presentation.ts',
  'hooks/accounting/useCloseAssurance.ts', 'components/accounting/CloseAssuranceCenter.tsx',
  'scripts/service-boundary-gate.js', 'scripts/ledger-close-truth-gate.js', 'package.json', 'prisma/schema.prisma', 'tsconfig.json', 'jest.config.ts', 'jest.setup.ts',
  path.relative(root, __filename).replace(/\\/g, '/'),
])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'close-current-recovery-' + phase + '-' + crypto.randomUUID());
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  inventory: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'services/inventory/__tests__/inventory-count.service.test.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts', '--json', '--outputFile=' + stem + '-jest.json'],
  ui: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx', 'hooks/__tests__/useCloseAssurance.export.test.tsx', '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
  boundary: ['scripts/service-boundary-gate.js', '--mode', 'fail', '--out', stem + '-gate.md', '--json-out', stem + '-gate.json'],
  ledger: ['scripts/ledger-close-truth-gate.js', '--mode', 'fail', '--out', stem + '-gate.md', '--json-out', stem + '-gate.json'],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], lintScope: changed, testScope: tests, sourceBefore: hashes() };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replace(/\\/g, '/'); fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (['jest', 'inventory', 'ui'].includes(phase) && fs.existsSync(stem + '-jest.json')) { const jest = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8')); report.jest = path.relative(root, stem + '-jest.json').replace(/\\/g, '/'); report.summary = { passed: jest.numPassedTests, failed: jest.numFailedTests, suites: jest.numTotalTestSuites, pending: jest.numPendingTests }; }
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-18000));
process.exitCode = report.passed ? 0 : 1;
