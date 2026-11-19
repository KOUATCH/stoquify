// Resume the already-seeded, dedicated qualification cluster. Never reset or reseed.
const {spawnSync}=require('node:child_process');
const net=require('node:net');
const {fs,path,assert,root,hash,own,target,candidate,receipt,connect,checkMigrations,schemaFingerprint,requireEmpty}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');
const mode=process.argv[2];assert(['start','stop'].includes(mode));assert.equal(process.argv.length,3);
const ownerFile=path.join(own,'cluster-owner.json');
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(key.toUpperCase())));
const run='resume-20261102-r2-retry01';
const historical=path.resolve(__dirname,'../../full-app/database');
function status(){return spawnSync(path.join(target.bin,'pg_ctl.exe'),['-D',target.cluster,'status'],{env,windowsHide:true,stdio:'ignore',timeout:10000}).status;}
function pid(){const value=Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]);assert(Number.isSafeInteger(value)&&value>0);return value;}
function bindStartedPid(owner){
  const lines=fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/);
  assert.equal(fs.realpathSync(lines[1]).toLowerCase(),fs.realpathSync(target.cluster).toLowerCase());assert.equal(Number(lines[3]),target.port);
  const startedAt=Number(lines[2])*1000;assert(Number.isFinite(startedAt)&&startedAt>=Date.parse(owner.startedAt)-5000&&startedAt<=Date.now(),'Postmaster predates this start attempt');return pid();
}
function control(args,label){const fd=fs.openSync(path.join(own,run+'-'+label+'.log'),'wx');try{const result=spawnSync(path.join(target.bin,'pg_ctl.exe'),args,{env,windowsHide:true,stdio:['ignore',fd,fd],timeout:label==='start'?200000:75000});if(result.error)throw result.error;assert.equal(result.status,0,'pg_ctl failed');}finally{fs.closeSync(fd);}}
async function portFree(){await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(target.port,target.host,()=>probe.close(resolve));});return true;}
async function main(){
  assert.equal(fs.realpathSync(target.cluster).toLowerCase(),path.resolve(target.cluster).toLowerCase());
  assert.equal(fs.readFileSync(path.join(target.cluster,'PG_VERSION'),'utf8').trim(),'17');
  const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);
  if(mode==='stop'){
    assert.equal(owner.exclusiveOwner,'qualification_database_r2');assert.equal(owner.run,run);assert.equal(owner.state,'running');assert.equal(status(),0);assert.equal(pid(),owner.postmasterPid);
    let identityConfirmed=false,identityError=null;
    try{const client=await connect('postgres');await client.end();identityConfirmed=true;}catch(error){identityError=error.message;assert.equal(pid(),owner.postmasterPid);assert.equal(bindStartedPid(owner),owner.postmasterPid);}
    control(['-D',target.cluster,'-m','fast','-t','60','-w','stop'],'stop');assert.equal(status(),3);await portFree();
    owner.state='stopped';owner.stoppedAt=new Date().toISOString();fs.writeFileSync(ownerFile,JSON.stringify(owner,null,2));
    receipt(run+'-stop',{at:new Date().toISOString(),passed:true,postmasterPid:owner.postmasterPid,cluster:target.cluster,stopped:true,portAvailable:true,identityConfirmed,identityError,pidBoundFallbackUsed:!identityConfirmed,databasesRetained:[target.build,target.full]});return;
  }
  assert.equal(owner.exclusiveOwner,'qualification_database_r2');assert.equal(owner.run,'resume-20261102-r2');assert.equal(owner.state,'stopped');const priorFailure=JSON.parse(fs.readFileSync(path.join(__dirname,'resume-20261102-r2-failure.json')));assert.equal(priorFailure.cleanup.stopped,true);assert.equal(priorFailure.cleanup.portAvailable,true);
  assert(fs.existsSync(path.join(candidate,'prisma/schema.prisma')),'Candidate storage must be available before restart');
  const context=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-context.json'),'utf8'));assert.equal(path.resolve(context.source),candidate);assert.equal(path.resolve(context.storage),path.dirname(candidate));assert.equal(fs.realpathSync(context.storage),path.dirname(candidate));assert.equal(path.resolve(context.root),root);assert.equal(fs.realpathSync(candidate),candidate);assert.equal(JSON.parse(fs.readFileSync(path.join(context.storage,'ownership.json'))).root,root);
  const admission=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-admission.json'),'utf8'));assert.equal(admission.passed,true);assert.equal(admission.candidateId,context.candidateId);
  const sourceManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-source-manifest.json'),'utf8'));for(const entry of sourceManifest.files.filter(f=>f.path==='prisma/schema.prisma'||f.path.startsWith('prisma/migrations/')))assert.equal(hash(fs.readFileSync(path.join(candidate,entry.path))),entry.sha256);
  assert.equal(status(),3,'Previous cluster must be confirmed stopped before ownership transfer');
  await portFree();
  receipt(run+'-prior-owner',{at:new Date().toISOString(),owner,pgCtlStatus:3,portWasFree:true});
  const resumed={purpose:owner.purpose,cluster:target.cluster,port:target.port,exclusiveOwner:'qualification_database_r2',run,state:'starting',startedAt:new Date().toISOString(),priorOwner:owner};
  fs.writeFileSync(ownerFile,JSON.stringify(resumed,null,2));
  try{
    control(['-D',target.cluster,'-l',path.join(own,run+'-postgres.log'),'-o','-h 127.0.0.1 -p '+target.port,'-t','180','-w','start'],'start');
    resumed.state='running';resumed.postmasterPid=bindStartedPid(resumed);fs.writeFileSync(ownerFile,JSON.stringify(resumed,null,2));
    const expected=JSON.parse(fs.readFileSync(path.join(historical,'database-clones.json'),'utf8'));
    const databases=[];
    for(const database of [target.template,target.build,target.full]){
      const client=await connect(database);try{const schema=await schemaFingerprint(client),migrations=await checkMigrations(client);assert.deepEqual(schema,expected.schema);assert.deepEqual(migrations,expected.migrations);const empty=database===target.full?undefined:await requireEmpty(client);databases.push({database,schema,migrations,empty});}finally{await client.end();}
    }
    const current=await snapshot('resumed-baseline-20261102-r2-retry01');
    const baseline=JSON.parse(fs.readFileSync(path.join(historical,'snapshot-seeded-baseline-1793284956923-71bfc774-b721-4af3-99cc-0e4143cb8602.json'),'utf8'));
    assert.equal(current.businessSha256,baseline.businessSha256,'Seeded business state changed');assert.deepEqual(current.sessionCounts,[],'No browser sessions should exist before qualification');assert.deepEqual(current.auditCounts,baseline.auditCounts);
    const seeded=JSON.parse(fs.readFileSync(path.join(historical,'fixture-seeded.json'),'utf8'));assert.equal(hash(fs.readFileSync(path.join(candidate,'lib/password.ts'))),seeded.passwordSourceSha256);assert.equal(path.resolve(seeded.privateFixturePath),path.join(own,'browser-fixture.private.json'));
    receipt('fixture-readiness',{at:new Date().toISOString(),passed:true,database:target.full,candidateId:context.candidateId,privateFixturePath:seeded.privateFixturePath,historicalSeedReceipt:path.join(historical,'fixture-seeded.json'),businessSha256:current.businessSha256,businessTables:current.tables.length,sessions:0,baselineEvidence:current.evidence,mutations:'None; existing synthetic fixture revalidated without reseeding.'});
    receipt(run+'-readiness',{candidateId:context.candidateId,at:new Date().toISOString(),passed:true,postmasterPid:resumed.postmasterPid,cluster:target.cluster,host:target.host,port:target.port,databases,businessSha256:current.businessSha256,businessTables:current.tables.length,sessions:0,baselineEvidence:current.evidence,mutations:'Cluster restart only. No migrations, reset, reseed, permission or session writes.',ownershipFile:ownerFile});
  }catch(error){
    const cleanup={attempted:true,stopped:false};
    try{if(status()===0){const recordedOwner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));assert.equal(recordedOwner.run,run);assert.equal(recordedOwner.exclusiveOwner,'qualification_database_r2');const actual=bindStartedPid(resumed);if(resumed.postmasterPid===undefined){resumed.postmasterPid=actual;cleanup.startTimeoutPidBound=true;}assert.equal(actual,resumed.postmasterPid);control(['-D',target.cluster,'-m','fast','-t','60','-w','stop'],'failure-stop');}assert.equal(status(),3);await portFree();cleanup.stopped=true;cleanup.portAvailable=true;}catch(cleanupError){cleanup.error=cleanupError.message;}
    resumed.state=cleanup.stopped?'stopped':'cleanup-unconfirmed';resumed.error=error.message;fs.writeFileSync(ownerFile,JSON.stringify(resumed,null,2));receipt(run+'-failure',{at:new Date().toISOString(),passed:false,error:error.message,cleanup});throw error;
  }
}
main().then(()=>console.log(JSON.stringify({mode,passed:true,run,host:target.host,port:target.port}))).catch(error=>{console.error(error.message);process.exitCode=1;});
