const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{Client}=require('pg');
const c=require('./af16-verification-context.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-03');
async function main(){
 if(fs.existsSync(path.join(output,'cleanup.json')))throw Error('Existing cleanup receipt refused');
 const run=JSON.parse(fs.readFileSync(path.join(output,'sealed-opening-summary.json')));
 if(!run.passed||!run.serverStopped||!run.proxyStopped)throw Error('Successful stopped browser runtime required');
 const source=JSON.parse(fs.readFileSync(path.join(output,'browser-fixture.json')));
 const {PrismaClient}=require('../.codex-tmp/af16-prisma/client');
 const db=new PrismaClient({datasources:{db:{url:c.url('af10')}}});
 let retained;
 try{
  if(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase()!==fs.realpathSync(c.cluster).toLowerCase())throw Error('Wrong owned cluster');
  retained={selectedClient:source.client,openingExecutions:await db.financialOpeningExecution.count({where:{organizationId:source.client}}),journals:await db.journalEntry.count({where:{organizationId:source.client}})};
  if(retained.openingExecutions!==0||retained.journals!==0)throw Error('Original fixture no longer untouched');
 }finally{await db.$disconnect()}
 const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres',connectionTimeoutMillis:5000});await admin.connect();
 try{
  await c.guard(admin);
  const other=(await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n;
  if(other)throw Error('Other client connections present; refusing service stop');
 }finally{await admin.end()}
 const result=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe',['-D',c.cluster,'-m','fast','-t','120','-w','stop'],{windowsHide:true,encoding:'utf8',timeout:130000});
 fs.writeFileSync(path.join(output,'database-stop.log'),(result.stdout||'')+(result.stderr||''),{flag:'wx'});
 if(result.status!==0)throw Error('Owned database shutdown failed');
 fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify({observedAt:new Date().toISOString(),originalFixture:retained,otherDatabaseClients:0,ownedDatabaseStopped:true,serverStopped:run.serverStopped,proxyStopped:run.proxyStopped,artifactUnchanged:run.artifactUnchangedAfterBrowser,syntheticCloneRetained:run.database,privateTlsAndCredentialsRetained:true,deployment:false,schemaPromotion:false},null,2),{flag:'wx'});
 console.log('Owned database stopped cleanly; original fixture remains without opening writes.');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
