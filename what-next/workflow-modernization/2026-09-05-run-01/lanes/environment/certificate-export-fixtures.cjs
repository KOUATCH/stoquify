const f=require('./invoice-approval-fixtures.cjs'),{db,path,crypto,assert}=f;
const certification=require(path.join(f.root,'services/reconciliation/payment-reconciliation-certification.service.ts')),reconciliation=require(path.join(f.root,'services/reconciliation/payment-reconciliation-run.service.ts'));
const {captureProviderEvent}=require(path.join(f.root,'services/payments/provider-event.service.ts')),{MobileMoneyHmacAdapter}=require(path.join(f.root,'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const permissions=['payments.reconciliation.read','payments.reconciliation.run','payments.reconciliation.sign','payments.reconciliation.certificate.export'];
async function fixture(name,organizations){
 const x=await f.fixture(name,organizations),now=new Date(),reference=crypto.randomUUID(),adapter=new MobileMoneyHmacAdapter('OWNED-CERTIFICATE');
 x.bank=await db.chartOfAccount.create({data:{organizationId:x.organizationId,code:'OWNED-CERT-BANK',nameEn:'Synthetic certificate bank mapping',type:'ASSET',normalBalance:'DEBIT'}});
 x.suspense=await db.chartOfAccount.create({data:{organizationId:x.organizationId,code:'OWNED-CERT-SUSPENSE',nameEn:'Synthetic certificate suspense mapping',type:'ASSET',normalBalance:'DEBIT'}});
 x.rail=await db.paymentRail.create({data:{organizationId:x.organizationId,type:'MOBILE_MONEY',code:'OWNED-CERTIFICATE',name:'Synthetic certificate rail'}});
 x.provider=await db.providerAccount.create({data:{organizationId:x.organizationId,paymentRailId:x.rail.id,providerCode:adapter.providerCode,displayName:'Owned certificate verification',externalAccountHash:f.hash(reference),status:'ACTIVE',currencyCode:'XAF',settlementLedgerAccountId:x.bank.id,suspenseLedgerAccountId:x.suspense.id}});
 await db.settlementAccount.create({data:{organizationId:x.organizationId,providerAccountId:x.provider.id,ledgerAccountId:x.bank.id,approvalStatus:'APPROVED',requestedById:x.actorId,approvedById:x.checkerId,approvedAt:now,effectiveFrom:new Date('2026-01-01'),metadata:{synthetic:true,noLiveAuthority:true}}});
 x.payment=await db.paymentTransaction.create({data:{organizationId:x.organizationId,providerAccountId:x.provider.id,amount:'100.25',currencyCode:'XAF',direction:'INBOUND',state:'CONFIRMED',occurredAt:now,confirmedAt:now,providerTransactionId:reference,providerReference:reference,sourceType:'SYNTHETIC_WORKFLOW_VERIFICATION',metadata:{synthetic:true,noLivePaymentAuthority:true}}});
 const rawBody=JSON.stringify({eventId:'event-'+reference,transactionId:reference,reference,eventType:'PAYMENT_CONFIRMED',direction:'INBOUND',amount:'100.25',currency:'XAF',occurredAt:now.toISOString()}),secret=crypto.randomBytes(32).toString('hex'),timestamp=String(now.getTime()),signature=crypto.createHmac('sha256',secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
 await captureProviderEvent({organizationId:x.organizationId,providerAccountId:x.provider.id,adapter,rawBody,headers:{'x-provider-timestamp':timestamp,'x-provider-signature':signature},secret,now,receivedAt:now});
 const run=await reconciliation.runPaymentReconciliation({organizationId:x.organizationId,providerAccountId:x.provider.id,businessDate:now,runById:x.actorId});assert.equal(run.status,'READY_FOR_SIGNOFF');assert.equal(run.matchCount,1);
 x.run=await db.reconciliationRun.findUniqueOrThrow({where:{id:run.runId}});
 const signedAt=new Date();x.signed=await certification.signReconciliationRun({organizationId:x.organizationId,runId:x.run.id,signedById:x.checkerId,control:{actorPermissions:permissions,lastAuthAt:signedAt,now:signedAt}});assert.equal(x.signed.status,'SIGNED');
 x.run=await db.reconciliationRun.findUniqueOrThrow({where:{id:x.run.id}});assert.ok(x.run.certificateHash&&x.run.certificatePayload);return x;
}
const context=x=>{const now=new Date();return{organizationId:x.organizationId,runId:x.run.id,exportedById:x.actorId,control:{actorPermissions:permissions,lastAuthAt:now,now}}};
module.exports={...f,fixture,context,certification,permissions};
