// Metadata-only review/publishing. No application import, DB, network or subprocess tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root='docs/retention/execution/P09',out=`${root}/evidence`
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const baseline=read(`${out}/BASELINE.json`)
const latest=fs.readdirSync(out).filter(p=>/^unit-\d+\.results.json$/.test(p)).sort().at(-1)
const result=read(`${out}/${latest}`),execution=read(`${out}/${latest.replace('.results.json','.execution.json')}`)
if(!result.success||result.numPassedTests!==47||result.numFailedTests||result.numPendingTests||execution.exitCode!==0)throw new Error('Final exact pure lane has not passed')
const inheritedDrift=baseline.files.filter(f=>f.path!=='docs/retention/execution/STATUS.md'&&(!fs.existsSync(f.path)||hash(f.path)!==f.sha256)).map(f=>({...f,currentSha256:fs.existsSync(f.path)?hash(f.path):null}))
// Concurrent landing work is outside P09. Preserve and disclose it, never reset it.
const concurrentLanding=['components/landing/cinematic-hero.tsx','components/landing/cinematic.css']
if(inheritedDrift.some(f=>!concurrentLanding.includes(f.path)))throw new Error('Unreviewed source drift: '+inheritedDrift.map(f=>f.path).join(', '))
const oldStatus=fs.readFileSync(`${out}/STATUS.md.before`,'utf8')
const statusPath='docs/retention/execution/STATUS.md',currentStatus=fs.readFileSync(statusPath,'utf8')
const withoutP09=s=>s.split(/\r?\n/).filter(l=>!l.startsWith('| [P09]')).join('\n')
if(withoutP09(oldStatus)!==withoutP09(currentStatus))throw new Error('Other status rows changed')
const p01Files=['SOURCE_MANIFEST.json','SUPPLEMENTARY_SOURCE_MANIFEST.json'].flatMap(n=>read(`docs/retention/execution/P01/evidence/${n}`))
const p01Drift=p01Files.map(f=>({path:f.path,before:f.sha256_raw,current:fs.existsSync(f.path)?hash(f.path):null})).filter(f=>f.before!==f.current)
const p01Artifacts=Object.entries(read('docs/retention/execution/P01/evidence/VALIDATION.json').output_sha256).map(([p,h])=>({path:p,match:fs.existsSync(p)&&hash(p)===h}))
fs.writeFileSync(`${out}/P01_REVALIDATION.json`,JSON.stringify({checked:p01Files.length,sourceDrift:p01Drift,artifactHashes:p01Artifacts},null,2)+'\n')
const statusRow='| [P09](../implementation-prompts/09_PORTABILITY_CONTRACT.md) | P01, P04 | Data/export engineer | R07/R08; M5 preparation | PASS — bounded contract and synthetic checks | [P09 result](P09/RESULT.md): 20-category inventory; strict partial archive profile; 47 pure checks; V3/V4 plan | P10 policy decisions and P16 production extraction/delivery remain open; no complete tenant archive or live gate claim |'
fs.writeFileSync(statusPath,currentStatus.split(/\r?\n/).map(l=>l.startsWith('| [P09]')?statusRow:l).join('\r\n'))
const owned=['services/organization/authorized-archive-contract.ts','services/organization/__fixtures__/authorized-archive.v1.json','services/organization/__tests__/authorized-archive-contract.test.ts','jest.retention-archive.config.cjs',statusPath]
const evidence={utc:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineFileCount:baseline.files.length,unownedDrift:inheritedDrift,onlyP09StatusRow:withoutP09(oldStatus)===withoutP09(fs.readFileSync(statusPath,'utf8')),latestPureResult:latest,passed:result.numPassedTests,suites:result.numPassedTestSuites,failed:result.numFailedTests,skipped:result.numPendingTests,exitCode:execution.exitCode,startedAt:execution.startedAt,finishedAt:execution.finishedAt,p01SourceDrift:p01Drift.map(f=>f.path),owned:owned.map(p=>({path:p,sha256:hash(p)}))}
fs.writeFileSync(`${out}/VALIDATION.json`,JSON.stringify(evidence,null,2)+'\n')
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(`${dir}/${d.name}`):[`${dir}/${d.name}`])
const writeManifest=()=>{
 const manifest=[...owned,...walk(root)].filter(p=>p!==`${out}/MANIFEST.json`).map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(p)}))
 fs.writeFileSync(`${out}/MANIFEST.json`,JSON.stringify({utc:evidence.utc,files:manifest},null,2)+'\n')
}
// Materialize the two self-referenced output paths before checking their links.
if(!fs.existsSync(`${out}/ARTIFACT_LINKS.json`))fs.writeFileSync(`${out}/ARTIFACT_LINKS.json`,JSON.stringify({status:'CHECKING'})+'\n')
writeManifest()
// Check Markdown local links in the four required artifacts.
const links=[]
for(const name of ['RESULT.md','ARCHIVE_CONTRACT.md','PORTABILITY_COVERAGE.md','ARCHIVE_FIXTURE_MANIFEST.md']) {
 const file=`${root}/${name}`
 for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)) {
   const target=m[1].replace(/^<|>$/g,'').split('#')[0]
   if(!target||/^(https?:|app:|codex:)/.test(target))continue
   links.push({file,target,exists:fs.existsSync(path.resolve(path.dirname(file),target))})
 }
}
fs.writeFileSync(`${out}/ARTIFACT_LINKS.json`,JSON.stringify({pass:links.every(l=>l.exists),links},null,2)+'\n')
if(links.some(l=>!l.exists))throw new Error('Broken artifact link')
writeManifest()
console.log(JSON.stringify({pass:true,latest,tests:evidence.passed,unownedDrift:inheritedDrift.map(f=>f.path),onlyP09StatusRow:evidence.onlyP09StatusRow,artifactLinks:links.length,p01SourceDrift:evidence.p01SourceDrift,p01Artifacts}))
