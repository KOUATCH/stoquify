// Fresh source candidate using the already reconstructed, owned Phase 11 packages. No install/database writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),{capture,restore}=require(path.join(root,'scripts/candidate-snapshot.cjs')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pointer=path.join(root,'.codex-tmp/command-center-phase12-current.json');assert.ok(!fs.existsSync(pointer));
const prior=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/command-center-phase11-current.json'))),old=JSON.parse(fs.readFileSync(path.join(root,'docs/command-center/phase-11-artifact-2026-10-26/source-baseline.json')));
assert.equal(path.dirname(prior.work),path.join(root,'.codex-tmp'));assert.match(path.basename(prior.work),/^phase11-[a-f0-9]{10}$/);
for(const file of ['package.json','package-lock.json','prisma/schema.prisma'])assert.equal(hash(path.join(root,file)),hash(path.join(prior.candidate,file)),'Dependency/schema drift requires a new preparation decision: '+file);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'docs/command-center/phase-11-artifact-2026-10-26/dependency-results.json'))).passed,true);
const work=path.join(root,'.codex-tmp/phase12-'+crypto.randomBytes(5).toString('hex')),candidate=path.join(work,'candidate');fs.mkdirSync(work);console.log('Capturing latest combined source');
const snapshot=capture(root);restore(snapshot,candidate);
const dependencies=fs.realpathSync(path.join(prior.candidate,'node_modules'));assert.equal(dependencies,path.join(prior.candidate,'node_modules'));
fs.symlinkSync(dependencies,path.join(candidate,'node_modules'),'junction');
const oldMap=new Map(old.files.map(f=>[f.path,f.sha256])),current=new Map(snapshot.files.map(f=>[f.path,f.sha256])),source=f=>!f.startsWith('docs/')&&!f.startsWith('design-system/')&&!f.endsWith('.md');
const delta={changed:snapshot.files.filter(f=>source(f.path)&&oldMap.has(f.path)&&oldMap.get(f.path)!==f.sha256).map(f=>f.path),added:snapshot.files.filter(f=>source(f.path)&&!oldMap.has(f.path)).map(f=>f.path),removed:old.files.filter(f=>source(f.path)&&!current.has(f.path)).map(f=>f.path)};
fs.writeFileSync(pointer,JSON.stringify({work,candidate,dependencies,priorWork:prior.work},null,2));
fs.writeFileSync(path.join(__dirname,'source-baseline.json'),JSON.stringify({...snapshot,files:snapshot.files.map(({content,...f})=>f)},null,2));
fs.writeFileSync(path.join(__dirname,'source-delta.json'),JSON.stringify(delta,null,2));
fs.writeFileSync(path.join(__dirname,'prepare-results.json'),JSON.stringify({passed:true,files:snapshot.files.length,packageAndLockUnchanged:true,schemaUnchanged:true,dependencies:'Reuses only previously clean-installed owned Phase 11 packages; no root node_modules or fresh npm install',environmentFilesCopied:false,databaseStarted:false,productionAccess:false,privateClientHashes:Object.fromEntries(['index.js','index.d.ts','schema.prisma'].map(n=>[n,hash(path.join(dependencies,'.prisma/client',n))])),sharedClientHashes:Object.fromEntries(['index.js','index.d.ts','schema.prisma'].map(n=>[n,hash(path.join(root,'node_modules/.prisma/client',n))]))},null,2));
console.log(JSON.stringify({files:snapshot.files.length,delta,candidate}));
