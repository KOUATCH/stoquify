// Evidence/source reads only. Output is confined to this P12 review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../../../../..');process.chdir(root)
const fresh='docs/retention/execution/P02-P06-verification-2026-10-18/',hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(path.join(__dirname,p),JSON.stringify(v,null,2)+'\n')
const summary=read(fresh+'EVIDENCE_SUMMARY.json')
const source=summary.source.map(e=>({...e,current:hash(e.file),matches:hash(e.file)===e.sha256}))
const tests=summary.tests.map(t=>{const r=read(fresh+t.file);assert.equal(hash(fresh+t.file),t.sha256);return {file:fresh+t.file,sha256:t.sha256,success:r.success,passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests,executedInThisReview:false}})
const browser=summary.browser.map(t=>{assert.equal(hash(fresh+t.file),t.sha256);return {file:fresh+t.file,...read(fresh+t.file),executedInThisReview:false}})
const originalSchema=path.join(summary.target.directory,'schema.prisma')
assert.equal(hash(originalSchema),summary.schema.sha256)
const before=fs.readFileSync(originalSchema,'utf8'),after=fs.readFileSync('prisma/schema.prisma','utf8')
function declarations(s){return Object.fromEntries([...s.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(m=>[m[2],m[0].replace(/\r\n/g,'\n')]))}
const old=declarations(before),current=declarations(after),changed=Object.keys(old).filter(k=>old[k]!==current[k]),added=Object.keys(current).filter(k=>!old[k])
assert.deepEqual(changed.sort(),['AccountantAccessGrant','Organization','User'])
assert.deepEqual(added.sort(),['FirmEngagement','FirmEngagementAssignment','FirmEngagementGrantLink','FirmEngagementStatus','FirmEngagementTransition'])
const schemaChanges=changed.map(name=>({name,before:old[name],after:current[name]}))
const unchangedEvidenceModels=['POSCommitResult','BusinessEvent','Location','Role']
const models=unchangedEvidenceModels.map(name=>({name,exists:!!old[name],unchanged:old[name]===current[name]}))
assert.ok(models.every(m=>m.exists&&m.unchanged))
// Extract current prompt text independently instead of treating the old ledger as authority.
const prompts=[]
for(let i=1;i<=18;i++){const id='P'+String(i).padStart(2,'0'),name=fs.readdirSync('docs/retention/implementation-prompts').find(n=>n.startsWith(id.slice(1)+'_')),file='docs/retention/implementation-prompts/'+name,s=fs.readFileSync(file,'utf8'),section=s.slice(s.indexOf('## Acceptance criteria'),s.indexOf('## Verification steps'));prompts.push({id,path:file,sha256:hash(file),criteria:[...section.matchAll(/^- \[ \] (.+)$/gm)].map((m,n)=>({id:id+'-A'+(n+1),text:m[1].trim()})),dependencies:[...s.split(/\r?\n/).find(l=>l.startsWith('- Hard predecessor artifacts:')).matchAll(/\[(P\d+)\]/g)].map(m=>m[1])})}
write('PROMPT_CONTRACTS.json',prompts)
const historical=read(path.join(__dirname,'EVIDENCE_REVIEW.json'));historical.records.forEach(r=>r.historical=true);historical.note='All raw runtime results in this inventory predate this checkpoint rerun; none is a runtime execution by this review.';write('EVIDENCE_REVIEW.json',historical)
write('REFRESH_REVIEW.json',{at:new Date().toISOString(),source,tests,browser,cleanup:read(fresh+'CLEANUP.json'),schema:{originalFile:originalSchema,originalSha256:hash(originalSchema),currentSha256:hash('prisma/schema.prisma'),changed,added,models,details:schemaChanges,conclusion:'Additive dormant accountant engagement models/relations/keys; P02/P06 source tables unchanged. Historical bounded proof accepted; combined current schema/migration/client runtime remains a fixed-candidate prerequisite.'},limits:['The installed client datamodel still matches the October 18 evidence; it is not current full-schema generation proof','No new P02 database or P06 application browser run in this P12 review','Accounting access changes remain within unresolved P04/P15 full-path qualification; separate AF01-AF03 evidence is not a retention gate waiver']})
console.log(JSON.stringify({sourceDrift:source.filter(e=>!e.matches).map(e=>e.file),changedModels:changed,addedModels:added,tests:tests.map(t=>({file:t.file,passed:t.passed,failed:t.failed})),browser:browser.map(b=>({file:b.file,status:b.status}))},null,2))
