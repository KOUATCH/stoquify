const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const staticFile='evidence/cash-presentation-checks-2b770803-f52d-4386-ab1c-6200fc5a5b7c.json',runtimeFile='lanes/environment/cash-presentation-16cee833-13ae-48a9-b1af-3724fa067d5d.json',failedFile='evidence/cash-presentation-checks-bc1914eb-32f1-41fd-9c59-98d425e240d2.json';
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-queue-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&tests.steps.length===3&&tests.steps.every(step=>step.status===0));
assert.match(tests.steps[0].stderr,/Tests:\s+87 passed, 87 total/);
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads);assert.equal(runtime.checks.length,4);
assert.ok(runtime.checks.every(row=>row.tenantCurrencyVerified&&row.localizedSharedStates&&row.noPageErrors&&row.noHorizontalOverflow));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};
for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const changed=['components/cash-command/CashCommandDashboard.tsx','components/bi/BIActionPriorityBoard.tsx','components/bi/BITrustLegend.tsx','components/cash-command/__tests__/CashCommandDashboard.test.tsx','components/bi/__tests__/bi-command-primitives.test.tsx'];
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.ok(priorImpact.every(row=>changed.includes(row.file)));assert.ok(priorImpact.some(row=>row.file===changed[0]));
const report='CASH_COMMAND_PRESENTATION_2026-09-30.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['cash_risk_amount_uses_tenant_currency_en_fr_eur_usd','cash_shared_action_status_freshness_and_legend_localization','cash_owned_eur_populated_denied_desktop_mobile_read_invariants'],
 receipts:[staticFile,runtimeFile,failedFile].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.map(row=>{const file='lanes/environment/'+row.screenshot;return{file,sha256:hash(path.join(__dirname,file))}}),
 remaining:['Server-authored Cash descriptions, trust signals, action labels, due dates and proof-source copy still require EN/FR presentation. This renderer milestone does not close full localization, proof subjects, genuine posted payroll or accessibility/latency requirements.']};
fs.writeFileSync(path.join(__dirname,'evidence/cash-presentation-review-2026-09-30.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,report),`# Cash Command currency and shared presentation

${review.at}. FA-CASH-COMMAND remains In progress. No workflow was added or closed.

## Corrections and user benefit

Cash Command omitted the tenant currency when rendering BIRiskOpportunityRadar. That shared component defaults to XAF, so a EUR or USD source amount could display the wrong unit. The dashboard now passes data.currency and locale; amounts are not converted or recomputed. Three focused cases cover EN/EUR, FR/EUR and FR/USD. A real isolated EUR tenant verifies a 125,000 EUR employee-recovery risk against the authoritative service value and rendered page.

The action board and evidence legend accept an optional locale, preserving English defaults for other consumers. Cash passes its locale through severity, state, evidence and freshness badges. French empty guidance, drawer metrics and module-control labels are localized. Shared typography, tokens, tone meanings and component structure are preserved. Selection, approval, operational health and evidence grades are not reinterpreted.

## Verification and scope

- 87 tests in three suites, changed-file lint and full TypeScript passed: [receipt](${staticFile}). Existing shared English-default checks remain in the suite.
- Four actual views passed: populated and permission-restricted EN desktop (1440px) and FR mobile (320px), reduced motion and New York browser timezone. No page errors or horizontal overflow. EUR risk money, localized statuses, legend and empty guidance verified. Screenshots and timings: [runtime](${runtimeFile}).
- Guarded disposable PostgreSQL fixtures; real authorization and service reads; external browser traffic fenced. Balance records, payment counts and journal counts remained unchanged during reads. Synthetic source records establish display/read behavior, not posting, payment or approval readiness.
- Failed first test attempt retained: [receipt](${failedFile}). Two French amount matchers normalized narrow/no-break spaces; the third expected high severity from a critical fixture. Corrected expectations retain exact currency and severity assertions. No failing business control was relaxed.
- Development view times were ${runtime.checks.map(row=>(row.durationMs/1000).toFixed(1)+'s').join(', ')}. These include route loading/compilation and are not production budgets or certification.

## Review and operation

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command through an authorized organization. Risk values use that organization's currency. Restricted data remains omitted. Empty lists do not establish absence of risk. The proof legend explains evidence grades without granting authority.

Architecture/frontend/product/localization review: reuse existing presentation contracts and default compatibility. Finance/data review: preserve source amounts, nulls, grades, permissions and tenant currency. Security/privacy review: no change to admission; restricted views verified. Quality/SRE/rollout review: focused regression, local runtime evidence and no schema/deployment change. Statutory rules, commercial terms, integrations/events and AI behavior: not applicable to this presentation correction. No professional certification is claimed.

No migration or setup is required. If reverting, reverse only this renderer locale/currency patch, preserving earlier source-access, proof and UTC corrections. Other consumers remain on their prior default until explicitly localized. Server descriptions and action labels are still visibly English in the French screenshots; full EN/FR is not complete. Remaining proof subjects, genuine posted payroll, complete accessibility and latency requirements remain recorded in the workflow register.
`,{flag:'wx'});
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const current="const cashQueueCurrent = Object.entries(cashQueue.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(current,`const cashPresentation = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-presentation-review-2026-09-30.json')));
for (const row of [...cashPresentation.receipts, ...cashPresentation.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash presentation evidence changed');
for (const row of cashPresentation.priorImpact) if (cashQueue.sourceHashes[row.file] !== row.before || cashPresentation.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash presentation impact');
const cashPresentationCurrent = Object.entries(cashPresentation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashPresentationCurrent) throw new Error('Cash presentation dependency changed; review required');
const cashQueueCurrent = cashPresentationCurrent && Object.entries(cashQueue.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashPresentation.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashQueue.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(chain).length-1,11);
source=source.replaceAll(chain,'(cashPresentation.priorImpact.find(row => row.file === source)?.after ?? cashQueue.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashQueue.verifiedSubcriteria]','...cashQueue.verifiedSubcriteria, ...cashPresentation.verifiedSubcriteria]');
replace('const currentCashLane = JSON.parse',`for (const report of [cashPresentation.report, 'evidence/cash-presentation-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.presentationBindingCurrent = cashPresentationCurrent;
cashRead.implementationStatus = 'cash_source_access_currency_utc_and_shared_localization_corrected';
cashRead.runtimeStatus = 'owned_en_fr_handoffs_eur_risk_shared_status_and_restricted_empty_views_verified';
for (const gap of cashPresentation.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane = JSON.parse`);
replace('Complete source and shared-component EN/FR presentation','Complete server-authored EN/FR presentation');
replace('Source admission; finance/queue handoffs; UTC; honest evidence','Source admission; handoffs; UTC; currency; shared EN/FR');
source=source.replace(/\*\*Since the previous report:\*\*[^\r\n]*/, '**Since the previous report:** Corrected risk amounts that could use XAF instead of the tenant currency. Shared action states, freshness, evidence legend and drawer/module labels now receive French. 87 focused tests, lint and TypeScript passed; four isolated EN desktop/FR mobile populated and restricted views verified EUR amounts, shared labels, no overflow/errors and unchanged business records. [Evidence and guidance](CASH_COMMAND_PRESENTATION_2026-09-30.md). Initial test assertion failures are retained and explained. No workflow was added or closed.');
replace('Finish full server/shared-component EN/FR, other proofs and genuine posted payroll.','Finish server-authored EN/FR, other proofs and genuine posted payroll. Shared renderer localization is verified, but server descriptions remain English.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);
console.log(JSON.stringify({review:'evidence/cash-presentation-review-2026-09-30.json',priorImpact,report}));
