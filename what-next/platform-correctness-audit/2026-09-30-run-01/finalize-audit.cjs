const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=process.cwd(),dir=__dirname,v=path.join(dir,'verification');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(p,x)=>fs.writeFileSync(path.join(dir,p),typeof x==='string'?x:JSON.stringify(x,null,2));
const R=(p,label=p)=>`[${label}](<${path.join(dir,p).replaceAll('\\','/')}>)`;
const baseline=JSON.parse(fs.readFileSync(path.join(v,'source-fingerprints.json')));
const changed=[],missing=[];
for(const [p,sha]of Object.entries(baseline.fingerprints)){if(!fs.existsSync(path.join(root,p)))missing.push(p);else{const current=hash(fs.readFileSync(path.join(root,p)));if(current!==sha)changed.push({path:p,before:sha,after:current});}}
save('verification/source-preservation.json',{verifiedAt:new Date().toISOString(),baselineAt:baseline.capturedAt,comparedFiles:Object.keys(baseline.fingerprints).length,changed,missing,scope:'Fingerprinted source/config/schema/migration/test files; no assertion about files outside this baseline'});
const status=cp.execFileSync('git',['status','--short','--untracked-files=all'],{cwd:root,encoding:'utf8',maxBuffer:30e6});save('verification/worktree-after.txt',status);
const commands=fs.readdirSync(v).filter(p=>p.endsWith('.result.json')).map(p=>({file:p,...JSON.parse(fs.readFileSync(path.join(v,p)))}));
save('verification/command-register.json',commands);
save('verification/browser-limit.json',{recordedAt:new Date().toISOString(),tool:'mcp__cua_repl',attemptedUrl:'http://localhost:3000/en',mode:'hidden in-app browser',observed:'net::ERR_CONNECTION_REFUSED',result:'No current authenticated, visual, accessibility or mobile runtime test',scope:'No app state inferred from unrelated browser tabs; no personal browser inventory retained in audit'});
const scan=fs.readFileSync(path.join(root,'scripts/payroll-trust-spine-readiness-gate.js'),'utf8'),test=fs.readFileSync(path.join(root,'services/payroll/__tests__/payroll-run-approval-transition.service.test.ts'),'utf8');
save('verification/payroll-scanner-marker-triage.json',{gateExpected:'retries a serializable transaction conflict and applies the transition once',actualParameterizedTest:'retries a %s serializable transaction conflict and applies the transition once',gateHasLiteral:scan.includes('"retries a serializable transaction conflict and applies the transition once"'),testHasExpectedLiteral:test.includes('retries a serializable transaction conflict and applies the transition once'),testHasParameterizedTitle:test.includes('retries a %s serializable transaction conflict and applies the transition once'),classification:'Confirmed literal-marker mismatch; this explains one failed conjunction without asserting all gate obligations are satisfied'});
let verification=fs.readFileSync(path.join(dir,'verification-summary.md'),'utf8');verification+='\n## Concrete scanner mismatch\n\nThe payroll gate searches for `retries a serializable transaction conflict and applies the transition once`; the current parameterized test title is `retries a %s serializable transaction conflict and applies the transition once` at services/payroll/__tests__/payroll-run-approval-transition.service.test.ts:964. The literal check therefore fails despite a present parameterized test. This explains one conjunct, not every possible gate condition. Evidence: '+R('verification/payroll-scanner-marker-triage.json')+'.\n';save('verification-summary.md',verification);
let schema=fs.readFileSync(path.join(dir,'schema-assessment.md'),'utf8');schema+='\n## Existing retention metadata\n\nHRIS document evidence already records retentionPolicyCode, retentionBasis, retainUntil and legalHold and projects RETAIN / LEGAL_HOLD / EXPIRED_REVIEW_REQUIRED / UNDECIDED. This is a useful control and was not treated as absent. What remains unverified is a qualified, complete model-by-model retention schedule and deployed enforcement. Test fixture labels such as CM_EMPLOYMENT_10Y are not independent proof of a legally correct duration.\n';save('schema-assessment.md',schema);
const table=commands.map(c=>`| ${c.name} | ${c.startedAt} | ${c.code===null?'null':c.code} | ${c.timedOut?'TIMEOUT':c.code===0?'PASS':'FAIL / BLOCKED'} | ${R('verification/'+c.file,'result')} |`).join('\n');
save('evidence-index.md',`# Evidence index and audit boundaries

Audit completed: ${new Date().toISOString()}. Workspace: E:/ohada saas/Focused projects/stoquify. Commit: 62a56036a5ac9b37236a20c9b148052199069479 plus the pre-existing dirty working tree.

## Baseline and preservation

The audit request was refined with the explicitly invoked aqstoqflow-prompt-architect skill and then executed after the user's “run” instruction. The supplied full execution prompt is retained in ${R('audit-instructions.txt')}. Root AGENTS.md guided graph navigation and surgical scope. Computer-use skill was applied for the attempted browser check; it did not provide usable application runtime access.

- ${R('verification/commit.txt')}, ${R('verification/started-at.txt')}, ${R('verification/worktree-before.txt')} and ${R('verification/worktree-after.txt')}.
- ${R('verification/source-fingerprints.json')}: initial SHA-256 source baseline.
- ${R('verification/source-preservation.json')}: ${Object.keys(baseline.fingerprints).length} files compared; **${changed.length} changed, ${missing.length} missing**. ${changed.length||missing.length?'Any listed changes require attribution; no unchanged-source claim is made for them.':'All fingerprinted source/config/schema/migration/test files remained unchanged.'}
- Audit files are confined to this new directory. No migration, seed, reset, deployment, provider activation, filing, external message or live business-data mutation was executed. Test adapters/probes are audit artifacts, not application patches.

## Reports and inventories

- ${R('executive-assessment.md')}; ${R('findings.md')}; ${R('remediation-roadmap.md')}.
- ${R('capability-coverage.csv')}: 29 capability areas, with separate implementation/evidence status.
- ${R('review-lens-register.md')}: 22 applicable multidisciplinary lenses.
- ${R('schema-assessment.md')}; ${R('schema-model-inventory.csv')}; ${R('model-ownership-register.csv')}: all 211 models. Ownership/purpose assignments explicitly identify inferred candidates and unverified exclusive-writer/retention evidence.
- ${R('architecture-and-workflows.md')}: six core business journeys, denial/recovery boundaries and outstanding runtime matrix.
- ${R('bi-capability-matrix.md')}: 19 decision/metric contracts, existing state and scope priorities.
- ${R('verification-summary.md')}; ${R('external-source-register.md')}.

## Raw current evidence

| Artifact | What it proves | What it does not prove |
|---|---|---|
| ${R('verification/schema-model-details.json')} / ${R('verification/migration-inventory.json')} | Systematic fields/relations/constraints/writer candidates and migration hashes | Dynamic/raw writers, exclusive ownership or approved retention |
| ${R('verification/database-metadata.json')} / ${R('verification/schema-database-comparison.json')} | Local read-only catalog, table/column-name parity and 87 matching migration checksums | Production schema, all type/index/privilege drift, safe fresh/upgrade replay |
| ${R('verification/database-tieouts.json')} / ${R('verification/database-cross-domain-tieouts.json')} | Actual local aggregate checks with SQL and denominators | Final AP/payroll/reconciliation operation: sampled records are drafts |
| ${R('verification/accounting-behavior-probes.json')} | Seven actual current-function behaviors with in-memory transaction doubles | Unauthorized access, live-data mutation, provider success or DB atomicity |
| ${R('verification/offline-behavior-probes.json')} | Current queue algorithm loses/strands data under defined synthetic cases | Physical-device persistence, encryption, browser eviction or full server replay |
| ${R('verification/test-failure-register.json')} and tests-*-direct.jest.json | Exact failed assertions and completed unit/component results | Exact repository CI pass or real PostgreSQL/provider concurrency |
| ${R('verification/payroll-scanner-marker-triage.json')} | Concrete stale literal marker versus parameterized test title | Blanket dismissal of all structural gate blockers |
| ${R('verification/graph-navigation.json')} | Existing graph topology/sample nodes used for navigation | Current implementation truth without source validation |
| ${R('verification/browser-limit.json')} | Attempted local app entry point unavailable | Any current visual/usability/accessibility completion |
| ${R('verification/source-citations.json')} | Verified current-source citation locations | Independent qualified approval |

The local database connection/session was READ ONLY with transaction rollback and bounded queries. Only schema metadata and aggregate counts were stored. No connection URL, business row identifier or employee/customer/payment content was included in aggregate reports. The provider target is described as local with a fingerprint; credentials were not exposed.

## Commands

All wrappers retain command, start/end time, exit/signal, timeout, sanitized environment target and stdout/stderr. Tests/structural gates/Prisma validation/typecheck use an intentionally inaccessible localhost:1 database target. The separate catalog/tie-out probes use the configured local database in explicit read-only mode. Full wrappers and adapters are reproducible audit artifacts in this directory.

| Command label | Started UTC | Exit | Outcome | Evidence |
|---|---|---:|---|---|
${table}

Raw database and behavior probes write their own timestamped result JSON, as indexed above. Commands with timeouts were stopped, not treated as passed. The adapted unit test configuration retains repository mocks and the installed Next SWC transformer, while bypassing the stalled Next configuration loading; exact CI remains a limitation.

## Explicitly unresolved evidence

1. Disposable PostgreSQL concurrency/failure-injection tests and current 87-migration fresh/upgrade/restore rehearsals.
2. Authenticated EN/FR browser workflows, real offline restart/multi-tab behavior, accessibility, mobile and support recovery.
3. Posted AP and payroll, settled payments and signed reconciliation source-to-ledger cycles on representative non-draft data.
4. Country/version-specific independent legal/accounting/payroll approval and real provider/authority acceptance.
5. Deployed worker schedules, monitoring/alerts, load/latency/cost limits, backup retention and measured recovery objectives.
6. Complete dynamic writer/privilege review, approved retention policy per model and source-dependent delete restrictions.

These are evidence limits and follow-on acceptance work; absence of access was not silently converted into either a pass or a confirmed vulnerability.
`);
const required=['executive-assessment.md','capability-coverage.csv','schema-assessment.md','architecture-and-workflows.md','findings.md','bi-capability-matrix.md','remediation-roadmap.md','evidence-index.md'];
const linkErrors=[];
for(const f of fs.readdirSync(dir).filter(p=>p.endsWith('.md'))){const content=fs.readFileSync(path.join(dir,f),'utf8');for(const match of content.matchAll(/\]\(<([^>]+)>\)/g)){let target=match[1];const lineMatch=target.match(/:(\d+)$/);if(lineMatch)target=target.slice(0,-lineMatch[0].length);if(!fs.existsSync(target))linkErrors.push({file:f,target,error:'missing'});else if(lineMatch&&Number(lineMatch[1])>fs.readFileSync(target,'utf8').split('\n').length)linkErrors.push({file:f,target,error:'line out of bounds'});}}
const validation={checkedAt:new Date().toISOString(),requiredArtifacts:required.map(p=>({path:p,exists:fs.existsSync(path.join(dir,p)),bytes:fs.existsSync(path.join(dir,p))?fs.statSync(path.join(dir,p)).size:0})),localLinkErrors:linkErrors,sourceChanged:changed.length,sourceMissing:missing.length};save('verification/artifact-validation.json',validation);
console.log(JSON.stringify(validation));
if(linkErrors.length||validation.requiredArtifacts.some(a=>!a.exists))process.exitCode=1;
