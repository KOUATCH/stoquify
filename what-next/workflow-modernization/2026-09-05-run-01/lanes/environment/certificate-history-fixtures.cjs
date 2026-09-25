const f=require('./certificate-export-fixtures.cjs'),{db,path,assert,crypto}=f;
const history=require(path.join(f.root,'services/reconciliation/reconciliation-certificate-history.service.ts'));
const reconciliation=require(path.join(f.root,'services/reconciliation/payment-reconciliation-run.service.ts'));
const {captureProviderEvent}=require(path.join(f.root,'services/payments/provider-event.service.ts')),{MobileMoneyHmacAdapter}=require(path.join(f.root,'services/payments/adapters/mobile-money-hmac.adapter.ts'));
async function historyFixture(name,organizations,{runs=21,exports=21}={}){
 const x=await f.fixture(name,organizations),ids=[];
 await db.organization.update({where:{id:x.organizationId},data:{requestedModules:['purchasing','finance','accounting','payment_reconciliation']}});
 for(let day=1;day<=runs;day++){
  const occurredAt=new Date(`2026-08-${String(day).padStart(2,'0')}T12:00:00Z`),reference=crypto.randomUUID(),adapter=new MobileMoneyHmacAdapter('OWNED-CERTIFICATE'),receivedAt=day===1?new Date('2026-09-08T12:00:00Z'):occurredAt;
  const historicalPayment=await db.paymentTransaction.create({data:{organizationId:x.organizationId,providerAccountId:x.provider.id,amount:'100.25',currencyCode:'XAF',direction:'INBOUND',state:'CONFIRMED',occurredAt,confirmedAt:occurredAt,providerTransactionId:reference,providerReference:reference,sourceType:'SYNTHETIC_WORKFLOW_VERIFICATION',metadata:{synthetic:true,noLivePaymentAuthority:true}}});
  const rawBody=JSON.stringify({eventId:'event-'+reference,transactionId:reference,reference,eventType:'PAYMENT_CONFIRMED',direction:'INBOUND',amount:'100.25',currency:'XAF',occurredAt:occurredAt.toISOString()}),secret=crypto.randomBytes(32).toString('hex'),timestamp=String(receivedAt.getTime()),signature=crypto.createHmac('sha256',secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({organizationId:x.organizationId,providerAccountId:x.provider.id,adapter,rawBody,headers:{'x-provider-timestamp':timestamp,'x-provider-signature':signature},secret,now:receivedAt,receivedAt});
  const result=await reconciliation.runPaymentReconciliation({organizationId:x.organizationId,providerAccountId:x.provider.id,businessDate:occurredAt,runById:x.actorId});assert.equal(result.status,'READY_FOR_SIGNOFF');assert.equal(result.matchCount,1);
  const now=new Date();await f.certification.signReconciliationRun({organizationId:x.organizationId,runId:result.runId,signedById:x.checkerId,control:{actorPermissions:f.permissions,now,lastAuthAt:now}});ids.push(result.runId);
  if(day===1){x.run=await db.reconciliationRun.findUniqueOrThrow({where:{id:result.runId}});x.payment=historicalPayment}
 }
 // Fixture-only creation times exercise ordering ties; certificate/source evidence remains untouched.
 await db.reconciliationRun.updateMany({where:{organizationId:x.organizationId,id:{in:ids}},data:{createdAt:new Date('2026-08-01T00:00:00Z')}});
 await db.reconciliationRun.update({where:{id:x.run.id},data:{createdAt:new Date('2026-07-01T00:00:00Z')}});
 x.exports=[];
 for(let i=0;i<exports;i++){const command={...f.context(x),expectedCertificateHash:x.run.certificateHash,idempotencyKey:crypto.randomUUID()};const result=await f.certification.exportReconciliationCertificate(command);x.exports.push({command,result})}
 if(x.exports.length){await db.paymentReconciliationInboxItem.updateMany({where:{organizationId:x.organizationId,id:{in:x.exports.map(e=>e.result.inboxItemId)}},data:{createdAt:new Date('2026-08-01T00:00:00Z')}});await db.paymentReconciliationInboxItem.update({where:{id:x.exports[0].result.inboxItemId},data:{createdAt:new Date('2026-07-01T00:00:00Z')}})}
 x.historyControl={organizationId:x.organizationId,actorId:x.actorId,actorPermissions:f.permissions};return x;
}
module.exports={...f,history,historyFixture};
