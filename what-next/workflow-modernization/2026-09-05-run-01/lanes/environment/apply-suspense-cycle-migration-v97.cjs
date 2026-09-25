const local=require('./registration-local.cjs'),fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const migration='20260909093000_add_suspense_posting_cycles',file=path.join(local.root,'prisma/migrations',migration,'migration.sql'),sql=fs.readFileSync(file,'utf8'),sha=crypto.createHash('sha256').update(sql).digest('hex'),run=crypto.randomUUID().slice(0,12);
const rehearsal=JSON.parse(fs.readFileSync(path.join(__dirname,'suspense-cycle-migration-v97-bd798055-3ed.json'),'utf8'));assert.ok(rehearsal.passed);assert.equal(rehearsal.sqlSha256,sha);
const report={at:new Date().toISOString(),migration,sqlSha256:sha,rehearsal:'suspense-cycle-migration-v97-bd798055-3ed.json',applied:false,historyRecorded:false};
(async()=>{await local.withClient(local.targetUrl(),async c=>{
 await local.assertOwned(c);report.database=(await c.query('SELECT current_database() AS name')).rows[0].name;
 const existing=(await c.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' AND column_name='postingCycle'")).rowCount;assert.equal(existing,0,'One-use apply requires the pre-migration schema');
 const snapshot=async()=>crypto.createHash('sha256').update(JSON.stringify((await c.query('SELECT to_jsonb(b) - \'postingCycle\' AS record FROM ledger_posting_batches b ORDER BY id')).rows)).digest('hex');
 report.beforeHash=await snapshot();await c.query(sql);report.applied=true;report.afterHash=await snapshot();assert.equal(report.afterHash,report.beforeHash);
 assert.equal((await c.query('SELECT count(*)::int AS n FROM ledger_posting_batches WHERE "postingCycle" <> 1')).rows[0].n,0);
 });
 // Register only the migration that was actually executed above. Never run all
 // pending migrations, seeds, resets or a default application build here.
 const target=local.targetUrl().toString(),result=spawnSync(process.execPath,[path.join(local.root,'node_modules/prisma/build/index.js'),'migrate','resolve','--applied',migration],{cwd:local.root,env:{...process.env,DATABASE_URL:target,DIRECT_URL:target},encoding:'utf8',windowsHide:true});
 report.historyExitCode=result.status;assert.equal(result.status,0,'Applied SQL; local migration-history registration needs recovery');report.historyRecorded=true;
 await local.withClient(local.targetUrl(),async c=>{await local.assertOwned(c);const rows=(await c.query('SELECT checksum,finished_at,rolled_back_at FROM _prisma_migrations WHERE migration_name=$1',[migration])).rows;assert.equal(rows.length,1);assert.equal(rows[0].checksum,sha);assert.ok(rows[0].finished_at&&!rows[0].rolled_back_at)});
 report.passed=true;
})().catch(e=>{report.error={code:e.code||e.name,message:String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]')}}).finally(()=>{const out='suspense-cycle-apply-v97-'+run+'.json';fs.writeFileSync(path.join(__dirname,out),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file:out,passed:report.passed,applied:report.applied,historyRecorded:report.historyRecorded,error:report.error}));process.exitCode=report.passed?0:1});
