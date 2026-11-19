const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'))
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),baseline=read('BASELINE.json')
const sourceFiles=baseline.owned.filter(file=>!file.endsWith('STATUS.md'))
for(const file of sourceFiles){
 const result=cp.spawnSync('git',['diff','--no-index','--',path.join(__dirname,path.basename(file)+'.before'),path.join(root,file)],{encoding:'utf8',windowsHide:true,maxBuffer:4e6})
 if(![0,1].includes(result.status))throw Error('Diff failed')
 fs.writeFileSync(path.join(__dirname,path.basename(file)+'.patch'),result.stdout)
}
const drift=Object.entries(baseline.fingerprints).filter(([file,old])=>!fs.existsSync(path.join(root,file))||hash(fs.readFileSync(path.join(root,file)))!==old).map(([file])=>file)
const statusPath=path.join(root,'docs/retention/execution/STATUS.md'),before=fs.readFileSync(path.join(__dirname,'STATUS.md.before'),'utf8'),after=fs.readFileSync(statusPath,'utf8')
const strip=text=>text.split(/\r?\n/).filter(line=>!line.startsWith('| [P08]')).join('\n')
const p07=JSON.parse(fs.readFileSync(path.join(root,'docs/retention/execution/P07-media-2026-10-18/evidence/VALIDATION.json'),'utf8'))
const p07Source=p07.files.filter(f=>/^(services|components)\//.test(f.path)).map(f=>({...f,current:hash(fs.readFileSync(path.join(root,f.path))),matches:hash(fs.readFileSync(path.join(root,f.path)))===f.sha256}))
const result={utc:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:root,windowsHide:true}).trim(),baselineFiles:Object.keys(baseline.fingerprints).length,changed:drift,unownedDrift:drift.filter(file=>!baseline.owned.includes(file)),onlyP08StatusRow:strip(before)===strip(after),p07CurrentSource:p07Source,ownedSource:sourceFiles.map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}))}
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2))
const manifest=fs.readdirSync(__dirname,{recursive:true}).filter(file=>file!=='MANIFEST.json'&&fs.statSync(path.join(__dirname,file)).isFile()).map(file=>({file:file.replaceAll('\\','/'),sha256:hash(fs.readFileSync(path.join(__dirname,file)))}))
fs.writeFileSync(path.join(__dirname,'MANIFEST.json'),JSON.stringify(manifest,null,2))
console.log(JSON.stringify({changed:drift,unownedDrift:result.unownedDrift,onlyP08StatusRow:result.onlyP08StatusRow,p07CurrentSourceMatches:p07Source.every(f=>f.matches),evidenceFiles:manifest.length}))
if(!result.onlyP08StatusRow)process.exitCode=1
