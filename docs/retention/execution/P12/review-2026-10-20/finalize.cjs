// Checkpoint document/evidence integrity only; no application/database/browser operations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..'),parent=path.join(__dirname,'..'),rel=p=>path.relative(root,p).replaceAll('\\','/')
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8')),hash=p=>fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null
const norm=s=>s.replaceAll('\r\n','\n'),baseline=read('BASELINE.json')
const docNames=['RESULT.md','DAY_30_CHECKPOINT.md','DAYS_31_60_EXECUTION_ORDER.md','ACCEPTANCE_LEDGER.md']
const owned=docNames.map(n=>rel(path.join(parent,n))).concat('docs/retention/execution/STATUS.md')
const drift=baseline.files.map(f=>({...f,current:hash(path.join(root,f.path))})).filter(f=>f.sha256!==f.current)
const unowned=drift.filter(f=>!owned.includes(f.path))
const problems=[]
const concurrentReviewed={
 'prisma/schema.prisma':'69b4bfef70d412d0023efe1089e019d2f74178013c61bdbefbf6aa746013d0d1',
 'services/accounting/accountant-access.service.ts':'5a60f58b097fd4413f032c55c35186500cc3c089c48c9ebcdeccdcefd8d5edf6'
}
if(unowned.some(f=>concurrentReviewed[f.path]!==f.current))problems.push('Additional unreviewed selected source drift')
for(const file of docNames){const expected=baseline.files.find(f=>f.path===rel(path.join(parent,file)))?.sha256;assert.equal(hash(path.join(__dirname,'PRIOR_'+file)),expected,`Prior copy ${file}`)}
const status=fs.readFileSync(path.join(root,'docs/retention/execution/STATUS.md'),'utf8'),initial=fs.readFileSync(path.join(__dirname,'INITIAL_STATUS.md'),'utf8')
const withoutP12=s=>norm(s).split('\n').filter(l=>!l.startsWith('| [P12]')).join('\n')
assert.equal(withoutP12(status),withoutP12(initial),'Non-P12 register row changed')
const rows=read('ACCEPTANCE.json'),contracts=read('PROMPT_CONTRACTS.json'),original=contracts.filter(c=>Number(c.id.slice(1))<=11).flatMap(c=>c.criteria)
assert.equal(rows.length,42);assert.equal(original.length,42)
for(const a of original){const row=rows.find(r=>r.id===a.id);assert.equal(row.text,a.text);assert.ok(row.owner&&row.reason)}
assert.equal(rows.filter(r=>r.status==='PASS').length,41);assert.equal(rows.filter(r=>r.status==='PARTIAL').length,1)
const md=fs.readFileSync(path.join(parent,'ACCEPTANCE_LEDGER.md'),'utf8')
for(const a of rows)assert.ok(md.includes(`| ${a.id}: ${a.text} | ${a.status} |`),a.id)
assert.equal(read('WORKFLOW.json').exitCode,0)
const proof=read('PROOF_RESULTS.json');assert.equal(proof.success,true);assert.equal(proof.numPassedTests,13);assert.equal(proof.numFailedTests,0);assert.equal(proof.numPendingTests,0);assert.equal(read('PROOF_EXECUTION.json').exit,0)
const fresh=path.join(root,'docs/retention/execution/P02-P06-verification-2026-10-18'),freshManifest=JSON.parse(fs.readFileSync(path.join(fresh,'MANIFEST.json')))
const packetDrift=freshManifest.files.filter(f=>hash(path.join(root,f.file))!==f.sha256)
assert.deepEqual(packetDrift.map(f=>f.file),['docs/retention/execution/STATUS.md'],'Prior packet altered beyond expected P12 register update')
const refresh=read('REFRESH_REVIEW.json');for(const f of refresh.source)assert.equal(hash(path.join(root,f.file)),f.current,'Post-review source drift '+f.file)
const links=[]
const docs=docNames.map(n=>path.join(parent,n)).concat(path.join(__dirname,'REVIEW_AND_COMMANDS.md'),path.join(__dirname,'ATTEMPTS.md'))
for(const file of docs)for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){
 let link=m[1].replace(/^<|>$/g,'');if(/^(https?:|#)/.test(link))continue
 const destination=path.resolve(path.dirname(file),link.split('#')[0])
 if(['VALIDATION.json','MANIFEST.json'].includes(path.basename(destination)))continue
 assert.ok(fs.existsSync(destination),`${rel(file)} broken link ${link}`);links.push({file:rel(file),link})
}
// Verify planned downstream dependencies without executing any prompt.
const order=fs.readFileSync(path.join(parent,'DAYS_31_60_EXECUTION_ORDER.md'),'utf8')
for(const c of contracts.filter(c=>Number(c.id.slice(1))>=13)){const line=order.split('\n').find(l=>l.includes(`**${c.id} —`));assert.ok(line,c.id);for(const dep of c.dependencies)assert.ok(new RegExp(`\\b${dep}\\b`).test(line),`${c.id} missing ${dep}`)}
const extra=['actions/accounting/data-trust.actions.ts','services/accounting/data-trust.service.ts','services/accounting/accountant-access.service.ts','services/accounting/close-evidence-acceptance-authority.service.ts','services/accounting/close-assurance-current-proof.ts','services/accounting/__tests__/close-assurance-current-proof.test.ts','jest.accountant-portfolio.config.cjs','services/evidence/evidence-grade.service.ts','services/evidence/evidence-blockers.service.ts','docs/accounting-firms/roadmap-2026-10-19/execution/AF01/RESULT.md','docs/accounting-firms/roadmap-2026-10-19/execution/AF02/RESULT.md','docs/accounting-firms/roadmap-2026-10-19/execution/AF03/RESULT.md','docs/accounting-firms/roadmap-2026-10-19/execution/AF04/AUTHORITY_AND_LOCK_ORDER.md']
fs.writeFileSync(path.join(__dirname,'ADDITIONAL_SOURCE_HASHES.json'),JSON.stringify({at:new Date().toISOString(),files:extra.map(file=>({file,sha256:hash(path.join(root,file))})),AF04ResultPresent:fs.existsSync(path.join(root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF04/RESULT.md')),note:'Additional inspected source/evidence; no accountant programme executed'},null,2)+'\n')
const head=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(head,baseline.head)
const result={at:new Date().toISOString(),status:problems.length?'NEEDS_REVIEW':'PASS',head,initialTracked:baseline.status.trim().split('\n').length,initialUntracked:baseline.untracked.length,selectedFiles:baseline.files.length,ownedDrift:drift.filter(f=>owned.includes(f.path)),unownedDrift:unowned,nonP12StatusUnchanged:true,priorDocumentsPreserved:true,originalCriteria:42,acceptance:{PASS:41,PARTIAL:1},workflowExit:0,pureTests:13,newDatabaseTests:0,newBrowserTests:0,packetDrift:packetDrift.map(f=>f.file),localLinksChecked:links.length,downstreamDependenciesChecked:true,problems}
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n')
const files=fs.readdirSync(__dirname).filter(n=>n!=='MANIFEST.json'&&fs.statSync(path.join(__dirname,n)).isFile()).map(n=>rel(path.join(__dirname,n))).concat(owned,'docs/retention/execution/P12/review-2026-10-18/prepare.cjs')
fs.writeFileSync(path.join(__dirname,'MANIFEST.json'),JSON.stringify({at:new Date().toISOString(),scope:'P12 only; shared STATUS ownership limited to P12 row',files:files.map(file=>({file,sha256:hash(path.join(root,file))}))},null,2)+'\n')
console.log(JSON.stringify({status:result.status,unownedDrift:unowned.map(f=>f.path),criteria:42,pass:41,partial:1,pureTests:13,links:links.length,manifestFiles:files.length}))
if(problems.length)process.exitCode=1
