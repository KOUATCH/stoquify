const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const testsFile='evidence/cash-visibility-checks-c19d425c-ef36-43e6-92cb-718f9f21d9a8.json';
const runtimeFile='lanes/environment/cash-visibility-e9ed9334-f743-48a4-b2d1-b460a2b7f9cd.json';
const tests=JSON.parse(fs.readFileSync(path.join(root,testsFile))),runtime=JSON.parse(fs.readFileSync(path.join(root,runtimeFile)));
assert.ok(tests.sourceStable&&tests.steps.every(step=>step.status===0));
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads&&runtime.checks.length===8);
const sourceHashes={...tests.sourceAfter,...runtime.sourceAfter};
for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(path.join(repo,file)),expected,file);
const previous=JSON.parse(fs.readFileSync(path.join(root,'evidence/cash-proof-boundary-review-2026-09-27.json')));
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report:'CASH_COMMAND_VISIBILITY_2026-09-28.md',sourceHashes,
 receipts:[testsFile,runtimeFile].map(file=>({file,sha256:sha(path.join(root,file))})),
 artifacts:runtime.checks.map(row=>({file:'lanes/environment/'+row.screenshot,sha256:sha(path.join(root,'lanes/environment',row.screenshot))})),
 verifiedSubcriteria:[...previous.verifiedSubcriteria,'unit_domain_projection_and_hidden_source_invariance','unit_independent_payroll_subdomain_permissions','owned_en_fr_payroll_permission_module_revocation_retained_read','owned_foreign_payroll_balance_absent_from_dto_and_route_payload','owned_cash_read_preserves_business_records'],
 remaining:[
 'Domain aggregates are projected before browser serialization; broad source snapshots are still loaded before domain admission. Implement scoped source reads and useful domain-specific provenance without duplicate queries.',
 previous.remaining[1],
 'Actual proof discovery/opening and recovery need database/browser verification; aggregate runtime proof does not establish that lifecycle.',
 'Payroll destination permissions disagree with some card links; the stock card targets a nonexistent inventory/stock route. Verify and correct authorized handoffs.',
 'Complete EN/FR service and shared-component copy, honest current-observation labels, keyboard/contrast/reflow and route-latency investigation. Synthetic read fixtures do not verify genuine posted payroll.'
 ],
 limits:['Synthetic DRAFT payroll read fixtures; no approval, posting or payment execution claimed.','Eight views cover aggregate access, not full Cash Command lifecycle or localization.','Development interaction times include compilation and screenshot/assertion work; no production latency claim.'],
 interruptedAttempt:'Earlier session 56446 lost its tool host and retained no result. On Sept 28 no matching owned verifier process or receipt remained; a new isolated fixture run produced the current receipt.'};
fs.writeFileSync(path.join(root,'evidence/cash-visibility-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,review.report),`# Cash Command aggregate access — bounded correction

Verified ${review.at}. FA-CASH-COMMAND remains In progress.

## Delivered behavior

The browser receives a service-owned projection: domain permission and current module read admission control amounts, cards, summaries, proof identifiers and related metadata. Denied amounts are unavailable, not zero. Payroll payments and statutory amounts have separate permissions. Mixed-source hashes, blockers and timestamps cannot reveal a denied domain through a permitted card. Hidden queue counts are null. Drawer and module diagnostics require their own authority. EN/FR explains that unavailable values do not establish a zero balance.

## Verification and failed attempts

- Before-fix regressions exposed payroll 350000, statutory 90000 and nine cards despite denial: evidence/cash-visibility-before.json.
- Hidden-source differential testing found private blocker state affecting a permitted drill-through. The route now remains independent of the inaccessible snapshot flag. Failed attempt preserved in evidence/cash-visibility-checks-75c7cf5f-5f47-4c40-bb64-23846fb48e89.json.
- Final focused 35 tests in four suites, changed-file lint and full TypeScript passed: ${testsFile}. All recorded source hashes revalidated before reuse. Earlier unrelated TypeScript errors are absent from this later run; no ownership of their correction is claimed.
- Actual owned PostgreSQL and authenticated route: ${runtimeFile}. Allowed, permission-revoked, payroll-suspended and retained-read states each passed EN 1440px / FR 320px. Denied payroll and foreign-tenant balances were absent from serialized route data. Checked balances, journals and payments remained unchanged by reads. Eight screenshots have exact bindings in evidence/cash-visibility-review-2026-09-28.json.
- The interrupted prior process produced no result and is not counted. A fresh isolated fixture run succeeded. No migration, deployment, real payment or external delivery occurred.

## Practical use

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. An organization administrator supplies role permissions and eligible modules through existing controls. Missing permission is not missing business activity. Users needing payroll balances require payroll.payments.reconcile plus readable payroll access; statutory totals require payroll.declarations.manage. Retained read access does not authorize new work. Genuine payroll approval and posting must be completed through their owning workflows.

## Remaining requirements

${review.remaining.map(value=>'- '+value).join('\n')}

The inspected FR screenshot visibly contains English source labels and shared components. Only the new unavailable-value notice is localized by this correction. Development view durations ranged from 4.4 to 7.0 seconds after the first 73.6-second compilation-influenced view; these are full test interactions, not isolated query timings or approved performance budgets.

## Review responsibilities

Architecture/backend/data/security: source-owned projection and domain/tenant boundaries verified within the recorded scope; broad underlying queries remain open. Frontend/workflow/accessibility/localization: notice and no-overflow checks passed; broader requirements remain open. Finance/audit: no zero substitution or financial mutation; authentic posted obligations remain unverified. Product/quality/SRE/rollout: regression and runtime evidence retained; no release certification. Packaging: current module access remains distinct from financial state. Statutory, billing, providers, AI, offline and new migrations: not applicable to this read projection; no rules or operations changed.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8');
const start=source.indexOf('cashRead.closureReview.verifiedCriteria = cashProofCurrent');
const end=source.indexOf('const currentCashLane =',start);assert.ok(start>0&&end>start);
source=source.slice(0,start)+`const cashVisibility = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-visibility-review-2026-09-28.json')));
for (const row of [...cashVisibility.receipts, ...cashVisibility.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash visibility evidence changed: ' + row.file);
const cashVisibilityCurrent = Object.entries(cashVisibility.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
cashRead.closureReview.verifiedCriteria = cashVisibilityCurrent ? cashVisibility.verifiedSubcriteria : cashProofCurrent ? cashProof.verifiedSubcriteria : [];
cashRead.closureReview.note = 'Aggregate output and retained proof regressions have focused evidence; eight owned EN/FR aggregate views passed. Scoped source reads, proof lifecycle, full localization and financial handoffs remain open.';
cashRead.closureReview.proofSourceBindingCurrent = cashProofCurrent;
cashRead.closureReview.aggregateSourceBindingCurrent = cashVisibilityCurrent;
cashRead.implementationStatus = 'partial_domain_projection_verified_source_reads_and_proof_recovery_pending';
cashRead.runtimeStatus = 'owned_en_fr_aggregate_permissions_revocation_retention_and_tenant_boundary_verified';
cashRead.remaining = cashRead.remaining.filter(value => !cashProof.remaining.includes(value));
for (const gap of cashVisibility.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
for (const report of [cashProof.report, cashVisibility.report, 'evidence/cash-visibility-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
`+source.slice(end);
source=source.replace('evidence: cashRead.evidence, implementationStatus: cashRead.implementationStatus','evidence: cashRead.evidence, implementationStatus: cashRead.implementationStatus, runtimeStatus: cashRead.runtimeStatus');
source=source.replace('Proof-discovery authorization and posted-journal query contract; prior currency/null checks | Aggregate authorization, proof recovery, runtime/EN/FR and genuine posted payroll | Engineering | Correct domain projections before cosmetic work','Domain output permissions, tenant isolation, retained-read and proof-query contracts | Scoped source reads, proof recovery, full EN/FR and posted payroll | Engineering | Correct proof state and domain handoffs');
const a=source.indexOf('**Since the previous report:**'),b=source.indexOf('**Backlog:**',a);assert.ok(a>0&&b>a);
source=source.slice(0,a)+`**Since the previous report:** Domain output projection now removes denied totals, metadata and hidden queue counts; payroll payment/statutory access is independent. Thirty-five focused tests across four suites, lint and full TypeScript passed. Current source hashes match those checks. Eight actual EN/FR views verified allowed, permission-revoked, suspended and retained-read access, absence of foreign payroll balances in serialized output, no horizontal overflow and unchanged business records. See [bounded correction and current evidence](CASH_COMMAND_VISIBILITY_2026-09-28.md). The prior interrupted verifier had no retained result and was replaced only after confirming its process was gone. No workflow was added or closed.

**Remaining priority:** Broad source queries still run before output authorization; domain-specific provenance and query scoping are unfinished. Proof drawers share unsafe request state. Payroll/inventory handoffs and full localization require correction. The French screenshot confirms remaining English text. Genuine posted payroll lifecycle and complete accessibility remain unverified. Synthetic read fixtures establish no approval or posting. No migration, deployment or live customer change occurred.

`+source.slice(b);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,target);
console.log(JSON.stringify({report:review.report,criteria:review.verifiedSubcriteria.length}));
