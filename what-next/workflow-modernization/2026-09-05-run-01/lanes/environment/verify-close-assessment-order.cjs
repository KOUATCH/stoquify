// Scoped verification only; no migration, seed, external service or database writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'lint', 'typecheck', 'boundary', 'ledger'].includes(phase));
const changed = [
  'services/accounting/close-assessment-order.service.ts', 'services/accounting/__tests__/close-assessment-order.service.test.ts',
  'services/accounting/close-assurance.service.ts', 'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/accounting/close-assurance-current-proof.ts',
  'services/accounting/close-assurance-pack.service.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'services/evidence/proof-trail.service.ts', 'services/evidence/__tests__/proof-trail.service.test.ts',
  'services/evidence/__tests__/close-proof-invalidation.service.test.ts',
  'components/evidence/proof-trail-presentation.ts',
  'lib/dashboard/snapshot-source-blocker-presentation.ts', 'lib/dashboard/__tests__/snapshot-source-blocker-presentation.test.ts',
  'components/accounting/CloseAssuranceCenter.tsx', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx',
  'hooks/accounting/useCloseAssurance.ts', 'hooks/__tests__/useCloseAssurance.export.test.tsx',
];
const tests = changed.filter(file => /\.test\.tsx?$/.test(file)).concat([
  'services/accounting/__tests__/close-assurance-current-proof.test.ts',
  'actions/accounting/__tests__/close-assurance.actions.test.ts',
  'actions/accounting/__tests__/close-assurance-read-access.test.ts',
]);
const files = [...new Set([...changed, ...tests,
  'actions/accounting/close-assurance.actions.ts', 'actions/evidence/proof-trail.actions.ts',
  'services/evidence/evidence-grade.service.ts', 'services/_shared/action-errors.ts',
  'services/inventory/inventory-close-invalidation.service.ts', 'services/accounting/journal-close-invalidation.service.ts',
  'scripts/service-boundary-gate.js', 'scripts/ledger-close-truth-gate.js', 'package.json', 'prisma/schema.prisma', 'tsconfig.json', 'jest.config.ts', 'jest.setup.ts',
  path.relative(root, __filename).replace(/\\/g, '/'),
])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'close-assessment-order-' + phase + '-' + crypto.randomUUID());
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
  boundary: ['scripts/service-boundary-gate.js', '--mode', 'fail', '--out', stem + '-gate.md', '--json-out', stem + '-gate.json'],
  ledger: ['scripts/ledger-close-truth-gate.js', '--mode', 'fail', '--out', stem + '-gate.md', '--json-out', stem + '-gate.json'],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], lintScope: changed, testScope: tests, sourceBefore: hashes() };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replace(/\\/g, '/'); fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) { const jest = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8')); report.jest = path.relative(root, stem + '-jest.json').replace(/\\/g, '/'); report.summary = { passed: jest.numPassedTests, failed: jest.numFailedTests, suites: jest.numTotalTestSuites, pending: jest.numPendingTests }; }
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-14000));
process.exitCode = report.passed ? 0 : 1;
