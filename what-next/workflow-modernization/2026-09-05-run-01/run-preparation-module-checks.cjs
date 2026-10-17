const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/__tests__/ReconciliationPreparationWorkbench.test.tsx', 'actions/payments/reconciliation-preparation.actions.ts', 'actions/payments/__tests__/reconciliation-preparation.actions.test.ts', 'services/modules/module-entitlement.service.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const output = path.join(__dirname, 'evidence/preparation-module-checks-' + crypto.randomUUID() + '.json');
const report = { startedAt: new Date().toISOString(), sourceBefore: hashes(), steps: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
function save() { fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
const tests = [files[1], files[3], files[5], 'components/finance/__tests__/ReconciliationAdditionalSourcesReview.test.tsx', 'services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts'];
const steps = [['jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests]], ['lint', ['node_modules/eslint/bin/eslint.js', ...files.filter(f => !f.endsWith('.json'))]], ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']]];
for (const [name, args] of steps) {
  const step = { name, args, startedAt: new Date().toISOString() }; report.steps.push(step); save();
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 1200000, maxBuffer: 2 * 1024 * 1024 });
  Object.assign(step, { endedAt: new Date().toISOString(), status: result.status, error: result.error?.code ?? null, stdout: result.stdout, stderr: result.stderr }); save();
  console.log(JSON.stringify({ name, status: step.status, error: step.error }));
  if (result.status !== 0 || result.error) break;
}
report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.passed = report.steps.length === steps.length && report.steps.every(s => s.status === 0 && !s.error) && report.sourceStable;
report.endedAt = new Date().toISOString(); save(); console.log(JSON.stringify({ output, passed: report.passed })); process.exitCode = report.passed ? 0 : 1;
