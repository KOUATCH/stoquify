const f=require('./fixtures.cjs'),{db,fs,path,assert}=f,trust=require(path.join(f.root,'services/accounting/data-trust.service.ts'));
const report={startedAt:new Date().toISOString(),synthetic:true,liveProvider:false,checks:[]};
async function check(name,fn){await fn();report.checks.push({name,status:'PASS'});console.log('PASS '+name)}
(async()=>{
 const x=await f.fixture(),[a,b]=x.clients;report.fixtureOrganizations=[x.firm.id,a.client.id,b.client.id];
 const exportFor=async c=>{const access=await f.access.resolveAccountantClientAccess({...x.context,accountantUserId:x.actor.id,clientOrganizationId:c.client.id,capability:'EXPORT'});return trust.exportAccountantTrustPack({organizationId:access.organizationId,periodId:c.period.id,exportedById:x.actor.id,actorPermissions:f.permissions,lastAuthAt:new Date(),includeLedgerRows:true})};
 await check('empty ledger cannot be exported as certified evidence',()=>assert.rejects(()=>exportFor(a)));
 const postedA=await f.ledger(x,a,'100.25'),postedB=await f.ledger(x,b,'230.50');
 let first;
 await check('two real PostgreSQL trust exports retain correct client and ledger source',async()=>{
  for(const [c,posted,foreign] of [[a,postedA,postedB],[b,postedB,postedA]]){
   const pack=await exportFor(c),payload=JSON.parse(pack.content);assert.equal(payload.scope.organizationId,c.client.id);assert.equal(payload.scope.periodId,c.period.id);assert.ok(pack.content.includes(posted.id));assert.ok(!pack.content.includes(foreign.id));assert.equal(pack.verdict,'CERTIFIED');
   assert.equal(await db.ledgerAuditEvent.count({where:{organizationId:c.client.id,action:'ACCOUNTANT_TRUST_PACK_EXPORT',resourceId:pack.exportId}}),1);
   if(c===a)first=pack;
  }
 });
 // Seed only the pre-existing certified-snapshot condition. Certification creation
 // and pilot/expert approval are deliberately not claimed by this test.
 const pack=await db.closePackExport.create({data:{organizationId:a.client.id,periodId:a.period.id,closeRunId:a.closeRun.id,watermarkId:'SYNTHETIC-NOT-A-CERTIFICATION',contentHash:f.hash({synthetic:true}),isCertified:true,metadata:{synthetic:true,initialConditionOnly:true}}});
 await db.closeRun.update({where:{id:a.closeRun.id},data:{status:'CERTIFIED'}});
 let changed;
 await check('actual journal posting invalidates seeded snapshot and creates durable proof',async()=>{
  changed=await f.ledger(x,a,'42.75');
  const stored=await db.closePackExport.findUniqueOrThrow({where:{id:pack.id}});assert.equal(stored.metadata.staleState.status,'EVIDENCE_STALE');assert.equal(stored.metadata.staleState.sourceId,changed.id);
  const event=await db.businessEvent.findUniqueOrThrow({where:{id:stored.metadata.staleState.businessEventId}});assert.equal(event.organizationId,a.client.id);assert.equal(event.eventType,'close.certification.invalidated');
  assert.equal(await db.businessEventOutbox.count({where:{organizationId:a.client.id,businessEventId:event.id,eventName:event.eventType}}),1);
  const other=await db.closeRun.findUniqueOrThrow({where:{id:b.closeRun.id}});assert.ok(!other.metadata?.staleState);
  report.invalidation={closePackExportId:pack.id,businessEventId:event.id,sourceJournalId:changed.id,initialCondition:'SEEDED_CERTIFIED_SNAPSHOT_ONLY'};
 });
 await check('new accountant export reflects changed source and preserves old immutable download',async()=>{
  const next=await exportFor(a);assert.notEqual(first.contentHash,next.contentHash);assert.ok(next.content.includes(changed.id));assert.ok(!first.content.includes(changed.id));report.exports={before:first.contentHash,after:next.contentHash};
 });
 report.status='PASS';
})().catch(e=>{report.status='FAIL';report.error=f.safe(e);console.error(report.error);process.exitCode=1}).finally(async()=>{await db.$disconnect();report.completedAt=new Date().toISOString();report.sources=f.sources();fs.writeFileSync(path.join(__dirname,'proof-export.json'),JSON.stringify(report,null,2))});
