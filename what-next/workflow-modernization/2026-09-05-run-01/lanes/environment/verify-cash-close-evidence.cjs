// Focused verification only: no migrations, seeds, database reset or application startup.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'lint', 'typecheck'].includes(phase));
const changed = [
  'services/snapshots/close-readiness-snapshot.service.ts', 'services/snapshots/__tests__/close-readiness-snapshot.service.test.ts',
  'services/cash-command/cash-command.service.ts', 'services/cash-command/__tests__/cash-command.service.test.ts',
  'services/cash-command/cash-command-presentation.ts', 'lib/dashboard/snapshot-blocker-presentation.ts',
  'lib/dashboard/__tests__/snapshot-blocker-presentation.test.ts',
  'lib/dashboard/snapshot-source-blocker-presentation.ts',
  'services/evidence/proof-trail.service.ts', 'services/evidence/__tests__/close-proof-invalidation.service.test.ts',
  'services/evidence/__tests__/proof-trail.service.test.ts',
  'components/cash-command/CashCommandDashboard.tsx', 'components/cash-command/__tests__/CashCommandDashboard.test.tsx',
];
const tests = changed.filter(file => /\.test\.tsx?$/.test(file)).concat([
  'services/cash-command/__tests__/cash-command-sources.service.test.ts',
  'services/evidence/__tests__/evidence-grade.service.test.ts',
  'services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts',
  'services/snapshots/__tests__/snapshot-rebuild.service.test.ts',
  'services/signals/__tests__/business-signal-rules.service.test.ts',
]);
const files = [...new Set([...changed, ...tests, 'services/cash-command/cash-command-sources.service.ts',
  'services/cash-command/cash-command-visibility.service.ts', 'services/snapshots/snapshot-contracts.ts',
  'services/snapshots/snapshot-utils.ts', 'services/evidence/evidence-grade.service.ts',
  'services/evidence/proof-trail.service.ts', 'services/accounting/close-assurance-pack.service.ts',
  'lib/dashboard/snapshot-source-blocker-presentation.ts', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', 'prisma/schema.prisma'])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const run = crypto.randomUUID(), stem = path.join(evidence, 'cash-close-' + phase + '-' + run);
const commands = { jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed], typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'] };
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes() };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 12 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replace(/\\/g, '/'); fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) { const jest = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8')); report.jest = path.relative(root, stem + '-jest.json').replace(/\\/g, '/'); report.summary = { passed: jest.numPassedTests, failed: jest.numFailedTests, suites: jest.numTotalTestSuites, pending: jest.numPendingTests }; }
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-16000));
process.exitCode = report.passed ? 0 : 1;
