const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const [staticFile,runtimeFile,...failedFiles]=process.argv.slice(2);for(const file of [runtimeFile,...failedFiles])assert.ok(/^lanes\/environment\/cash-queue-[\w-]+\.json$/.test(file));
assert.ok(/^evidence\/close-timezone-checks-[\w-]+\.json$/.test(staticFile));
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-finance-handoff-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable);const testSummary=tests.steps[0].stderr.match(/Tests:\s+\d+ passed, \d+ total/)?.[0];assert.ok(testSummary);
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads);assert.equal(runtime.checks.length,6);
assert.ok(runtime.checks.every(row=>row.sourceActionVerified&&row.keyboardHandoff&&row.recordVisible&&row.backRetainedLocale&&row.renderedLinkRevocation&&row.revokedActionRemoved&&row.retainedHistoryInvisible&&row.freshDeniedRecordAbsent&&row.noPageErrors));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
for(const [file,expected]of Object.entries(prior.sourceHashes))assert.equal(sourceHashes[file],expected,'No product change expected: '+file);
const report='CASH_COMMAND_QUEUE_HANDOFFS_2026-09-30.md';
const source='components/accounting/CloseAssuranceCenter.tsx',reproduction=failedFiles.find(file=>read(file).pageErrors?.some(row=>row.detail.includes('Hydration failed')&&row.detail.includes('As of:')));assert.ok(reproduction);
const before=read(reproduction).sourceBefore[source],after=sourceHashes[source];assert.notEqual(before,after);
const historical=require('node:child_process').execFileSync('git',['show','62a56036a5ac9b37236a20c9b148052199069479:'+source],{cwd:repo,windowsHide:true});assert.equal(crypto.createHash('sha256').update(historical).digest('hex'),before);
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact:[],
 correctionImpact:[{file:source,before,after,reproduction}],
 verifiedSubcriteria:['cash_purchasing_close_inventory_loss_actual_record_handoffs_en_fr','cash_queue_keyboard_back_permission_withdrawal_and_fresh_denial','cash_queue_handoffs_preserve_business_records','close_handoff_utc_evidence_and_period_dates_without_hydration_mismatch'],
 receipts:[staticFile,runtimeFile,...failedFiles].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.flatMap(row=>row.screenshots.map(name=>{const file='lanes/environment/'+name;return{file,sha256:hash(path.join(__dirname,file))}})),
 remaining:['Finish full server-authored and shared-component EN/FR copy, remaining proof subjects, genuine posted payroll and complete accessibility/latency requirements. Verified handoffs do not establish complete downstream purchasing, close or inventory-loss lifecycles.']};
fs.writeFileSync(path.join(__dirname,'evidence/cash-queue-review-2026-09-30.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,report),`# Cash action-queue handoffs

${review.at}. FA-CASH-COMMAND remains In progress. The previous turn was progress: source evidence was corrected and finance handoffs verified. This turn completes the remaining named queue-handoff checks; it does not complete their downstream business lifecycles or the Cash workflow.

## Verified boundaries

| Cash action | Destination | Current source/destination permission | Persisted record inspected |
|---|---|---|---|
| Overdue purchase receiving | /dashboard/purchase-orders | purchases.orders.read | Submitted order with past expected delivery |
| Close blocker | /dashboard/accounting/close | accounting.close.read | Blocked close run and its accounting period |
| Recorded inventory loss | /dashboard/inventory/loss-control | inventory.levels.read | Loss item and adjustment details dialog |

The existing mappings are correct. Current service results and actual links were checked separately. Each destination was reached by keyboard in EN desktop and FR mobile. Back returned to the Cash route with locale intact. After withdrawing the domain permission while a link was rendered, each destination displayed denial, concealed the source record, and excluded its reference from a fresh server response. Reloading Cash removed the denied action from both the rendered queue and service result. Read-only close controls remained disabled. Loss details opened and closed by keyboard.

The close handoff exposed a real timestamp hydration defect: the server rendered 10:46 while the New York browser rendered 5:46 for the same evidence timestamp. A repeat with screenshot caret mutation disabled confirmed the date mismatch. CloseAssuranceCenter now renders evidence timestamps explicitly in UTC with a visible UTC suffix and renders accounting-period dates in UTC to avoid shifting calendar boundaries. No authorization, close calculation or persisted record changed.

## Evidence and limits

[Runtime receipt](${runtimeFile}) records six passed journeys, twelve screenshots, exact source hashes, development handoff timings and unchanged purchase-order, close-run and stock-adjustment records plus unchanged payment, journal, business-event and receipt counts. Fixtures are synthetic historical read inputs; creating a completed adjustment fixture is not evidence that the adjustment approval/posting lifecycle passed. No live customer, real payment, external message, migration, deployment or gate clearance was performed.

[Focused regression](${staticFile}): ${testSummary}; three suites, changed-file lint and full TypeScript passed. Added EN/FR rendering checks simulate a Honolulu default timezone and assert unchanged UTC instants and accounting-period calendar dates. The actual browser uses New York time and verifies the visible UTC label without captured page errors. The prior Cash-specific evidence remains bound through the preceding finance review. These checks do not prove production performance, full accessibility, translated source copy, genuine posted payroll or all downstream operations.

Five failed attempts are retained. The first direct service invocation omitted the fixture's actual admin role and was correctly rejected. The next two used a partial order-reference match that also matched the signed-in fixture email, causing false data-presence failures on a visibly denied page. The next two exposed and isolated the real close timestamp mismatch. The final verifier uses a distinct order reference and exact order/item matching. It also independently checks a fresh denied server response. Previously delivered browser data is not claimed to have been erased; visibility and new server delivery are the tested controls.

## Review and operating guidance

Architecture/backend/security: reuse existing routes, server permission checks and service-owned action projection. Finance/audit/data: no domain transitions and persisted-record equality across reads. Purchasing/close/inventory: verified entry into the owning workspaces and their permitted records; receiving, certification, adjustment approval and posting remain separate workflows. UX/quality: keyboard navigation, locale-preserving Back and denied recovery exercised. SRE: development measurements only. Statutory rules, billing, provider execution, offline and AI: not applicable to this handoff-only verification. No professional certification is claimed.

From /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command, use the action queue to open the owning workspace. Resolve the condition there under its existing controls. A visible link does not preserve permission after revocation; refresh Cash to see current available actions. The operations reviewed here require the permissions in the table and an eligible module. Close evidence timestamps explicitly use UTC. No schema change occurred; rollback only the reviewed formatter and corresponding tests if needed, then rerun the linked checks.

Next: complete source and shared-component EN/FR presentation, remaining proof subjects, genuine posted payroll and outstanding accessibility/performance criteria. The original full-platform objective and unresolved register remain intact.
`,{flag:'wx'});
console.log(JSON.stringify({report,review:'evidence/cash-queue-review-2026-09-30.json'}));
