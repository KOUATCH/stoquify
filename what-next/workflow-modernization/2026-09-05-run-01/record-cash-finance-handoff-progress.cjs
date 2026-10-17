const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const [staticFile,runtimeFile]=process.argv.slice(2);assert.ok(/^evidence\/cash-navigation-checks-[\w-]+\.json$/.test(staticFile));assert.ok(/^lanes\/environment\/cash-finance-handoff-[\w-]+\.json$/.test(runtimeFile));
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-observation-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads);
assert.equal(runtime.checks.length,4);assert.ok(runtime.checks.every(row=>row.keyboardHandoff&&row.backRetainedLocale&&row.renderedLinkRevocation&&row.noPageErrors));
assert.deepEqual(runtime.forecastSourceChecks,{emptyOperational:true,incompleteBlocked:true});
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['services/cash-command/cash-command-sources.service.ts','services/cash-command/__tests__/cash-command-sources.service.test.ts'].sort());
const report='CASH_COMMAND_FINANCE_HANDOFFS_2026-09-30.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['cash_payroll_source_empty_operational_and_incomplete_blocked','cash_payroll_source_posted_requires_unblocked_source_linked_basis','cash_finance_payment_reconciliation_en_fr_keyboard_handoffs_and_permission_revocation'],
 receipts:[staticFile,runtimeFile].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.flatMap(row=>row.screenshots.map(name=>{const file='lanes/environment/'+name;return{file,sha256:hash(path.join(__dirname,file))}})),
 remaining:['Verify remaining purchasing, close and inventory-loss action-queue handoffs; finish full server-authored EN/FR, remaining proofs, genuine posted payroll and complete accessibility/latency requirements.']};
fs.writeFileSync(path.join(__dirname,'evidence/cash-finance-handoff-review-2026-09-30.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,report),`# Cash Command finance handoffs and source evidence

${review.at}. FA-CASH-COMMAND remains In progress; no workflow closure is claimed.

## Correction

The previous forecast-card correction did not reach the internal Cash source wrapper: an authoritative empty result still became posted there. The wrapper now identifies no-upcoming-period results as empty/operational, withholds a posted grade for unknown reasons, reserves posted for unblocked source-linked results, and preserves blocked status when authority or required proof is missing. Domain amounts, hashes, query scope and posting requirements remain unchanged. Only the source wrapper and its tests changed.

## Handoff contract

The collected-cash card targets /dashboard/finance/payments using finance.read. That permission is accepted by both the destination route and its dashboard action. The unreconciled-cash card targets /dashboard/finance/reconciliation using payments.reconciliation.read, matching the destination route. No additional permission-map entry was required.

Graph reports were used as a locator only: GRAPH_REPORT_components.md includes inferred CashCommandDashboard connections through generic String calls, which do not establish real handoffs. Current source and actual browser navigation establish these boundaries. Purchasing, close and inventory-loss action-queue routes still require runtime verification.

## Verification

- [Static regression](${staticFile}): 214 tests/seven suites, lint and full TypeScript passed with stable source. Six added source-level cases cover empty, source-linked, unknown and contradictory blocked inputs. A source-linked unit fixture is not evidence of actual payroll posting.
- [Owned runtime](${runtimeFile}): actual payroll reads return empty/operational before a synthetic due period is created; the unposted period then returns blocked/null. Four EN desktop/FR mobile journeys follow the two finance links by keyboard, return through browser Back with locale intact, then withdraw permission while a link is rendered and verify destination denial. Eight screenshots are retained. No captured page errors occurred.
- Balance records, payment counts and journal counts remain unchanged across the navigation reads. Role changes and synthetic fixture setup are intentional test effects. No approval, posting, payment, external message, migration or deployment occurred.
- Development handoff times are recorded as observations, not an approved performance budget or production certification. These journeys prove entry and denial, not the complete downstream payment or reconciliation lifecycle.

## User guidance and review

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. Collected cash opens the payment ledger; unreconciled cash opens the reconciliation workspace. A permission withdrawn after the page loads can still leave a visible link, but the destination must deny the operation. Refresh Cash Command to obtain current permitted indicators. Empty payroll source evidence means no eligible due records in the selected horizon; it never proves that payroll was posted.

Backend/data/finance/audit review: source classifications now agree with the cards without altering financial truth. Security: admission and destination revalidation remain server-owned. UX/localization: EN/FR routing, keyboard entry and recovery through Back exercised; broader source-copy translation and native accessibility remain open. SRE/quality: exact source bindings and isolated regression retained. Statutory, pricing, provider, offline and AI rules: not applicable to this metadata change and read-only handoff verification. These are engineering reviews, not professional approvals.

Recovery requires reverting only the reviewed source-wrapper classification hunk and corresponding tests, then rerunning affected checks; preserve unrelated changes. No schema rollback is needed. Remaining requirements are retained in the workflow register and CURRENT_PROGRESS.md.
`,{flag:'wx'});
console.log(JSON.stringify({report,review:'evidence/cash-finance-handoff-review-2026-09-30.json'}));
