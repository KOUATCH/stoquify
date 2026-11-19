// Observe only owned synthetic targets; stop the owned cluster only when no other clients remain.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
const {Client}=require('pg'),{spawnSync}=require('node:child_process'),c=require('./af16-verification-context.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-04');
async function main(){
 assert.notEqual(process.env.NODE_ENV,'production');const run=JSON.parse(fs.readFileSync(path.join(output,'sealed-obligation-summary.json'))),source=JSON.parse(fs.readFileSync(path.join(output,'browser-fixture.json')));
 assert.ok(run.passed&&run.artifactUnchangedAfterBrowser&&run.proxyStopped&&run.serverStopped);
 await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(3186,'127.0.0.1',()=>s.close(e=>e?reject(e):resolve()));});
 const {PrismaClient}=require('../.codex-tmp/af16-prisma/client'),result={};
 for(const [label,url] of [['original',c.url('af11')],['clone','postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261102_obligation_r4']]){
  const db=new PrismaClient({datasources:{db:{url}}});
  try{
   assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync(c.cluster).toLowerCase());
   const revisions=await db.firmObligationRevision.findMany({where:{organizationId:source.client},orderBy:[{code:'asc'},{version:'asc'}]});
   const pack=await db.closePackExport.findUniqueOrThrow({where:{id:source.packId},include:{closeRun:true}});
   result[label]={selectedClient:source.client,revisions:revisions.map(r=>({code:r.code,instanceId:r.instanceId,version:r.version,actorId:r.actorId,decision:r.decision,sourceSnapshot:r.sourceSnapshot})),journalCount:await db.journalEntry.count({where:{organizationId:source.client}}),packCertified:pack.isCertified,closeRunStatus:pack.closeRun.status,preparerSessions:await db.session.count({where:{userId:source.actors.preparer}})};
   assert.equal(result[label].journalCount,0);assert.equal(pack.isCertified,false);assert.equal(pack.closeRun.status,'BLOCKED');
   if(label==='original')assert.equal(revisions.length,0);
   else{
    assert.equal(revisions.length,3);assert.equal(result[label].preparerSessions,0);
    const operational=revisions.filter(r=>r.code==='CLOSE_EVIDENCE_COLLECTION');assert.deepEqual(operational.map(r=>[r.version,r.decision]),[[1,'PREPARED'],[2,'REVIEWED']]);assert.notEqual(operational[0].actorId,operational[1].actorId);
    const statutory=revisions.find(r=>r.code==='CM_VAT_MONTHLY');assert.equal(statutory.sourceSnapshot.statutoryVerified,false);assert.equal(statutory.sourceSnapshot.qualifiedReview,null);
   }
  }finally{await db.$disconnect()}
 }
 const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres'});await admin.connect();
 try{await c.guard(admin);assert.equal((await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n,0);}finally{await admin.end();}
 const stopped=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe',['-D',c.cluster,'-m','fast','-t','60','-w','stop'],{windowsHide:true,encoding:'utf8',timeout:65000});fs.writeFileSync(path.join(output,'database-stop.log'),stopped.stdout+stopped.stderr,{flag:'wx'});assert.equal(stopped.status,0);
 fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify({observedAt:new Date().toISOString(),...result,ownedDatabaseStopped:true,otherDatabaseClients:0,serverStopped:true,proxyStopped:true,proxyPortFree:true,cloneRetained:run.database},null,2),{flag:'wx'});console.log('Original AF11 fixture unchanged; selected clone reconciled; owned services stopped.');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
