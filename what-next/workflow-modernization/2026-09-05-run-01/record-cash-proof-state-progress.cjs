const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const testFile='evidence/cash-visibility-checks-bddc10b4-7464-45e1-88bd-d1a4bb2aaf2f.json';
const runtimeFile=process.argv[2];assert.ok(/^lanes\/environment\/cash-proof-state-[a-f0-9-]+\.json$/.test(runtimeFile));
const tests=JSON.parse(fs.readFileSync(path.join(root,testFile))),runtime=JSON.parse(fs.readFileSync(path.join(root,runtimeFile)));
assert.ok(tests.passed&&runtime.passed&&runtime.sourceStable&&runtime.checks.length===2&&runtime.noPaymentMutation);
const prior=JSON.parse(fs.readFileSync(path.join(root,'evidence/cash-visibility-review-2026-09-28.json')));
const sourceHashes={...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(path.join(repo,file)),expected,file);
const changed=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(changed.map(row=>row.file).sort(),['components/cash-command/CashCommandDashboard.tsx','components/cash-command/__tests__/CashCommandDashboard.test.tsx'].sort());
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report:'CASH_COMMAND_PROOF_STATE_2026-09-28.md',sourceHashes,aggregateImpact:changed,
 receipts:[testFile,runtimeFile].map(file=>({file,sha256:sha(path.join(root,file))})),artifacts:runtime.checks.map(row=>({file:'lanes/environment/'+row.screenshot,sha256:sha(path.join(root,'lanes/environment',row.screenshot))})),
 verifiedSubcriteria:['unit_single_proof_drawer_and_reverse_response_order','unit_scope_withdrawal_and_subject_tenant_response_match','owned_en_fr_proof_transport_retry_escape_focus_return','owned_current_proof_permission_revocation_and_no_payment_mutation'],
 remaining:'Cash proof state and payment-proof recovery are corrected and verified. Complete other proof types, pending-close browser races, full dialog localization, contrast and broader accessibility; no complete proof-workflow closure claimed.',
 impactRationale:'Only Cash Command proof state/rendering and its component tests changed. No domain projection, service, action, shared drawer, module guard or route source changed. All 35 previous regression cases still pass alongside six new cases; actual payment proof reads and aggregate denial on reload exercised on the current component. Earlier aggregate runtime receipt stays immutable and is reused with this bounded impact review.'};
fs.writeFileSync(path.join(root,'evidence/cash-proof-state-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,review.report),`# Cash Command proof state — bounded correction

${review.at}. Parent workflow remains In progress.

Multiple hosts previously shared one open flag and proof result; late responses could replace the selected record, and transport failure escaped recovery. Each opening now has a subject identity and request sequence. Selection/close clears old data; stale responses and unmatched tenant/subject payloads are discarded. A server scope change remounts the proof section immediately. One selected drawer receives loading, error or actual proof data. Close/reopen retries, with generic EN/FR recovery copy and focus returned to the initiating button.

## Evidence

- ${testFile}: 41 tests/four suites, lint and TypeScript passed. Tests cover overlapping requests, scope withdrawal, wrong subject/tenant response, EN/FR transport recovery and focus return.
- First focus-return failure retained: evidence/cash-visibility-checks-46f199bc-5ade-46e8-948e-2c035d646380.json. The inline test drawer's close button replaced the captured trigger; dialog buttons are now excluded from capture. Assertions were retained.
- ${runtimeFile}: actual EN desktop and FR 320px browser. Forced failed server-action transport, keyboard open, one dialog, Escape/focus return, actual payment proof retry, permission revocation and identifier withdrawal passed. Synthetic PENDING payment row unchanged by reads; this is no payment execution/posting evidence.
- Source/receipt/screenshot bindings and aggregate impact: evidence/cash-proof-state-review-2026-09-28.json.

${review.impactRationale}

## User procedure and remaining work

On /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command, choose an available proof. A loading state replaces previous evidence. If loading fails, close the panel and reopen the same proof. Escape returns to its button. Current server permissions control both discovery and loading; role changes require current data to be fetched. This patch does not provide real-time server-pushed revocation of an already open page.

${review.remaining} Source query scoping/provenance, finance/payroll/inventory handoffs, actual posted payroll and full Cash Command EN/FR remain open. The shared drawer still has English labels on the French route. No schema, production deployment, statutory approval, provider operation or release certification is included.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8');
const marker='const cashVisibilityCurrent = Object.entries(cashVisibility.sourceHashes).every';const index=source.indexOf(marker);assert.ok(index>0);
source=source.slice(0,index)+`const cashProofState = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-proof-state-review-2026-09-28.json')));
for (const row of [...cashProofState.receipts, ...cashProofState.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash proof state evidence changed: ' + row.file);
const cashProofStateCurrent = Object.entries(cashProofState.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
for (const row of cashProofState.aggregateImpact) if (cashVisibility.sourceHashes[row.file] !== row.before || cashProofState.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash aggregate impact');
`+source.slice(index);
source=source.replace('const cashVisibilityCurrent = Object.entries(cashVisibility.sourceHashes).every(([source, expected]) => crypto.createHash', 'const cashVisibilityCurrent = cashProofStateCurrent && Object.entries(cashVisibility.sourceHashes).every(([source, expected]) => crypto.createHash');
source=source.replace("=== expected);\ncashRead.closureReview.verifiedCriteria = cashVisibilityCurrent", "=== (cashProofState.aggregateImpact.find(row => row.file === source)?.after ?? expected));\ncashRead.closureReview.verifiedCriteria = cashVisibilityCurrent");
// Source has mixed CRLF/LF from earlier surgical updates; the exact condition must be present.
assert.ok(source.includes('cashProofState.aggregateImpact.find(row => row.file === source)?.after ?? expected'));
source=source.replace('cashVisibilityCurrent ? cashVisibility.verifiedSubcriteria : cashProofCurrent', 'cashVisibilityCurrent ? [...cashVisibility.verifiedSubcriteria, ...cashProofState.verifiedSubcriteria] : cashProofCurrent');
source=source.replace("cashRead.closureReview.aggregateSourceBindingCurrent = cashVisibilityCurrent;", "cashRead.closureReview.aggregateSourceBindingCurrent = cashVisibilityCurrent;\ncashRead.closureReview.proofStateSourceBindingCurrent = cashProofStateCurrent;");
source=source.replace("'partial_domain_projection_verified_source_reads_and_proof_recovery_pending'", "'partial_domain_projection_and_proof_recovery_verified_source_reads_pending'");
source=source.replace('for (const gap of cashVisibility.remaining)', 'for (const gap of cashVisibility.remaining.filter(value => value !== cashProof.remaining[1] && !value.startsWith("Actual proof discovery/opening")))');
source=source.replace('!cashProof.remaining.includes(value));', '!cashProof.remaining.includes(value) && !value.startsWith("Actual proof discovery/opening"));');
source=source.replace('const currentCashLane =',`if (!cashRead.remaining.includes(cashProofState.remaining)) cashRead.remaining.push(cashProofState.remaining);
for (const report of [cashProofState.report, 'evidence/cash-proof-state-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
const currentCashLane =`);
source=source.replace('Scoped source reads, proof recovery, full EN/FR and posted payroll | Engineering | Correct proof state and domain handoffs', 'Scoped source reads, remaining proofs, full EN/FR and posted payroll | Engineering | Scope source queries and verify domain handoffs');
source=source.replace('Thirty-five focused tests across four suites', 'Forty-one focused tests across four suites');
source=source.replace('Current source hashes match those checks.', 'Current source hashes match the final checks; the earlier aggregate runtime is retained with an explicit drawer-only impact review.');
source=source.replace('No workflow was added or closed.', 'Proof request ordering, identity/scope withdrawal and generic transport recovery are now corrected; EN/FR actual payment-proof retry, Escape/focus return and revoked identifier withdrawal passed. See [proof state evidence](CASH_COMMAND_PROOF_STATE_2026-09-28.md). No workflow was added or closed.');
source=source.replace('Proof drawers share unsafe request state.', 'Remaining proof types, full dialog localization and broader accessibility still need verification.');
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,target);console.log(JSON.stringify({report:review.report,changed:changed.map(row=>row.file)}));
