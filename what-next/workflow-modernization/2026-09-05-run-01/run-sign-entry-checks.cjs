const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const files = ['components/finance/PaymentReconciliationWorkbench.tsx','components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx','components/finance/PaymentSuspenseQueue.tsx','components/finance/__tests__/PaymentSuspenseQueue.test.tsx','components/finance/ReconciliationSignReview.tsx','components/finance/__tests__/ReconciliationSignReview.test.tsx','lib/auth-client.ts','hooks/usePermissions.ts','hooks/__tests__/usePermissions.workflow.test.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const output = path.join(__dirname, 'evidence/sign-entry-checks-' + crypto.randomUUID() + '.json');
const report = { startedAt: new Date().toISOString(), sourceBefore: hashes(), steps: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
function save() { const text = JSON.stringify(report, null, 2), fd = fs.openSync(output, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); } }
const tests = [files[1],files[3],files[5],files[8]];
const steps = [['jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests]]];
if (!process.argv.includes('--reproduce')) steps.push(['lint', ['node_modules/eslint/bin/eslint.js', ...files.filter(f => !f.endsWith('.css') && !f.endsWith('.json'))]], ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']]);
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
