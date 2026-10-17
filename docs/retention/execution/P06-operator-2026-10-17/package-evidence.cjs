const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),normalize=s=>s.replace(/\r\n/g,'\n')
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'BASELINE.json'),'utf8'))
const owned=new Set(['lib/pos/offline-local-queue.ts','lib/pos/__tests__/offline-local-queue.test.ts','components/pos/ProfessionalPOSSystem.tsx','components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx','docs/retention/execution/P06/RESULT.md','docs/retention/execution/P06/OFFLINE_ENVELOPE.md','docs/retention/execution/P06/OFFLINE_FAILURE_MATRIX.md','docs/retention/execution/STATUS.md'])
for(const file of ['components/pos/offline/LocalOfflineRecovery.tsx','components/pos/__tests__/LocalOfflineRecovery.test.tsx','services/pos/__tests__/retention-offline-operator.browser-fixture.test.ts']) owned.add(file)
const drift=[]
for(const [file,before] of Object.entries(baseline.hashes)) {const actual=path.join(root,file);if(!fs.existsSync(actual)||hash(fs.readFileSync(actual))!==before)drift.push({file,owned:owned.has(file),present:fs.existsSync(actual)})}
const beforePaths=['lib/pos/offline-local-queue.ts','lib/pos/__tests__/offline-local-queue.test.ts','hooks/posHooks/useOfflineSync.ts','components/pos/ProfessionalPOSSystem.tsx','components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx']
for(const file of beforePaths){
  const before=path.join(__dirname,path.basename(file)+'.before.txt'),after=path.join(root,file)
  const diff=cp.spawnSync('git',['diff','--no-index','--',before,after],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true})
  if(![0,1].includes(diff.status))throw Error('Diff failed '+file)
  fs.writeFileSync(path.join(__dirname,path.basename(file)+'.patch'),diff.stdout)
}
const tests=fs.readdirSync(__dirname).filter(name=>name.endsWith('.results.json')).map(name=>{const r=JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));return {file:name,success:r.success,passed:r.numPassedTests,failed:r.numFailedTests,pending:r.numPendingTests,suites:r.numTotalTestSuites}})
const result={utc:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),drift,unrelatedDrift:drift.filter(d=>!d.owned),tests,sourceHashes:Object.fromEntries([...owned].filter(p=>fs.existsSync(path.join(root,p))).map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]))}
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2))
fs.writeFileSync(path.join(__dirname,'FINAL_WORKTREE_STATUS.txt'),cp.execFileSync('git',['status','--short','--untracked-files=all'],{cwd:root,maxBuffer:32*1024*1024}))
const manifest=fs.readdirSync(__dirname).filter(n=>n!=='ARTIFACT_MANIFEST.json'&&fs.statSync(path.join(__dirname,n)).isFile()).map(name=>({name,sha256:hash(fs.readFileSync(path.join(__dirname,name)))}))
fs.writeFileSync(path.join(__dirname,'ARTIFACT_MANIFEST.json'),JSON.stringify({utc:new Date().toISOString(),files:manifest},null,2))
console.log(JSON.stringify({unrelatedDrift:result.unrelatedDrift,tests},null,2))
