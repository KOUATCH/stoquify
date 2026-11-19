// Reviewed isolated build pipeline; no schema promotion, installation or deployment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{Client}=require('pg');
const root=path.resolve(__dirname,'../../../..'),c=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/p03-grant-20261028-r1/context.json'),'utf8'));
const candidate=path.resolve('D:/Codex-Stoquify-P03-20261028-01a1816a/recovery-u02'),artifact=path.resolve('D:/Codex-Stoquify-P03-20261028-01a1816a/recovery-u02-artifact');
const {capture}=require(path.join(root,'scripts/candidate-snapshot.cjs')),{inspectBuildProcesses}=require(path.join(root,'scripts/build-app-safe.js')),{verify}=require(path.join(root,'scripts/release-artifact.cjs'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(k.toUpperCase())));
const receipt={startedAt:new Date().toISOString(),passed:false,commands:[],candidate,artifact};let startAttempted=false;
const name='stoquify_local_p03_20261029_u02_build_r1',url='postgresql://p03@127.0.0.1:'+c.pgPort+'/'+name;
Object.assign(env,{NEXT_TELEMETRY_DISABLED:'1',CHECKPOINT_DISABLE:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1',DATABASE_URL:url,DIRECT_URL:url,NEXTAUTH_URL:'https://localhost:3186',NEXT_PUBLIC_BASE_URL:'https://localhost:3186',NEXT_PUBLIC_APP_URL:'https://localhost:3186',STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS:'0',STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS:'0',STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS:'0',BUILD_APP_TIMEOUT_MS:String(60*60*1000)});
for(const key of ['AUTH_SECRET','NEXTAUTH_SECRET','BETTER_AUTH_SECRET','PUBLIC_IDENTITY_ABUSE_HASH_SECRET','AQSTOQFLOW_RECEIPT_TOKEN_SECRET','AQSTOQFLOW_HISTORY_CURSOR_SECRET','AQSTOQFLOW_STATEMENT_TOKEN_SECRET','AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY','AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY'])env[key]=crypto.randomBytes(32).toString('hex');
function pgCommand(label,args){const fd=fs.openSync(path.join(__dirname,label+'.log'),'wx');let r;try{r=spawnSync(path.join(c.bin,'pg_ctl.exe'),args,{env,windowsHide:true,stdio:['ignore',fd,fd],timeout:60000})}finally{fs.closeSync(fd)}if(r.error)throw r.error;assert.equal(r.status,0,label)}
async function guard(db){assert.equal(fs.realpathSync((await db.query('SHOW data_directory')).rows[0].data_directory).toLowerCase(),fs.realpathSync(c.cluster).toLowerCase())}
async function command(label,args,timeoutMs){
 const startedAt=new Date().toISOString(),fd=fs.openSync(path.join(__dirname,label+'.log'),'wx');
 return new Promise((resolve,reject)=>{
  let timedOut=false,settled=false,fallback,termination=null;
  const child=spawn(process.execPath,args,{cwd:candidate,env,windowsHide:true,stdio:['ignore',fd,fd]});
  const finish=(exitCode,signal,error)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(fallback);fs.closeSync(fd);const r={label,args,startedAt,finishedAt:new Date().toISOString(),exitCode,signal,timedOut,termination,error:error?.message};receipt.commands.push(r);fs.writeFileSync(path.join(__dirname,label+'-result.json'),JSON.stringify(r,null,2),{flag:'wx'});console.log(JSON.stringify({label,exitCode,timedOut}));if(error||exitCode!==0||timedOut)reject(Error(label+' failed'));else resolve()};
  const timer=setTimeout(()=>{
   timedOut=true;
   if(!settled&&child.pid){const killed=spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000,stdio:'ignore'});termination={pid:child.pid,exitCode:killed.status,error:killed.error?.message};}
   fallback=setTimeout(()=>{if(settled)return;try{child.kill()}catch{}receipt.residualChild={pid:child.pid,cleanup:'unconfirmed after bounded termination attempt',termination};child.unref();finish(null,null,Error('Owned child exit not confirmed after termination deadline'));},5000);
  },timeoutMs);
  child.on('error',e=>finish(null,null,e));child.on('exit',(code,signal)=>finish(code,signal));
 });
}
async function main(){
 assert.equal(JSON.parse(fs.readFileSync(path.resolve(candidate,'../ownership.json'),'utf8')).sourceRoot,root);assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'native-replay-result.json'),'utf8')).passed,true);assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'u02-green-result.json'),'utf8')).exitCode,0);assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'u02-compiler-result.json'),'utf8')).exitCode,0);assert.equal(process.argv.length,2);assert(process.env.NODE_ENV!=='production');assert(!fs.existsSync(artifact),'Fresh artifact required');assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'u02-preparation.json'),'utf8')).passed,true);
 assert.equal(c.own,path.join(root,'.codex-tmp/p03-grant-20261028-r1'));assert.equal(c.cluster,path.join(c.own,'postgres'));
 assert(!fs.readdirSync(candidate).some(n=>n==='.env'||n.startsWith('.env.')),'No application environment files');
 const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'u02-source-manifest.json'),'utf8')).files;assert.deepEqual(capture(candidate).files.map(({path,sha256})=>({path,sha256})),expected);
 const inspection=inspectBuildProcesses({includeDevProcesses:false});assert(!inspection.error,inspection.error?.message);assert.equal(inspection.orphans.length,0,'Competing build: preserve other work');
 assert.equal(spawnSync(path.join(c.bin,'pg_ctl.exe'),['-D',c.cluster,'status'],{windowsHide:true,stdio:'ignore'}).status,3,'Owned cluster must be stopped');
 startAttempted=true;pgCommand('u02-pg-start',['-D',c.cluster,'-l',path.join(c.own,'u02-postgres.log'),'-o','-h 127.0.0.1 -p '+c.pgPort,'-w','start']);
 const admin=new Client({connectionString:'postgresql://p03@127.0.0.1:'+c.pgPort+'/postgres',connectionTimeoutMillis:5000,query_timeout:120000});await admin.connect();try{await guard(admin);assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount,0);await admin.query('CREATE DATABASE "'+name+'" TEMPLATE "'+c.template+'"')}finally{await admin.end()}
 const db=new Client({connectionString:url,connectionTimeoutMillis:5000,query_timeout:10000});await db.connect();try{await guard(db);const rows=(await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;const catalog=fs.readdirSync(path.join(candidate,'prisma/migrations')).filter(n=>fs.existsSync(path.join(candidate,'prisma/migrations',n,'migration.sql'))).sort();assert.deepEqual(rows.map(r=>r.migration_name),catalog);for(const r of rows)assert(r.finished_at&&!r.rolled_back_at&&r.checksum===hash(fs.readFileSync(path.join(candidate,'prisma/migrations',r.migration_name,'migration.sql'))));assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,0);receipt.database={name,host:'127.0.0.1',port:c.pgPort,migrations:rows.length,synthetic:true}}finally{await db.end()}
 const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');assert(fs.existsSync(npm));
 receipt.environmentVariableNames=Object.keys(env).sort();receipt.scope='Previously sealed four-delta candidate plus reviewed command/refresh repair, physical private dependencies, fresh synthetic secrets and build database. Not a current combined release or clean install.';
 await command('u02-client-generation',['node_modules/prisma/build/index.js','generate'],10*60*1000);
 await command('u02-artifact-build',[npm,'run','release:artifact','--',artifact],90*60*1000);
 const digest=hash(fs.readFileSync(path.join(artifact,'artifact.json'))),manifest=verify(candidate,artifact,digest);assert.deepEqual(manifest.source,expected);
 receipt.artifactSha256=digest;receipt.buildId=manifest.buildId;receipt.runtimeFiles=manifest.files.length;receipt.passed=true;
}
main().catch(e=>{receipt.error=e.message;process.exitCode=1}).finally(()=>{if(startAttempted){try{const status=spawnSync(path.join(c.bin,'pg_ctl.exe'),['-D',c.cluster,'status'],{env,windowsHide:true,encoding:'utf8',timeout:5000});if(status.status===0)pgCommand('u02-pg-stop',['-D',c.cluster,'-m','fast','-w','stop']);else assert.equal(status.status,3);receipt.clusterStopped=true}catch(e){receipt.cleanupError=e.message;receipt.passed=false;process.exitCode=1}}receipt.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'u02-build.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({passed:receipt.passed,error:receipt.error,buildId:receipt.buildId,clusterStopped:receipt.clusterStopped}))});
