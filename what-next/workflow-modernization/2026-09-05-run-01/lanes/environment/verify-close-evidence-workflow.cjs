const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), phase = process.argv[2];
if (!['jest', 'typecheck', 'lint'].includes(phase)) throw Error('Select jest, typecheck or lint; no database/build operation');
const files = ['services/accounting/close-evidence-workflow.service.ts', 'actions/accounting/close-evidence-workflow.actions.ts', 'components/accounting/CloseEvidenceWorkflowPanel.tsx', 'components/accounting/close-evidence-workflow-copy.ts', 'components/accounting/CloseAssuranceCenter.tsx',
  'services/accounting/__tests__/close-evidence-workflow.service.test.ts', 'actions/accounting/__tests__/close-evidence-workflow.actions.test.ts', 'components/accounting/__tests__/CloseEvidenceWorkflowPanel.test.tsx', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx'];
const bound = [...files, 'services/accounting/close-assurance.service.ts', 'services/accounting/close-evidence-replacement.service.ts', 'services/accounting/close-evidence-acceptance-authority.service.ts', 'services/accounting/missing-close-evidence-request-queue.service.ts', 'services/accounting/missing-close-evidence-accountant-review-queue.service.ts', 'services/modules/module-entitlement.service.ts', 'package.json', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sources = () => Object.fromEntries(bound.map(name => [name, sha(fs.readFileSync(path.join(root, name)))]));
const stem = path.resolve(__dirname, '../../evidence/close-evidence-workflow-' + phase + '-' + crypto.randomUUID());
const tests = files.filter(name => name.includes('.test.'));
const args = phase === 'typecheck' ? ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'] : phase === 'lint' ? ['node_modules/eslint/bin/eslint.js', ...files] : ['node_modules/jest/bin/jest.js', '--roots', 'services', 'actions', 'components', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile=' + stem + '-jest.json'];
const report = { phase, startedAt: new Date().toISOString(), command: args, sourceBefore: sources() };
const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 24 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
Object.assign(report, { finishedAt: new Date().toISOString(), exitCode: result.status, error: result.error?.message, sourceAfter: sources() });
report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.passed = result.status === 0 && report.sourceStable;
if (phase === 'jest' && fs.existsSync(stem + '-jest.json')) { const j = JSON.parse(fs.readFileSync(stem + '-jest.json')); report.summary = { passed: j.numPassedTests, failed: j.numFailedTests, suites: j.numTotalTestSuites, failedSuites: j.numFailedTestSuites }; }
fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' }); fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt: stem + '.json', passed: report.passed, sourceStable: report.sourceStable, summary: report.summary })); if (!report.passed) console.log(((result.stdout || '') + (result.stderr || '')).slice(-12000)); process.exitCode = report.passed ? 0 : 1;
