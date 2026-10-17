// Local focused checks only: no build, migration, seed or database access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), phase = process.argv[2];
assert.ok(['jest', 'typecheck', 'lint'].includes(phase));
const changed = [
  'services/accounting/journal-reversal-order.service.ts', 'services/accounting/__tests__/journal-reversal-order.service.test.ts',
  'services/inventory/inventory-close-invalidation.service.ts', 'services/inventory/__tests__/inventory-close-invalidation.service.test.ts',
  'services/inventory/inventory-adjustment-reversal.service.ts', 'services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts',
  'services/reconciliation/payment-suspense-correction.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery.service.ts',
  'services/reconciliation/payment-suspense-cycle-ledger.service.ts', 'services/reconciliation/__tests__/payment-suspense-reversal-order.service.test.ts',
  'services/reconciliation/payment-suspense-resolution-evidence.service.ts',
  'services/reconciliation/__tests__/payment-suspense-cycle-hash-compatibility.test.ts',
  'services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/__tests__/purchase-correction-ledger.service.test.ts',
  'services/purchasing/purchase-return-credit.service.ts', 'services/purchasing/__tests__/purchase-return-credit.service.test.ts',
  'services/inventory/inventory-stock-event.service.ts', 'services/inventory/__tests__/inventory-stock-event.service.test.ts',
  'services/accounting/close-assurance-pack.service.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'actions/purchasing/purchase-return-credit.actions.ts', 'actions/purchasing/__tests__/purchase-return-credit.actions.test.ts',
];
const tests = [...new Set(changed.filter(file => file.includes('.test.')).concat([
  'services/accounting/__tests__/posting.service.test.ts', 'services/accounting/__tests__/customer-settlement-reversal.service.test.ts',
  'services/accounting/__tests__/journal-close-invalidation.service.test.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'services/accounting/__tests__/close-assessment-order.service.test.ts', 'services/accounting/__tests__/periods.service.test.ts',
  'services/accounting/__tests__/close-assurance.service.test.ts', 'services/snapshots/__tests__/close-readiness-snapshot.service.test.ts',
  'services/cash-command/__tests__/cash-command.service.test.ts', 'services/inventory/__tests__/inventory-reconciliation.service.test.ts',
  'services/purchasing/__tests__/purchase-correction-ledger.service.test.ts',
  'services/reconciliation/__tests__/payment-suspense-correction.contracts.test.ts', 'services/reconciliation/__tests__/payment-suspense-correction-record.test.ts',
  'services/reconciliation/__tests__/payment-suspense-resolution-recovery-evidence.service.test.ts',
]))];
const source = [...new Set([...changed, ...tests,
  ...['posting','customer-settlement-reversal','journal-close-invalidation','close-assurance-pack','close-assurance','periods','close-assessment-order','accounting-period-catalog'].map(n => 'services/accounting/'+n+'.service.ts'),
  'services/purchasing/purchase-correction-ledger.service.ts', 'services/inventory/inventory-reconciliation.service.ts',
  'services/controls/sensitive-action.service.ts', 'services/events/business-event.service.ts',
  'prisma/schema.prisma', 'prisma/db.ts', 'package.json', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', path.relative(root, __filename),
])];
const hashes = () => Object.fromEntries(source.map(file => [file.replaceAll('\\','/'), crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stem = path.join(evidence, 'source-reversal-'+phase+'-'+crypto.randomUUID());
const commands = { jest: ['node_modules/jest/bin/jest.js','--roots','services','actions','lib','--runInBand','--runTestsByPath',...tests,'--json','--outputFile='+stem+'-jest.json'],
  typecheck: ['node_modules/typescript/bin/tsc','--noEmit','--pretty','false'], lint: ['node_modules/eslint/bin/eslint.js',...changed] };
const report = { at: new Date().toISOString(), phase, command: commands[phase], sourceBefore: hashes() };
const result = spawnSync(process.execPath,commands[phase],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=8192'}});
report.exitCode=result.status; report.sourceAfter=hashes(); report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
report.log=path.relative(root,stem+'.log').replaceAll('\\','/'); fs.writeFileSync(stem+'.log',(result.stdout||'')+(result.stderr||''),{flag:'wx'});
if (phase==='jest'&&fs.existsSync(stem+'-jest.json')) { const j=JSON.parse(fs.readFileSync(stem+'-jest.json')); report.jest=path.relative(root,stem+'-jest.json').replaceAll('\\','/'); report.summary={passed:j.numPassedTests,failed:j.numFailedTests,pending:j.numPendingTests,suites:j.numTotalTestSuites}; }
report.passed=result.status===0&&report.sourceStable; fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({receipt:stem+'.json',passed:report.passed,sourceStable:report.sourceStable,summary:report.summary}));
if (!report.passed) console.log(((result.stdout||'')+(result.stderr||'')).slice(-16000));
process.exitCode=report.passed?0:1;
