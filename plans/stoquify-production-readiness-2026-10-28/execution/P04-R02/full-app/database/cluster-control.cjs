// Parent-confirmed lifecycle only; never operates on an already-running foreign owner.
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const { fs, path, assert, own, target, quote, receipt, connect, checkMigrations, schemaFingerprint, requireEmpty } = require('./database-common.cjs');
const mode = process.argv[2]; assert(['start', 'clone', 'stop'].includes(mode)); assert.equal(process.argv.length, 3);
const ownerFile = path.join(own, 'cluster-owner.json');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(key.toUpperCase())));
function status() { return spawnSync(path.join(target.bin, 'pg_ctl.exe'), ['-D', target.cluster, 'status'], { env, windowsHide: true, stdio: 'ignore', timeout: 10000 }).status; }
function postmasterPid() {const pid=Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]);assert(Number.isSafeInteger(pid)&&pid>0);return pid;}
function control(args, label = mode) {
  const fd = fs.openSync(path.join(own, 'pg-' + label + '.log'), 'wx');
  try { const result = spawnSync(path.join(target.bin, 'pg_ctl.exe'), args, { env, windowsHide: true, stdio: ['ignore',fd,fd], timeout: 60000 }); if (result.error) throw result.error; assert.equal(result.status, 0, 'pg_ctl failed'); }
  finally { fs.closeSync(fd); }
}
async function main() {
  fs.mkdirSync(own, { recursive: true });
  if (mode === 'start') {
    assert.equal(status(), 3, 'Confirmed owned cluster must be stopped');
    assert(!fs.existsSync(ownerFile), 'An existing orchestration owner must be reconciled');
    await new Promise((resolve,reject) => { const probe=net.createServer(); probe.once('error',reject); probe.listen(target.port,target.host,()=>probe.close(resolve)); });
    const owner = { purpose:'P04-R02 full-app qualification', cluster:target.cluster, port:target.port, exclusiveOwner:'p04_actions', state:'starting', startedAt:new Date().toISOString() };
    fs.writeFileSync(ownerFile, JSON.stringify(owner,null,2), {flag:'wx'});
    try {
      control(['-D',target.cluster,'-l',path.join(own,'postgres.log'),'-o','-h 127.0.0.1 -p '+target.port,'-w','start']);
      owner.state='running';owner.postmasterPid=postmasterPid(); fs.writeFileSync(ownerFile,JSON.stringify(owner,null,2));
      const client=await connect(target.template);
      try {
        const schema=await schemaFingerprint(client), empty=await requireEmpty(client);
        receipt('cluster-start',{at:new Date().toISOString(),started:true,target:{host:target.host,port:target.port,cluster:target.cluster,template:target.template},schema,empty,ownershipFile:ownerFile,keptRunningFor:'parent build and browser; explicit stop required'});
      } finally { await client.end(); }
    } catch(error) {
      const cleanup={attempted:true,stopped:false};
      try { const state=status(); if(state===0)control(['-D',target.cluster,'-m','fast','-w','stop'],'start-failure-stop');else assert.equal(state,3,'Owned cluster status could not be established');assert.equal(status(),3);cleanup.stopped=true; }
      catch(cleanupError){cleanup.error=cleanupError.message;}
      owner.state=cleanup.stopped?'stopped':'cleanup-unconfirmed';owner.failure=error.message;fs.writeFileSync(ownerFile,JSON.stringify(owner,null,2));
      receipt('cluster-start-failure',{at:new Date().toISOString(),started:false,error:error.message,cleanup,cluster:target.cluster});
      throw error;
    }
  } else {
    const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8')); assert.equal(owner.cluster,target.cluster); assert.equal(owner.exclusiveOwner,'p04_actions'); assert.equal(owner.state,'running'); assert.equal(status(),0);
    if(mode==='stop') {
      assert.equal(postmasterPid(),owner.postmasterPid,'Owned server PID changed; do not stop a restarted owner');
      let identityConfirmed=false,identityError=null;
      try{const client=await connect('postgres');await client.end();identityConfirmed=true;}catch(error){identityError=error.message;assert.equal(postmasterPid(),owner.postmasterPid);}
      control(['-D',target.cluster,'-m','fast','-w','stop']); assert.equal(status(),3);
      owner.state='stopped';owner.stoppedAt=new Date().toISOString();fs.writeFileSync(ownerFile,JSON.stringify(owner,null,2));
      receipt('cluster-stop',{at:new Date().toISOString(),cluster:target.cluster,stopped:true,postmasterPid:owner.postmasterPid,identityConfirmed,identityError,pidBoundFallbackUsed:!identityConfirmed,databasesRetained:[target.build,target.full]});
    } else {
      const template=await connect(target.template);let migrations,schema;
      try { migrations=await checkMigrations(template);schema=await schemaFingerprint(template);await requireEmpty(template); } finally { await template.end(); }
      const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'cluster-start.json'),'utf8'));assert.deepEqual(schema,baseline.schema,'Template catalog changed after ownership acquisition');
      const admin=await connect('postgres');
      try {
        const existing=await admin.query('SELECT datname FROM pg_database WHERE datname=ANY($1::text[])',[[target.build,target.full]]);assert.equal(existing.rowCount,0,'Both clone destinations must be fresh');
        for(const name of [target.build,target.full])await admin.query('CREATE DATABASE '+quote(name)+' TEMPLATE '+quote(target.template));
      } finally {await admin.end();}
      const clones=[];
      for(const name of [target.build,target.full]){const client=await connect(name);try{assert.deepEqual(await schemaFingerprint(client),schema);assert.deepEqual(await checkMigrations(client),migrations);clones.push({database:name,empty:await requireEmpty(client)});}finally{await client.end();}}
      receipt('database-clones',{at:new Date().toISOString(),passed:true,migrations,schema,clones,limitations:['Catalog fingerprint binds template/clone equality; migration checksums bind the candidate history. No Prisma diff or fresh migration replay was executed in this package.']});
    }
  }
  console.log(JSON.stringify({mode,passed:true,host:target.host,port:target.port}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
