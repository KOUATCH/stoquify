const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashTimezoneCurrent = Object.entries(cashTimezone.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashObservations = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-observation-review-2026-09-30.json')));
for (const row of [...cashObservations.receipts, ...cashObservations.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash observation evidence changed');
for (const row of cashObservations.priorImpact) if (cashTimezone.sourceHashes[row.file] !== row.before || cashObservations.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash observation impact');
const cashObservationsCurrent = Object.entries(cashObservations.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashObservationsCurrent) throw new Error('Cash observation dependency changed; review required');
const cashTimezoneCurrent = cashObservationsCurrent && Object.entries(cashTimezone.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashObservations.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashTimezone.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(chain).length-1,8);
source=source.replaceAll(chain,'(cashObservations.priorImpact.find(row => row.file === source)?.after ?? cashTimezone.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashTimezone.verifiedSubcriteria]','...cashTimezone.verifiedSubcriteria, ...cashObservations.verifiedSubcriteria]');
replace('const currentCashLane = JSON.parse',`for (const report of [cashObservations.report, 'evidence/cash-observation-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.observationAndForecastBindingCurrent = cashObservationsCurrent;
cashRead.implementationStatus = 'source_admission_navigation_utc_and_honest_observation_forecast_states_verified';
cashRead.runtimeStatus = 'owned_en_fr_empty_incomplete_out_of_horizon_and_denied_forecast_verified';
cashRead.remaining = [...new Set(cashRead.remaining.map(value => value
  .replace('honest current-observation labels, ', '')
  .replace('Full server-authored EN/FR copy, honest observation labels and empty payroll forecast evidence grade require correction.', 'Full server-authored EN/FR copy requires completion.')
  .replace('Complete server-authored EN/FR copy, honest current-observation labels and empty-forecast grading.', 'Complete server-authored EN/FR copy.')
  .replace('Finish remaining finance/action-queue handoffs, server-authored EN/FR, current-observation labels and empty-forecast grading.', 'Finish remaining finance/action-queue handoffs and full server-authored EN/FR copy.')
  .replace('Independent source admission verified; finance/payroll/inventory handoffs remain open.', 'Source admission and selected stock/payroll/drawer handoffs verified; remaining finance/action-queue handoffs and full downstream lifecycles remain open.')
  .replace('in this queued workflow', 'in this active workflow')))] ;
for (const gap of cashObservations.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane = JSON.parse`);
replace('Source admission; stock/payroll/drawer handoffs; UTC display','Source admission/handoffs; UTC; honest observations/forecast states');
replace('Finance handoffs, proofs, EN/FR, honest states and posted payroll','Finance handoffs, proofs, full EN/FR and posted payroll');
assert.equal((source.match(/\*\*Since the previous report:\*\*[^\r\n]*/g)||[]).length,1);
source=source.replace(/\*\*Since the previous report:\*\*[^\r\n]*/, '**Since the previous report:** Current Cash events now state observations without inventing change against a previous snapshot. Empty payroll forecasts carry operational evidence, incomplete proof remains blocked, and posted is reserved for source-linked results. 208 tests/seven suites, lint and TypeScript passed. Eight EN/FR browser views verify empty, incomplete, out-of-horizon and denied source states. [Evidence and guidance](CASH_COMMAND_OBSERVATIONS_AND_FORECAST_2026-09-30.md). No workflow was added or closed; no business approval or posting was simulated.');
replace('Finish other finance/action-queue handoffs, server EN/FR, honest observation/empty-forecast labels, other proofs and genuine posted payroll.','Finish other finance/action-queue handoffs, full server EN/FR, other proofs and genuine posted payroll.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);console.log('Added exact reviewed observation/forecast impacts and removed superseded gaps.');
