const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const tests = [
  'services/cash-command/__tests__/cash-command.service.test.ts',
  'actions/evidence/__tests__/proof-trail.actions.test.ts',
  'components/cash-command/__tests__/CashCommandDashboard.test.tsx',
  'app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx',
];
const changed = ['services/cash-command/cash-command.service.ts', 'services/cash-command/cash-command-contracts.ts', tests[0]];
const files = [...new Set([...changed, ...tests, 'services/evidence/evidence-contracts.ts', 'services/modules/module-entitlement.service.ts', 'lib/security/rbac-permissions.ts'])];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: sources(), steps: [] };
const steps = [
  ['jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests]],
  ['lint', ['node_modules/eslint/bin/eslint.js', ...changed]],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']],
];
for (const [name, args] of steps) {
  const result = spawnSync(process.execPath, args, {cwd:root, encoding:'utf8', windowsHide:true, timeout:1200000, maxBuffer:3*1024*1024});
  report.steps.push({name,args,status:result.status,error:result.error?.code ?? null,stdout:result.stdout,stderr:result.stderr});
  console.log(JSON.stringify({name,status:result.status,error:result.error?.code}));
  if (result.status !== 0 || result.error) break;
}
report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.passed = report.steps.length === steps.length && report.steps.every(row => row.status === 0 && !row.error) && report.sourceStable;
const file = 'evidence/cash-proof-checks-' + crypto.randomUUID() + '.json';
fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,passed:report.passed})); process.exitCode = report.passed ? 0 : 1;
