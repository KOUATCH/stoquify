const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const runDir=path.resolve(__dirname,'..'),file=path.join(runDir,'CLOSE_ACCEPTANCE_AUTHORITY_2026-10-01.md');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),before=fs.readFileSync(file);
assert.equal(sha(before),'124a0459e2ea3ec674622ef2ce29f5db9b0e8fdae76d347c0021037f04327943');
const receipts=[
 'evidence/close-authority-jest-ffefee98-ea98-4992-8c10-ce904e1dd71d.json',
 'evidence/close-authority-typecheck-29e4e019-c593-40e9-9000-a91a3f02ce96.json',
 'evidence/close-authority-lint-4534f591-f4e4-4829-a68b-ce0da38685e3.json',
 'lanes/environment/close-acceptance-authority-runtime-1b9e4ead-ae52-4167-9aff-68f6ffba655e.json',
 'lanes/environment/close-acceptance-authority-browser-b03ef31d-efe6-4d95-8f65-862f5d78759f.json'];
const parsed=receipts.map(name=>JSON.parse(fs.readFileSync(path.join(runDir,name),'utf8')));
for(const receipt of parsed){assert.equal(receipt.passed,true);assert.equal(receipt.sourceStable,true);}
assert.equal(parsed[0].summary.passed,478);assert.equal(parsed[0].summary.failed,0);assert.equal(parsed[0].summary.suites,12);
assert.equal(parsed[3].checks.length,38);assert.equal(parsed[4].journeys.length,2);
for(const receipt of parsed.slice(3)){assert.equal(receipt.outsideUnchanged,true);assert.equal(receipt.noOperationFinancialEffects,true);}
let text=before.toString('utf8');
function change(old,value){assert.ok(text.includes(old),old);text=text.replace(old,value);}
change('The authority correction is implemented in the shared working tree; its final verification is pending.','The authority correction is implemented and the scoped verification below passed against current source.');
change('Actual concurrency verification is still pending in this report.','Four actual PostgreSQL races verified both orderings for role permission removal and session deletion. Other writer compatibility is source-reviewed; this does not claim a runtime race for every authority writer.');
change('Before releasing, finish the source-bound focused tests, typecheck, changed-file lint, owned-database denial/concurrency checks and actual EN/FR recovery journeys.','The source-bound static, owned-database and actual EN/FR checks below passed. Before releasing a changed build, revalidate affected evidence through the existing approved release process.');
change('New browser verification is pending;','Current EN desktop/FR mobile authority recovery passed;');
change('Actual financial no-effect verification remains pending for this increment.','Enumerated financial fingerprints stayed unchanged after fixture setup in both runtime and browser verification.');
const heading='## Verification status at report handoff';assert.ok(text.includes(heading));text=text.slice(0,text.indexOf(heading));
const [en,fr]=parsed[4].journeys;
const shot=name=>'lanes/environment/close-acceptance-authority-browser-b03ef31d-efe6-4d95-8f65-862f5d78759f-'+name+'.png';
text+=`## Verification and retained attempts

Checks were serialized with the bundled Node runtime. The [static wrapper](lanes/environment/verify-close-authority.cjs) invokes Jest with --runInBand and --runTestsByPath for twelve affected suites, the repository's no-emit TypeScript check, and ESLint for nine changed files. Each receipt records exact arguments and before/after source hashes. No migration-bearing build was invoked.

| Check | Result and evidence |
|---|---|
| Initial Jest | Failed: 476 passed, two failed, zero pending. [Original receipt](evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9.json) and original test output remain retained. |
| Corrected Jest | Passed: 478 tests, twelve suites, zero failed/pending; source stable. [Receipt](${receipts[0]}). |
| TypeScript | Passed: existing full no-emit check; source stable. [Receipt](${receipts[1]}). |
| Changed-file lint | Passed: nine files, no logged warnings/errors; source stable. [Receipt](${receipts[2]}). |
| Actual PostgreSQL | Passed: 38 checks—32 denied authority cases, two authorized home/delegated successes and four role/session revocation races. [Receipt](${receipts[3]}). |
| Actual application browser | Passed: EN1440 and FR320, actual sign-in/password confirmation, three denial/recovery cases per language and exact final persisted acceptance. [Receipt](${receipts[4]}). |
| Migration, production build/deployment, release/X1 clearance | Not performed; no schema migration was needed. Local passes do not establish these approvals. |

The initial failures were test-contract mismatches. Unknown storage errors deliberately become private INTERNAL_ERROR/500; the corrected assertion verifies sanitization and zero effects. The delayed-authentication fixture advanced only process time; it now also advances the post-lock database clock and still requires FRESH_AUTH_REQUIRED/403 with no effects. No product weakening was needed. The exact pre-repair test is retained in evidence/close-authority-test-repair-before-7bbddd06-e271-4c96-96a7-744a47b7b6d9.json.

Earlier editing attempts encountered unmatched anchors, a script syntax error and Windows write restrictions. Their state was inspected before corrected scoped writes. Ordinary listener inspection also returned Access denied; scoped read-only inspection confirmed PID28380, parent12740, loopback3110, this workspace and the Next development command. There was no automatic approval-review rejection. No such attempt ran a migration or changed another environment.

Runtime uses only the guarded owned loopback database stoquify_local_registration_20260906_01. Synthetic accounting setup and explicitly injected collector failure precede the operation-financial baseline. Actual domain services produce assessment and collection results. Runtime service sessions are explicitly synthetic persisted fixtures; the separate browser verifier signs in and confirms the real password through the app. Retained synthetic consent records authorize only isolated test actors, not a real professional mandate.

Distinct backend PIDs and pg_blocking_pids prove each race. Revocation-first role/session changes reject after waiting with unchanged decision effects. Acceptance-first revocation waits through commit; replay after revocation is denied without another effect. Denied cases preserve findings, acceptance comments, audit/event records and financial fingerprints. Original runs, checklists, evidence and exports remain unchanged. Both terminal receipts confirm source stability, enumerated outside-fixture stability and no operation-induced financial changes.

Each browser journey records five deliberate submissions: a password challenge, three FORBIDDEN cases (removed permission, suspended target Close capability, read-only client grant), and one successful acceptance. Password confirmation itself submits nothing. Recovery requires refresh, reopen, renewed notes and explicit review. Each journey records seventeen keyboard/focus checks, eight screenshots and zero page errors. Document/detail scroll widths equal their containers; reduced motion is enabled. The verifier observes actual responses without replacing them.

Inspected [EN reviewed state](${shot('en1440-password-confirmed-explicit-review')}), [EN denied state](${shot('en1440-permission-removed-denied-confidential-detail-cleared')}), [FR reviewed state](${shot('fr320-password-confirmed-explicit-review')}), [FR denied state](${shot('fr320-client-grant-read-only-denied-confidential-detail-cleared')}) and [FR accepted state](${shot('fr320-accepted-after-manual-authority-recovery')}). Narrow review/action text wraps within the viewport and focus is visible. These observations do not certify native assistive technology, true zoom, all contrast states or complete accessibility.

Local route-to-open-review observations: EN1440 ${en.readyMs}ms; FR320 ${fr.readyMs}ms. These include navigation, loading and opening the review in the development app. They are neither isolated query times nor a production benchmark. No approved comparable latency budget is established here; production latency and lock contention remain unverified.

## Next bounded work within the same priorities

FA-CASH-COMMAND and FA-CLOSE-PACK remain In progress. No workflow is split or closed. The next defect is the zero-variance physical-count/publication race retained in [the assessment-order report](CLOSE_ASSESSMENT_ORDER_2026-10-01.md): count posting calls invalidation after source changes, while invalidation captures run IDs once. A concurrent assessment can escape that captured set and retain stale READY/current Cash evidence after count commit. The inventory annex recheck still protects certification; this is not a demonstrated certified-export bypass.

Resolve and sort all affected existing tenant accounting periods, including periods without a Close run, then hold the existing period locks before discovery through source commit. Relevant paths: services/inventory/inventory-count.service.ts; services/inventory/inventory-close-invalidation.service.ts; services/accounting/close-assessment-order.service.ts; captured-run discovery in services/accounting/close-assurance-pack.service.ts. Verify producer-first and creator-first order with real blocker PIDs, later-period and no-run-period scope, retained exports, retry behavior, tenant independence and no financial effects. Concurrent creation of new periods requires separate coordination if claimed. Do not add common locks to all financial writers blindly: journal reversal retains a separate multi-period ordering risk.

Other producers, future-period recovery, interrupted processing/outbox delivery, the whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility, production performance and legacy receipt/invoice/carrying-value conflicts remain open. This checkpoint supplies no deployment, live activation, real payment, external message or X1 clearance. No user input blocks the next authorized local engineering work.
`;
const config={receipts,artifacts:['CLOSE_ACCEPTANCE_AUTHORITY_2026-10-01.md','evidence/close-authority-before-28ee45e0-6457-402a-a934-c81d2f568582.json','evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9.json','evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9-jest.json','evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9.log','evidence/close-authority-test-repair-before-7bbddd06-e271-4c96-96a7-744a47b7b6d9.json','evidence/complete-close-authority-report.cjs'],
 verificationSummary:'478 tests across twelve suites, TypeScript, changed-file lint, 38 actual PostgreSQL checks and EN1440/FR320 browser recovery passed. Role/session revocation races verified both transaction orders. Actual password confirmation, three authority refusals and explicit recovery matched persisted acceptance. Source, outside-fixture and operation-financial hashes stayed stable. The initial two test failures were corrected and retained.',
 verifiedCriteria:['Acceptance derives exact session proof from trusted action context, never forms; direct/work-desk surface permissions remain distinct.','Persisted home roles/account/organizations/session/delegation and canonical module authority are locked through acceptance; post-wait expiry rechecked before effects.','38 actual PostgreSQL authority checks include role/session revocation races in both orders, denied replay, retained history and financial no-effects.','Actual delegated EN1440/FR320 password challenge, permission/module/grant refusal and explicit recovery match one source-bound persisted acceptance.'],
 limitations:['Full-register reconciliation incomplete;270workflows/17families/191unmapped;parent Cash/Close remain In progress.','Actual concurrency races cover role update and session deletion; other writer order is source-reviewed rather than comprehensively raced.','Synthetic owned test sessions/consent are not real-client authority; browser authenticates normally.','Producer discovery/multi-period ordering, interruption/delivery and whole Cash lifecycle remain open.','Native assistive technology, whole accessibility, production performance, authentic country/payroll prerequisites and retained financial/legacy conflicts remain unverified.','No migration, deployment, live activation, external message, real payment or X1 clearance.']};
const id=crypto.randomUUID();fs.writeFileSync(path.join(__dirname,'close-authority-report-before-'+id+'.md'),before,{flag:'wx'});
const temporary=file+'.'+id+'.tmp';fs.writeFileSync(temporary,text,{flag:'wx'});fs.renameSync(temporary,file);
const configFile=path.join(__dirname,'close-authority-final-config.json');fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:file,reportSha256:sha(fs.readFileSync(file)),config:configFile,passed:true}));
