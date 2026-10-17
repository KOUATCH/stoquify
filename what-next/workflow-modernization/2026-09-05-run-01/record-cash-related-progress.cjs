const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const staticFile='evidence/cash-related-checks-711ad1b9-ef0a-4a3e-a1f1-7b8627e853be.json';
const runtimeFile='lanes/environment/cash-related-8f869a02-eb8e-4773-8328-95ce048528dd.json';
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/proof-portal-review-2026-09-28.json');
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutation);
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};
for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['services/cash-command/__tests__/cash-command.service.test.ts','services/cash-command/cash-command.service.ts']);
const testTotal=tests.steps[0].stderr.match(/Tests:\s+(\d+) passed/)[1];
const report='CASH_COMMAND_RELATED_SOURCES_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',report,completeWorkflowVerified:false,sourceHashes,priorImpact,
 receipts:[staticFile,runtimeFile].map(file=>({file,sha256:sha(path.join(root,file))})),verifiedSubcriteria:['related_snapshot_reads_reused_with_identical_real_aggregate','related_source_failure_rejects_before_aggregate_and_fresh_retry_succeeds'],
 limits:['Source admission remains after broad reads. This change only eliminates repeated payment, inventory and close reads.','One owned synthetic fixture established database equivalence. No new browser run was needed for this service-only orchestration change; existing visual/access evidence is reused with explicit source impact and current UI unit coverage.','Recorded single-process timings are ordered cold/warm observations, not an unbiased speed comparison or production budget result.'],
 impact:'Only Cash Command orchestration and its tests changed. It now calls the existing tenant aggregate FromRelated entry with the same three objects passed to cards/signals. Shared snapshot builders, domain projections, schema, actions, portal and destination policies are unchanged. Real database equivalence covers aggregate metrics, source hash, freshness, blockers, disclosed summary, proof subjects and card values/states; financial rows remain unchanged.'};
fs.writeFileSync(path.join(root,'evidence/cash-related-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Cash Command related-source reuse

${review.at}. FA-CASH-COMMAND remains In progress.

## Correction and evidence

Cash Command used to read payment, inventory and close snapshots directly and again through the tenant operating snapshot. It now supplies its existing results to getTenantOperatingSnapshotFromRelated. This removes redundant reads and ensures the cards and aggregate use the same related evidence. It does not create a transaction-wide database snapshot.

${review.impact}

- ${staticFile}: ${testTotal} tests/four suites, changed-file lint and full TypeScript passed. New cases cover exact object reuse, one call per related source, independent failure of each source, no aggregate/signal/proof discovery after failure, and fresh retry. The existing tenant currency, unavailable-total, blockers, UI request-state and route tests remain covered.
- ${runtimeFile}: actual isolated PostgreSQL with an existing synthetic organization. The historical nested-read path was reconstructed using the unchanged getTenantOperatingSnapshot entry. Calls to payment/inventory/close were 2/2/2 before and 1/1/1 after. Deep equality passed for the complete aggregate (including evidence and provenance), and for disclosed summary, proof subjects and card values/states. Balances, payment transactions, payment and journal counts were unchanged. No fixture creation, business operation or authentication change was required.
- Raw service timings were ${runtime.baseline.elapsedMs.toFixed(1)}ms followed by ${runtime.current.elapsedMs.toFixed(1)}ms. The second read benefits from a warmed process/database; these are diagnostic observations only. No production latency improvement percentage is claimed.

The portal's six views and current module-action matrix remain valid for unchanged presentation/action code. Source changes and exact verification bindings are recorded in evidence/cash-related-review-2026-09-28.json; old receipts remain immutable.

## Remaining source boundary

The tenant aggregate still reads sales, purchasing, payroll, journal and assurance data before the output projection. Required next implementation: authorize each source domain before its query and build domain-specific evidence for permitted cards. The private tenant builder currently performs 27 parallel operations and composes mixed provenance. A denied domain must become explicitly unavailable, never a fabricated successful zero snapshot. Preserve the existing currency, payroll proof and failed-query contracts. Do not broaden Cash Command roles or infer domain authority from tenant administrator status.

Payroll/inventory destination permissions, all server-authored EN/FR copy, remaining proof subjects and genuinely posted payroll lifecycle also remain open in the parent checklist.

## Operation and recovery

Routes remain /en/dashboard/finance/cash-command and /fr/dashboard/finance/cash-command. No new input, document, approval, migration or setup is required. A failed source still fails the read; retry requests fresh evidence. No deployment or live activation occurred. If an orchestration regression emerges, revert only this Cash Command call change while retaining the current proof authorization and portal fixes. Existing previous closure source files are unchanged.

## Review scope

Architecture/backend/SRE: existing shared composition entry reused; redundant source calls measured without performance certification. Data/finance/audit: actual aggregate and financial-row invariance, failure not zero. Security: output projection retained; pre-query domain admission explicitly unfinished. Frontend/quality: current Cash UI and route tests passed; unchanged visual evidence reused. Product/operations: no employee procedure or packaging change. Statutory, migrations, external providers, offline and agents: not applicable; behavior unchanged.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8');
const marker='const cashPortalCurrent =';assert.ok(source.includes(marker));
source=source.replace(marker,()=>`const cashRelated = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-related-review-2026-09-28.json')));
for (const row of cashRelated.receipts) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash related receipt changed');
const cashRelatedCurrent = Object.entries(cashRelated.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
for (const row of cashRelated.priorImpact) if (cashPortal.sourceHashes[row.file] !== row.before || cashRelated.sourceHashes[row.file] !== row.after) throw new Error('Invalid related-source impact');
const cashPortalCurrent =`);
source=source.replace('const cashPortalCurrent = Object.entries(cashPortal.sourceHashes)', 'const cashPortalCurrent = cashRelatedCurrent && Object.entries(cashPortal.sourceHashes)');
source=source.replace('=== expected);\nfor (const row of cashPortal.priorImpact)', '=== (cashRelated.priorImpact.find(row => row.file === source)?.after ?? expected));\nfor (const row of cashPortal.priorImpact)');
source=source.replaceAll('=== (cashPortal.priorImpact.find', '=== (cashRelated.priorImpact.find(row => row.file === source)?.after ?? cashPortal.priorImpact.find');
source=source.replace('...cashPortal.verifiedSubcriteria]', '...cashPortal.verifiedSubcriteria, ...cashRelated.verifiedSubcriteria]');
source=source.replace('const currentCashLane =', `for (const report of [cashRelated.report, 'evidence/cash-related-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.relatedSourceBindingCurrent = cashRelatedCurrent;
const currentCashLane =`);
const a=source.indexOf('**Since the previous report:**'),b=source.indexOf('**Remaining priority:**',a);assert.ok(a>0&&b>a);
source=source.slice(0,a)+`**Since the previous report:** Removed duplicate payment, inventory and close reads in Cash Command. Actual isolated database checks reduced related-service calls from six to three while preserving the complete aggregate, disclosed values, proof subjects and financial rows. ${testTotal} focused tests/four suites, lint and TypeScript passed, including independent source failure and retry. Earlier proof portal and module-action verification remains supported by unchanged UI/action code and an explicit impact review. See [source reuse evidence](CASH_COMMAND_RELATED_SOURCES_2026-09-28.md) and [portal/access evidence](CASH_COMMAND_PROOF_PORTAL_2026-09-28.md). No workflow was added or closed.

`+source.slice(b);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,target);console.log(JSON.stringify({report,testTotal,impact:priorImpact.map(row=>row.file)}));
