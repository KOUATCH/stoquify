const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
const {spawnSync}=require('node:child_process'),{Client}=require('pg'),c=require('./af16-verification-context.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-03');
async function main(){
 assert.notEqual(process.env.NODE_ENV,'production');const run=JSON.parse(fs.readFileSync(path.join(output,'sealed-engagement-summary.json')));assert.ok(run.passed&&run.serverStopped&&run.proxyStopped&&run.artifactUnchangedAfterBrowser);
 await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(3186,'127.0.0.1',()=>s.close(e=>e?reject(e):resolve()));});
 const {PrismaClient}=require('../.codex-tmp/af16-prisma/client'),data={};
 for(const [key,url] of [['template',c.url('template')],['clone','postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261102_engagement_r3']]){
  const db=new PrismaClient({datasources:{db:{url}}});
  try{
   assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync(c.cluster).toLowerCase());
   data[key]={users:await db.user.count(),organizations:await db.organization.count(),engagements:await db.firmEngagement.count(),grants:await db.accountantAccessGrant.count(),journals:await db.journalEntry.count()};
   if(key==='template')assert.deepEqual(data[key],{users:0,organizations:0,engagements:0,grants:0,journals:0});
   else{
    const e=await db.firmEngagement.findFirstOrThrow({where:{firmOrganizationId:'af05-firm'}});data[key].status=e.status;data[key].version=e.version;
    data[key].reviewerRevoked=!!(await db.accountantAccessGrant.findFirstOrThrow({where:{accountantUserId:'af05-reviewer'}})).revokedAt;
    data[key].managerSessions=await db.session.count({where:{userId:'af05-manager'}});
    assert.equal(e.status,'ACTIVE');assert.ok(data[key].reviewerRevoked);assert.equal(data[key].managerSessions,0);assert.equal(data[key].journals,0);
   }
  }finally{await db.$disconnect()}
 }
 const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres'});await admin.connect();
 try{await c.guard(admin);assert.equal((await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n,0);}finally{await admin.end();}
 const stopped=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe',['-D',c.cluster,'-m','fast','-t','60','-w','stop'],{windowsHide:true,encoding:'utf8',timeout:65000});fs.writeFileSync(path.join(output,'database-stop.log'),stopped.stdout+stopped.stderr,{flag:'wx'});assert.equal(stopped.status,0);
 fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify({observedAt:new Date().toISOString(),...data,ownedDatabaseStopped:true,otherDatabaseClients:0,proxyPortFree:true,serverStopped:true,proxyStopped:true,cloneRetained:run.database},null,2),{flag:'wx'});console.log('Template untouched; owned services stopped; diagnostic clone retained.');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
