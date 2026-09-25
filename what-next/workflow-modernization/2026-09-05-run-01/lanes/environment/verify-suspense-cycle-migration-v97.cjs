const local=require('./registration-local.cjs'),fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const migration='20260909093000_add_suspense_posting_cycles',file=path.join(local.root,'prisma/migrations',migration,'migration.sql'),sql=fs.readFileSync(file,'utf8'),run=crypto.randomUUID().slice(0,12);
const report={at:new Date().toISOString(),migration,sqlSha256:crypto.createHash('sha256').update(sql).digest('hex'),checks:[],applied:false};
const hash=rows=>crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function preserved(c){return hash((await c.query('SELECT to_jsonb(b) - \'postingCycle\' AS record FROM ledger_posting_batches b ORDER BY id')).rows)}
async function expectSql(c,code,work){await c.query('SAVEPOINT expected_failure');try{await work();assert.fail('Expected SQL rejection '+code)}catch(e){assert.equal(e.code,code)}finally{await c.query('ROLLBACK TO SAVEPOINT expected_failure');await c.query('RELEASE SAVEPOINT expected_failure')}}
(async()=>{await local.withClient(local.targetUrl(),async c=>{
 await local.assertOwned(c);report.database=(await c.query('SELECT current_database() AS name')).rows[0].name;
 const exists=(await c.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' AND column_name='postingCycle'")).rowCount;assert.equal(exists,0,'This one-use rehearsal requires the pre-migration schema');
 const before=await preserved(c),org=(await c.query('SELECT id FROM organizations WHERE name LIKE $1 ORDER BY id LIMIT 1',[local.prefix+'%'])).rows[0]?.id;assert.ok(org);
 // Remove only the script transaction wrapper so all DDL and synthetic checks
 // can be rolled back together. The SQL body is otherwise the exact migration.
 const body=sql.replace(/^BEGIN;\r?\n/m,'').replace(/^COMMIT;\s*$/m,'');await c.query('BEGIN');
 try{
  await c.query(body);assert.equal(await preserved(c),before);assert.equal((await c.query('SELECT count(*)::int AS n FROM ledger_posting_batches WHERE "postingCycle" <> 1')).rows[0].n,0);report.checks.push('All existing batch bytes preserved; every old batch defaults to cycle 1');
  const insert=(id,type,purpose,cycle=1,key=id)=>c.query('INSERT INTO ledger_posting_batches (id,"organizationId","sourceType","sourceId","postingPurpose","postingCycle","idempotencyKey","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',[run+'-'+id,org,type,run+'-source',purpose,cycle,run+'-'+key]);
  await insert('first','PAYMENT_SUSPENSE','SUSPENSE_RECLASSIFICATION');await insert('second','PAYMENT_SUSPENSE','SUSPENSE_RECLASSIFICATION',2);await insert('reverse-first','PAYMENT_SUSPENSE','REVERSAL');await insert('reverse-second','PAYMENT_SUSPENSE','REVERSAL',2);report.checks.push('Distinct suspense posting and reversal cycles retain the same canonical source ID');
  await expectSql(c,'23505',()=>insert('duplicate','PAYMENT_SUSPENSE','SUSPENSE_RECLASSIFICATION',2));await expectSql(c,'23505',()=>insert('duplicate-key','PAYMENT_SUSPENSE','SUSPENSE_RECLASSIFICATION',3,'second'));report.checks.push('Same-cycle source uniqueness and tenant request-key uniqueness both remain enforced');
  for(const [type,purpose]of [['MANUAL','MANUAL_JOURNAL'],['POS_SALE','SALE_COMPLETION'],['SUPPLIER_INVOICE','SUPPLIER_INVOICE'],['PAYMENT_SUSPENSE','MANUAL_JOURNAL']])await expectSql(c,'23514',()=>insert('forbidden-'+type,type,purpose,2));
  await expectSql(c,'23514',()=>insert('zero','PAYMENT_SUSPENSE','REVERSAL',0));await expectSql(c,'23514',()=>insert('negative','PAYMENT_SUSPENSE','REVERSAL',-1));report.checks.push('Non-suspense later cycles, incompatible purpose, zero and negative cycles are rejected');
  await insert('manual','MANUAL','MANUAL_JOURNAL');await expectSql(c,'23505',()=>insert('manual-retry','MANUAL','MANUAL_JOURNAL'));report.checks.push('Unchanged single-effect source identity remains enforced for ordinary manual postings');
 }finally{await c.query('ROLLBACK')}
 assert.equal(await preserved(c),before);assert.equal((await c.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' AND column_name='postingCycle'")).rowCount,0);report.checks.push('Rehearsal rollback restores original schema and batch bytes, with no synthetic batch retained');
 report.passed=true;
 });})().catch(e=>{report.error={code:e.code||e.name,message:String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]')}}).finally(()=>{const out='suspense-cycle-migration-v97-'+run+'.json';fs.writeFileSync(path.join(__dirname,out),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file:out,passed:report.passed,checks:report.checks,error:report.error,applied:report.applied}));process.exitCode=report.passed?0:1});
