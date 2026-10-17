const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),hash=f=>sha(fs.readFileSync(f)),read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const staticFile='evidence/cash-sources-checks-2297b09b-19bb-4ae3-a5c9-d59b65e20c66.json',runtimeFile='lanes/environment/cash-sources-4011fff6-b709-499b-a04d-cca4b43509bb.json',payrollFile='lanes/environment/payroll-source-null-f9ba77fb-2a01-4c4e-8bda-31a813dc68f8.json';
const tests=read(staticFile),runtime=read(runtimeFile),payroll=read(payrollFile),prior=read('evidence/payroll-extraction-review-2026-09-28.json');
for(const receipt of [tests,runtime,payroll])assert.ok(receipt.passed&&receipt.sourceStable);
assert.equal(runtime.checks.filter(row=>row.permission).length,35);assert.equal(runtime.checks.filter(row=>row.screenshot).length,8);assert.ok(runtime.noBusinessMutationsDuringReads&&runtime.failedQueryAndRetryVerified);
assert.ok(payroll.checks.every(row=>row.aggregateEquivalent&&row.independentMetricsEquivalent&&row.unavailableProviderVerified));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter,...payroll.sourceAfter};
for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
const allowed=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','services/cash-command/__tests__/cash-command.service.test.ts','services/payroll/payroll-finance-forecast.service.ts'];
assert.deepEqual(priorImpact.map(row=>row.file).sort(),allowed.sort());
let forecast=fs.readFileSync(path.join(repo,'services/payroll/payroll-finance-forecast.service.ts'),'utf8').replace(/\r\n/g,'\n');
forecast=forecast.replace('paymentTruth: SnapshotResult<PaymentTruthMetrics> | null','paymentTruth: SnapshotResult<PaymentTruthMetrics>').replace('      input.paymentTruth !== null &&\n','').replace('input.paymentTruth?.freshness.sourceMaxUpdatedAt ?? null,','input.paymentTruth.freshness.sourceMaxUpdatedAt,');
const headerEnd=forecast.indexOf('const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS');
const restoredForecast=forecast.slice(0,headerEnd).replace(/\n/g,'\r\n')+forecast.slice(headerEnd);
assert.equal(sha(restoredForecast),prior.sourceHashes['services/payroll/payroll-finance-forecast.service.ts'],'Only nullable provider input, short-circuit and optional freshness changed; retain original mixed header line endings for comparison');
const report='CASH_COMMAND_SOURCE_ADMISSION_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['seven_source_permission_and_current_module_admission_before_domain_queries','denied_sources_null_without_mixed_tenant_reads','domain_specific_cash_balance_and_forecast_provenance','owned_35_source_grant_cases_and_en_fr_eight_views','source_query_failure_retry_and_nullable_provider_proof'],
 receipts:[staticFile,runtimeFile,payrollFile,'lanes/environment/cash-sources-f88fcb26-25a5-4d9b-b674-d2aef5ad8fc5.json'].map(file=>({file,sha256:hash(path.join(root,file))})),
 artifacts:runtime.checks.filter(row=>row.screenshot).map(row=>{const file='lanes/environment/'+row.screenshot;return{file,sha256:hash(path.join(root,file))}}),
 sharedImpact:'Payroll calculator changes only permit a null payment source and fail provider proof closed when payment batches exist; old non-null behavior is exactly reconstructed and DB-equivalent. BI adapter change is its input kind type only; runtime implementation unchanged. Existing tenant snapshot and Digest sources unchanged. Seven focused consumer suites, lint and full typecheck pass.',
 remaining:['Payroll destination permissions and stock route handoffs remain open.','Full server-authored EN/FR copy, honest observation labels and empty payroll forecast evidence grade require correction.','Remaining proof subjects, genuinely posted payroll lifecycle, accessibility and route-latency closure remain open.']};
fs.writeFileSync(path.join(root,'evidence/cash-sources-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Cash Command source admission

${review.at}. FA-CASH-COMMAND remains In progress. This closes the pre-query domain-admission criterion, not the entire workflow.

Cash Command no longer invokes the mixed tenant operating snapshot. It checks each source permission and current module read grant before querying collected cash, reconciliation, inventory, close, employee balances, payroll forecasts and overdue purchasing. Request-local grant reuse avoids duplicate payroll module checks; the next request evaluates current grants again. Existing tenant-wide authority, active-organization check, drawer admission, inventory-loss admission, diagnostics permission and final browser projection remain effective.

Denied sources produce null values, omitted cards and explicit restrictions. A successful empty cash query is zero with empty source status. Query and entitlement failures reject; they are never converted to successful zero results. Cash, employee balances and payroll forecasts now carry their own hashes/freshness/blockers. Mixed payroll metadata is removed if either payment or declaration aggregate permission is absent. Mixed-currency employee balances retain separate evidence and no combined total. Payroll forecast hashes include the source-evidence fingerprint; absent provider evidence cannot satisfy the existing proof requirement.

## Verification

- ${staticFile}: 192 tests across seven suites, changed-file lint and full TypeScript passed. New cases cover all seven permission/query boundaries, retained-read admission, entitlement/query failures, retry, revocation, tenant predicates, empty-versus-denied data and mixed currencies.
- ${runtimeFile}: 35 actual PostgreSQL cases: seven source permissions, each active, permission-denied, suspended, expired and read_only. Real source calls were counted, aggregate tenant predicates checked, foreign fixture sentinels excluded and controlled query failure/retry verified. Eight authenticated EN desktop/FR 320px mobile views verified active/revoked/suspended/retained payroll reads with independent permitted cash. Screenshots and timings are in that receipt; the French suspended screenshot was visually inspected. Existing source cards still contain English text; these are language-route/access checks, not complete localization approval.
- ${payrollFile}: actual read-only comparison with retained original code preserves full tenant and independent payroll results for empty and incomplete-proof cases. Additional null-provider reads retain the missing-provider blocker and null total when required. Synthetic POSTED-labelled incomplete-proof records do not establish a genuinely posted payroll lifecycle.
- ${review.sharedImpact}

The first runtime attempt failed because the chosen foreign sentinel 7654321 was a substring of the owned balance 987654321. The failed receipt is retained; the corrected verifier uses a distinct foreign value. Initial shell attempts hit Windows EPERM while writing scripts/evidence; the authorized elevated rerun retained the complete passing evidence. No automatic-review rejection occurred. Initial TypeScript identified a nullable provider count and was corrected before the passing run.

## User and operator guidance

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. No migration or new input is needed. An unavailable indicator does not mean zero: ask the organization administrator to inspect the corresponding existing permission and module read grant. Cash uses finance.read; reconciliation uses payments.reconciliation.read; inventory uses inventory.read; close uses accounting.close.read; payroll balances/net pay use payroll.payments.reconcile; declarations use payroll.declarations.manage; receiving signals use purchases.orders.read. Grant administration does not supply missing posting, declaration, provider or currency-conversion proof. Refresh after authorized access changes. A read_only grant permits existing evidence inspection, without authorizing new business operations.

On a source error, retain the page error and retry after the underlying service recovers. Do not substitute an empty snapshot. Deployment remains unperformed. No schema changes are required; any rollout must use the existing release process and observe source failures/denials. Recovery should restore the coherent previous Cash orchestrator/contracts/projection and adapter/input changes together; do not weaken domain admission or manufacture proof. Isolated fixture setup changed only synthetic records, roles and grants; business records were unchanged during reads. Audit decisions remain permitted logging effects.

## Remaining and review responsibilities

${review.remaining.map(s=>'- '+s).join('\n')}

Architecture/backend/data/security: independently admitted domain sources, tenant-scoped aggregates, current read-only/expiry rules and null semantics verified. Finance/payroll/audit: currency and proof rules retained; genuine posting not claimed. Frontend/UX: responsive access states checked; full translation, empty-forecast grading and observation wording remain open. Quality/SRE: scoped regression, real DB/browser evidence and honest failed attempts; development timings are not production certification. Product/packaging/operations: no entitlement expansion or price change. Country rules, offline, AI and migrations: not applicable; their policies/lifecycles are unchanged.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let s=fs.readFileSync(target,'utf8');
s=s.replace('const payrollExtractionCurrent =',`const cashSources = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-sources-review-2026-09-28.json')));
for (const row of [...cashSources.receipts, ...cashSources.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash source evidence changed');
for (const row of cashSources.priorImpact) if (payrollExtraction.sourceHashes[row.file] !== row.before || cashSources.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash source impact');
const cashSourcesCurrent = Object.entries(cashSources.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashSourcesCurrent) throw new Error('Cash source dependency changed; review required');
const payrollExtractionCurrent = cashSourcesCurrent &&`);
s=s.replace("=== expected);\nif (!payrollExtractionCurrent)","=== (cashSources.priorImpact.find(row => row.file === source)?.after ?? expected));\nif (!payrollExtractionCurrent)");
s=s.replaceAll('=== (payrollExtraction.priorImpact.find','=== (cashSources.priorImpact.find(row => row.file === source)?.after ?? payrollExtraction.priorImpact.find');
s=s.replace('...payrollExtraction.verifiedSubcriteria]', '...payrollExtraction.verifiedSubcriteria, ...cashSources.verifiedSubcriteria]');
s=s.replace('const currentCashLane =',`for (const report of [cashSources.report, 'evidence/cash-sources-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.sourceAdmissionBindingCurrent = cashSourcesCurrent;
cashRead.closureReview.note = 'Independent source permission/module reads and domain provenance verified; remaining handoffs, language copy, proof subjects and genuinely posted payroll prevent closure.';
cashRead.implementationStatus = 'independent_domain_source_admission_and_provenance_verified';
cashRead.runtimeStatus = 'owned_35_source_cases_and_en_fr_eight_views_verified';
cashRead.remaining = cashRead.remaining.filter(value => value !== 'Domain aggregates are projected before browser serialization; broad source snapshots are still loaded before domain admission. Implement scoped source reads and useful domain-specific provenance without duplicate queries.');
cashRead.remaining = cashRead.remaining.map(value => value.replace('Entry/source owner located; full aggregation and destination authorization trace pending.', 'Independent source reads verified; destination authorization and complete lifecycle remain pending.').replace('Source read scoping and finance/payroll/inventory handoffs remain open.', 'Independent source admission verified; finance/payroll/inventory handoffs remain open.'));
for (const gap of cashSources.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane =`);
s=s.replace('Domain output permissions, tenant isolation, retained-read and proof-query contracts | Scoped source reads, remaining proofs, full EN/FR and posted payroll | Engineering | Scope source queries and verify domain handoffs','Source/output admission, domain provenance, tenant isolation and retained reads | Handoffs, remaining proofs, EN/FR, honest states and posted payroll | Engineering | Correct and verify authorized handoffs');
const p=s.indexOf('**Since the previous report:**'),q=s.indexOf('**Backlog:**',p);assert.ok(p>0&&q>p);
s=s.slice(0,p)+`**Since the previous report:** Cash Command now queries domains independently after permission and current module checks. Denied data remains null; permitted source failures remain errors. Cash, recovery and forecast cards have domain provenance. 192 tests/seven suites, lint and TypeScript passed; 35 real source/grant cases and eight EN/FR browser views passed. Existing payroll results remain DB-equivalent; unavailable provider proof fails closed. [Evidence, failures and operator guidance](CASH_COMMAND_SOURCE_ADMISSION_2026-09-28.md). No workflow was added or closed.

**Remaining priority:** Correct payroll/inventory handoffs, server-authored EN/FR, honest observation/empty-forecast labels, remaining proof subjects and genuinely posted payroll lifecycle. Current browser checks verify access and reflow, not complete translation. Native screen-reader speech/browser zoom and production latency remain unverified. No migration, deployment or real cash operation occurred.

`+s.slice(q);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s);fs.renameSync(pending,target);console.log(JSON.stringify({report,review:'evidence/cash-sources-review-2026-09-28.json',priorImpact:priorImpact.map(row=>row.file)}));
