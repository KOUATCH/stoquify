// Read-only source/Git/doc checks; writes only P12 validation and manifest.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..');process.chdir(root)
const dir=path.resolve(__dirname,'..'),statusFile='docs/retention/execution/STATUS.md'
const hash=p=>fs.existsSync(p)&&fs.statSync(p).isFile()?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'BASELINE.json')))
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'SOURCE_REVIEW.json')))
const drift=baseline.files.filter(e=>!e.path.startsWith('docs/retention/execution/P12/')&&e.path!==statusFile&&hash(e.path)!==e.sha256).map(e=>({file:e.path,before:e.sha256,after:hash(e.path)}))
const reviewedSourceDrift=source.files.filter(e=>hash(e.file)!==e.sha256)
const previous=fs.readFileSync(path.join(__dirname,'INITIAL_STATUS.md'),'utf8'),current=fs.readFileSync(statusFile,'utf8')
const omitP12=s=>s.split(/\r?\n/).filter(l=>!l.startsWith('| [P12](')).join('\n')
const statusOnlyP12=omitP12(previous)===omitP12(current)
const p12Rows=current.split(/\r?\n/).filter(l=>l.startsWith('| [P12]('))
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)])
const markdown=walk(dir).filter(p=>p.endsWith('.md')&&!p.endsWith('INITIAL_STATUS.md'))
const links=[]
for(const file of markdown){for(const m of fs.readFileSync(file,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
 const url=m[1].replace(/^<|>$/g,'');if(/^(https?:|#)/.test(url))continue
 const target=path.resolve(path.dirname(file),decodeURIComponent(url.split('#')[0]))
 const pending=[path.join(__dirname,'VALIDATION.json'),path.join(__dirname,'MANIFEST.json')].includes(target)
 links.push({file:path.relative(root,file).replaceAll('\\','/'),link:url,exists:fs.existsSync(target)||pending})
}}
const contracts=JSON.parse(fs.readFileSync(path.join(__dirname,'PROMPT_CONTRACTS.json'))).filter(c=>Number(c.id.slice(1))<=11).flatMap(c=>c.criteria)
const acceptance=JSON.parse(fs.readFileSync(path.join(__dirname,'ACCEPTANCE.json')))
const coverage=acceptance.length===42&&contracts.length===42&&contracts.every(c=>acceptance.filter(a=>a.id===c.id&&a.text===c.text&&a.owner&&['PASS','PARTIAL','BLOCKED','NOT_RUN'].includes(a.status)).length===1)
const workflow=JSON.parse(fs.readFileSync(path.join(__dirname,'WORKFLOW.json'))),storage=JSON.parse(fs.readFileSync(path.join(__dirname,'STORAGE_RESULTS.json'))),storageExecution=JSON.parse(fs.readFileSync(path.join(__dirname,'STORAGE_EXECUTION.json')))
const sourcePreserved=drift.length===0&&reviewedSourceDrift.length===0
// Inspected concurrent landing work, never edited by P12. Retain exact observed
// hashes and original failed validation; do not claim an unchanged whole tree.
const concurrent={
 'components/landing/__tests__/CinematicLanding.test.tsx':'9cf7ce43ea2b94ae8c01c105b041b1d67972faad863af848dbe2ed42cb665cd7',
 'components/landing/__tests__/workflow-atlas.test.tsx':'098c0dbf52181de7e631987910931b80daaca80225eb465a9468c19c974fe6ed',
 'components/landing/cinematic-business-story.tsx':'0f9e6e314f98e5d602fdbd16329b1c7f5922ae717dd875b93622dbaf754e985b',
 'components/landing/cinematic.css':'88e54f15baa610694c651c9b3fbc35412b407b272bf4bf069ae2b20b99a9f367'
}
const unexplainedDrift=drift.filter(e=>concurrent[e.file]!==e.after)
const relevantSourcesStable=reviewedSourceDrift.length===0&&unexplainedDrift.length===0
const valid=relevantSourcesStable&&statusOnlyP12&&coverage&&p12Rows.length===1&&p12Rows[0].includes('| PARTIAL |')&&links.every(l=>l.exists)&&workflow.exitCode===0&&storage.success&&storage.numPassedTests===25&&storage.numPendingTests===0&&storageExecution.exit===0
const result={at:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:cp.execFileSync('git',['status','--short','--untracked-files=no'],{encoding:'utf8'}),baselineEntries:baseline.files.length,sourcePreserved,relevantSourcesStable,unexplainedDrift,concurrentChangesReviewed:Object.keys(concurrent),drift,reviewedSourceDrift,statusOnlyP12,acceptanceCount:acceptance.length,exactAcceptanceCoverage:coverage,links,workflowExit:workflow.exitCode,storage:{passed:storage.numPassedTests,failed:storage.numFailedTests,skipped:storage.numPendingTests,exit:storageExecution.exit},checksPassed:valid,checkpoint:'PARTIAL',M0:'PARTIAL',laterPromptsExecuted:false}
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n')
const files=[...walk(dir).filter(p=>path.basename(p)!=='MANIFEST.json'),path.resolve(statusFile)].map(p=>({path:path.relative(root,p).replaceAll('\\','/'),sha256:hash(p)})).sort((a,b)=>a.path.localeCompare(b.path))
fs.writeFileSync(path.join(__dirname,'MANIFEST.json'),JSON.stringify({at:new Date().toISOString(),head:result.head,ownership:'P12 directory and P12 status row only; manifest excludes itself',files},null,2)+'\n')
console.log(JSON.stringify({checksPassed:valid,sourcePreserved,drift,reviewedSourceDrift,statusOnlyP12,acceptanceCount:acceptance.length,brokenLinks:links.filter(l=>!l.exists),storage:result.storage},null,2))
process.exitCode=valid?0:1
