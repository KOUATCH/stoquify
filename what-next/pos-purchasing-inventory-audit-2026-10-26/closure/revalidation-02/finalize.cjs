const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8')),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const start=read('start-source-manifest.json'),current=start.files.map(({file})=>({file,sha256:hash(file)}));
const drift=current.filter((f,i)=>f.sha256!==start.files[i].sha256);assert.deepEqual(drift,[],'Source changed during verification');
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).stdout.trim();assert.equal(head,start.head);
const checks={};for(const name of ['authoring','worker','ap','clone-action-hook']){const r=read(name+'-results.json');assert.equal(r.success,true,name);checks[name]={status:'PASS',passed:r.numPassedTests,failed:r.numFailedTests}}
const browser=read('authenticated-browser-results.json');assert.equal(browser.length,2);assert.ok(browser.every(r=>r.status==='PASS'));
const clone=read('clone-browser-results.json'),upgrade=read('upgrade-results.json'),restore=read('restore-results.json');for(const r of [clone,upgrade,restore])assert.equal(r.status,'PASS');
for(const m of upgrade.applied)assert.equal(m.checksum,hash(path.join('prisma/migrations',m.migration_name,'migration.sql')),'Migration checksum mismatch');
assert.equal(fs.statSync(path.join(__dirname,'typecheck.log')).size,0);
const procedures=fs.readdirSync(__dirname).filter(f=>f.endsWith('.cjs')).map(file=>({file,sha256:hash(path.join(__dirname,file))}));
const summary={completedAt:new Date().toISOString(),head,sourceFiles:current.length,sourceDriftDuringRun:[],applicationChanges:[],harnessChanges:['Unique saved-work fixture titles','Per-scenario baseline counts on populated database','Require a new cache fault during this run'],checks,authenticatedBrowser:browser,cloneBrowser:clone,upgrade:{database:upgrade.database,from:upgrade.preMigrationCount,to:upgrade.finalMigrationCount,checksumsMatched:upgrade.applied.length},restore:{database:restore.database,tables:restore.tables.length,sourceStable:restore.sourceStable},typecheck:{exitCode:0,toolSession:70724,diagnostics:0},workflow:{exitCode:0,toolSession:38427},procedures,programComplete:false,remaining:['MTN MoMo sandbox configuration and provider verification','Open retention/operating policy','Previously documented broader verification exclusions'],negativeStockCertification:'EXCLUDED per user instruction',productionMutation:false,rolloutDefaultsChanged:false};
fs.writeFileSync(path.join(__dirname,'final-source-manifest.json'),JSON.stringify({at:summary.completedAt,head,files:current},null,2));fs.writeFileSync(path.join(__dirname,'summary.json'),JSON.stringify(summary,null,2));
const report=`# Revalidation 02 — 26 October 2026

All five requested verification areas were rerun. The scoped results pass again. Application behavior and rollout defaults were not changed. The overall program remains incomplete for the previously documented external-provider, policy and broader scenario exclusions.

| Area | Fresh result | Evidence |
|---|---|---|
| B5 durable create/clone | ${checks.authoring.passed} real PostgreSQL cases passed, including browser fixture preparation. Concurrent replay, changed input, permission/session/tenant denial, rollback and recovery were exercised. | [Results](authoring-results.json), [reconciliation](authoring-reconciliation.json) |
| Authenticated journeys | EN desktop and FR mobile passed again: real sign-in, revoked authority, dropped reply, a new cache fault in this run, receipt recovery/reload and focus. Clone recovery after locale navigation created exactly one new order. | [Authoring browser](authenticated-browser-results.json), [clone browser](clone-browser-results.json) |
| Supplier/worker | ${checks.ap.passed} AP/return and ${checks.worker.passed} worker PostgreSQL cases passed. Stock/ledger reconciliation, independent payment recording, return/reversal, lease contention, stale completion denial and retry/dead letter were checked. | [AP reconciliation](ap-reconciliation.json), [worker reconciliation](worker-reconciliation.json) |
| Upgrade/restore | Populated upgrade ${upgrade.preMigrationCount} → ${upgrade.finalMigrationCount}; all ${upgrade.applied.length} migration checksums matched current source. Restore matched all ${restore.tables.length} public data tables by count and digest; source remained stable during backup. | [Upgrade](upgrade-results.json), [restore](restore-results.json) |
| Validation | ${checks['clone-action-hook'].passed} mocked action/hook tests passed; scoped TypeScript exited 0 with no diagnostics; repository workflow check passed. | [Mocked results](clone-action-hook-results.json), [typecheck log](typecheck.log), [summary](summary.json) |

## Source and environment

Revision: \`${head}\`. Before starting, all 3,354 files in the prior source manifest matched. The current run's ${current.length} source fingerprints remained unchanged from its starting snapshot through completion. [Start manifest](start-source-manifest.json), [final manifest](final-source-manifest.json), and [browser configuration comparison](browser-config-provenance.json) retain the evidence. The isolated browser copy was aligned with the current root TypeScript configuration; the two prior differences were generated-type/include-exclude paths, not compiler options. No root configuration was changed.

The real database cases used only \`stoquify_pos_audit_20261026_d30f\` on localhost. Fresh upgrade and restore databases are named in their result files and retained. The browser used only \`http://127.0.0.1:3168\` with synthetic authentication. Its task-owned server was stopped before the restore snapshot. No production mutation, provider charge, deployment, commit or push occurred.

## Harness corrections

Repeated execution against retained evidence required unique saved-work titles and counts relative to each scenario's starting state. The cache-failure assertion now requires new probe evidence from this run, rather than accepting a previous run's marker. These are verification-harness changes; no product repair or rollout activation was needed. Prior evidence was preserved in the parent closure folder.

## Procedures and limits

The current definitions, command registry and guards were inspected before execution. The first check was \`npm run agent:workflow:check\`. Fresh test results were produced by this folder's \`run.cjs authoring\`, \`run.cjs worker\`, and \`run.cjs ap\`; the two browser scripts; \`upgrade-restore.cjs upgrade\` and \`upgrade-restore.cjs restore\`. The mocked lane used \`jest.workflow-closure-ui.config.cjs\`; the compiler used \`tsconfig.workflow-closure.json\`. Script hashes and result counts are in [summary.json](summary.json).

Database guarantees, mocked behavior, rendered interaction and external-provider behavior remain separate evidence classes. One of the nine PostgreSQL cases prepares browser fixtures; it is not an additional business-invariant certification. Synthetic cash execution recording is not external payment settlement or provider reconciliation. The generic local worker checks do not establish MTN MoMo API or callback compatibility.

MTN MoMo sandbox verification remains blocked by the confirmed missing local sandbox configuration. Retention/operating policy remains open by instruction. Negative-stock behavior is preserved and its certification excluded. Default legacy behavior outside the enabled durable-authoring cohort remains outside the B5 guarantee. Broader cases and rollback guidance remain in the [closure report](../CLOSURE_REPORT.md) and [shared evidence register](../../EVIDENCE_REGISTER.md).
`;
fs.writeFileSync(path.join(__dirname,'REPORT.md'),report);console.log(JSON.stringify({head,checks,upgrade:summary.upgrade,restore:summary.restore,typecheck:summary.typecheck,applicationChanges:[]}));
