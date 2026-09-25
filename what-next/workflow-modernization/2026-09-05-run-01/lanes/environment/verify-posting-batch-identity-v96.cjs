const f=require('./invoice-approval-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {createLedgerPostingBatch}=require(path.join(f.root,'services/accounting/posting.service.ts'));
const mode=process.argv[2];assert.ok(['before','after'].includes(mode));
const run=crypto.randomUUID().slice(0,12),organizations=[];
const files=['services/accounting/posting.service.ts','prisma/schema.prisma'];
const sources=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,p))).digest('hex')]));
const report={at:new Date().toISOString(),mode,run,checks:[],sourcesBefore:sources(),scope:'Owned PostgreSQL synthetic ledger batch identity. No journals or live postings.'};
const snapshot=where=>db.ledgerPostingBatch.findMany({where,orderBy:{id:'asc'}}).then(f.hash);
(async()=>{
 await f.local.withClient(f.target,f.local.assertOwned);report.originalBefore=await snapshot({organizationId:{notIn:organizations}});
 const x=await f.fixture('batch-identity-v96-'+mode+'-'+run,organizations),period=await db.accountingPeriod.findFirstOrThrow({where:{organizationId:x.organizationId},orderBy:{startDate:'asc'}});
 const base={organizationId:x.organizationId,periodId:period.id,sourceType:'PAYMENT_SUSPENSE',sourceId:'owned-source-'+run,postingPurpose:'SUSPENSE_RECLASSIFICATION',sourceVersion:1,idempotencyKey:'owned-key-'+run,metadata:{synthetic:true}};
 const first=await db.$transaction(tx=>createLedgerPostingBatch(base,tx));
 const before=await snapshot({organizationId:x.organizationId});
 const conflicting=[{...base,sourceId:'different-source'}, {...base,sourceType:'MANUAL'}, {...base,postingPurpose:'REVERSAL'}, {...base,sourceVersion:2,idempotencyKey:'owned-v2-'+run}];
 for(const request of conflicting){
  if(mode==='before'){assert.equal((await db.$transaction(tx=>createLedgerPostingBatch(request,tx))).id,first.id)}
  else{await assert.rejects(()=>db.$transaction(tx=>createLedgerPostingBatch(request,tx)),e=>e.code==='IDEMPOTENCY_CONFLICT')}
 }
 assert.equal(await snapshot({organizationId:x.organizationId}),before);
 report.checks.push(mode==='before'?'Reproduced four incompatible requests silently returning the same batch':'Four incompatible requests reject without ledger mutation');
 if(mode==='after'){
  assert.equal((await db.$transaction(tx=>createLedgerPostingBatch({...base,idempotencyKey:'fresh-retry-'+run},tx))).id,first.id);
  assert.equal((await db.$transaction(tx=>createLedgerPostingBatch({...base,sourceVersion:null},tx))).id,first.id);
  assert.equal(await snapshot({organizationId:x.organizationId}),before);report.checks.push('Canonical source dedupe and historical null/v1 retry preserve the original batch');
  const second=await db.$transaction(tx=>createLedgerPostingBatch({...base,sourceId:'second-source',idempotencyKey:'second-key-'+run},tx));
  await assert.rejects(()=>db.$transaction(tx=>createLedgerPostingBatch({...base,idempotencyKey:second.idempotencyKey},tx)),e=>e.code==='IDEMPOTENCY_CONFLICT');report.checks.push('Conflicting key is rejected even when a separate canonical source batch also exists');
  const other=await f.fixture('batch-other-v96-'+run,organizations);
  const foreign=await db.$transaction(tx=>createLedgerPostingBatch({...base,organizationId:other.organizationId,periodId:undefined},tx));assert.notEqual(foreign.id,first.id);assert.equal(foreign.organizationId,other.organizationId);report.checks.push('Same key/source tuple in another tenant creates its own scoped batch');
  const concurrent=await Promise.allSettled(Array.from({length:4},()=>db.$transaction(tx=>createLedgerPostingBatch({...base,sourceId:'concurrent',idempotencyKey:'concurrent-'+run},tx))));
  assert.ok(concurrent.some(x=>x.status==='fulfilled'));
  for(const r of concurrent)if(r.status==='rejected')assert.ok(['P2002','P2034'].includes(r.reason.code));
  assert.equal(await db.ledgerPostingBatch.count({where:{organizationId:x.organizationId,sourceId:'concurrent'}}),1);
  assert.equal((await db.$transaction(tx=>createLedgerPostingBatch({...base,sourceId:'concurrent',idempotencyKey:'concurrent-'+run},tx))).sourceId,'concurrent');report.checks.push('Concurrent creation has one durable batch; uniqueness/serialization losers safely replay on retry');
 }
 report.passed=true;report.defectReproduced=mode==='before';
})().catch(e=>{report.error=f.safe(e,[])}).finally(async()=>{
 report.originalUnchanged=report.originalBefore===await snapshot({organizationId:{notIn:organizations}});report.sourcesAfter=sources();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);await db.$disconnect();
 const file='posting-batch-identity-v96-'+mode+'-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file,checks:report.checks,passed:report.passed,error:report.error,sourceStable:report.sourceStable,originalUnchanged:report.originalUnchanged}));process.exitCode=report.passed&&report.sourceStable&&report.originalUnchanged?0:1;
});
