// Publish conclusions from retained receipts; refuse missing or failing selected checks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),c=require('./af16-verification-context.cjs')
const phase=path.dirname(c.output),roadmap=path.dirname(path.dirname(phase)),docs=path.join(c.root,'docs/accounting-firms')
const read=file=>fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''),json=file=>JSON.parse(read(path.join(c.output,file)))
const initial=json('regression-jest.json'),recovery=json('recovery-regression-jest.json'),latest=new Map(initial.testResults.map(row=>[row.name,row]))
for(const row of recovery.testResults)latest.set(row.name,row)
const classes={component:{suites:0,tests:0},unit:{suites:0,tests:0}}
for(const row of latest.values()){
 if(row.status!=='passed'||row.assertionResults.some(test=>test.status!=='passed'))throw Error('Unresolved regression '+row.name)
 const category=read(row.name).includes('@jest-environment jsdom')?'component':'unit';classes[category].suites++;classes[category].tests+=row.assertionResults.length
}
const phaseNames=['AF01','AF03','AF04','AF05','AF06','AF07','AF08','AF09','AF10','AF11','AF12','AF13','AF16WORKER']
const database=phaseNames.map(name=>{const file=name+'/'+(['AF03','AF04'].includes(name)?'attempt-2/':'')+'jest.json',r=json(file);if(!r.success)throw Error('Unresolved phase '+name);return {phase:name,tests:r.numPassedTests,file}})
const shared=json('shared-journey-jest.json'),upgrade=json('upgrade/verification.json'),types=json('types.json'),release=json('release-artifact-jest.json')
if(!shared.success||!upgrade.equal||types.exitCode!==0||!release.success)throw Error('Selected verification incomplete')
const evidenceBrowser=json('AF06/browser-results.json'),advisoryBrowser=json('AF12/browser-verification.json'),practiceBrowser=json('AF13/shared-browser/browser-verification.json')
if(![evidenceBrowser,advisoryBrowser,practiceBrowser].every(row=>row.passed))throw Error('Browser verification incomplete')
const worker=json('worker-recovery.json'),portfolioFile=fs.readdirSync(path.join(c.output,'AF01')).find(name=>name.endsWith('-query-evidence.json')),portfolio=json('AF01/'+portfolioFile)
const sourceCheck=json('source-verification.json')
const exportChecks=json('export-artifact-verification.json');if(!exportChecks.passed)throw Error('Export artifact verification incomplete')
const total=classes.unit.tests+classes.component.tests,dbCount=database.reduce((n,row)=>n+row.tests,0)
const snapshot=json('AF13/shared-browser/browser-practice-export.json')
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value
const hash='sha256:'+crypto.createHash('sha256').update(JSON.stringify(canonical(snapshot.report))).digest('hex')
if(hash!==snapshot.contentHash)throw Error('Downloaded practice snapshot hash differs')
fs.writeFileSync(path.join(c.output,'export-reconciliation.json'),JSON.stringify({passed:true,contentHash:hash,currencies:snapshot.report.cohorts[0].summary.economics.map(row=>row.currency)},null,2))
const summary={scope:'AF01–AF13 synthetic development',classes,regressionTests:total,database,phaseLaneCases:dbCount,sharedJourneyCases:shared.numPassedTests,upgradeCases:json('upgrade/baseline-jest.json').numPassedTests,releaseFixtureTests:release.numPassedTests,typesPassed:true,browserJourneysPassed:3,workflow:{initial:'PASS',final:'FAIL: concurrent reviewed authentication-test drift'},productionDecision:'NO_GO',pilot:'PILOT_PREPARED'}
fs.writeFileSync(path.join(c.output,'verification-summary.json'),JSON.stringify(summary,null,2))
const rows=database.map(row=>`| ${row.phase} | ${row.tests} | PASS | [Jest receipt](2026-10-25-run-01/${row.file}) |`).join('\n')
const result=`# AF16 development verification result

25 October 2026. **Development verification executed for AF01–AF13 using synthetic scenarios. Formal AF16 status: IMPLEMENTED_UNVERIFIED for release. Production decision: NO_GO. Pilot: PILOT_PREPARED.** Live pilot validation is deferred under the user's development-stage instruction. AF14 and AF15 are excluded.

## Candidate and changes

Source HEAD: ${read(path.join(c.output,'source-head.txt')).trim()}. The checkout contains substantial pre-existing changes; HEAD alone does not identify the tested candidate. See initial-working-tree.txt, phase-suite-adapters-initial.json, phase-suite-adapters.json and AF13/browser-source-manifest.json in this run for current source/test hashes. Application sources were copied without environment files; only the isolated generated Prisma client was used. No production configuration, schema promotion, outreach, payment or deployment was performed.

Source comparison covered ${sourceCheck.comparedFiles} files. Concurrent differences from the retained browser snapshot: ${sourceCheck.changedSinceBrowserSnapshot.join(', ') || 'none'}. These files were preserved. The exercised accounting surfaces and direct authentication API are unchanged; the changed public authentication screens were not part of this browser journey. This run verifies the recorded snapshot, not an unbounded moving checkout.

Reused AF01–AF13 services, actions, components, schema, phase scenarios and browser workflows. Added AF16-only orchestration, a real queue recovery scenario, a shared reviewed-client journey, scoped type configuration and evidence/report tooling. Two existing tests were corrected: the delegated-recovery component suite needed a mock for its new obligation child; AF03's dormant-only assertions were superseded explicitly by the AF04 authority migration. Current assertions verify managed-key retention, live enrollment with current permissions, denial after suspension/end and inability to regain legacy access. No application business behavior or migration was changed.

## Verification by evidence class

| Class | Current result | Limits |
|---|---|---|
| Workflow/source | Initial workflow contract PASS; final check FAIL on concurrent PasswordRecoveryForms.test.tsx reviewed-file drift; schema validates and hashes retained | No registry hash was refreshed; the changed test:ecc:pilots lane was not executed |
| Pure/mocked service/unit | ${classes.unit.tests} tests in ${classes.unit.suites} suites pass | No real database or authentication implied |
| Component/jsdom | ${classes.component.tests} tests in ${classes.component.suites} suites pass | Rendering/interaction in jsdom; separate from browser checks |
| Combined scoped source types | PASS, no emit | AF01–AF13 entrypoints and dependencies, not a full production build |
| Real PostgreSQL lanes | ${dbCount} cases pass across ${database.length} phase/worker suites; one AF12 duration case is pure | Fresh named clones on owned loopback PostgreSQL 17; original phase data/receipts preserved |
| Shared client journey | ${shared.numPassedTests} case passes | Same managed engagement combines reviewed workpapers, delivered advisory and confidential planning, with financial source hashes unchanged |
| Migration | ${upgrade.migrationsAfter} clean migrations and replay; populated ${upgrade.migrationsBefore}→${upgrade.migrationsAfter} upgrade/replay passes | Twelve table counts/digests retained; some operational tables are empty; not every historical predecessor |
| Release artifact boundary | ${release.numPassedTests} tests pass | Fixture compiler/artifacts and mocked promotion; not an actual sealed Stoquify build/deployment |
| Authenticated browser | Three current journeys pass | Exact tested surfaces below; no whole-app accessibility certification |
| Artifact inspection | AF08 JSON/CSV/PDF byte hashes, selected reviewed balances in three PDFs, private-marker exclusion and downloaded planning hash reconcile | See export-artifact-verification.json, publication-verification.json and visual-review.json; only the selected schedules are expected in each export |

The initial broad regression run had 1,312 passing tests and one suite that could not load. The corrected suite contributes five passing tests, giving ${total} tests across ${latest.size} distinct suites. Retain both receipts; no failed assertion was silently dropped. AF03's initial four obsolete assertions and AF04's omitted legacy harness fixture are retained; fresh-clone reruns pass 31 and 27 cases respectively.

The first new shared-journey attempt supplied an engagement field to the narrower workpaper scope. Existing strict validation rejected it before any planning record was created. The test now passes only client and period to that service; its corrected rerun passes without weakening the input contract. Both receipts are retained.

The first PDF comparison expected a receivable balance in a cash-only browser advisory. The checker now derives expected balances from each exact paired JSON; all three PDFs pass, including the cash-only selection. The initial checker result remains retained. This was an expectation correction, not a changed export.

## PostgreSQL scenario matrix

| Phase | Cases | Result | Evidence |
|---|---:|---|---|
${rows}

AF01 tests complete traversal, current/historical proof, stale publication and independent-writer snapshots. AF03–AF05 test legacy compatibility, explicit managed enrollment, identity/assignment constraints, permission/session/mandate revocation, expiry, concurrent suspension and retained handover. AF06 preserves independent response review and failed financial controls. AF07 checks decimal import, duplicate identity, account coverage and transactional failure. AF08 tests source-bound review/export and private data exclusion. AF09–AF10 exercise preview, tie-out, atomic apply, lost-response retry and recovery through existing writers. AF11 preserves unknown country evidence and scoped obligations. AF12–AF13 check advisory agreement/outcomes, manual effort, confidential currency-separated planning, replay, revision races and current authority.

Fixture boundaries matter: synthetic historical ledger rows and a typed payment-collector receipt are prepared inputs. Acceptance of that receipt does not constitute a successful full close assessment, reconciliation signoff, live provider delivery or statutory filing. AF12's pure duration calculation is not counted as proof of a database write.

## Current browser journeys

- **Evidence desk:** /en and /fr/dashboard/accounting/accountant-portfolio and the selected /dashboard/accounting/close/:periodId route. Separate preparer, client owner and reviewer sign-ins; retained request, response, password freshness challenge and independent acceptance; FAILED reconciliation remains FAILED. English/French at 1440px and 390px, four scoped axe checks, no horizontal overflow and keyboard refresh focus. [Receipt](2026-10-25-run-01/AF06/browser-results.json).
- **Advisory:** /en and /fr/dashboard/accounting/accountant-portal with the synthetic client/period. Lost successful response and exact retry, self-review denial, independent review, client agreement, delivered JSON/PDF, private-note exclusion, explicit missing baseline, source staleness and module denial. Four scoped axe checks and keyboard focus. [Receipt](2026-10-25-run-01/AF12/browser-verification.json).
- **Workload on that same reviewed client:** protected manual effort/correction, independent review with step-up, separate EUR/USD/XAF budgets, hashed JSON download, client denial and fee-permission removal. Four scoped axe checks. [Receipt](2026-10-25-run-01/AF13/shared-browser/browser-verification.json).

The first evidence-browser attempt timed out after 90 seconds while the client workbench still showed loading after cold compilation. Its failed receipt and screenshots are retained. A warm retry used the same request and a bounded 180-second UI wait. Passing functional checks after that retry is not evidence of acceptable production responsiveness.

Current browser checks do not rerun every setup, opening and obligation screen or every screen-reader interaction. Historical phase screenshots remain historical. These are explicit release coverage gaps rather than inferred green results.

## Performance and recovery observations

The 105-client portfolio traversed ${portfolio.pagination.pages} pages at a maximum ${portfolio.pagination.maxClientsPerPage} clients per page. Observed total ${portfolio.pagination.elapsedMs.toFixed(1)} ms, ${portfolio.pagination.queryCount} database queries and ${portfolio.pagination.maxQueryMs} ms maximum individual query duration; the scenario verifies read-only operation. This is a local combined run, not an agreed SLO or capacity certification. The query count warrants profiling before a live pilot.

The 1,000-row provider import's retained performance receipt measures its real locks, statement/inbox/event/outbox and invalidation path. Queue recovery used ${worker.load} synthetic messages plus one foreign-client message, bounded competing claims, a stale acknowledgement fence and one injected handler failure. Observed recovery elapsed ${worker.elapsedMs.toFixed(1)} ms. The local handler sent nothing externally; the other client's pending message remained untouched. No stakeholder latency/error budget has been agreed.

## Acceptance assessment

| Criterion | Result | Basis |
|---|---|---|
| AF16-AC1 current checks or explicit NO_GO | PASS as a decision requirement | Current receipts above; release gaps explicitly NO_GO in GO_NO_GO.md |
| AF16-AC2 truthful portfolio, consent and independent review | PASS within synthetic scope | Real service scenarios and current three-role evidence journey |
| AF16-AC3 no cross-client disclosure, duplicate financial effect or permissive rollback | PASS for exercised scenarios | Tenant boundaries, idempotency/atomicity, managed-key fences, source freshness and private-field clearing |
| AF16-AC4 rehearsed rollout/rollback and build/schema separation | PARTIAL | Local control/queue rehearsals and 17 release-fixture tests pass; full built previous-app/hosted rollout rehearsal not performed |
| AF16-AC5 metric definitions and baseline plan | PASS for preparation | PILOT_PROTOCOL.md defines cohorts, missingness, two-cycle collection and decision owners; live measurements remain pending |

## Commands and reproducibility

Reviewed command-registry definitions before execution. New scripts are explicitly scoped AF16 tools, not newly approved general commands. The exact run uses npm run agent:workflow:check; node scripts/prepare-af16-verification.cjs; node scripts/prepare-af16-phase-suites.cjs; node scripts/run-af16-phase-suites.cjs (AF03 and AF04 fresh attempt 2 retained); node scripts/verify-af16-upgrade.cjs; Jest with jest.af16-regression.config.cjs and the isolated PostgreSQL config; node scripts/verify-af16-types.cjs; the selected release-artifact test; and the guarded current browser adapters. JSON receipts retain individual test names, outcomes and timestamps. Scripts refuse existing fresh database targets; reruns need a new explicit attempt rather than destructive reset. The final workflow check exits 1 because the separately edited components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx differs from the test:ecc:pilots reviewed manifest. Its owner must review that drift; AF16 did not change it or the registry. See workflow-check-final.log.

The combined shared-journey run uses the retained AF12 synthetic clone only after its phase suite succeeds. Browser credentials and server logs stay in the task-private directory. Final cleanup is recorded separately. Publication uses docs-report-publisher, followed by PDF/text/hash checks; rendering a report is not product verification.

## Release, ownership and next step

Keep the formal release status IMPLEMENTED_UNVERIFIED and the expanded production decision NO_GO. AF11 remains limited by qualified country review. Live recruitment, baseline benefit and two-cycle validation are deferred. The technical release owner must supply a full sealed build, selected-scope remaining browser checks, acceptable agreed performance/error budgets and compatible rollout/rollback evidence. Product and firm owners select the later pilot; no automatic AF14/AF15 work is justified by these results.

See [scope](RELEASE_SCOPE.md), [decision matrix](GO_NO_GO.md), [pilot protocol](PILOT_PROTOCOL.md) and [recovery runbook](ROLLBACK_RUNBOOK.md). Architecture/IAM/data, accounting evidence, UX, performance and operations are material and reflected in the checks. Country legal support is explicitly pending. AI model behavior, new pricing and live billing are not applicable to this verification slice.
`
fs.writeFileSync(path.join(phase,'RESULT.md'),result)
const edit=(file,fn)=>fs.writeFileSync(file,fn(read(file)))
edit(path.join(phase,'RELEASE_SCOPE.md'),s=>s.replace('**State:** IN_PROGRESS.','**State:** development verification executed; formal release IMPLEMENTED_UNVERIFIED / NO_GO.'))
edit(path.join(roadmap,'STATUS.md'),s=>s.replace('AF14–AF16 NOT_STARTED.','AF14–AF15 NOT_STARTED; AF16 development verification executed, release IMPLEMENTED_UNVERIFIED / NO_GO.').replace('The shared workflow-registry check passes in the AF13 run;','The AF16 final workflow check fails on concurrent authentication-test manifest drift; the AF13 workflow pass is historical;').split('\n').map(line=>line.startsWith('| [AF16 prompt]')?`| [AF16 prompt](prompts/AF16-pilot-release-assurance.md) | IMPLEMENTED_UNVERIFIED | Explicit AF01–AF13 synthetic development expansion | [Current result](execution/AF16/RESULT.md) — ${total} regressions, ${dbCount} phase/worker cases, shared journey, current types, populated upgrade, three authenticated journeys and release-fixture checks | Development evidence retained; production NO_GO; pilot prepared, live validation deferred; remaining build/rollout/browser/performance, workflow drift and AF11 review gates |`:line.startsWith('| Core AF01–AF08 |')?'| Core AF01–AF08 | NO_GO for production | PILOT_PREPARED | [AF16 current evidence and remaining release gates](execution/AF16/GO_NO_GO.md) |':line.startsWith('| Optional AF09–AF15 |')?'| Expanded AF01–AF13; AF14–AF15 excluded | NO_GO for production | PILOT_PREPARED | Synthetic development checks executed; AF11 qualified review and release gaps remain. Live validation deferred by user |':line).join('\n'))
const note=`**25 October 2026 AF16 development verification:** Current AF01–AF13 synthetic verification is recorded in [AF16 RESULT](execution/AF16/RESULT.md): ${total} regressions, ${dbCount} phase/worker cases, a shared reviewed-client journey, scoped types, populated migration/replay and three authenticated browser journeys. Formal release remains IMPLEMENTED_UNVERIFIED / NO_GO; the pilot is prepared and live validation deferred. AF14–AF15 remain unstarted.\n\n`
edit(path.join(roadmap,'01_IMPLEMENTATION_ROADMAP.md'),s=>s.replace(/^(# .*\r?\n)/, '$1\n'+note).replace('AF14–AF16 remain planned.','AF14–AF15 remain planned; AF16 development verification is recorded with explicit release gaps.'))
edit(path.join(docs,'README.md'),s=>s.replace('AF01–AF13 implementation evidence and fourteen supporting reports','AF01–AF13 implementation evidence, AF16 development verification and supporting reports').replace(/^(# .*\r?\n)/,'$1\n**AF16 development verification (25 October 2026):** [Result MD](roadmap-2026-10-19/execution/AF16/RESULT.md) · [Result PDF](roadmap-2026-10-19/execution/AF16/RESULT.pdf). Current AF01–AF13 synthetic checks executed; production NO_GO, pilot prepared, live validation deferred.\n\n')+'\n## AF16 release-assurance publication\n\n| Report | Markdown | PDF |\n|---|---|---|\n'+['RESULT','RELEASE_SCOPE','GO_NO_GO','PILOT_PROTOCOL','ROLLBACK_RUNBOOK'].map(name=>`| ${name.replaceAll('_',' ')} | [MD](roadmap-2026-10-19/execution/AF16/${name}.md) | [PDF](roadmap-2026-10-19/execution/AF16/${name}.pdf) |`).join('\n')+'\n')
const followup=`# AF16 development verification — next step\n\n25 October 2026. Current synthetic AF01–AF13 verification is recorded in [the canonical result](../docs/accounting-firms/roadmap-2026-10-19/execution/AF16/RESULT.md). ${total} regressions and ${dbCount} phase/worker cases pass, plus the shared-client journey, scoped types, migration preservation and current browser checks.\n\nThe production decision remains NO_GO; the pilot is prepared, with live validation deferred. Close the remaining AF16 build, rollout/rollback, selected-scope browser and agreed-performance-budget gaps before treating this as a release candidate. AF11 qualified country review remains separate. Do not automatically start AF14 or AF15.\n\nContinuation prompt: Execute the remaining local AF16 assurance gaps from RESULT.md and GO_NO_GO.md on an isolated synthetic target. Reuse the existing services and receipts, retain current authorization and evidence boundaries, record actual failures and update the roadmap and Markdown/PDF reports. Keep real pilot enrollment, production deployment and qualified-country claims deferred.\n`
fs.mkdirSync(path.join(c.root,'what-next'),{recursive:true});fs.writeFileSync(path.join(c.root,'what-next/2026-10-25-af16-development-verification.md'),followup)
fs.writeFileSync(path.join(docs,'supporting-reports/2026-10-25-af16-development-verification.md'),followup.replace('(../docs/accounting-firms/roadmap-2026-10-19/execution/AF16/RESULT.md)','(<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF16/RESULT.md>)'))
// The same absolute-link copy is used in both locations for portable publication.
fs.copyFileSync(path.join(docs,'supporting-reports/2026-10-25-af16-development-verification.md'),path.join(c.root,'what-next/2026-10-25-af16-development-verification.md'))
console.log(JSON.stringify(summary,null,2))
