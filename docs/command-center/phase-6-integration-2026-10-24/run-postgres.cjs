const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const {Client}=require(path.join(root,'node_modules/pg'));
const {assertDisposableDatabaseTarget}=require(path.join(root,'scripts/disposable-fixture-guard.js'));
const bin='C:/Program Files/PostgreSQL/17/bin';
const sanitize=s=>String(s??'').replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[disposable URL redacted]');
const report={startedAt:new Date().toISOString(),productionAccess:false,applicationConnectionRead:false,bootstrap:'Fresh private PostgreSQL cluster; captured pre-change schema bootstrap then additive Command Center SQL migration; not full migration-history certification'};
async function port(){const s=net.createServer();await new Promise((yes,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',yes)});const p=s.address().port;await new Promise(yes=>s.close(yes));return p;}
async function main(){
 if(['NODE_ENV','VERCEL_ENV','AQSTOQFLOW_ENV'].some(k=>String(process.env[k]).toLowerCase()==='production'))throw Error('Production environment refused');
 const suffix=crypto.randomBytes(5).toString('hex');
 const work=path.join(root,'.codex-tmp','phase6-postgres-'+suffix);fs.mkdirSync(work,{recursive:false});
 const data=path.join(work,'cluster'),snapshot=path.join(work,'schema.prisma');
 const database='stoquify_local_command_center_'+suffix;
 const password=crypto.randomBytes(32).toString('hex'),pwfile=path.join(work,'fixture-password');fs.writeFileSync(pwfile,password);
 const bindPort=await port();
 const target=new URL('postgresql://codex_fixture:'+password+'@127.0.0.1:'+bindPort+'/'+database+'?schema=public&connection_limit=8&connect_timeout=5');
 assertDisposableDatabaseTarget(target.toString(),[database]);
 report.target={host:'127.0.0.1',port:bindPort,database,privateDataDirectory:path.relative(root,data)};
 const env={...process.env,NODE_ENV:'test',DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),SHADOW_DATABASE_URL:target.toString(),COMMAND_CENTER_DISPOSABLE_DATABASE:database,COMMAND_CENTER_DISPOSABLE_CLUSTER:data,COMMAND_CENTER_PERSISTENCE_ENABLED:'true',RUN_COMMAND_CENTER_INTEGRATION_POSTGRES:'1',RUN_COMMAND_CENTER_ASSIGNMENT_POSTGRES:'1',RUN_WORKFLOW_ASSURANCE_IDENTITY_POSTGRES_CERTIFICATION:'1'};
 // Prevent inherited libpq routing/service settings from redirecting a test client.
 for(const key of ['PGHOST','PGPORT','PGDATABASE','PGSERVICE','PGSERVICEFILE','PGOPTIONS','PGHOSTADDR','PGUSER','PGPASSWORD'])delete env[key];
 let started=false;
 try{
  execFileSync(path.join(bin,'initdb.exe'),['-D',data,'-U','codex_fixture','--auth=scram-sha-256','--pwfile='+pwfile,'--encoding=UTF8','--locale=C'],{env,windowsHide:true,timeout:60000,stdio:'pipe'});
  fs.unlinkSync(pwfile);
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',data,'-l',path.join(work,'postgres.log'),'-o','-h 127.0.0.1 -p '+bindPort,'-w','start'],{env,windowsHide:true,timeout:60000,stdio:'ignore'});started=true;
  const adminUrl=new URL(target);adminUrl.pathname='/postgres';adminUrl.search='';
  const admin=new Client({connectionString:adminUrl.toString(),connectionTimeoutMillis:5000});
  try{
   await admin.connect();const check=(await admin.query('SELECT current_database() AS database, current_setting(\'data_directory\') AS directory, host(inet_server_addr()) AS address, version() AS version')).rows[0];
   report.observedClusterIdentity=check;
   if(check.database!=='postgres'||fs.realpathSync.native(check.directory).toLowerCase()!==fs.realpathSync.native(data).toLowerCase()||check.address!=='127.0.0.1')throw Error('Private cluster identity mismatch');
   report.serverVersion=check.version;report.clusterIdentityVerified=true;
   if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)throw Error('Existing database refused');
   await admin.query('CREATE DATABASE "'+database+'"');
  }finally{await admin.end();}
  const schema=fs.readFileSync(path.join(root,'.codex-tmp/phase6-before/prisma/schema.prisma'));fs.writeFileSync(snapshot,schema);report.schemaSha256=crypto.createHash('sha256').update(schema).digest('hex');
  const config=path.join(work,'prisma.config.ts');fs.writeFileSync(config,'import {defineConfig} from "prisma/config"; export default defineConfig({schema:"./schema.prisma"});');
  const push=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'db','push','--skip-generate','--config',config],{cwd:work,env,windowsHide:true,encoding:'utf8',timeout:180000});
  fs.writeFileSync(path.join(__dirname,'bootstrap.log'),sanitize(push.stdout)+sanitize(push.stderr));report.bootstrapExitCode=push.status;
  if(push.error||push.status!==0)throw Error('Disposable schema bootstrap failed; see sanitized bootstrap.log');
  const migration=fs.readFileSync(path.join(root,'prisma/migrations/20261024180000_command_center_coordination/migration.sql'),'utf8');
  const migrate=new Client({connectionString:target.toString(),connectionTimeoutMillis:5000});
  try{await migrate.connect();await migrate.query('BEGIN');await migrate.query(migration);await migrate.query('COMMIT');report.additiveMigrationSha256=crypto.createHash('sha256').update(migration).digest('hex');report.additiveMigrationApplied=true;}finally{await migrate.end();}
  const test=spawnSync(process.execPath,[path.join(root,'node_modules/jest/bin/jest.js'),'--config',path.join(__dirname,'jest.postgres.config.cjs'),'--runInBand','--json','--outputFile='+path.join(__dirname,'postgres-results.json')],{cwd:root,env,windowsHide:true,encoding:'utf8',timeout:240000});
  fs.writeFileSync(path.join(__dirname,'postgres.log'),sanitize(test.stdout)+sanitize(test.stderr));report.testExitCode=test.status;
  if(test.error||test.status!==0)throw Error('PostgreSQL verification failed; see sanitized postgres.log');
 }finally{
  if(started){const stop=spawnSync(path.join(bin,'pg_ctl.exe'),['-D',data,'-m','fast','-w','stop'],{env,windowsHide:true,encoding:'utf8',timeout:60000});report.shutdownExitCode=stop.status;report.stopped=stop.status===0;}
  if(fs.existsSync(pwfile))fs.unlinkSync(pwfile);
  report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'target-evidence.json'),JSON.stringify(report,null,2));
  if(started&&!report.stopped)throw Error('Disposable cluster shutdown failed; inspect target-evidence.json');
 }
}
main().catch(e=>{console.error(sanitize(e.message));process.exitCode=1});
