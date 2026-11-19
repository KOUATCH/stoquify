// P03-owned fresh local fixture. Never connects to an existing application target.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),net=require('node:net');
const {spawnSync}=require('node:child_process'),{Client}=require('pg');
const root=path.resolve(__dirname,'../../../..'),own=path.join(root,'.codex-tmp/p03-grant-20261028-r1'),cluster=path.join(own,'postgres'),runtime=path.join(own,'runtime');
const source=path.join(root,'.codex-tmp/af16-release-20261026'),artifact=path.join(root,'.codex-tmp/af16-artifact-20261026');
const digest='987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f',bin='C:/Program Files/PostgreSQL/17/bin';
const {verify,filesUnder}=require(path.join(root,'scripts/release-artifact.cjs'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(k.toUpperCase())));
Object.assign(env,{NODE_ENV:'test',CHECKPOINT_DISABLE:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1'});
const receipt={startedAt:new Date().toISOString(),artifactSha256:digest,passed:false,commands:[]};let startAttempted=false;
function run(label,file,args,extra={}){const r=spawnSync(file,args,{cwd:own,env,encoding:'utf8',windowsHide:true,timeout:300000,...extra});fs.writeFileSync(path.join(own,label+'.log'),(r.stdout||'')+(r.stderr||''));receipt.commands.push({label,file,args,exitCode:r.status});if(r.error)throw r.error;if(r.status!==0)throw Error(label+' failed: '+r.status);}
async function port(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p))})})}
async function main(){
 if(process.argv.length!==2||process.env.NODE_ENV==='production')throw Error('Only fresh local setup permitted');
 assert(own.startsWith(path.join(root,'.codex-tmp')+path.sep));assert(!fs.existsSync(own),'Owned directory must be new');
 const manifest=verify(source,artifact,digest);assert.equal(manifest.buildId,'eoW9-NZPj4rd9OHTZxMDM');
 fs.mkdirSync(own);fs.cpSync(path.join(artifact,'runtime'),runtime,{recursive:true,errorOnExist:true,force:false});
 assert.deepEqual(filesUnder(runtime),manifest.files.map(f=>({path:f.path.slice(8),sha256:f.sha256})));
 receipt.buildId=manifest.buildId;receipt.runtimeFiles=manifest.files.length;
 const scaffold=path.join(own,'schema');fs.mkdirSync(scaffold);
 fs.copyFileSync(path.join(source,'prisma/schema.prisma'),path.join(scaffold,'schema.prisma'));
 fs.cpSync(path.join(source,'prisma/migrations'),path.join(scaffold,'migrations'),{recursive:true,errorOnExist:true,force:false});
 fs.writeFileSync(path.join(scaffold,'prisma.config.ts'),'import { defineConfig } from "prisma/config"; export default defineConfig({schema:"schema.prisma"});');
 const pgPort=await port();run('initdb',path.join(bin,'initdb.exe'),['-D',cluster,'-U','p03','-A','trust','--no-locale','--encoding=UTF8']);
 fs.writeFileSync(path.join(cluster,'pg_hba.conf'),['host all all 127.0.0.1/32 trust','host all all ::1/128 reject',''].join(String.fromCharCode(10)));
 startAttempted=true;run('pg-start',path.join(bin,'pg_ctl.exe'),['-D',cluster,'-l',path.join(own,'postgres.log'),'-o','-h 127.0.0.1 -p '+pgPort,'-w','start']);
 const name='stoquify_local_p03_20261028_template_r1',url='postgresql://p03@127.0.0.1:'+pgPort+'/'+name;
 const admin=new Client({connectionString:'postgresql://p03@127.0.0.1:'+pgPort+'/postgres',connectionTimeoutMillis:5000});await admin.connect();
 try{assert.equal(fs.realpathSync((await admin.query('SHOW data_directory')).rows[0].data_directory).toLowerCase(),fs.realpathSync(cluster).toLowerCase());assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount,0);await admin.query('CREATE DATABASE "'+name+'"')}finally{await admin.end()}
 run('migrate-frozen',process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',path.join(scaffold,'prisma.config.ts')],{cwd:scaffold,env:{...env,DATABASE_URL:url,DIRECT_URL:url,SHADOW_DATABASE_URL:url}});
 const db=new Client({connectionString:url});await db.connect();try{
 const migrations=(await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
 const catalog=fs.readdirSync(path.join(scaffold,'migrations')).filter(n=>fs.existsSync(path.join(scaffold,'migrations',n,'migration.sql'))).sort();assert.deepEqual(migrations.map(x=>x.migration_name),catalog);
 for(const m of migrations)assert(m.finished_at&&!m.rolled_back_at&&m.checksum===hash(fs.readFileSync(path.join(scaffold,'migrations',m.migration_name,'migration.sql'))));
 assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int n FROM organizations')).rows[0].n,0);
 receipt.migrations=migrations.map(({migration_name,checksum})=>({name:migration_name,sha256:checksum}));
 }finally{await db.end()}
 fs.writeFileSync(path.join(own,'context.json'),JSON.stringify({root,own,cluster,runtime,source,artifact,digest,bin,pgPort,template:name},null,2),{flag:'wx'});receipt.passed=true;
}
main().catch(e=>{receipt.error=e.message;process.exitCode=1}).finally(()=>{if(startAttempted){try{const status=spawnSync(path.join(bin,'pg_ctl.exe'),['-D',cluster,'status'],{env,windowsHide:true,encoding:'utf8'});if(status.status===0)run('pg-stop',path.join(bin,'pg_ctl.exe'),['-D',cluster,'-m','fast','-w','stop']);else assert.equal(status.status,3,'Cannot establish owned cluster status');receipt.clusterStopped=true}catch(e){receipt.passed=false;receipt.cleanupError=e.message;process.exitCode=1}}receipt.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'isolation-prepare.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({passed:receipt.passed,error:receipt.error,clusterStopped:receipt.clusterStopped}))});
