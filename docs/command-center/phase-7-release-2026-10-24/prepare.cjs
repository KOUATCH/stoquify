const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {execFileSync,spawnSync}=require('node:child_process');
const {Client}=require('pg');
const {root,pointer,environment,redact}=require('./environment.cjs');
const {capture,restore}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
const bin='C:/Program Files/PostgreSQL/17/bin';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function main(){
 if(fs.existsSync(pointer))throw Error('Existing Phase 7 environment: inspect before preparing another');
 const suffix=crypto.randomBytes(5).toString('hex'),work=path.join(root,'.codex-tmp/phase7-'+suffix),candidate=path.join(work,'candidate');fs.mkdirSync(work,{recursive:false});
 const snapshot=capture(root);restore(snapshot,candidate);
 fs.writeFileSync(path.join(__dirname,'source-baseline.json'),JSON.stringify({head:snapshot.head,files:snapshot.files.map(({content,...f})=>f),excluded:snapshot.excluded},null,2));
 // Dependencies are reused read-only; never run install/generate in this candidate.
 fs.symlinkSync(path.join(root,'node_modules'),path.join(candidate,'node_modules'),'junction');
 const dbPort=await port(),appPort=await port(),password=crypto.randomBytes(32).toString('hex');
 const database='stoquify_local_command_center_e2e_'+suffix;
 const s={work,candidate,database,dbPort,appPort,origin:'http://127.0.0.1:'+appPort,cluster:path.join(work,'cluster'),url:'postgresql://codex_fixture:'+password+'@127.0.0.1:'+dbPort+'/'+database+'?schema=public&connection_limit=12',secrets:{}};
 for(const key of ['BETTER_AUTH_SECRET','AUTH_SECRET','NEXTAUTH_SECRET','PUBLIC_IDENTITY_ABUSE_HASH_SECRET','AQSTOQFLOW_RECEIPT_TOKEN_SECRET','AQSTOQFLOW_HISTORY_CURSOR_SECRET','AQSTOQFLOW_STATEMENT_TOKEN_SECRET','AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY','AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY'])s.secrets[key]=crypto.randomBytes(32).toString('hex');
 const env=environment(s,'test'),pw=path.join(work,'init-password');fs.writeFileSync(pw,password);
 let started=false;
 try{
  execFileSync(path.join(bin,'initdb.exe'),['-D',s.cluster,'-U','codex_fixture','--auth=scram-sha-256','--pwfile='+pw,'--encoding=UTF8','--locale=C'],{env,windowsHide:true,timeout:60000,stdio:'pipe'});fs.unlinkSync(pw);
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',s.cluster,'-l',path.join(work,'postgres.log'),'-o','-h 127.0.0.1 -p '+dbPort,'-w','start'],{env,windowsHide:true,timeout:60000,stdio:'ignore'});started=true;
  const adminUrl=new URL(s.url);adminUrl.pathname='/postgres';const admin=new Client({connectionString:adminUrl.toString()});await admin.connect();
  try{const identity=(await admin.query("SELECT current_setting('data_directory') AS directory,host(inet_server_addr()) AS address")).rows[0];if(path.resolve(identity.directory).toLowerCase()!==path.resolve(s.cluster).toLowerCase()||identity.address!=='127.0.0.1')throw Error('Cluster identity mismatch');await admin.query('CREATE DATABASE "'+database+'"')}finally{await admin.end()}
  const config=path.join(work,'prisma.config.ts');fs.writeFileSync(config,'import {defineConfig} from "prisma/config";export default defineConfig({schema:"./candidate/prisma/schema.prisma",migrations:{path:"./candidate/prisma/migrations"}});');
  const replay=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',config],{cwd:work,env,encoding:'utf8',timeout:240000,windowsHide:true,maxBuffer:20e6});
  fs.writeFileSync(path.join(__dirname,'fresh-migration.log'),redact(replay.stdout)+redact(replay.stderr));
  s.migrationExitCode=replay.status;
  const migrations=fs.readdirSync(path.join(candidate,'prisma/migrations')).filter(n=>fs.existsSync(path.join(candidate,'prisma/migrations',n,'migration.sql'))).sort();
  fs.writeFileSync(path.join(__dirname,'migration-catalog.json'),JSON.stringify(migrations.map(name=>({name,sha256:hash(fs.readFileSync(path.join(candidate,'prisma/migrations',name,'migration.sql')))})),null,2));
  fs.writeFileSync(path.join(work,'private.json'),JSON.stringify({url:s.url,secrets:s.secrets}));const {url,secrets,...publicState}=s;fs.writeFileSync(pointer,JSON.stringify(publicState,null,2));
  fs.writeFileSync(path.join(__dirname,'target-evidence.json'),JSON.stringify({...publicState,productionAccess:false,applicationEnvironmentRead:false,clusterIdentityVerified:true,stopped:false,migrationCount:migrations.length},null,2));
  console.log(JSON.stringify({candidate,origin:s.origin,database,migrationExitCode:replay.status,sourceFiles:snapshot.files.length,migrationCount:migrations.length}));
 }catch(e){if(started)execFileSync(path.join(bin,'pg_ctl.exe'),['-D',s.cluster,'-m','fast','-w','stop'],{env,windowsHide:true,timeout:60000,stdio:'ignore'});throw e}
 finally{if(fs.existsSync(pw))fs.unlinkSync(pw)}
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
