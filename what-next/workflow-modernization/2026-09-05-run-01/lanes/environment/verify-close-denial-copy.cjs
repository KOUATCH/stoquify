// Refresh only the hook/banner boundary after shortening French error guidance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence');
const phase = process.argv[2]; assert.ok(['jest', 'lint', 'typecheck'].includes(phase));
const changed = ['hooks/accounting/useCloseAssurance.ts', 'hooks/__tests__/useCloseAssurance.export.test.tsx', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx'];
const tests = changed.filter(file => /\.test\.tsx?$/.test(file));
const files = [...changed, 'components/accounting/CloseAssuranceCenter.tsx', 'components/accounting/CloseReadinessJourneyPanel.tsx', 'actions/accounting/close-assurance.actions.ts', 'services/accounting/close-assurance-pack.service.ts', 'services/accounting/close-assurance.service.ts', 'services/accounting/close-assurance-current-proof.ts', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'package.json', path.relative(root, __filename).replaceAll('\\', '/')];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), stem = path.join(evidence, 'close-denial-copy-' + phase + '-' + stamp);
const commands = {
  jest: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'],
  lint: ['node_modules/eslint/bin/eslint.js', ...changed],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
};
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes() };
const result = spawnSync(process.execPath, commands[phase], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
report.exitCode = result.status; report.signal = result.signal; report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.log = path.relative(root, stem + '.log').replaceAll('\\', '/'); fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) { const j = JSON.parse(fs.readFileSync(stem + '-jest.json', 'utf8')); report.summary = { passed: j.numPassedTests, failed: j.numFailedTests, suites: j.numTotalTestSuites, pending: j.numPendingTests }; }
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary }));
if (!report.passed) process.stdout.write(((result.stdout || '') + (result.stderr || '')).slice(-15000));
process.exitCode = report.passed ? 0 : 1;
