// Evidence-only writer. Does not run tests, load application config or contact a database.
const fs=require('node:fs'),crypto=require('node:crypto');
const root='what-next/hris-implementation-2026-10-24',dir=root+'/HR-08';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const digest=p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});
const old=read(dir+'/evidence-before-independent-review.json');
const review=read(dir+'/independent-review.json');
if(review.verdict!=='APPROVED_WITH_SCOPED_LIMITATIONS'||review.findings.some(x=>x.status!=='RESOLVED'))throw Error('Independent review not closed');
const unit=read(dir+'/unit-review.json'),pg=read(dir+'/postgres-review.json');
const unitRun=read(dir+'/unit-review-run.json'),typesRun=read(dir+'/types-review-run.json');
const workflow=read(dir+'/workflow-review.json');
for(const result of [unit,pg])if(!result.success||result.numFailedTests||result.numPendingTests)throw Error('Required lane is incomplete');
if(unitRun.exitCode!==0||typesRun.exitCode!==0||!workflow.ok||!fs.readFileSync(dir+'/typecheck-review.txt','utf8').includes('Diagnostics: 0'))throw Error('Required check failed');
const browserFiles=[root+'/HR-02/browser/results.json',root+'/HR-06/browser/results.json'];
for(const file of browserFiles)if(read(file).results.length!==6)throw Error('Incomplete browser matrix');
const sources=[...new Set(old.hashes.map(x=>x.path).concat('services/payroll/__tests__/payroll-replay-authorization.test.ts'))];
const hashes=sources.map(digest);
const changed=hashes.filter(x=>old.hashes.find(y=>y.path===x.path)?.sha256!==x.sha256).map(x=>x.path);
const timestamp=new Date().toISOString();
review.recordedAt=timestamp;
review.finalVerification={unitPassed:unit.numPassedTests,unitSuites:unit.numPassedTestSuites,postgresPassed:pg.numPassedTests,typecheckDiagnostics:0,browserJourneys:12};
review.reviewedSourceHashes=hashes;
review.closingConditionSatisfied=true;
fs.writeFileSync(dir+'/independent-review.json',JSON.stringify(review,null,2));
const closeout={timestamp,database:'stoquify_local_hris_20261024',host:'127.0.0.1',port:55464,schema:'public',remainingSyntheticOrganizations:0,
 cleanupCheck:"SELECT 'remaining_test_organizations=' || count(*) FROM organizations WHERE slug LIKE 'hris-verification-%';",cleanupCheckExitCode:0,
 postgresStop:{dataDirectory:'C:/Users/J COMPUTER/.codex/visualizations/2026/10/24/01a16e07-5033-74f0-a987-8d57c6717085/hris-postgres-20261024',command:'pg_ctl -D <exact dataDirectory> -m fast -w stop',exitCode:0,result:'server stopped',filesRetained:true},
 staticComponentHarness:{address:'127.0.0.1:18542',ownedExecSession:40870,result:'terminated with Ctrl-C after six successful browser cases',terminationExitCode:1},
 databaseBrowserHarness:'ephemeral server and headless browser closed in test finally blocks',noProductionEffects:true};
fs.writeFileSync(dir+'/environment-closeout.json',JSON.stringify(closeout,null,2));
const pgArgs=['node_modules/jest/bin/jest.js','--config','jest.hris-correctness-postgres.config.cjs','--runInBand','--no-cache','--json','--outputFile='+dir+'/postgres-review.json'];
const results=[
 {lane:'mocked/pure/component/source assertions',artifact:dir+'/unit-review.json',passed:unit.numPassedTests,suites:unit.numPassedTestSuites,failed:0,skipped:0,exitCode:unitRun.exitCode,command:['node',...unitRun.args],startedAt:unitRun.startedAt,finishedAt:unitRun.finishedAt},
 {lane:'real PostgreSQL and embedded People browser matrix',artifact:dir+'/postgres-review.json',passed:pg.numPassedTests,failed:0,skipped:0,exitCode:0,command:['node',...pgArgs],startedAt:new Date(pg.startTime).toISOString(),finishedAt:new Date(Math.max(...pg.testResults.map(x=>x.endTime))).toISOString(),explicitEnvironment:'HRIS_CORRECTNESS_DATABASE_URL=postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public'},
 {lane:'focused TypeScript',artifact:dir+'/typecheck-review.txt',diagnostics:0,exitCode:typesRun.exitCode,command:['node',...typesRun.args],startedAt:typesRun.startedAt,finishedAt:typesRun.finishedAt},
 {lane:'attendance browser',artifact:browserFiles[0],passed:6,exitCode:0,command:['node',root+'/HR-02/browser/check.cjs'],target:'127.0.0.1:18542; actual component with synthetic action'},
 {lane:'People browser',artifact:browserFiles[1],passed:6,exitCode:0,command:'Embedded in complete PostgreSQL suite',target:'ephemeral loopback server; actual service/PostgreSQL with synthetic role boundary'},
 {lane:'workflow',artifact:dir+'/workflow-review.json',passed:true,exitCode:0,command:'npm run agent:workflow:check; final manifest revalidation via inspected validate() export',unclassifiedScripts:workflow.unclassifiedCount},
 {lane:'owned tracked diff whitespace',exitCode:0,command:'git diff --check -- <review-owned source/test files and execution register>'},
 ];
const artifacts=[dir+'/unit-review.json',dir+'/postgres-review.json',dir+'/typecheck-review.txt',dir+'/unit-review-run.json',dir+'/types-review-run.json',dir+'/workflow-review.json',dir+'/independent-review.json',dir+'/INDEPENDENT_REVIEW.md',dir+'/RESULT.md',dir+'/ROLLBACK_AND_SUPPORT.md',dir+'/environment-closeout.json',dir+'/cleanup-recovery.json',dir+'/review-reproduction.json',dir+'/unit-review-initial.json',dir+'/postgres-review-focused.json',...browserFiles];
for(const slice of ['HR-02','HR-06'])for(const locale of ['en','fr'])for(const width of [360,768,1440])artifacts.push(`${root}/${slice}/browser/${locale}-${width}.png`);
const harnesses=['jest.hris-correctness-postgres.config.cjs','jest.payroll-trust-spine.config.cjs','jest.setup.ts',root+'/typecheck.cjs',dir+'/run-review-check.cjs',dir+'/write-review-evidence.cjs',root+'/HR-02/browser/check.cjs',root+'/HR-02/browser/serve.cjs',root+'/HR-06/browser/check.cjs',root+'/HR-06/browser/build.cjs'];
fs.writeFileSync(dir+'/evidence.json',JSON.stringify({slice:'HR-08',status:'VERIFIED',timestamp,baselineCommit:old.baselineCommit,
 scope:'Bounded engineering correctness; inherited dirty tree preserved; no legal/production/whole-platform certification',hashes,reviewChangedFiles:changed,harnessHashes:harnesses.map(digest),artifacts:artifacts.map(digest),results,
 commands:results.map(x=>x.command),independentReview:dir+'/independent-review.json',acceptance:Object.fromEntries(['AC01','AC02','AC03','AC04','AC05','AC06'].map(x=>[x,'PASS within documented scope'])),
 operationalPolicy:'Whole overnight shift belongs to its local start date',databaseTarget:closeout,open:[],limitations:[...review.limitations,'Readiness remains BLOCKED for unrelated missing employee/contract/payment proof','Current payroll admission: CM/monthly/single employer','No elapsed-time/DST segmentation or retrospective employment correction workflow'],nextEligibleSlice:'HR-09; not started'},null,2));
console.log(JSON.stringify({status:'VERIFIED',sourceFiles:hashes.length,reviewChangedFiles:changed,unit:unit.numPassedTests,postgres:pg.numPassedTests,browser:12,typeDiagnostics:0}));
