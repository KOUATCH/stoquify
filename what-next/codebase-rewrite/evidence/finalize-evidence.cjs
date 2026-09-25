const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const baseline = require('./baseline.json');
const after = require('./after.json');
const applicationFiles = [
  'hooks/useCashPaymentHistoryWorkbench.ts',
  'services/pos/cash-payment-history.service.ts',
  'components/finance/CashPaymentHistoryWorkbench.tsx',
  'services/leakage/pos-cash-shortage-production-activation-preflight.ts',
];
const tests = [
  'hooks/__tests__/useCashPaymentHistoryWorkbench.scope.test.tsx',
  'hooks/__tests__/useCashPaymentHistoryWorkbench.test.ts',
  'services/pos/__tests__/cash-payment-history.service.test.ts',
];
const files = [...applicationFiles, ...tests].map(file => {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const previous = baseline.manifest.find(row => row.file === file);
  const lines = text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0);
  return { file, category: applicationFiles.includes(file) ? 'application' : 'tests',
    before: previous || null, after: { lines, bytes: Buffer.byteLength(text), sha256: crypto.createHash('sha256').update(text).digest('hex') },
    lineDelta: lines - (previous?.lines || 0) };
});
const externalChanges = after.manifest.filter(row => row.category === 'application' && !applicationFiles.includes(row.file))
  .filter(row => row.sha256 !== baseline.manifest.find(old => old.file === row.file)?.sha256)
  .map(row => ({ file: row.file, lineDelta: row.lines - (baseline.manifest.find(old => old.file === row.file)?.lines || 0) }));
const result = { recordedAt: new Date().toISOString(),
  note: 'The after scan predates the final optional-error-code guard. This task manifest records the final edited files; line counts are unchanged by that guard. Other concurrent changes are not attributed to this task.',
  applicationLineDelta: files.filter(row=>row.category==='application').reduce((sum,row)=>sum+row.lineDelta,0),
  files, observedConcurrentApplicationChanges: externalChanges };
fs.writeFileSync(path.join(__dirname,'task-changes.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ applicationLineDelta:result.applicationLineDelta,applicationFiles:applicationFiles.length,tests:tests.length,concurrentFiles:externalChanges.length }));
