const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f)));
const [staticFile,runtimeFile,...failedFiles]=process.argv.slice(2);
assert.ok(staticFile?.startsWith('evidence/cash-navigation-checks-')&&staticFile.endsWith('.json'));
assert.ok(runtimeFile?.startsWith('lanes/environment/cash-evidence-')&&runtimeFile.endsWith('.json'));
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-timezone-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.noFinancialMutationsDuringReads);
assert.equal(runtime.checks.length,8);assert.ok(runtime.checks.every(row=>row.observationsNotComparisons&&row.forecastGradeVerified&&row.noPageErrors));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};
for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['services/cash-command/cash-command.service.ts','components/cash-command/CashCommandDashboard.tsx','components/cash-command/__tests__/CashCommandDashboard.test.tsx','services/cash-command/__tests__/cash-command.service.test.ts'].sort());
const report='CASH_COMMAND_OBSERVATIONS_AND_FORECAST_2026-09-30.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['cash_observations_do_not_claim_unmeasured_change','empty_cash_observation_scope_does_not_claim_no_risk_en_fr','empty_payroll_horizon_operational_not_posted','payroll_observation_blocker_count_not_currency','owned_empty_incomplete_out_of_horizon_and_denied_forecast_en_fr'],
 receipts:[staticFile,runtimeFile,...failedFiles].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.map(row=>{const file='lanes/environment/'+row.screenshot;return{file,sha256:hash(path.join(__dirname,file))}}),
 remaining:['Finish remaining finance/action-queue handoffs and full server-authored EN/FR copy.','Verify remaining proof subjects, genuine posted payroll lifecycle and full accessibility/latency requirements. The original truncated shell hydration trace cannot be conclusively attributed to the reproduced date defect; investigate any recurrence.']};
fs.writeFileSync(path.join(__dirname,'evidence/cash-observation-review-2026-09-30.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,report),`# Cash Command observations and payroll forecast evidence

${review.at}. FA-CASH-COMMAND remains In progress. Previous goal turn: progress, with UTC correction and drawer handoff evidence. This turn completes two source-meaning criteria; full workflow closure remains unproven.

## Corrected behavior

Cash Command previously labeled current source values as new, changed or worsened despite having no earlier comparison snapshot. Its service now emits observed events with no previous value. The accepted shared observation display shows the current value, identifies historical comparison as unavailable, and has EN/FR empty guidance that does not infer absence of risk. The collected-cash heading describes the selected period. Existing severity, amounts, provenance, controls and actions are preserved.

The payroll-proof observation also inherited the net-pay card's currency unit while displaying a blocker count. That observation now explicitly uses a number and blocker unit; it is not presented as a monetary amount.

An unblocked forecast was also always labeled posted. A successful read with no upcoming payroll periods is evidence of an empty horizon, not posting. The two forecast cards now show empty/operational for that result, retain blocked/null for incomplete evidence, and reserve posted for the existing source-linked reason. Unknown future evidence reasons do not inherit a posted grade. The forecast service, ledger proof requirements and financial values are unchanged.

## Verification

- [Focused checks](${staticFile}): 208 tests/seven suites, changed-file lint and full typecheck passed with stable source hashes. Cases include empty, blocked, source-linked and unknown-reason forecasts; current values and severity remain intact. The source-linked unit fixture does not establish a genuine posted payroll lifecycle.
- [Actual runtime](${runtimeFile}): eight EN desktop/FR mobile views against the owned local database and real app. With current permissions, an empty horizon displays operational zero values; a newly created incomplete synthetic period with no run withholds amounts as blocked; moving that test period outside the horizon returns to empty; withdrawn permissions hide the indicators and show the truthful empty-observation explanation. Both actual service projections and rendered cards are checked. No page errors or checked-viewport horizontal overflow occurred.
- The fixture date change tests scope handling only. It is not cancellation, posting, approval, settlement or proof that an obligation has been resolved. Payroll balance rows, payment count and journal count were unchanged during reads. Eight screenshots and development timings are retained; no production performance claim is made.
- The first browser attempt passed both empty views, then failed its incomplete-source expectation because the synthetic due date was tomorrow, outside Cash Command's selected UTC day. The fixture now uses a due date inside the selected day. That failed receipt remains retained in the review; the product's horizon was not changed to satisfy the test.

## Review, guidance and recovery

Finance/product/audit: distinguish a current observation, an empty result and posted evidence. Backend/data/security: preserve source reads, tenant/role/module projection and nullable blocked amounts. Frontend/design/localization: reuse BIWhatChangedStrip's observation contract and current semantic tokens; no shared component edits or second UI system. Quality/SRE: source-bound tests and actual state changes; release remains unapproved. Statutory, provider, offline, billing and AI behavior: not applicable to this display/read-model change. These are engineering reviews, not expert certifications.

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. Read current observations as the present source position; they do not establish improvement or deterioration. Empty payroll cards mean no eligible items were found in the displayed forecast horizon. Check payroll periods and due dates in the authorized source workspace if obligations are expected. Blocked cards require the existing domain proof to be completed; changing this display does not lift those controls.

No migration or deployment was performed. Recovery is limited to reverting the reviewed service event/grade and dashboard observation changes, then rerunning the linked checks; preserve unrelated changes. Remaining finance handoffs, full source localization, other proofs, genuine posted payroll and complete accessibility/performance verification remain in the register.
`,{flag:'wx'});
console.log(JSON.stringify({report,review:'evidence/cash-observation-review-2026-09-30.json'}));
