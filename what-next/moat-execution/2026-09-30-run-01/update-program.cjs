const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),run=path.relative(root,__dirname).replaceAll('\\','/'),docs=path.join(root,'docs/moat/roadmap');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const postgres=read('postgres.json'),browser=read('browser.json'),proof=read('proof-export.json'),checks=read('checks.json'),tests=read('regression-tests.json');
for(const result of [postgres,browser,proof])assert.equal(result.status,'PASS');
assert.ok(checks.results.every(r=>r.exitCode===0));assert.equal(tests.numFailedTests,0);
// A current browser receipt must cover the final source. Older PostgreSQL
// receipts stay scoped to their unchanged server sources, not subsequent UI edits.
for(const [file,hash] of Object.entries(browser.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,'Browser source drift: '+file);
const registerPath=path.join(docs,'MOAT_WORK_PACKAGE_REGISTER.json'),register=JSON.parse(fs.readFileSync(registerPath,'utf8')),pkg=register.packages.find(p=>p.id==='M1-03');
register.updatedAt=new Date().toISOString();register.status='LOCAL_RUNTIME_VERIFIED_PROGRAM_CONDITIONAL';register.runEvidence=run;register.nextPackage='M2-01';
pkg.status='LOCAL_RUNTIME_VERIFIED_EXTERNAL_GATES_OPEN';pkg.preciseGap='Local runtime gates passed; real rail/payment corpus, recipient delivery recovery, reconciled customer inputs and pilot observations remain open.';
pkg.entryConditions='Owned local browser/database fixtures verified for engineering; customer/rail conditions apply separately to operational completion.';
pkg.dependencyDisposition={engineering:'M1-01 available; local runtime completed',operational:['M1-02 reconciled inputs and customer onboarding','M2-01 actual selected rail and permissioned corpus']};
pkg.affectedFilesOrServices=['services/accounting/accountant-work-desk.service.ts','services/accounting/accountant-work-desk.contracts.ts','components/accounting/AccountantWorkDesk.tsx','components/accounting/accountant-work-desk-copy.ts','components/accounting/AccountantPortfolio.tsx','app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx','app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx'];
pkg.evidence=['postgres.json','browser.json','browser-en.png','browser-fr.png','proof-export.json','checks.json','regression-tests.json','service-boundary.json','source-final.json'].map(file=>run+'/'+file);
pkg.verification=[`${postgres.checks.length} PostgreSQL authority/integrity/rollback/concurrency checks passed`, 'EN/FR Chromium keyboard, narrow viewport, revoked review, two-client reload/download passed', `${proof.checks.length} real PostgreSQL ledger/export/invalidation checks passed; certified initial snapshot seeded`, `${tests.numPassedTests} Jest tests in ${tests.numPassedTestSuites} suites; typecheck/lint/boundary passed`];
pkg.blockers=['B3','B4','B5','B6'];pkg.nextAction='Complete selected-rail, customer input, delivery recovery and pilot evidence; retain local verified checkpoint. Screen-reader and backup-restore release checks remain open.';
pkg.externalLeadTime='Real rail corpus, customer inputs/consent, delivery operator and pilot observations not supplied.';
pkg.maturity={implemented:true,localVerification:'PASSED_REAL_LOCAL_RUNTIME',operationalValidation:'NOT_ESTABLISHED',commercialValidation:'NOT_ESTABLISHED',released:false};
pkg.acceptanceEvidence={bilingualWorkflow:'PASS_LOCAL_BROWSER; screen-reader review open',currentAuthority:'PASS_LOCAL_POSTGRES_AND_BROWSER',concurrencyReplay:'PASS_LOCAL_POSTGRES',changedSourceAndExport:'PASS_LOCAL; certified snapshot initial condition seeded',unansweredAndDelivery:'VISIBILITY_IMPLEMENTED_VERIFIED; real delivery recovery and pilot validation open'};
pkg.report='docs/moat/roadmap/M1_03_EXECUTION_REPORT.md';
for(const p of register.packages)p.blockers=p.blockers.filter(b=>!['B1','B2'].includes(b));
const first=register.packages.find(p=>p.id==='M1-01');first.nextAction='M1-03 local runtime passed; continue its operational evidence gates.';first.externalLeadTime='Local runtime prerequisite satisfied on 2026-09-30.';
fs.writeFileSync(registerPath,JSON.stringify(register,null,2)+'\n');
const checkpoint='\n> **30 September 2026 update:** M1-03 local PostgreSQL and EN/FR browser gates passed. Unanswered-request/notification visibility and in-place password confirmation are implemented. Real rail, customer cutover, recipient delivery recovery and pilot gates remain open. See [M1-03 execution report](M1_03_EXECUTION_REPORT.md); dated 27 September statements below describe the earlier baseline.\n';
for(const name of ['MOAT_ROADMAP','MOAT_EXECUTION_PLAN','MOAT_REQUIREMENTS_TRACEABILITY','MOAT_VALIDATION_PROTOCOLS','MOAT_DECISIONS_AND_BLOCKERS','MOAT_EXECUTION_REPORT']){
 const filename=path.join(docs,name+'.md');let content=fs.readFileSync(filename,'utf8');if(!content.includes('**30 September 2026 update:**')){const end=content.indexOf('\n');content=content.slice(0,end+1)+checkpoint+content.slice(end+1)}
 if(name==='MOAT_EXECUTION_PLAN'){
  content=content.replace('Unanswered requests remain outside this first view and are explicitly disclosed in its copy.','As of 30 September, unanswered requests appear with client-recipient ownership and scoped notification states; contradictory or truncated histories are withheld and marked incomplete. Notification processing does not establish recipient delivery.');
  content=content.replace('Each client is rechecked after its queue snapshot.','Each client is rechecked after its queue, pending-request and notification reads.');
  content=content.replace('The browser tool timed out twice during this run. No authorized isolated database target was identified. These gaps remain open and are not replaced by mocks.','The 27 September browser/database gaps were resolved in the 30 September local runtime checkpoint. Live rail, delivery recovery, screen-reader/restore and customer evidence remain open.');
 }
 if(name==='MOAT_VALIDATION_PROTOCOLS')content=content.replace('The new desk covers submitted responses, so observe unanswered-request chasing in the existing workflow and record the remaining UX gap.','The desk now includes unanswered requests and notification processing states. In the pilot, verify actual recipient delivery and recovery independently; an outbox SENT state is not a delivery receipt.');
 if(name==='MOAT_DECISIONS_AND_BLOCKERS'){
  content=content.replace('| B1 | Browser control unavailable | QA/tool runtime | Two `cua.getState()` calls timed out before enumeration; no browser/session observations or screenshots obtained |','| B1 | Resolved locally on 30 September | QA/tool runtime | Chromium completed EN/FR workflows and scoped downloads; see M1-03 report |');
  content=content.replace('| B2 | No identified authorized isolated DB target | QA/data owner | Need a disposable seeded PostgreSQL environment and scoped users to verify concurrency, revocation and full journey; no live data used |','| B2 | Resolved locally on 30 September | QA/data owner | Owned loopback PostgreSQL verified authority, rollback, concurrency, exports and source invalidation; synthetic fixtures only |');
  content=content.replace('M1-03 is the next principal package once browser access and an authorized isolated database are available: verify two-client list/detail/accept/export, grant expiry/revocation, read-only modules, source change and replay/concurrent acceptance.','M1-03 local engineering gates have passed. Continue its operational acceptance with real delivery recovery, reconciled client inputs and pilot observations.');
 }
 fs.writeFileSync(filename,content);
}
const sources=Object.fromEntries(Object.keys(browser.sources).map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
fs.writeFileSync(path.join(__dirname,'source-final.json'),JSON.stringify({at:new Date().toISOString(),sources},null,2));
fs.writeFileSync(path.join(__dirname,'verification-manifest.json'),JSON.stringify({at:new Date().toISOString(),programStatus:register.status,packageStatus:pkg.status,postgresChecks:postgres.checks.length,browserChecks:browser.checks.length,proofChecks:proof.checks.length,jest:{passed:tests.numPassedTests,suites:tests.numPassedTestSuites},checks:checks.results,limitations:['Synthetic fixtures only','Initial certified snapshot seeded for invalidation test','No live rail or recipient-delivery recovery','No customer pilot/commercial evidence','No screen-reader audit or backup restore','No deployment'],publication:'See publication-manifest.json'},null,2));
console.log(JSON.stringify({package:pkg.id,status:pkg.status,jest:tests.numPassedTests,postgres:postgres.checks.length,browser:browser.checks.length,proof:proof.checks.length}));
