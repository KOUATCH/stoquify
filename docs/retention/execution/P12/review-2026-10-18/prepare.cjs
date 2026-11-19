// Read-only source/evidence inventory. Writes only this new P12 review directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..'),old=path.join(__dirname,'../evidence'),base='docs/retention/execution/'
process.chdir(root)
const hash=p=>fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(path.join(__dirname,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'})
const previous=read(path.join(old,'PREREQUISITE_FINGERPRINTS.json'))
const comparisons=previous.map(c=>({...c,entries:c.entries.map(e=>({...e,current:hash(e.path),matches:hash(e.path)===e.expected}))}))
const fresh=base+'P02-P06-verification-2026-10-18/'
comparisons.push({id:'P02/P06 refresh manifest',manifest:fresh+'MANIFEST.json',entries:read(fresh+'MANIFEST.json').files.map(e=>({path:e.file,expected:e.sha256,current:hash(e.file),matches:hash(e.file)===e.sha256}))})
comparisons.push({id:'prior P12 source snapshot',manifest:base+'P12/evidence/BASELINE.json',entries:read(path.join(old,'BASELINE.json')).files.map(e=>({path:e.path,expected:e.sha256,current:hash(e.path),matches:hash(e.path)===e.sha256}))})
write('PREREQUISITE_FINGERPRINTS.json',comparisons)
const paths=new Set([...read(fresh+'BASELINE.json').files.map(f=>f.path),...comparisons.flatMap(c=>c.entries.map(e=>e.path)),...read(fresh+'EVIDENCE_SUMMARY.json').source.map(f=>f.file)])
for(const f of ['RESULT.md','DAY_30_CHECKPOINT.md','DAYS_31_60_EXECUTION_ORDER.md','ACCEPTANCE_LEDGER.md']){const p=base+'P12/'+f;paths.add(p);fs.writeFileSync(path.join(__dirname,'PRIOR_'+f),fs.readFileSync(p),{flag:'wx'})}
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024})
for(const p of git(['diff','HEAD','--name-only','-z']).split('\0').filter(Boolean))paths.add(p)
write('BASELINE.json',{at:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),status:git(['status','--short','--untracked-files=no']),untracked:git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean),files:[...paths].sort().map(path=>({path,sha256:hash(path)}))})
fs.writeFileSync(path.join(__dirname,'INITIAL_STATUS.md'),fs.readFileSync(base+'STATUS.md'),{flag:'wx'})
for(const f of ['workflow.cjs','review.cjs'])fs.writeFileSync(path.join(__dirname,f),fs.readFileSync(path.join(old,f)),{flag:'wx'})
console.log(JSON.stringify(comparisons.map(c=>({id:c.id,count:c.entries.length,drift:c.entries.filter(e=>!e.matches).map(e=>e.path)})),null,2))
