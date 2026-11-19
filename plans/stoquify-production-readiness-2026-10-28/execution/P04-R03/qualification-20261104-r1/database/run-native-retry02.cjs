// Independently review before executing: creates/migrates/tests only a fresh local cluster.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), net = require('node:net');
const { spawnSync, spawn } = require('node:child_process');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../../../../../..');
const own = path.join(root, '.codex-tmp/p04r03-qualification-20261104-r3');
const cluster = path.join(own, 'postgres'), scaffold = path.join(own, 'schema');
const bin = 'C:/Program Files/PostgreSQL/17/bin', database = 'stoquify_local_p04_r03_20261104_r3';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(key.toUpperCase())));
Object.assign(env, { NODE_ENV:'test', NEXT_TELEMETRY_DISABLED:'1', CHECKPOINT_DISABLE:'1', PRISMA_HIDE_UPDATE_MESSAGE:'1' });
const report = { startedAt:new Date().toISOString(), passed:false, evidenceClass:'real PostgreSQL/services/actions; authentication transport stubbed; no HTTP/browser', commands:[] };
let startAttempted = false, port, ownedPid;
const receiptFile = path.join(__dirname, 'native-result-retry02.json');
function filesUnder(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const full = path.join(directory,entry.name);
    assert(!entry.isSymbolicLink(), 'No symlink in captured input');
    return entry.isDirectory() ? filesUnder(full) : [full];
  }).sort();
}
function source() {
  // Broad application dependency binding includes imported permission catalogues,
  // event/communication helpers, safe errors and identity templates. No secrets/env.
  const roots = ['services','actions','lib','config','components','types','schemas','validations','hooks'];
  const paths = roots.filter(directory => fs.existsSync(path.join(root,directory))).flatMap(directory => filesUnder(path.join(root,directory))).filter(file => /\.(ts|tsx|cjs|mjs|js|json)$/.test(file));
  paths.push(...['prisma/schema.prisma','plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/full-app-20261102-r3/verify-generated-schema.cjs','services/_shared/protect.ts','package.json','package-lock.json'].map(p => path.join(root,p)));
  paths.push(...filesUnder(__dirname).filter(file => /\.(ts|cjs)$/.test(file)));
  return [...new Set(paths)].sort().map(file => ({path:path.relative(root,file).replaceAll('\\','/'),sha256:hash(fs.readFileSync(file))}));
}
function run(label, file, args, options={}) {
  const fd = fs.openSync(path.join(own,label+'.log'),'wx'); let result;
  try { result = spawnSync(file,args,{cwd:own,env,windowsHide:true,stdio:['ignore',fd,fd],timeout:300000,...options}); }
  finally { fs.closeSync(fd); }
  report.commands.push({label,file,args,exitCode:result.status});
  if (result.error) throw result.error;
  assert.equal(result.status,0,label+' failed');
}
async function available(requested=0) { return new Promise((resolve,reject) => { const server=net.createServer(); server.once('error',reject); server.listen(requested,'127.0.0.1',()=>{const p=server.address().port;server.close(error=>error?reject(error):resolve(p));}); }); }
function pid() { return Number(fs.readFileSync(path.join(cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]); }
async function connect(name) {
  assert(['postgres',database].includes(name));
  const client=new Client({host:'127.0.0.1',port,user:'p04r03',password:'',database:name,ssl:false,application_name:'p04r03-qualification',connectionTimeoutMillis:5000,query_timeout:120000});
  await client.connect();
  try {
    assert.equal(fs.realpathSync((await client.query('SHOW data_directory')).rows[0].data_directory).toLowerCase(),fs.realpathSync(cluster).toLowerCase());
    const identity=(await client.query('SELECT current_database() name,host(inet_server_addr()) host,inet_server_port() port')).rows[0];
    assert.deepEqual(identity,{name,host:'127.0.0.1',port}); return client;
  } catch(error) { await client.end(); throw error; }
}
async function main() {
  assert.equal(process.argv.length,2); assert.notEqual(process.env.NODE_ENV,'production');
  assert(!fs.existsSync(receiptFile),'Fresh evidence required'); assert(!fs.existsSync(own),'Fresh owned directory required');
  assert(own.startsWith(path.join(root,'.codex-tmp')+path.sep));
  report.sourceBefore=source();
  const clientManifest=JSON.parse(fs.readFileSync(path.join(root,'plans/stoquify-production-readiness-2026-10-28/execution/P03/private-client-manifest.json'),'utf8'));
  assert.equal(clientManifest.passed,true);
  for(const file of clientManifest.files) assert.equal(hash(fs.readFileSync(path.join(clientManifest.root,'node_modules/.prisma/client',file.path))),file.sha256);
  for(const item of clientManifest.envPaths) assert(!fs.existsSync(item.path));
  const currentSchema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8');
  const generatedSchema=fs.readFileSync(path.join(clientManifest.root,'node_modules/.prisma/client/schema.prisma'),'utf8');
  const transformPath=path.join(root,'plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/full-app-20261102-r3/verify-generated-schema.cjs');
  const proof=require(transformPath).verifyGeneratedSchema(root,hash(currentSchema));
  assert.equal(proof.exactCanonicalMatch,true,'Installed Prisma canonical schema mismatch');
  assert.equal(hash(generatedSchema),proof.generatedSchemaSha256,'Private generated schema differs');
  report.schemaProof=proof;
  report.privateClient={manifest:'execution/P03/private-client-manifest.json',files:clientManifest.files.length,schemaSha256:hash(currentSchema),generatedSchemaSha256:hash(generatedSchema),declarationCompatibility:true};
  fs.mkdirSync(scaffold,{recursive:true}); fs.writeFileSync(path.join(own,'owner.json'),JSON.stringify({purpose:'P04-R03 native qualification',root,own,cluster,database,state:'preparing'},null,2),{flag:'wx'});
  fs.writeFileSync(path.join(scaffold,'schema.prisma'),currentSchema,{flag:'wx'});
  fs.cpSync(path.join(root,'prisma/migrations'),path.join(scaffold,'migrations'),{recursive:true,errorOnExist:true,force:false});
  const migrationFiles=filesUnder(path.join(root,'prisma/migrations'));
  report.migrations=migrationFiles.map(file=>({path:path.relative(path.join(root,'prisma/migrations'),file).replaceAll('\\','/'),sha256:hash(fs.readFileSync(file))}));
  assert.deepEqual(filesUnder(path.join(scaffold,'migrations')).map(file=>({path:path.relative(path.join(scaffold,'migrations'),file).replaceAll('\\','/'),sha256:hash(fs.readFileSync(file))})),report.migrations);
  assert.equal(report.migrations.filter(f=>f.path.endsWith('/migration.sql')).length,121);
  fs.writeFileSync(path.join(scaffold,'prisma.config.ts'),'import { defineConfig } from "prisma/config"; export default defineConfig({schema:"schema.prisma"});\n',{flag:'wx'});
  port=await available();
  run('initdb',path.join(bin,'initdb.exe'),['-D',cluster,'-U','p04r03','-A','trust','--no-locale','--encoding=UTF8']);
  fs.writeFileSync(path.join(cluster,'pg_hba.conf'),'host all all 127.0.0.1/32 trust\nhost all all ::1/128 reject\n');
  startAttempted=true; run('pg-start',path.join(bin,'pg_ctl.exe'),['-D',cluster,'-l',path.join(own,'postgres.log'),'-o','-h 127.0.0.1 -p '+port,'-w','start']);
  ownedPid=pid(); assert(Number.isSafeInteger(ownedPid)&&ownedPid>0);
  fs.writeFileSync(path.join(own,'owner.json'),JSON.stringify({purpose:'P04-R03 native qualification',root,own,cluster,database,port,ownedPid,state:'running'},null,2));
  const admin=await connect('postgres');try { assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount,0);await admin.query('CREATE DATABASE "'+database+'"'); } finally {await admin.end();}
  const url='postgresql://p04r03@127.0.0.1:'+port+'/'+database;
  run('migrate-current',process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',path.join(scaffold,'prisma.config.ts')],{cwd:scaffold,env:{...env,DATABASE_URL:url,DIRECT_URL:url,SHADOW_DATABASE_URL:url}});
  const check=await connect(database);try {
    const applied=(await check.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const expected=report.migrations.filter(f=>f.path.endsWith('/migration.sql')).map(f=>({name:f.path.split('/')[0],sha256:f.sha256}));
    assert.deepEqual(applied.map(r=>({name:r.migration_name,sha256:r.checksum})),expected);
    assert(applied.every(r=>r.finished_at&&!r.rolled_back_at));
    for(const table of ['organizations','users','roles','sessions','invites','access_requests','business_events','business_event_outbox']) assert.equal((await check.query('SELECT count(*)::int n FROM "'+table+'"')).rows[0].n,0);
    report.migrationsVerified=applied.length;
  } finally {await check.end();}
  Object.assign(env,{P04R03_DATABASE_URL:url+'?connection_limit=8',P04R03_CLUSTER:cluster,P04R03_PORT:String(port),P04R03_EVIDENCE:__dirname,STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS:'0',STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS:'0',STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS:'0'});
  report.target={host:'127.0.0.1',port,database,cluster,ownedPid};report.environmentVariableNames=Object.keys(env).sort();
  const fd=fs.openSync(path.join(own,'native-tests.log'),'wx');
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'node_modules/jest/bin/jest.js'),'--config',path.join(__dirname,'jest.native-retry02.config.cjs'),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,'native-jest-retry02.json')],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]});
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:10000});},15*60*1000);
    child.once('error',e=>{clearTimeout(timer);fs.closeSync(fd);reject(e);});
    child.once('exit',code=>{clearTimeout(timer);fs.closeSync(fd);report.testExitCode=code;report.timedOut=timedOut;timedOut?reject(Error('Native suite timed out')):resolve();});
  });
  const result=JSON.parse(fs.readFileSync(path.join(__dirname,'native-jest-retry02.json'),'utf8'));
  report.tests={total:result.numTotalTests,passed:result.numPassedTests,failed:result.numFailedTests,pending:result.numPendingTests};
  assert.equal(report.testExitCode,0);assert.equal(result.numPendingTests,0);assert.equal(result.numFailedTests,0);assert(result.numPassedTests>=20);
  report.sourceAfter=source();assert.deepEqual(report.sourceAfter,report.sourceBefore);
  const migrationState=directory=>filesUnder(directory).map(file=>({path:path.relative(directory,file).replaceAll('\\','/'),sha256:hash(fs.readFileSync(file))}));
  assert.deepEqual(migrationState(path.join(root,'prisma/migrations')),report.migrations);
  assert.deepEqual(migrationState(path.join(scaffold,'migrations')),report.migrations);
  report.migrationsUnchanged=true;report.sourceUnchanged=true;report.passed=true;
}
main().catch(error=>{report.error=error.message;process.exitCode=1;}).finally(async()=>{
  if(startAttempted)try{
    const status=spawnSync(path.join(bin,'pg_ctl.exe'),['-D',cluster,'status'],{env,windowsHide:true,stdio:'ignore',timeout:10000});
    if(status.status===0){
      if(!ownedPid)ownedPid=pid();assert.equal(pid(),ownedPid);
      const admin=await connect('postgres');try{const clients=(await admin.query("SELECT pid,datname,application_name,state FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()" )).rows;report.remainingClients=clients;assert.equal(clients.length,0);assert.equal(pid(),ownedPid);}finally{await admin.end();}
      run('pg-stop',path.join(bin,'pg_ctl.exe'),['-D',cluster,'-m','fast','-w','stop']);
    }else assert.equal(status.status,3);
    assert.equal(spawnSync(path.join(bin,'pg_ctl.exe'),['-D',cluster,'status'],{env,windowsHide:true,stdio:'ignore',timeout:10000}).status,3);
    await available(port);report.cleanup={clusterStopped:true,portReleased:true,databasesRetained:[database]};
    fs.writeFileSync(path.join(own,'owner.json'),JSON.stringify({purpose:'P04-R03 native qualification',root,own,cluster,database,port,ownedPid,state:'stopped'},null,2));
  }catch(error){report.cleanupError=error.message;report.passed=false;process.exitCode=1;}
  report.finishedAt=new Date().toISOString();fs.writeFileSync(receiptFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,error:report.error,tests:report.tests,cleanup:report.cleanup,cleanupError:report.cleanupError}));
});
