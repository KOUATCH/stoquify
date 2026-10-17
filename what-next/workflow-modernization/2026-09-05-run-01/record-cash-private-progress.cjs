const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const staticFile='evidence/cash-private-checks-6584ea53-f92b-4437-aa12-f8aac7e4b45e.json',runtimeFile='lanes/environment/cash-private-82358d34-39e8-4ecb-9ec8-a08989cfe03b.json';
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-related-review-2026-09-28.json');
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads&&runtime.settingsDiagnosticsReadVerified&&runtime.checks.length===10);
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};
for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['services/cash-command/__tests__/cash-command.service.test.ts','services/cash-command/cash-command-contracts.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command.service.ts']);
const report='CASH_COMMAND_PRIVATE_SOURCES_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',report,completeWorkflowVerified:false,sourceHashes,priorImpact,
 receipts:[staticFile,runtimeFile,'lanes/environment/cash-private-22ff2620-e84e-4f6c-ba33-eee20ef9e7ca.json'].map(file=>({file,sha256:sha(path.join(root,file))})),
 artifacts:runtime.checks.map(row=>({file:'lanes/environment/'+row.screenshot,sha256:sha(path.join(root,'lanes/environment',row.screenshot))})),
 verifiedSubcriteria:['drawer_permission_and_current_module_admission_before_domain_query','withheld_drawer_source_remains_null_without_risk_or_health_claim','module_diagnostics_permission_before_query','owned_en_fr_drawer_dependency_revocation_retention_and_tenant_isolation'],
 impact:'Cash Command reads only organization name/currency after tenant authority, before private source queries. Drawer read requires CASH_DRAWER_READ and enforced current cash_drawer read admission, including dependencies. Full module diagnostics require MANAGE_SYSTEM_SETTINGS. Nullable contracts suppress unqueried drawer cards, changes, risks, trust, totals and signals; projection retains explicit source restrictions. Existing snapshot calculations, currency and payroll proof contracts, domain services, proof actions and UI presentation remain unchanged.',
 remaining:'Mixed tenant/payment/inventory/close snapshots still load before their domain output permissions. Replace them with independently authorized source reads and domain-specific provenance; preserve payroll proof/currency and failed-query contracts. Cash Command handoffs, complete server-authored EN/FR, remaining proof types and genuinely posted payroll lifecycle remain open.',
 limits:['Ten browser views cover the changed drawer-source states and existing unavailable-data banner; no new complete accessibility certification.','Synthetic drawer balances establish read isolation only, not cash operation correctness or ledger posting.','Module diagnostic current permission was exercised with actual source service calls; module-management lifecycle remains separate.']};
fs.writeFileSync(path.join(root,'evidence/cash-private-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Cash Command private source admission

${review.at}. Workflow FA-CASH-COMMAND remains In progress. Previous goal turn was progress: source reuse was implemented and verified. This turn completes the drawer/diagnostics portion of pre-query admission; the full source boundary remains open.

## Delivered correction

${review.impact}

Previously these services ran for every admitted Cash Command visitor and their results were discarded by the browser projection. The new path avoids unauthorized source access altogether. Name/currency no longer depend on loading drawer or module administration details. An unavailable organization rejects before business reads. Query or module-lookup failures remain failures; no empty success is substituted. Fresh requests recheck admission.

## Verification

- ${staticFile}: 63 tests/four suites, changed-file lint and full TypeScript passed. Coverage includes source ordering, missing permission, module denial, retained reads, unavailable organization, failed admission/query and fresh retry; independent related-source failure and prior currency/proof/UI tests remain covered.
- ${runtimeFile}: ten actual EN/FR browser views (desktop EN, 320px FR), with real PostgreSQL source admission and real module policies. States: required sales dependency suspended, authorized, permission revoked, cash_drawer suspended and retained read. Direct service instrumentation counted zero drawer calls for denied cases and one for permitted cases; module diagnostics were not queried without settings permission. An additional authorized settings call queried diagnostics exactly once. No module decision was mocked.
- Own synthetic drawer variance 7,654,321 was returned only when allowed; foreign 3,456,789 remained absent. Denied totals and drawer state were null, with no drawer card or confidence signal. Actual response inspection and the EN/FR unavailable-not-zero notice passed. No horizontal overflow. Synthetic drawer rows and transaction counts were unchanged during reads.
- FR suspended screenshot inspected: drawer information is absent and the French limitation remains visible. Remaining English server copy and broader Cash Command translation defects stay open; this is not full EN/FR closure.

Failed attempt cash-private-22ff2620-e84e-4f6c-ba33-eee20ef9e7ca expected an allowed read with a fixture missing the required sales grant. The real policy denied it correctly. The fixture was corrected, and dependency denial became an explicit matrix case. Initial verifier file generation failed with Windows EPERM, then the attempted execution reported missing module; no runtime verification occurred until the scoped write succeeded. No automatic approval-review rejection occurred.

## Operating guidance and recovery

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. The organization administrator must provide CASH_DRAWER_READ plus a valid cash_drawer module and its required dependency grants for drawer evidence. Retained read permits viewing, not cash operations. Settings diagnostics require MANAGE_SYSTEM_SETTINGS. Obtain these values from the current organization role and module configuration; no new form or external approval is introduced. A missing source is unavailable, not a zero balance. Retry a failed source read after the source/module service recovers.

No schema migration, production deployment, live activation, cash transaction, payment or external message occurred. Preserve the pre-query checks during recovery; reverting them would restore unauthorized source loads. The existing isolated fixtures are clearly synthetic and retained as test evidence.

## Remaining work and review

${review.remaining}

Security/backend: actual current permission/module admission precedes source calls. Data/finance/audit: null semantics, tenant isolation and business-row invariance; no financial certification. Architecture/frontend: existing composition supports absent sources without fake snapshots, existing UI reused. Quality/SRE: focused tests and actual isolated runtime, no production budget claim. Product/operations: existing roles/modules retained, no packaging change. Statutory, external providers, offline, AI and migrations: not applicable to this bounded correction. Full workflow original requirements remain active.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8');
const marker='const cashRelatedCurrent =';assert.ok(source.includes(marker));
source=source.replace(marker,()=>`const cashPrivate = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-private-review-2026-09-28.json')));
for (const row of [...cashPrivate.receipts, ...cashPrivate.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash private-source evidence changed');
const cashPrivateCurrent = Object.entries(cashPrivate.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
for (const row of cashPrivate.priorImpact) if (cashRelated.sourceHashes[row.file] !== row.before || cashPrivate.sourceHashes[row.file] !== row.after) throw new Error('Invalid private-source impact');
const cashRelatedCurrent =`);
source=source.replace('const cashRelatedCurrent = Object.entries(cashRelated.sourceHashes)', 'const cashRelatedCurrent = cashPrivateCurrent && Object.entries(cashRelated.sourceHashes)');
source=source.replace('=== expected);\nfor (const row of cashRelated.priorImpact)', '=== (cashPrivate.priorImpact.find(row => row.file === source)?.after ?? expected));\nfor (const row of cashRelated.priorImpact)');
source=source.replaceAll('=== (cashRelated.priorImpact.find', '=== (cashPrivate.priorImpact.find(row => row.file === source)?.after ?? cashRelated.priorImpact.find');
source=source.replace('...cashRelated.verifiedSubcriteria]', '...cashRelated.verifiedSubcriteria, ...cashPrivate.verifiedSubcriteria]');
source=source.replace('const currentCashLane =', `for (const report of [cashPrivate.report, 'evidence/cash-private-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.privateSourceBindingCurrent = cashPrivateCurrent;
cashRead.implementationStatus = 'drawer_and_diagnostics_prequery_admission_verified_mixed_sources_pending';
const currentCashLane =`);
const a=source.indexOf('**Since the previous report:**'),b=source.indexOf('**Backlog:**',a);assert.ok(a>0&&b>a);
source=source.slice(0,a)+`**Since the previous report:** Drawer permission and current module/dependency checks now precede source reads; settings diagnostics are queried only with settings permission. Withheld drawer values stay null and produce no drawer risk or health claims. Ten actual EN/FR browser views and real database calls verified dependency denial, authorization, permission revocation, suspension, retained read and tenant isolation. Sixty-three focused tests/four suites, lint and TypeScript passed. A failed fixture lacked a required dependency; the real guard correctly denied it, and the corrected matrix explicitly tests that condition. [Evidence and guidance](CASH_COMMAND_PRIVATE_SOURCES_2026-09-28.md). No workflow was added or closed.

**Remaining priority:** Payment, inventory, close and the mixed tenant snapshot still need independently authorized reads and domain-specific provenance. Preserve payroll currency/proof and failed-query semantics. Payroll/inventory handoffs, server-authored EN/FR, remaining proof types and genuinely posted payroll lifecycle remain open. Existing proof accessibility evidence has its recorded scope; native screen-reader speech/browser zoom remain unverified. No migration, deployment, cash operation or live customer change occurred.

`+source.slice(b);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,target);console.log(JSON.stringify({report,criteria:review.verifiedSubcriteria.length,sourceImpact:priorImpact.map(row=>row.file)}));
