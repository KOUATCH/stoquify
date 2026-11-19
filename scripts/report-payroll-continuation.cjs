'use strict';
// Assemble verified local evidence; no environment loading, app imports, DB calls or approvals.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),BASE='docs/database-seed/payroll-continuation-2026-11-02';
const file=name=>path.join(ROOT,BASE,name);
const read=name=>JSON.parse(fs.readFileSync(file(name),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
const write=(name,value)=>fs.writeFileSync(file(name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
function replaceReport(target,value){
 if(path.relative(ROOT,target).startsWith('..'))throw Error('Report target escaped workspace');
 const staged=target+'.payroll-continuation.tmp';fs.writeFileSync(staged,value);
 if(!fs.existsSync(target)){fs.renameSync(staged,target);return;}
 const backups=file('canonical-report-backups');fs.mkdirSync(backups,{recursive:true});
 const backup=path.join(backups,crypto.randomUUID()+'-'+path.basename(target));
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','[System.IO.File]::Replace($env:PAYROLL_REPORT_STAGE,$env:PAYROLL_REPORT_TARGET,$env:PAYROLL_REPORT_BACKUP)'],{
  env:{...process.env,PAYROLL_REPORT_STAGE:staged,PAYROLL_REPORT_TARGET:target,PAYROLL_REPORT_BACKUP:backup},windowsHide:true,stdio:'pipe'});
}
const sourceBase='docs/database-seed/payroll-unblock-workpapers/source-research-2026-11-02';
const research=JSON.parse(fs.readFileSync(path.join(ROOT,sourceBase,'preparation-verification.json'),'utf8'));
const periods=read('payroll-continuation-results.json'),preflight=read('review-preflight.json'),inspection=read('database-inspection.json');
const unit=read('history-proof-unit.json'),pg=read('history-proof-postgres/postgres-run.json');
const service=read('history-proof-postgres/service-transactions.json'),spine=read('history-proof-postgres/trust-spine.json');
const types=read('typecheck.json'),deployment=read('history-guard-deployment.json'),catalog=read('migration-catalog-validation.json');
const dataset=read('whole-dataset-verification.json'),prior=read('whole-dataset-verification-before.json');
if(!unit.success||!service.success||!pg.passed||!spine.ready||!spine.checks.every(row=>row.passed)||!types.passed||!research.passed||!dataset.passed||catalog.status!=='ready')throw Error('Required engineering checks have not all passed');
if(dataset.businessFingerprint!==prior.businessFingerprint)throw Error('Retained dataset business fingerprint changed unexpectedly');
if(periods.unexpectedIssues.length||Object.values(periods.invariants).some(value=>value!==true)||periods.summary.periodGateAttempts!==33||periods.summary.octoberPending!==3)throw Error('Period-gate outcomes are incomplete or unexpected');
if(deployment.status!=='APPLIED_TO_OWNED_DISPOSABLE_DATABASE')throw Error('History guard has not been deployed to the owned dataset');
const summary={generatedAt:new Date().toISOString(),status:'ENGINEERING_PROGRESS_STATUTORY_EXECUTION_BLOCKED',
 database:inspection.identity.database,userConfirmedReviewerArtifactsUnavailable:true,statutoryApprovalRecorded:false,productionUseAllowed:false,
 periodGates:periods.summary,reviewPreflight:{passedConditions:preflight.checks.filter(x=>x.passed).length,totalConditions:preflight.checks.length,status:preflight.status},
 verification:{scopedUnit:{tests:unit.numTotalTests,passed:unit.numPassedTests,failed:unit.numFailedTests,suites:unit.numTotalTestSuites},
  postgresService:{tests:service.numTotalTests,passed:service.numPassedTests,failed:service.numFailedTests,suites:service.numTotalTestSuites},
  postgresDatabase:pg.database,postgresMigrations:pg.migrations.length,sql:{ready:spine.ready,checks:spine.checks.length,passed:spine.checks.filter(row=>row.passed).length},sourceTypecheck:{owned:types.owned.length,imported:types.imported.length},
  sourcePreparation:{checks:research.checkCount,passed:research.passed},wholeDataset:{checks:dataset.checkCount,passed:dataset.passed,businessFingerprintUnchanged:dataset.businessFingerprint===prior.businessFingerprint,lastOrderedReplay:'2026-10-29'}},
 remaining:{payrollTables:inspection.originalPendingTableCounts.filter(row=>row.count===0).length,historicalInvoices:inspection.historicalAp.reduce((n,row)=>n+row.invoices,0),
  requirements:['Authentic reviewed effective-dated 2025/2026 rules and independent expected-result fixtures','Qualified reviewer/checker evidence and legal-owner publication/admission','Reviewed tax-year, history-membership, adjustment, correction/reversal and refund contract','Certified complete-period inputs, followed by full chronological payroll and downstream acceptance']},
 sourceHashes:Object.fromEntries(['services/payroll/payroll-control.service.ts','services/payroll/payroll-history-proof.ts','prisma/disposable-payroll-continuation.ts','scripts/run-disposable-payroll-continuation.cjs','prisma/migrations/20261102190000_payroll_history_proof_version_binding/migration.sql'].map(p=>[p,sha(p)]))};
write('continuation-summary.json',summary);
const registerFile=path.join(ROOT,'docs/database-seed/payroll-unblock-register.json');
const register=JSON.parse(fs.readFileSync(registerFile,'utf8'));
const additions=[
 {id:'ED-06',tasks:['ENG-03','ENG-04','ENG-07'],status:'V2_CURRENTNESS_GUARD_IMPLEMENTED_VERIFIED',selection:'New v2 review/approval/emission/post transitions reject inconsistent or changed observed history; committed replay and existing legacy gates are retained. A narrow migration protects an existing v2 version marker; new v2 combined posting is refused.',remaining:'Observed source integrity does not establish statutory history completeness, tax-year membership or legal correctness.'},
 {id:'ED-07',tasks:['ENG-08','ENG-09'],status:'PERIOD_GATES_EXECUTED_WITH_BLOCKERS',selection:'Deterministic 36-slot continuation inspected and executed: 33 real historical period gates; three October slots explicitly pending. No missing attendance, expert approval or downstream completion was fabricated.',remaining:'Full chronological calculation and downstream lifecycle require reviewed/admitted rules, independent fixtures and supported complete inputs.'},
];
for(const addition of additions)for(const id of addition.tasks){const entry=register.entries.find(row=>row.id===id);if(!entry)throw Error('Register task missing: '+id);
 entry.engineeringSubsteps=(entry.engineeringSubsteps||[]).filter(row=>row.id!==addition.id);
 entry.engineeringSubsteps.push({id:addition.id,status:addition.status,selection:addition.selection,remaining:addition.remaining,evidence:BASE+'/continuation-summary.json'});
 entry.evidence=[...new Set([...entry.evidence,BASE+'/continuation-summary.json'])];}
register.generatedAt=summary.generatedAt;
register.latestContinuation={file:BASE+'/continuation-summary.json',status:summary.status,userConfirmedReviewerArtifactsUnavailable:true,statutoryApprovalRecorded:false};
register.counts={};for(const row of register.entries)register.counts[row.status]=(register.counts[row.status]||0)+1;
replaceReport(registerFile,JSON.stringify(register,null,2)+'\n');
const start='[payroll-continuation-2026-11-02-start]: #',end='[payroll-continuation-2026-11-02-end]: #';
function updateSection(target,section){let text=fs.readFileSync(target,'utf8');const a=text.indexOf(start),b=text.indexOf(end);if(a>=0&&b>=a)text=text.slice(0,a)+text.slice(b+end.length);const titleEnd=text.indexOf('\n');text=text.slice(0,titleEnd)+'\n\n'+start+'\n\n'+section+'\n\nEarlier inventory and report content below is retained as historical context.\n\n'+end+'\n\n'+text.slice(titleEnd+1).trimStart();replaceReport(target,text);}
const section=`## Executed continuation — 2 November 2026\n\nThe new [continuation report](payroll-continuation-2026-11-02/CONTINUATION-REPORT.md) records scoped v2 history-currentness protection, its database migration and tests, and 33 real period-gate attempts with three October periods pending. Parent ENG-01 through ENG-09 retain their prerequisite status; substeps ED-06/ED-07 do not establish completed annual payroll or statutory approval. The user confirmed that signed reviewer decisions, independent fixtures and the approved calculation contract are unavailable.\n\n[Machine summary](payroll-continuation-2026-11-02/continuation-summary.json) · [New reviewer handoff](payroll-unblock-workpapers/source-research-2026-11-02/REVIEWER-HANDOFF.md) · [Historical AP finding](payroll-unblock-workpapers/source-research-2026-11-02/AP-2025-ADMISSION-FINDING.md).`;
for(const name of ['PAYROLL-UNBLOCK-REGISTER.md','PAYROLL-UNBLOCK-COMPLETION-PACKET.md'])updateSection(path.join(ROOT,'docs/database-seed',name),section);
const text=`# Payroll and database continuation — 2 November 2026

Status: **${summary.status}**. Database: \`${summary.database}\`. The user confirmed that signed reviewer decisions, independent fixture results and the approved calculation contract are not available. Engineering progress below preserves that boundary.

## Completed engineering

- Added v2 observed-history integrity/currentness checks before new independent review, approval, payslip emission and posting. New or missing prior rows, changed source snapshots/hashes, scope mismatches and incomplete amounts are rejected. The existing selection policy is preserved; it does not prove legal history membership.
- Added a protected numeric-v2 marker to new calculations and a narrow trigger preventing that existing marker from being changed or removed. Other metadata edits and legacy records retain their existing behavior; no frozen records were backfilled. The new migration is applied to the owned disposable dataset.
- Closed the older combined approval/posting route for new v2 runs. Successful committed replay remains available, and legacy-only transitions retain their existing gates.
- Added a separate deterministic twelve-month period-gate runner, without reseeding. It requires an inspected, hash-bound plan, authenticates retained synthetic users and records exact service outcomes. Full payroll calculation and downstream lifecycle are still gated and unimplemented by this runner.

New v2 calculations require the independent command workflow. Environments using the older combined command must adopt the governed trust-spine workflow before processing new v2 runs. Runtime feature configuration was not changed by this continuation.

## Actual execution outcomes

| Outcome | Result |
|---|---:|
| Planned organization/month slots | ${periods.summary.plannedOrganizationMonths} |
| Historical period-service attempts | ${periods.summary.periodGateAttempts} |
| Blocked period gates | ${periods.summary.blockedPeriodGates} |
| Periods created | ${periods.summary.periodsCreated} |
| Existing periods reused | ${periods.summary.existingPeriodsReused} |
| October slots pending | ${periods.summary.octoberPending} |
| Completed payroll lifecycles | ${periods.summary.completedPayrollLifecycles} |
| Unexpected runner failures | ${periods.summary.unexpectedFailures} |

The six November–December 2025 attempts lack effective published pack coverage. The other 27 historical attempts lack reviewed CNPS provenance. October retains its October 31 pay date and observation cutoff of October 28; elapsed calendar time does not supply the missing observations. Existing payroll runs and period records were preserved. See [execution results](payroll-continuation-results.json), [plan](payroll-continuation-plan.json) and [database inspection](database-inspection.json).

## Verification, with separate evidence classes

| Evidence class | Fresh result | Practical limit |
|---|---|---|
| Scoped mock/unit tests | ${unit.numPassedTests}/${unit.numTotalTests} passed, ${unit.numTotalTestSuites} suites | Regression evidence; no statutory approval |
| PostgreSQL service tests | ${service.numPassedTests}/${service.numTotalTests} passed | Synthetic isolated scopes on a fresh database |
| SQL approval/rollback checks | ${spine.checks.filter(row=>row.passed).length}/${spine.checks.length} passed | Actual database contenders, uniqueness and rollback |
| Fresh migration replay | ${pg.migrations.length} applied | Fresh test database; application database unchanged |
| Source-only TypeScript | ${types.owned.length} owned / ${types.imported.length} imported diagnostics | No runtime or browser certification |
| Research artifact checks | ${research.checkCount}/${research.checkCount} passed | Exact retained bytes and documentary integrity |
| Whole retained dataset | ${dataset.checkCount} checks passed | Read-only recheck; last complete ordered scenario replay was October 29 |
| Business fingerprint | ${summary.verification.wholeDataset.businessFingerprintUnchanged?'Unchanged':'CHANGED — inspect evidence'} | Tracked business state compared with retained pre-continuation evidence |
| Authentic reviewer preflight | ${summary.reviewPreflight.passedConditions}/${summary.reviewPreflight.totalConditions} conditions | **${preflight.status}**; not ready for publication |
| New browser checks | Not run | Existing limited browser evidence remains historical |

See [unit results](history-proof-unit.json), [fresh database run](history-proof-postgres/postgres-run.json), [SQL checks](history-proof-postgres/trust-spine.json), [service results](history-proof-postgres/service-transactions.json), [type check](typecheck.json), [local deployment](history-guard-deployment.json) and [whole-dataset verification](whole-dataset-verification.json).

The PostgreSQL fixture constructs isolated synthetic PAID history records directly and exercises real transactions, triggers and approval-service boundaries. Normal employee payroll creation, real actor authentication and admitted statutory calculations require their separate acceptance evidence. Two early PostgreSQL attempts exposed fixture assumptions about the current model, deletion behavior and unique period ranges. Their failed results are retained in the attempt-1 and attempt-2 evidence folders; the final rerun uses corrected fixtures and unchanged production controls. The [separate legacy deletion finding](history-proof-legacy-delete-finding.md) records the pre-existing trigger behavior without changing its policy.

## Source preparation and reviewer return

Seven additional official DGI PDFs were retained and parsed, alongside re-verification of eight existing artifacts. The preparation maps fifteen rule paths and eleven scenario families. The consolidated 2025 CGI remains unrecovered; the official targets returned 404. A source-reference discrepancy in the scanned 2026 circular is preserved for reviewer reconciliation. Source discovery and byte checks do not constitute statutory interpretation or independent fixture approval.

Read the [reviewer handoff](../payroll-unblock-workpapers/source-research-2026-11-02/REVIEWER-HANDOFF.md), [source verification](../payroll-unblock-workpapers/source-research-2026-11-02/preparation-verification.json), [source manifest](../payroll-unblock-workpapers/source-research-2026-11-02/retained-source-manifest.json), and [historical AP admission finding](../payroll-unblock-workpapers/source-research-2026-11-02/AP-2025-ADMISSION-FINDING.md).

## Work that remains blocked

All ${summary.remaining.payrollTables} originally empty payroll-dependent tables remain empty. The ${summary.remaining.historicalInvoices} historical supplier invoices remain matched and unposted. The remaining parent tasks are recorded in the [detailed register](../PAYROLL-UNBLOCK-REGISTER.md) and [machine register](../payroll-unblock-register.json).

Required inputs are authentic effective-dated 2025/2026 rules; independently calculated expected results; the approved tax-year/history, adjustment, correction/reversal and refund contract; reviewer/checker evidence; legal-owner publication and production-admission authority. After those inputs, complete authoritative YTD/adjustment binding, full cross-month service acceptance, certified input snapshots, annual payroll, payslips, payment/declaration and accounting/close reconciliation. Re-preview the eighteen AP invoices only after an authorized 2025 VAT publication.

The retained application database was not changed. No live payment, external message, tax filing, statutory approval or production deployment was performed.

## Reproduce the bounded continuation

Generate and inspect the plan first; the execute command records real blockers and returns the dedicated blocked status when prerequisites are absent.

\`\`\`powershell
node scripts/run-disposable-payroll-continuation.cjs plan stoquify_replay_dataset_20261028_01
node scripts/run-disposable-payroll-continuation.cjs execute stoquify_replay_dataset_20261028_01
\`\`\`

The source-only check is \`node scripts/check-payroll-continuation-types.cjs\`. Fresh PostgreSQL tests require a new guarded database name and a dedicated output directory; see the retained run command. Databases and evidence are retained; no automatic deletion is included. The next skill handoff is country-pack provenance after authentic review prerequisites arrive.
`;
write('CONTINUATION-REPORT.md',text);
const skillReport=path.join(ROOT,'what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-11-02.md');fs.mkdirSync(path.dirname(skillReport),{recursive:true});
fs.writeFileSync(skillReport,text.replaceAll('](../payroll-unblock-workpapers/','](../../docs/database-seed/payroll-unblock-workpapers/').replaceAll('](../PAYROLL-UNBLOCK-REGISTER.md)','](../../docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md)').replaceAll('](../payroll-unblock-register.json)','](../../docs/database-seed/payroll-unblock-register.json)').replace(/\]\((?!\.\.\/)([^)]+)\)/g,'](../../'+BASE+'/$1)'));
console.log(JSON.stringify({status:summary.status,periodGates:summary.periodGates,verification:summary.verification}));
