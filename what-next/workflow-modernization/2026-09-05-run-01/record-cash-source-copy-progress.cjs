const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),hash=file=>digest(fs.readFileSync(file)),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const staticFile='evidence/cash-source-copy-checks-08040baa-533b-4b61-88ab-ead73b20ff3a.json',runtimeFile='lanes/environment/cash-source-copy-f0f0e741-0495-4002-b5d2-fc77dffca9f7.json';
const history=['evidence/cash-source-copy-checks-86a98a48-80c9-43fc-9dc0-9846a277e05f.json','evidence/cash-source-copy-checks-d61de4b6-045e-46b0-b18a-0d43307986fb.json','evidence/cash-source-copy-checks-15332a70-2a74-4628-86e4-458e2b3c75ce.json','evidence/cash-source-copy-checks-5c982819-6b26-4711-bbc4-472609c27add.json','lanes/environment/cash-source-copy-fac6d033-3ea5-4123-8e98-a5f78f811f79.json'];
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-presentation-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&tests.steps.length===3&&tests.steps.every(step=>step.status===0));assert.match(tests.steps[0].stderr,/Tests:\s+130 passed, 130 total/);
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads);assert.equal(runtime.checks.length,6);
assert.ok(runtime.checks.every(row=>row.sourceCopyVerified&&row.tenantCurrencyVerified&&row.noPageErrors&&row.noHorizontalOverflow&&row.untranslatedDisplayText.length===0));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const changed=['services/cash-command/cash-command.service.ts','services/cash-command/__tests__/cash-command.service.test.ts','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx','components/bi/BIRiskOpportunityRadar.tsx','components/bi/__tests__/bi-command-primitives.test.tsx'];
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));assert.ok(priorImpact.every(row=>changed.includes(row.file)));
const digestClosure=read('evidence/digest-closure-2026-09-27.json'),shared='components/bi/BIRiskOpportunityRadar.tsx';
const oldText='risk.urgency === "now"',newText='risk.urgency === "watch" ? locale.startsWith("fr") ? "à surveiller" : "watch" : risk.urgency === "now"';
const sharedText=fs.readFileSync(path.join(repo,shared),'utf8');assert.equal(sharedText.split(newText).length-1,1);assert.equal(digest(sharedText.replace(newText,oldText)),digestClosure.sourceHashes[shared]);
const report='CASH_COMMAND_SOURCE_COPY_2026-09-30.md';
const remaining=[
 'Verify remaining proof subjects through the actual browser lifecycle and complete EN/FR source reasons/nodes inside proof drawers. Main authorized read-model prose, proof-link labels, statuses and due dates are verified in the covered views; unknown/custom source text is preserved.',
 'Verify genuine posted payroll obligations and their downstream financial records. Synthetic read fixtures do not prove posting, payment, declaration or approval completion.',
 'Finish the Cash accessibility checklist: tablet coverage, keyboard/contrast/reflow, enlarged text and the identified payroll nested-main boundary. Native screen-reader speech and browser zoom remain unverified limits.',
 'Complete route-latency investigation against a recorded baseline or approved budget. The original truncated shell hydration trace remains unattributed; investigate any recurrence. The reproduced date mismatch is corrected.',
 'Reconcile complete lifecycle/failure/recovery evidence against CASH_COMMAND_CLOSURE_2026-09-27.md. Named source/destination handoffs are verified; this does not close downstream purchasing, close, inventory-loss or payroll workflows.'
];
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 digestImpact:{file:shared,before:digestClosure.sourceHashes[shared],after:sourceHashes[shared],oldText,newText,scope:'Only the assessed watch urgency display is translated in French; English, risk amounts, rank, severity, state and authorization are unchanged. Shared EN/FR unit checks and actual Cash renderer views passed.'},
 verifiedSubcriteria:['cash_authorized_read_model_en_fr_prose_without_identity_or_control_changes','cash_action_and_forecast_dates_explicit_utc','cash_full_partial_denied_and_stale_source_presentation_en_fr','cash_watch_urgency_localization_preserves_assessment'],
 receipts:[staticFile,runtimeFile,...history].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.map(row=>{const file='lanes/environment/'+row.screenshot;return{file,sha256:hash(path.join(__dirname,file))}}),
 remaining,supersededRemaining:read('WORKFLOW_REGISTER.json').workflows.find(row=>row.id==='FA-CASH-COMMAND').remaining};
fs.writeFileSync(path.join(__dirname,'evidence/cash-source-copy-review-2026-09-30.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,report),`# Cash Command source presentation

${review.at}. FA-CASH-COMMAND remains In progress. The previous turn delivered currency/shared-label corrections; this turn delivers authorized source presentation and UTC due-date display. No workflow is added or closed.

## Delivered behavior

The Cash page applies a display-only presenter after server authorization and localized navigation. It translates the authorized brief, cards, risks, observations, actions, trust labels, canonical warnings and proof-link explanations into French. Existing snapshot warning translators are reused. Only known display strings and narrowly matched numeric templates change. Unknown/custom copy, tenant and object IDs, permissions, source hashes, evidence grades, states, monetary values, null totals, denied proof identities and navigation decisions remain intact. English returns the existing model unchanged.

The authorized brief is translated from its disclosed cards only when it matches the service's canonical summary. This avoids reconstructing hidden-domain totals or overwriting custom caveats. French amounts retain source precision and currency. Role labels and non-monetary count units are presented without changing role or currency identifiers used for enforcement.

Action and forecast dates previously used the server's implicit timezone. They now explicitly use UTC and show that context. A Honolulu-default test verifies a July 1 instant near midnight stays July 1 in EN and FR. The shared risk panel now translates watch urgency while preserving the assessment.

## Verification

- 130 tests across five suites, changed-file lint and full TypeScript passed: [final static receipt](${staticFile}). Tests cover route wiring, UTC dates, empty/partial/full disclosure, custom text, denied identities and preservation of non-display fields.
- Six actual views: full, partial and denied source access in EN desktop 1440px and FR mobile 320px. A persisted recovery source is 48 hours old, beyond the configured 24-hour limit; source staleness remains true and its canonical reason is French. Due labels, proof labels, the brief, next actions and watch urgency render. Keyboard focus remains usable. No page errors or horizontal overflow; balance rows, payment counts and journal counts remain unchanged during reads. [Final runtime](${runtimeFile}).
- The French service display-field audit has zero unchanged English prose in these fixtures. This is sampled current-source coverage, not a claim that arbitrary future/custom records or proof-drawer nodes have been translated. Machine identifiers remain unchanged.
- Final development view times: ${runtime.checks.map(row=>(row.durationMs/1000).toFixed(1)+'s').join(', ')}. These are local observations, not production performance certification.
- Earlier receipts are retained in the review record. Two first tests assumed the wrong denial wording and a cross-domain redaction on an independently scoped cash card; assertions now exercise the real partial-payroll case. TypeScript found nullable observation drill-through; the presenter now preserves null. A prior 107-test/fresh-source browser pass preceded the final stale/watch additions.

## Shared impact and review

Graph components bi_biactionpriorityboard_tsx (community 98) and bi_bicommandbriefheader_tsx (community 50) guided shared-boundary inspection; current source governs behavior. The only change to Digest's closed source bindings is the risk renderer's exact watch-expression translation. Reconstructing that expression produces the original closure hash. Shared EN/FR regressions and real renderer checks support retaining the closure; all other closure guards remain exact.

Architecture/backend/data/security review: presentation follows authorization; no new queries, writes, grants or schema. Finance/controls review: values, currencies, unavailable totals, grades and blockers preserved. Frontend/workflow/product/accessibility review: existing shell/tokens retained, French prose and meaningful UTC context delivered; complete accessibility still open. Quality/SRE/rollout review: guarded disposable fixtures, regression and source-bound receipts. Statutory rules, commercial packaging, integration/events and AI decisions: not applicable to this display correction. These are engineering checks, not professional approvals.

## Operator guidance and recovery

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command with your organization's authorized role. The same permitted source facts appear in the chosen language. Review unavailable or stale indicators in their source workspace; refreshing does not resolve their blockers. Proof links explain missing records or access without granting permission. Dates marked UTC use UTC calendar boundaries. No new input, signing system, migration or live activation is required.

Rollback, if needed, reverses only this presenter, route wiring, UTC date-label and watch-label changes. Preserve previous source-admission, financial, proof and timezone corrections. The prior source bindings and exact impact hashes are retained in the review record.

## Remaining closure

${remaining.map(value=>'- '+value).join('\n')}
`,{flag:'wx'});
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashPresentationCurrent = Object.entries(cashPresentation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashSourceCopy = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-source-copy-review-2026-09-30.json')));
for (const row of [...cashSourceCopy.receipts, ...cashSourceCopy.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash source-copy evidence changed');
for (const row of cashSourceCopy.priorImpact) if (cashPresentation.sourceHashes[row.file] !== row.before || cashSourceCopy.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash source-copy impact');
const cashSourceCopyCurrent = Object.entries(cashSourceCopy.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashSourceCopyCurrent) throw new Error('Cash source-copy dependency changed; review required');
const cashPresentationCurrent = cashSourceCopyCurrent && Object.entries(cashPresentation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashSourceCopy.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashPresentation.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(chain).length-1,12);source=source.replaceAll(chain,'(cashSourceCopy.priorImpact.find(row => row.file === source)?.after ?? cashPresentation.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashPresentation.verifiedSubcriteria]','...cashPresentation.verifiedSubcriteria, ...cashSourceCopy.verifiedSubcriteria]');
replace('  // Only the reconciliation preparation/recovery copy changed.',`  const watch = cashSourceCopy.digestImpact;
  if (source === watch.file && expected === watch.before && actual === watch.after) {
    const current = bytes.toString('utf8');
    if (current.split(watch.newText).length !== 2 || crypto.createHash('sha256').update(current.replace(watch.newText, watch.oldText)).digest('hex') !== expected) throw new Error('Unreviewed risk renderer change');
    continue;
  }
  // Only the reconciliation preparation/recovery copy changed.`);
replace('const currentCashLane = JSON.parse',`for (const report of [cashSourceCopy.report, 'evidence/cash-source-copy-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.sourceCopyBindingCurrent = cashSourceCopyCurrent;
cashRead.closureReview.note = 'Source admission, named handoffs and covered EN/FR read-model prose are verified; proof-drawer content, genuine posted payroll and complete accessibility/latency still prevent closure.';
cashRead.implementationStatus = 'cash_authorized_source_presentation_and_utc_due_dates_corrected';
cashRead.runtimeStatus = 'owned_en_fr_full_partial_denied_stale_source_copy_and_keyboard_verified';
cashRead.remaining = cashSourceCopy.remaining;
for (const report of [cashSourceCopy.report, 'evidence/cash-source-copy-review-2026-09-30.json']) if (!digest.evidence.includes(report)) digest.evidence.push(report);
const currentCashLane = JSON.parse`);
replace('Source admission; handoffs; UTC; currency; shared EN/FR','Source admission; handoffs; currency; EN/FR read model');
replace('Full EN/FR, remaining proofs, posted payroll and accessibility','Proof content, posted payroll, accessibility and latency');
replace('Complete server-authored EN/FR presentation','Verify remaining proof subjects and source-record localization');
source=source.replace(/\*\*Since the previous report:\*\*[^\r\n]*/, '**Since the previous report:** Cash read-model descriptions, warnings, actions and proof-link labels now have French presentation after authorization. Action/forecast dates use explicit UTC. 130 tests, lint and TypeScript passed; six EN desktop/FR mobile full, partial and denied views verify source prose, stale-source preservation, watch urgency and unchanged business records. [Evidence and guidance](CASH_COMMAND_SOURCE_COPY_2026-09-30.md). Earlier assertion/type failures remain documented. Duplicate remaining-work entries were consolidated without removing unresolved requirements. No workflow was added or closed.');
replace('Finish server-authored EN/FR, other proofs and genuine posted payroll. Shared renderer localization is verified, but server descriptions remain English.','Finish proof-subject lifecycle and proof-drawer source-record localization, genuine posted payroll and complete accessibility/latency checks. Covered read-model prose is localized; unknown/custom copy is preserved.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);console.log(JSON.stringify({report,priorImpact,digestImpact:review.digestImpact}));
