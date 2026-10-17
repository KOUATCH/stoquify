// Focused, serialized verification. No migrations, seeds or application build hooks.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), phase = process.argv[2];
assert.ok(['jest', 'typecheck', 'lint'].includes(phase));
const changed = [
  'app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx',
  'app/[locale]/(dashboard)/dashboard/accounting/journals/__tests__/page.test.tsx',
  'components/accounting/JournalEntryActions.tsx',
  'components/accounting/journal-workflow-copy.ts',
  'components/accounting/__tests__/JournalEntryActions.test.tsx',
];
const tests = [...changed.filter(file => file.includes('.test.')), 'actions/accounting/__tests__/journals-posting.actions.test.ts', 'actions/accounting/__tests__/journals-reversal.actions.test.ts'];
const prior = JSON.parse(fs.readFileSync(path.join(evidence, 'manual-reversal-authority-jest-d0606c87-0e8a-45af-81d8-eb6fd05a9925.json')));
const files = [...new Set([...changed, ...tests, ...Object.keys(prior.sourceAfter),
  'actions/security/step-up-auth.actions.ts', 'services/security/step-up-auth.service.ts',
  'components/ui/dialog.tsx', 'components/ui/input.tsx', 'components/ui/button.tsx', 'components/ui/textarea.tsx',
  'components/DataTableComponents/RenderedDataTable.tsx', 'components/ui/table.tsx',
  'app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access.tsx',
  'app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui.tsx',
  'app/globals.css', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json',
  path.relative(root, __filename).replaceAll('\\', '/')])];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stem = path.join(evidence, 'manual-journal-recovery-' + phase + '-' + crypto.randomUUID());
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--roots', 'app', 'components', 'actions', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes(), scope: 'Journal queue data truth, permission/source command visibility and preserved review/authentication recovery. Existing Cash/Close lifecycle limitations remain.' };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
report.exitCode = result.status; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
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
