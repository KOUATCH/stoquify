/** Synthetic commerce continuation. Every external communication remains queued locally. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { signIn } from './disposable-business-workflows';
import { createCustomerStatementSnapshot } from '../services/accounting/customer-statement.service';
import { queueCustomerStatementDelivery } from '../services/accounting/customer-statement-delivery.service';
import { openCustomerStatementDeliveryEnvelope } from '../services/accounting/customer-statement-delivery-envelope';
import { getPublicCustomerStatement } from '../services/accounting/customer-statement-access.service';
import { submitCustomerStatementRecipientAction } from '../services/accounting/customer-statement-recipient-action.service';
import { recordReferralClick } from '../services/referrals/referral-attribution.service';
import { savePurchaseAuthoring, getPurchaseAuthoring, preparePurchaseAuthoring, createPurchaseOrderFromAuthoring } from '../services/purchase-order/purchase-order-authoring.service';
import { getPurchaseOrderLifecyclePreview, executePurchaseOrderLifecycle, getPurchaseOrderApprovalPreview, approvePurchaseOrder } from '../services/purchase-order/purchase-order.service';
import { getSupplierPoAcknowledgementWorkbench, issueSupplierPoInvite, getPublicSupplierPoEnvelope, submitSupplierPoProposal, reviewSupplierPoProposal } from '../services/purchase-order/supplier-po-acknowledgement.service';
import { issuePublicReceiptAccessToken, assertPublicReceiptAccessToken } from '../services/pos/public-receipt-token-registry.service';
import { enforcePublicIdentityAbuseLimits, hashPublicIdentityAbuseSubject } from '../services/security/public-identity-abuse.service';
import { seedRemainingCommerceOperations } from './disposable-remaining-commerce-operations';
import { seedRemainingPictures } from './disposable-remaining-pictures';
type Actor = Awaited<ReturnType<typeof signIn>>;
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const uuid = (value: string) => { const h = sha(value); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
function ensure(value: unknown, message: string): asserts value { if (!value) throw Error(message); }

export async function seedRemainingCommerce(org: string, actors: Record<string, Actor>, out: string) {
 const { OUT, assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
 const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
 ensure(process.env.NODE_ENV === 'test' && path.resolve(out) === path.resolve(OUT) && ['synth12_douala','synth12_yaounde','synth12_bafoussam'].includes(org), 'Owned synthetic context required');
 assertManifestTarget(new URL(process.env.DATABASE_URL!), manifest);
 ensure((await db.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`)[0].name === manifest.target.database, 'Wrong database');
 const capturedAt = new Date(JSON.parse(readFileSync(path.join(out, 'remaining-table-baseline.json'), 'utf8')).capturedAt);
 const report: {scenarios: any[]; issues: any[]; blockedTables: any[]} = {scenarios: [], issues: [], blockedTables: []};
 const run = async (name: string, action: () => Promise<unknown>) => { console.log('Commerce scenario', org, name); try { report.scenarios.push({name,result:await action()}); } catch(error) { report.issues.push({scenario:name,message:error instanceof Error?error.message:String(error)}); } };
 const scope = (role: string) => ({organizationId:org,actorId:actors[role].actorId,sessionId:actors[role].sessionId,sessionToken:actors[role].sessionToken});
 const document = (name: string, data: unknown) => { const file=path.join(out,'synthetic-documents',name+'.json'); const bytes=JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',externalTransferPerformed:false,data},null,2)+'\n'; if(existsSync(file))ensure(readFileSync(file,'utf8')===bytes,'Retained synthetic document differs');else writeFileSync(file,bytes);return {sha256:sha(bytes),uri:`http://127.0.0.1:3188/${name}.json`}; };
 for(const key of ['STATEMENT_TOKEN_SECRET','STATEMENT_DELIVERY_ENCRYPTION_KEY','SUPPLIER_PO_TOKEN_SECRET','RECEIPT_TOKEN_SECRET'])process.env[key]=sha(process.env.AUTH_SECRET+':synthetic:'+key);

 await run('customer-statement-consent-response-referral',async()=>{
  const fixtureClock=(Date as any).clock,previousTime=Date.now();fixtureClock.setSystemTime(capturedAt);
  try {
  const customerId=org+'_customer_10',key=org+':remaining:statement';
  const statement=await createCustomerStatementSnapshot({organizationId:org,customerId,periodStart:'2026-10-01T00:00:00Z',periodEnd:'2026-10-28T20:00:00Z',currency:'XAF',generatedById:actors.owner.actorId,idempotencyKey:key,correlationId:key,now:capturedAt});
  ensure(statement.closingBalance==='10800.00'&&statement.itemCount===1,'Delivery receivable missing from statement');
  const proof=document(org+'-statement-consent',{customerId,statementId:statement.statementId,consent:'Synthetic recipient requests this local test statement',destination:`statements-${org}@example.invalid`});
  const delivery=await queueCustomerStatementDelivery({organizationId:org,statementSnapshotId:statement.statementId,issuedById:actors.owner.actorId,channel:'EMAIL',destination:`statements-${org}@example.invalid`,consentBasis:'RECIPIENT_REQUESTED',consentEvidenceHash:'sha256:'+proof.sha256,consentCapturedAt:'2026-10-28T19:00:00Z',allowDispute:true,allowPromiseToPay:true,locale:'FR',idempotencyKey:key+':delivery',correlationId:key+':delivery',now:capturedAt});
  const outbox=await db.businessEventOutbox.findUniqueOrThrow({where:{id:delivery.outboxId}});
  const envelope=openCustomerStatementDeliveryEnvelope((outbox.payload as any).sealedEnvelope);
  ensure(envelope,'Retained statement envelope cannot be decrypted');
  const token=new URL(envelope.accessUrl,'http://localhost:3187').searchParams.get('token');ensure(token,'Missing statement access token');
  if(await db.customerStatementAccessLog.count({where:{organizationId:org,statementSnapshotId:statement.statementId}})===0){
   const view=await getPublicCustomerStatement({statementSnapshotId:statement.statementId,token,now:capturedAt,ipAddress:'127.0.0.1',userAgent:'Synthetic dataset verifier'});ensure(view.statementId===statement.statementId&&view.controls.redacted,'Statement public read did not preserve boundary');
  }
  const receivable=await db.customerReceivableDocument.findFirstOrThrow({where:{organizationId:org,customerId}});
  const response=await submitCustomerStatementRecipientAction({statementSnapshotId:statement.statementId,token,actionType:'PROMISE_TO_PAY',customerReceivableDocumentId:receivable.id,requestedAmount:'10800.00',promisedFor:'2026-11-05',note:'Synthetic recipient plans to settle the delivery invoice on the agreed date',idempotencyKey:key+':promise',correlationId:key+':promise',now:capturedAt,ipAddress:'127.0.0.1',userAgent:'Synthetic dataset verifier'});
  await recordReferralClick({referralCode:delivery.referralCode,ipAddress:'127.0.0.1',userAgent:org+':synthetic-referral',now:capturedAt});
  const state=await db.customerStatementDeliveryState.findFirstOrThrow({where:{organizationId:org,deliveryId:delivery.deliveryId},orderBy:{version:'desc'}});
  ensure(state.status==='QUEUED'&&response.status==='OPEN','Unexpected statement delivery/response state');
  return {statementId:statement.statementId,deliveryId:delivery.deliveryId,responseId:response.actionId,closingBalance:statement.closingBalance,status:state.status,externalDeliveryPerformed:false,referralAttributionId:delivery.attributionId};
  } finally { fixtureClock.setSystemTime(previousTime); }
 });

 await run('purchase-authoring-and-supplier-proposal',async()=>{
  process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED='true';
  const key=org+':remaining:supplier-portal',id=uuid(key),owner=actors.owner;
  const author={orgId:org,userId:owner.actorId,permissions:owner.actorPermissions,sessionId:owner.sessionId,sessionToken:owner.sessionToken};
  let saved=await db.purchaseOrderAuthoringDraft.findUnique({where:{id}});
  let view=saved?await getPurchaseAuthoring(author,{id}):await savePurchaseAuthoring(author,{id,expectedRevision:0,title:'Synthetic supplier quantity discussion',content:{supplierId:org+'_supplier_4',locationId:org+'_loc_0',date:'2026-10-28',expectedDeliveryDate:'2026-11-02',paymentTerms:'Net 30 days',notes:key,shippingCost:'0',orderLines:[{itemId:org+'_item_4',quantity:'10',unitPrice:'2200',taxRate:'0',discount:'0',notes:'Synthetic office paper replenishment'}]}});
  if(view.status==='ACTIVE')view=await preparePurchaseAuthoring(author,{id,expectedRevision:view.revision});
  if(view.status==='PREPARED')view=await createPurchaseOrderFromAuthoring(author,{id,expectedRevision:view.revision});
  ensure(view.receipt&&view.status==='CREATED','Purchase authoring did not produce its retained order');
  let order=await db.purchaseOrder.findUniqueOrThrow({where:{id:view.receipt.orderId},include:{lines:true}});
  if(order.status==='DRAFT'){const preview=await getPurchaseOrderLifecyclePreview(order.id,scope('owner'),'submit');await executePurchaseOrderLifecycle(order.id,scope('owner'),{kind:'submit',expectedRevision:preview.revision,idempotencyKey:key+':submit'});order=await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id},include:{lines:true}});}
  if(order.status==='SUBMITTED'){const preview=await getPurchaseOrderApprovalPreview(order.id,scope('checker'));await approvePurchaseOrder(order.id,org,actors.checker.actorId,{...scope('checker'),expectedRevision:preview.revision,idempotencyKey:key+':approve'});}
  const workbench=await getSupplierPoAcknowledgementWorkbench({purchaseOrderId:order.id,organizationId:org,actorId:owner.actorId});
  const invite=await issueSupplierPoInvite({organizationId:org,issuedById:owner.actorId,sessionId:owner.sessionId,purchaseOrderId:order.id,expectedOrderHash:workbench.purchaseOrder.currentOrderHash,recipientReference:'Synthetic supplier contact; no email sent',idempotencyKey:key+':invite',correlationId:key+':invite'});
  if(await db.supplierPoAccessLog.count({where:{organizationId:org,envelopeId:invite.envelopeId}})===0)await getPublicSupplierPoEnvelope({envelopeId:invite.envelopeId,token:invite.token,ipAddress:'127.0.0.1',userAgent:'Synthetic supplier verifier'});
  const proposal=await submitSupplierPoProposal({envelopeId:invite.envelopeId,token:invite.token,proposalType:'REQUEST_CHANGE',quantityChanges:[{purchaseOrderLineId:order.lines[0].id,requestedQuantity:12}],requestedDeliveryDate:'2026-11-03',note:'Synthetic supplier requests a full carton quantity',idempotencyKey:key+':proposal',correlationId:key+':proposal'});
  if(proposal.status==='SUBMITTED')await reviewSupplierPoProposal({organizationId:org,reviewedById:actors.checker.actorId,sessionId:actors.checker.sessionId,purchaseOrderId:order.id,proposalId:proposal.proposalId,expectedOrderHash:workbench.purchaseOrder.currentOrderHash,expectedStateHash:proposal.stateHash,decision:'REJECT',reason:'Keep the originally approved quantity for this synthetic scenario',idempotencyKey:key+':review',correlationId:key+':review'});
  const final=await getSupplierPoAcknowledgementWorkbench({purchaseOrderId:order.id,organizationId:org,actorId:owner.actorId,envelopeId:invite.envelopeId});
  ensure(final.envelopes[0].proposals[0].status==='BUYER_REJECTED','Supplier proposal review missing');
  return {draftId:id,orderId:order.id,envelopeId:invite.envelopeId,proposalId:proposal.proposalId,status:'BUYER_REJECTED',externalDeliveryPerformed:false};
 });

 await run('receipt-access-and-public-abuse-boundary',async()=>{
  const sale=await db.salesOrder.findFirstOrThrow({where:{organizationId:org,channel:'POS',status:'COMPLETED'},orderBy:{id:'asc'}});
  let registry=await db.publicReceiptAccessToken.findFirst({where:{organizationId:org,salesOrderId:sale.id,metadata:{path:['syntheticMarker'],equals:org+':remaining:receipt'}}});
  if(!registry){const issued=await issuePublicReceiptAccessToken({organizationId:org,salesOrderId:sale.id,issuedById:actors.owner.actorId,metadata:{syntheticMarker:org+':remaining:receipt',classification:'SYNTHETIC_TEST_ONLY'}});await assertPublicReceiptAccessToken({salesOrderId:sale.id,token:issued.token});registry=await db.publicReceiptAccessToken.findUniqueOrThrow({where:{id:issued.tokenId}});}
  const subject=org+'-synthetic-registration@example.invalid',scopeName='registration:subject',subjectHash=hashPublicIdentityAbuseSubject(scopeName,subject);
  let bucket=await db.publicIdentityAbuseBucket.findUnique({where:{scope_subjectHash:{scope:scopeName,subjectHash}}});
  if(!bucket?.blockedUntil){for(let i=bucket?.requestCount||0;i<4;i++)await enforcePublicIdentityAbuseLimits({operation:'registration',subject});bucket=await db.publicIdentityAbuseBucket.findUniqueOrThrow({where:{scope_subjectHash:{scope:scopeName,subjectHash}}});}
  const denial=await enforcePublicIdentityAbuseLimits({operation:'registration',subject});ensure(!denial.allowed&&bucket!.requestCount===4,'Synthetic identity abuse limit did not deny');
  return {receiptTokenId:registry.id,abuseBucketId:bucket!.id,requestCount:bucket!.requestCount,denied:true};
 });
 const operations=await seedRemainingCommerceOperations(org,actors,out);
 report.scenarios.push(...operations.scenarios);report.issues.push(...operations.issues);
 await run('local-encrypted-picture-lifecycle',()=>seedRemainingPictures(org,actors,out));
 return report;
}
