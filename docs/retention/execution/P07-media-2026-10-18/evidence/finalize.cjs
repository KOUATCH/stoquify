const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'BASELINE.json'),'utf8'));
const hashBytes=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>hashBytes(fs.readFileSync(path.join(root,p)));
const existing=[...baseline.owned,'services/onboarding/__tests__/master-data-import-guards.test.ts'];
const newFiles=['components/onboarding/ItemImportImages.tsx','components/onboarding/__tests__/ItemImportImages.test.tsx','components/onboarding/__tests__/ItemImportImages.upload.test.tsx','services/onboarding/__tests__/item-import-media.test.ts','services/onboarding/__tests__/item-import-media.postgres.test.ts'];
for(const p of existing){
 const before=path.join(__dirname,path.basename(p)+'.before');
 if(!fs.existsSync(before)){
   const original=execFileSync('git',['show',`${baseline.head}:${p}`],{cwd:root});
   // The guard test was clean in the initial status; normalize line endings only for its baseline check.
   const originalHash=hashBytes(original),crlfHash=hashBytes(Buffer.from(original.toString().replace(/\r?\n/g,'\r\n')));
   if(![originalHash,crlfHash].includes(baseline.files[p]))throw Error('Cannot reconstruct exact baseline for '+p);
   fs.writeFileSync(before,originalHash===baseline.files[p]?original:Buffer.from(original.toString().replace(/\r?\n/g,'\r\n')));
 }
 const diff=spawnSync('git',['diff','--no-index','--',before,path.join(root,p)],{cwd:root,encoding:'utf8',maxBuffer:8e6});if(![0,1].includes(diff.status))throw Error('Diff failed');fs.writeFileSync(path.join(__dirname,path.basename(p)+'.patch'),diff.stdout);
}
const changed=Object.keys(baseline.files).filter(p=>hash(p)!==baseline.files[p]);
const strip=s=>s.split(/\r?\n/).filter(l=>!l.startsWith('| [P07]')).join('\n');
const beforeStatus=fs.readFileSync(path.join(__dirname,'STATUS.md.before'),'utf8'),afterStatus=fs.readFileSync(path.join(root,'docs/retention/execution/STATUS.md'),'utf8');
const review=JSON.parse(fs.readFileSync(path.join(__dirname,'SOURCE_REVIEW.json'),'utf8'));
const docUpdates=JSON.parse(fs.readFileSync(path.join(__dirname,'DOC_UPDATES.json'),'utf8'));
const historicalReportsRetained=docUpdates.every(d=>fs.readFileSync(path.join(root,d.path),'utf8')===d.prefix+fs.readFileSync(path.join(__dirname,d.before),'utf8'));
const validation={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baselineHead:baseline.head,baselineFiles:Object.keys(baseline.files).length,changed,unownedDrift:changed.filter(p=>!existing.includes(p)),onlyP07StatusRowChanged:strip(beforeStatus)===strip(afterStatus),mediaOwnersUnchanged:review.mediaControlFiles.every(f=>hash(f.path)===f.sha256),files:[...existing,...newFiles].map(p=>({path:p,sha256:hash(p)}))};
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(validation,null,2));
validation.historicalReportsRetained=historicalReportsRetained;
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(validation,null,2));
fs.writeFileSync(path.join(__dirname,'FINAL_TRACKED_STATUS.txt'),execFileSync('git',['status','--short','--untracked-files=no'],{cwd:root,encoding:'utf8'}));
const artifacts=[];function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);if(fs.statSync(f).isDirectory())walk(f);else if(n!=='ARTIFACT_MANIFEST.json')artifacts.push({path:path.relative(root,f).replaceAll('\\','/'),sha256:hashBytes(fs.readFileSync(f))});}}walk(path.resolve(__dirname,'..'));
fs.writeFileSync(path.join(__dirname,'ARTIFACT_MANIFEST.json'),JSON.stringify(artifacts,null,2));
console.log(JSON.stringify({unownedDrift:validation.unownedDrift,onlyP07StatusRowChanged:validation.onlyP07StatusRowChanged,mediaOwnersUnchanged:validation.mediaOwnersUnchanged,historicalReportsRetained,artifacts:artifacts.length}));
