const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {state,root}=require('./environment.cjs'),s=state(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const build=JSON.parse(fs.readFileSync(path.join(__dirname,'compiler-final-result.json')));
const log=fs.readFileSync(path.join(__dirname,'compiler-final.log'),'utf8');
const compiledWithOtherBuild=build.exitCode===1&&log.includes('Status: failed-post-build-orphans')&&log.includes('Build exit code: 0')&&log.includes('Post-build output state: valid')&&log.includes('Build timed out: no');
assert.ok(build.exitCode===0||compiledWithOtherBuild,'Completed compiler output required before copying source; this does not waive the process guard');assert.equal(build.capturedSourceUnchanged,true);
const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation.json'))),bp=path.join(__dirname,'source-baseline.json'),baseline=JSON.parse(fs.readFileSync(bp));
const owned=new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'source-changes.json'))).map(r=>r.file));
assert.equal(proof.candidateChanged.length,0);assert.equal(proof.sqlChanged.length,0);assert.equal(proof.privateClientStillMatches,true);assert.equal(proof.sharedClientUnchanged,true);
const files=[...proof.workspaceChanged,...proof.newWorkspaceSources];assert.ok(files.every(f=>!owned.has(f)&&!f.startsWith('prisma/')));
const destination=path.join(__dirname,'final-source-sync.json');assert.ok(!fs.existsSync(destination),'Final refresh already recorded');
fs.copyFileSync(bp,path.join(__dirname,'source-baseline-before-final-refresh.json'));
for(const name of ['compiler-final.log','compiler-final-result.json','compiler-source-hashes.json'])fs.copyFileSync(path.join(__dirname,name),path.join(__dirname,'before-final-refresh-'+name));
const changes=[];
for(const file of files){
 const dest=path.join(s.candidate,file),source=path.join(root,file),bytes=fs.readFileSync(source),old=baseline.files.find(f=>f.path===file);
 if(fs.existsSync(dest)){const backup=path.join(s.work,'before-final-refresh',file);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(dest,backup)}
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);assert.equal(hash(fs.readFileSync(source)),hash(bytes),'Source moved while copying '+file);
 changes.push({file,previousSha256:old?.sha256||null,sha256:hash(bytes)});
 if(old){old.sha256=hash(bytes);old.bytes=bytes.length}else baseline.files.push({path:file,sha256:hash(bytes),bytes:bytes.length});
}
baseline.files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(bp,JSON.stringify(baseline,null,2));
fs.writeFileSync(destination,JSON.stringify({createdAt:new Date().toISOString(),sharedSourceModified:false,files:changes,scope:'Final read-only root-to-candidate refresh after the prior source-bound build; no schema, migration or owned corrections changed'},null,2));
console.log(JSON.stringify({refreshedFiles:changes.length,sourceFiles:baseline.files.length}));
