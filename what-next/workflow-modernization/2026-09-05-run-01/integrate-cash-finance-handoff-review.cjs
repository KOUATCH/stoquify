const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashObservationsCurrent = Object.entries(cashObservations.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashFinanceHandoff = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-finance-handoff-review-2026-09-30.json')));
for (const row of [...cashFinanceHandoff.receipts, ...cashFinanceHandoff.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash finance handoff evidence changed');
for (const row of cashFinanceHandoff.priorImpact) if (cashObservations.sourceHashes[row.file] !== row.before || cashFinanceHandoff.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash finance handoff impact');
const cashFinanceHandoffCurrent = Object.entries(cashFinanceHandoff.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashFinanceHandoffCurrent) throw new Error('Cash finance handoff dependency changed; review required');
const cashObservationsCurrent = cashFinanceHandoffCurrent && Object.entries(cashObservations.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashFinanceHandoff.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashObservations.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(chain).length-1,9);
source=source.replaceAll(chain,'(cashFinanceHandoff.priorImpact.find(row => row.file === source)?.after ?? cashObservations.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashObservations.verifiedSubcriteria]','...cashObservations.verifiedSubcriteria, ...cashFinanceHandoff.verifiedSubcriteria]');
replace('const currentCashLane = JSON.parse',`for (const report of [cashFinanceHandoff.report, 'evidence/cash-finance-handoff-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.financeHandoffBindingCurrent = cashFinanceHandoffCurrent;
cashRead.implementationStatus = 'source_admission_navigation_utc_observation_and_source_forecast_states_verified';
cashRead.runtimeStatus = 'owned_en_fr_finance_payment_reconciliation_handoffs_and_revocation_verified';
cashRead.remaining = [...new Set(cashRead.remaining.map(value => value
 .replace('remaining finance/action-queue handoffs', 'remaining purchasing/close/inventory-loss action-queue handoffs')
 .replace('other finance/action-queue handoffs', 'purchasing/close/inventory-loss action-queue handoffs')))];
for (const gap of cashFinanceHandoff.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane = JSON.parse`);
replace('Source admission/handoffs; UTC; honest observations/forecast states','Source admission; finance handoffs; UTC; honest source/card evidence');
replace('Finance handoffs, proofs, full EN/FR and posted payroll','Remaining queue handoffs, proofs, full EN/FR and posted payroll');
replace('Finish finance destination checks','Verify purchasing/close/inventory-loss queue handoffs');
assert.equal((source.match(/\*\*Since the previous report:\*\*[^\r\n]*/g)||[]).length,1);
source=source.replace(/\*\*Since the previous report:\*\*[^\r\n]*/, '**Since the previous report:** The internal payroll source now agrees with the corrected cards: empty is operational, incomplete is blocked, and posted requires unblocked source-linked evidence. 214 tests/seven suites, lint and TypeScript passed. Four EN/FR browser journeys verify payment/reconciliation keyboard handoffs, Back navigation and permission withdrawal after rendering. [Evidence and guidance](CASH_COMMAND_FINANCE_HANDOFFS_2026-09-30.md). No workflow was added or closed; no approval or posting was simulated.');
replace('Finish other finance/action-queue handoffs, full server EN/FR, other proofs and genuine posted payroll.','Finish purchasing/close/inventory-loss action-queue handoffs, full server EN/FR, other proofs and genuine posted payroll.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);console.log('Added exact reviewed source classification and finance handoff evidence.');
