// Checks only the task-owned template/clone, then stops the owned cluster if unused.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{Client}=require('pg');
const c=require('./af16-verification-context.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-28-run-02');
async function main(){
 assert.notEqual(process.env.NODE_ENV,'production');
 if(fs.existsSync(path.join(output,'cleanup.json')))throw Error('Existing cleanup receipt refused');
 const run=JSON.parse(fs.readFileSync(path.join(output,'sealed-engagement-summary.json')));
 assert.ok(!run.passed&&run.serverStopped&&run.proxyStopped);
 const diagnostic=JSON.parse(fs.readFileSync(path.join(output,'refresh-diagnostic.json')));
 assert.ok(diagnostic.finishedAt&&diagnostic.error,'Retained diagnostic failure required');
 const net=require('node:net');
 await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(3186,'127.0.0.1',()=>server.close(error=>error?reject(error):resolve()));});
 const {PrismaClient}=require('../.codex-tmp/af16-prisma/client');
 const retained={};
 for(const [key,url] of [['template',c.url('template')],['clone','postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261028_engagement_r2']]){
  const db=new PrismaClient({datasources:{db:{url}}});
  try{
   assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync(c.cluster).toLowerCase());
   retained[key]={users:await db.user.count(),organizations:await db.organization.count(),engagements:await db.firmEngagement.count(),grants:await db.accountantAccessGrant.count(),journals:await db.journalEntry.count()};
   if(key==='template')assert.deepEqual(retained[key],{users:0,organizations:0,engagements:0,grants:0,journals:0});
   else{
    retained[key].grantActors=(await db.accountantAccessGrant.findMany({where:{organizationId:'af05-client'},orderBy:{accountantUserId:'asc'}})).map(g=>({actor:g.accountantUserId,status:g.status,revoked:!!g.revokedAt}));
    assert.equal(retained[key].engagements,0,'Lifecycle setup was not reached');
    assert.equal(retained[key].journals,0);
   }
  }finally{await db.$disconnect()}
 }
 const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres',connectionTimeoutMillis:5000});await admin.connect();
 try{
  await c.guard(admin);
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n,0,'Other clients present; refusing stop');
 }finally{await admin.end()}
 const result=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe',['-D',c.cluster,'-m','fast','-t','60','-w','stop'],{windowsHide:true,encoding:'utf8',timeout:65000});
 fs.writeFileSync(path.join(output,'database-stop.log'),(result.stdout||'')+(result.stderr||''),{flag:'wx'});assert.equal(result.status,0);
 fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify({observedAt:new Date().toISOString(),...retained,ownedDatabaseStopped:true,otherDatabaseClients:0,serverStopped:true,proxyStopped:true,proxyPortFree:true,syntheticCloneRetained:run.database,deployment:false,schemaPromotion:false},null,2),{flag:'wx'});
 console.log('Template untouched; synthetic clone retained; owned database stopped cleanly.');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
