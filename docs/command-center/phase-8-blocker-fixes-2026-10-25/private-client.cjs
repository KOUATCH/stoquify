const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');const s=state();
const {schemaTokens}=require(path.join(root,'scripts/ensure-prisma-client.js'));
const shared=path.join(root,'node_modules'),privateRoot=path.join(s.work,'private-dependencies'),modules=path.join(privateRoot,'node_modules'),link=path.join(s.candidate,'node_modules');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fingerprint=()=>Object.fromEntries(['index.d.ts','index.js','schema.prisma','package.json'].map(name=>[name,hash(path.join(shared,'.prisma/client',name))]));
const before=fingerprint();assert.ok(fs.lstatSync(link).isSymbolicLink());assert.equal(fs.realpathSync(link).toLowerCase(),fs.realpathSync(shared).toLowerCase());
assert.equal(path.dirname(privateRoot),s.work);assert.equal(fs.existsSync(privateRoot),false);fs.mkdirSync(modules,{recursive:true});
function reuse(source,destination){if(fs.statSync(source).isDirectory())fs.symlinkSync(source,destination,'junction');else fs.copyFileSync(source,destination)}
for(const entry of fs.readdirSync(shared)){
 if(['.prisma','.cache'].includes(entry)){fs.mkdirSync(path.join(modules,entry));continue}
 if(entry==='@prisma'){
  const scope=path.join(modules,entry);fs.mkdirSync(scope);
  for(const child of fs.readdirSync(path.join(shared,entry))){const source=path.join(shared,entry,child),destination=path.join(scope,child);if(child==='client')fs.cpSync(source,destination,{recursive:true,errorOnExist:true});else reuse(source,destination)}
 }else reuse(path.join(shared,entry),path.join(modules,entry));
}
// Remove only the verified candidate junction, never its shared target or contents.
fs.rmdirSync(link);fs.symlinkSync(modules,link,'junction');
const env={...environment(s,'test'),PRISMA_GENERATE_SKIP_AUTOINSTALL:'1',PRISMA_SKIP_POSTINSTALL_GENERATE:'true'};
const run=spawnSync(process.execPath,[path.join(shared,'prisma/build/index.js'),'generate','--config',path.join(s.work,'prisma.config.ts')],{cwd:s.work,env,windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:10e6});
fs.writeFileSync(path.join(__dirname,'private-client.log'),redact(run.stdout)+redact(run.stderr));
const report={exitCode:run.status,error:run.error?.message,privateModules:modules,sharedGeneratedClientBefore:before,sharedGeneratedClientAfter:fingerprint(),sharedClientUnchanged:JSON.stringify(before)===JSON.stringify(fingerprint()),productionAccess:false,applicationSourceChanged:false,dependencyInstall:false};
if(run.status===0){const generated=path.join(modules,'.prisma/client');report.generatedSchemaMatches=schemaTokens(fs.readFileSync(path.join(generated,'schema.prisma'),'utf8'))===schemaTokens(fs.readFileSync(path.join(s.candidate,'prisma/schema.prisma'),'utf8'));report.advisoryModelPresent=fs.readFileSync(path.join(generated,'index.d.ts'),'utf8').includes('export type FirmAdvisoryRevision');assert.equal(require.resolve('.prisma/client/default',{paths:[path.join(modules,'@prisma/client')]}).toLowerCase(),path.join(generated,'default.js').toLowerCase());}
fs.writeFileSync(path.join(__dirname,'private-client-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({exitCode:run.status,sharedClientUnchanged:report.sharedClientUnchanged,generatedSchemaMatches:report.generatedSchemaMatches,advisoryModelPresent:report.advisoryModelPresent}));
if(run.status!==0||!report.sharedClientUnchanged||!report.generatedSchemaMatches||!report.advisoryModelPresent)process.exitCode=1;
