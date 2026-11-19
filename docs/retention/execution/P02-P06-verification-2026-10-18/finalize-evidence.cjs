// Local evidence validation only. No application, database, network or Git mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../..'),prefix=path.relative(root,__dirname).replaceAll('\\','/'),read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'))
const hashBytes=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>fs.existsSync(p)?hashBytes(fs.readFileSync(p)):null
const baseline=read('BASELINE.json'),summary=read('EVIDENCE_SUMMARY.json'),norm=s=>s.replaceAll('\r\n','\n')
const ownedOutside=['services/analytics/__tests__/retention-outcomes.postgres.test.ts','docs/retention/execution/P02/RESULT.md','docs/retention/execution/P06/RESULT.md','docs/retention/execution/STATUS.md']
const concurrent=['components/landing/__tests__/CinematicLanding.test.tsx','components/landing/__tests__/workflow-atlas.test.tsx','components/landing/cinematic-business-story.tsx','components/landing/cinematic.css']
const drift=baseline.files.map(f=>({...f,currentSha256:hash(path.join(root,f.path))})).filter(f=>f.sha256!==f.currentSha256)
assert.ok(drift.every(f=>ownedOutside.includes(f.path)||concurrent.includes(f.path)),'Unexpected selected source drift')
for(const f of summary.source)assert.equal(hash(path.join(root,f.file)),f.sha256,`Post-check source drift: ${f.file}`)
const statusPath=path.join(root,'docs/retention/execution/STATUS.md'),stripRows=s=>norm(s).split('\n').filter(l=>!/^\| \[P0[26]\]/.test(l)).join('\n')
assert.equal(stripRows(fs.readFileSync(statusPath,'utf8')),stripRows(fs.readFileSync(path.join(__dirname,'INITIAL_STATUS.md'),'utf8')),'Unowned register row changed')
const historical=[]
for(const p of ownedOutside.filter(p=>p.endsWith('/RESULT.md'))){
 const original=execFileSync('git',['show',`${baseline.head}:${p}`],{cwd:root,windowsHide:true})
 assert.equal(hashBytes(original),baseline.files.find(f=>f.path===p).sha256,'Baseline result differs from recorded HEAD; manual comparison needed')
 const current=norm(fs.readFileSync(path.join(root,p),'utf8')),rest=current.replace(/\n> \*\*18 October 2026[^\n]*\n/,'')
 assert.equal(rest,norm(original.toString()),`Historical result altered: ${p}`);historical.push(p)
}
function test(file,count){const r=read(file);assert.equal(r.success,true);assert.equal(r.numPassedTests,count);assert.equal(r.numFailedTests,0);assert.equal(r.numPendingTests,0)}
test('p02-unit-1792353981196.results.json',65);test('retention-db-1792354347784.results.json',18);test('browser-fixture.results.json',1)
const operator=read('browser-1792354378317.json'),close=read('server-close-1792354740792.json'),states=read('read-states-1792354860401.json')
assert.equal(operator.status,'PASS');assert.equal(operator.steps.length,7);assert.deepEqual(operator.before,operator.after)
assert.equal(close.status,'PASS');assert.equal(close.blockers,3);assert.equal(close.closePosts,1);assert.equal(close.shift,'ACTIVE');assert.equal(close.financialCommits,0)
assert.equal(states.status,'PASS');assert.equal(states.steps.length,2);assert.deepEqual(states.colors,states.offlineColors)
assert.equal(read('WORKFLOW.json').exitCode,0);assert.equal(read('pg-stop.execution.json').exit,0);assert.equal(read('CLEANUP.json').success,true)
const rawFiles=['p02-unit-1792353981196.execution.json','retention-db-1792354347784.execution.json','browser-fixture.execution.json','operator-1792354373829.execution.json','server-close-1792354696827.execution.json','read-states-1792354845798.execution.json']
for(const file of rawFiles)assert.equal(read(file).exit,0,file)
const target=read('DATABASE_TARGET.json'),expected=path.join(root,'.codex-tmp','retention-p02-p06-refresh-bb98aca78f')
assert.equal(path.resolve(target.directory),expected)
const serverLines=fs.readFileSync(path.join(target.directory,'postgres.log'),'utf8').split(/\r?\n/).filter(l=>/pg_terminate_backend|terminating connection due to administrator command/.test(l))
assert.ok(serverLines.some(l=>l.includes('bigint')));assert.ok(serverLines.some(l=>l.includes('terminating connection')))
fs.writeFileSync(path.join(__dirname,'POSTGRES_FAILURE_PROBE.log'),serverLines.join('\n')+'\n')
const docs=['RESULT.md','P02_DATABASE_VERIFICATION.md','P06_OPERATOR_REFRESH.md','SOURCE_AND_COMMAND_REVIEW.md','RUN_PLAN.md'],links=[]
for(const file of docs){const text=fs.readFileSync(path.join(__dirname,file),'utf8');for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const link=match[1];if(/^(https?:|#)/.test(link))continue;const dest=path.resolve(__dirname,link.split('#')[0]);if(['VALIDATION.json','MANIFEST.json'].includes(path.basename(dest)))continue;assert.ok(fs.existsSync(dest),`${file}: broken ${link}`);links.push({file,link})}}
const gitStatus=execFileSync('git',['status','--short','--untracked-files=all'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024})
fs.writeFileSync(path.join(__dirname,'FINAL_GIT_STATUS.txt'),gitStatus)
const finalHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(finalHead,baseline.head)
const result={at:new Date().toISOString(),status:'PASS',head:finalHead,initialTrackedChanges:baseline.status.trim().split('\n').length,initialUntracked:baseline.untracked.length,selectedBaselineFiles:baseline.files.length,drift:drift.map(f=>({...f,classification:ownedOutside.includes(f.path)?'owned':'concurrent unrelated landing work; preserved'})),historicalResultsPreserved:historical,unownedRegisterRowsPreserved:true,postCheckSourceHashesMatch:true,checks:{mocked:65,database:18,fixtureSetup:1,operatorSteps:7,serverCloseBlockers:3,readStateSteps:2},cleanup:read('CLEANUP.json'),localLinksChecked:links.length,limitations:['Selected-hash preservation, not exhaustive all-file attribution','Initial unstyled offline screenshot retained; cause not isolated','P02 session-subject/headers seam; no human cohort or financial producer proof','No later prompt or historical checkpoint reevaluation']}
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n')
const files=fs.readdirSync(__dirname).filter(f=>f!=='MANIFEST.json'&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>`${prefix}/${f}`).concat(ownedOutside)
fs.writeFileSync(path.join(__dirname,'MANIFEST.json'),JSON.stringify({at:new Date().toISOString(),scope:'new packet and test; dated notices and only P02/P06 register rows; hashes of shared files do not imply ownership of all content',files:files.map(file=>({file,sha256:hash(path.join(root,file))}))},null,2)+'\n')
console.log(JSON.stringify({status:result.status,initialTrackedChanges:result.initialTrackedChanges,selectedFiles:result.selectedBaselineFiles,concurrentDrift:drift.filter(f=>concurrent.includes(f.path)).map(f=>f.path),manifestFiles:files.length,links:links.length}))
