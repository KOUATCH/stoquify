/** Isolated synthetic receipt inspection, serial trace, AP variance and cash refund cases. */
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {db} from './db';
import type {signIn} from './disposable-business-workflows';
import {hasAnyRbacPermission} from '../lib/security/rbac-permissions';
import {createPurchaseOrder,getPurchaseOrderLifecyclePreview,executePurchaseOrderLifecycle,getPurchaseOrderApprovalPreview,approvePurchaseOrder} from '../services/purchase-order/purchase-order.service';
import {previewPurchaseReceiving,confirmPurchaseReceiving} from '../services/purchase-order/purchase-receiving-workbench.service';
import {previewInvoicePreparation,confirmInvoicePreparation} from '../services/purchasing/invoice-preparation.service';
import {previewInvoiceMatchException,confirmInvoiceMatchException} from '../services/purchasing/invoice-match-exception.service';
import {openPOSShift,closePOSShift,getActivePOSCart,addPOSCartLine,commitPOSSale,refundPOSSale} from '../services/pos/pos.service';
import {acquirePOSCheckout,preparePOSCheckout} from '../services/pos/checkout.service';
import {posCartRevision} from '../services/pos/cart-revision';
import {commitSaleSchema} from '../services/pos/pos.schemas';

type Actor=Awaited<ReturnType<typeof signIn>>;
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const uuid=(s:string)=>{const h=sha(s);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
function ensure(value:unknown,message:string):asserts value{if(!value)throw Error(message);}

export async function seedRemainingStockPos(org:string,actors:Record<string,Actor>,out:string){
 const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
 const manifest=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8'));
 ensure(process.env.NODE_ENV==='test'&&path.resolve(out)===path.resolve(OUT)&&['synth12_douala','synth12_yaounde','synth12_bafoussam'].includes(org)&&new Date().toISOString()==='2026-10-28T20:00:00.000Z','Owned fixed-clock test context required');
 ensure(manifest.status==='schema-verified'&&manifest.target.database==='stoquify_replay_dataset_20261028_01'&&manifest.schemaSha256===sha(readFileSync('prisma/schema.prisma')),'Owned schema-verified stock/POS manifest required');
 assertManifestTarget(new URL(process.env.DATABASE_URL!),manifest);
 ensure((await db.$queryRaw<Array<{n:string}>>`SELECT current_database() AS n`)[0].n===manifest.target.database,'Wrong stock/POS database');
 const report:{organizationId:string;scenarios:any[];issues:any[];blockedTables:string[]}={organizationId:org,scenarios:[],issues:[],blockedTables:[]};
 const save=()=>writeFileSync(path.join(out,`${org}-remaining-stock-pos.json`),JSON.stringify(report,null,2)+'\n');
 const run=async(scenario:string,fn:()=>Promise<unknown>)=>{console.log('Stock/POS scenario',org,scenario);try{report.scenarios.push({scenario,result:await fn()});}catch(error){report.issues.push({scenario,message:error instanceof Error?error.message:String(error)});}save();};
 const scope=(role:string)=>({organizationId:org,actorId:actors[role].actorId,sessionId:actors[role].sessionId,sessionToken:actors[role].sessionToken});
 const dir=path.join(out,'synthetic-documents');mkdirSync(dir,{recursive:true});
 const proof=(name:string,data:unknown)=>{const file=path.join(dir,`${org}-remaining-stock-${name}.json`),bytes=JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',externalPaymentOrSubmissionPerformed:false,data},null,2)+'\n';if(existsSync(file))ensure(readFileSync(file,'utf8')===bytes,'Retained stock evidence changed');else writeFileSync(file,bytes);return {sha256:sha(bytes),uri:`http://127.0.0.1:3188/${path.basename(file)}`};};

 await run('held-serialized-receipt-independent-acceptance-and-invoice-exception',async()=>{
  const key=`${org}:remaining:serial-receipt`,itemId=`${org}_remaining_serial_item`,locationId=`${org}_loc_2`,supplierId=`${org}_supplier_2`;
  const manager=actors.manager;ensure(manager&&manager.actorId!==actors.owner.actorId,'Independent receiver required');
  const receiverPermissions=(await db.role.findMany({where:{organizationId:org,users:{some:{id:manager.actorId}}},select:{permissions:true}})).flatMap(r=>r.permissions);ensure(hasAnyRbacPermission(receiverPermissions,['purchases.orders.receive']),'Manager requires current receiving authority');
  const master=proof('serialized-item-reference',{itemId,sku:'SYN-REMAINING-SERIAL',name:'Synthetic serialized barcode scanner',unitCost:'1000.00',sellingPrice:'1500.00',initialStock:0,authoring:'DIRECT_SYNTHETIC_MASTER_REFERENCE',managedImageUnavailable:true,noImageClaim:true});
  let item=await db.item.findUnique({where:{id:itemId}});
  if(!item){const unit=await db.item.findUniqueOrThrow({where:{id:`${org}_item_0`},select:{unitId:true}});item=await db.item.create({data:{id:itemId,organizationId:org,nameEn:'Synthetic serialized barcode scanner',nameFr:'Lecteur synthétique numéroté',descriptionEn:`Disposable reference master. Evidence SHA-256 ${master.sha256}. No managed-image asset is claimed.`,sku:'SYN-REMAINING-SERIAL',slug:'synthetic-remaining-serial-scanner',imageUrls:[],costPrice:1000,sellingPrice:1500,unitId:unit.unitId,trackInventory:true,trackSerialNumbers:true}});}
  ensure(item.organizationId===org&&item.trackInventory&&item.trackSerialNumbers&&item.costPrice.eq(1000),'Serialized reference master differs from fixture');
  let order=await db.purchaseOrder.findFirst({where:{organizationId:org,notes:key},include:{lines:true}});
  if(!order){const created=await createPurchaseOrder({organizationId:org,createdById:actors.owner.actorId,supplierId,locationId,date:'2026-10-28',expectedDeliveryDate:'2026-10-28',paymentTerms:'Net 30 days',notes:key,shippingCost:0,orderLines:[{itemId,quantity:2,unitPrice:1000,taxRate:0,discount:0}]});order=await db.purchaseOrder.findUniqueOrThrow({where:{id:created.id},include:{lines:true}});}
  ensure(order.lines.length===1&&order.lines[0].itemId===itemId&&order.lines[0].orderedQuantity.eq(2),'Retained serialized purchase differs from fixture');
  if(order.status==='DRAFT'){const p=await getPurchaseOrderLifecyclePreview(order.id,scope('owner'),'submit');await executePurchaseOrderLifecycle(order.id,scope('owner'),{kind:'submit',expectedRevision:p.revision,idempotencyKey:key+':submit'});}
  order=await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id},include:{lines:true}});
  if(order.status==='SUBMITTED'){const p=await getPurchaseOrderApprovalPreview(order.id,scope('checker'));await approvePurchaseOrder(order.id,org,actors.checker.actorId,{...scope('checker'),expectedRevision:p.revision,idempotencyKey:key+':approve'});}
  const serials=[`${org}-SYN-SCANNER-0001`,`${org}-SYN-SCANNER-0002`];
  let receipt=await db.goodsReceipt.findFirst({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true,inspection:true,inspectionResolution:true}});
  if(!receipt){const evidence=proof('inspection-hold',{orderId:order.id,itemId,serials,inspection:'INCOMPLETE',reason:'Synthetic packaging checklist awaits independent confirmation'});const draft={kind:'receive' as const,orderId:order.id,inspectionOutcome:'INCOMPLETE' as const,inspectionReason:'Synthetic packaging checklist awaits independent confirmation',inspectionEvidenceNotes:evidence.uri+' sha256:'+evidence.sha256,items:[{lineId:order.lines[0].id,receivedQuantity:2,serialNumbers:serials}]};const p=await previewPurchaseReceiving(draft,scope('manager'));const result=await confirmPurchaseReceiving({draft,expectedRevision:p.revision,idempotencyKey:key+':held'},scope('manager'));ensure(result.disposition==='HELD','Incomplete receipt did not remain held');receipt=await db.goodsReceipt.findFirstOrThrow({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true,inspection:true,inspectionResolution:true}});ensure(await db.serialNumber.count({where:{organizationId:org,itemId}})===0&&await db.inventoryTransaction.count({where:{organizationId:org,referenceId:receipt.id}})===0,'Held receipt posted serials or inventory prematurely');}
  if(receipt.status==='HELD'){const evidence=proof('inspection-acceptance',{receiptId:receipt.id,serials,inspectorId:manager.actorId,independentReviewerId:actors.owner.actorId,syntheticChecklistComplete:true});const draft={kind:'resolve' as const,orderId:order.id,goodsReceiptId:receipt.id,decision:'ACCEPT' as const,reason:`Independent review of synthetic checklist ${evidence.uri} sha256:${evidence.sha256}`};const p=await previewPurchaseReceiving(draft,scope('owner'));const accepted=await confirmPurchaseReceiving({draft,expectedRevision:p.revision,idempotencyKey:key+':accept'},scope('owner'));ensure(accepted.disposition==='RECEIVED'&&accepted.stockStatus==='recorded'&&accepted.accountingStatus==='posted','Accepted inspection lacks verified stock/ledger outcome');}
  receipt=await db.goodsReceipt.findUniqueOrThrow({where:{id:receipt.id},include:{lines:true,inspection:true,inspectionResolution:true}});
  const retainedSerials=await db.serialNumber.findMany({where:{organizationId:org,itemId},orderBy:{serialNumber:'asc'}}),inventory=await db.inventoryLevel.findUniqueOrThrow({where:{itemId_locationId:{itemId,locationId}}});
  ensure(receipt.status==='RECEIVED'&&receipt.inspection?.outcome==='INCOMPLETE'&&receipt.inspectionResolution?.decision==='ACCEPT'&&receipt.inspectionResolution.resolvedById!==receipt.inspection.inspectedById,'Independent held receipt history changed');
  ensure(retainedSerials.length===2&&retainedSerials.every(s=>serials.includes(s.serialNumber)&&s.status==='AVAILABLE'&&s.locationId===locationId)&&inventory.quantityOnHand.eq(2)&&inventory.totalValue.eq(2000),'Serialized receipt quantity/value/serial tie-out failed');
  const invoiceNumber=`${org}-remaining-variance`,document=proof('supplier-invoice-variance',{invoiceNumber,receiptId:receipt.id,quantity:2,receiptUnitCost:1000,invoicedUnitCost:1100,total:2200,currency:'XAF',taxRate:0,purpose:'Deliberate vendor price variance requiring independent rejection'});
  let invoice=await db.supplierInvoice.findFirst({where:{organizationId:org,invoiceNumber}});
  if(!invoice){const draft={supplierId,invoiceNumber,invoiceDate:'2026-10-28',currency:'XAF',documentReference:document.uri,documentSha256:document.sha256,lines:[{goodsReceiptLineId:receipt.lines[0].id,description:'Synthetic barcode scanners with disputed supplier surcharge',quantity:'2',unitCost:'1100',taxRate:'0'}]};const p=await previewInvoicePreparation(draft,scope('owner'));ensure(p.variance==='200.00','Invoice preview did not expose the intended 200 XAF variance');const result=await confirmInvoicePreparation({draft,expectedRevision:p.revision,idempotencyKey:key+':invoice'},scope('owner'));invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:result.invoiceId}});}
  ensure(invoice.status==='DISPUTED'&&invoice.total.eq(2200),'Price mismatch must remain disputed and unposted');
  let exception=await db.supplierInvoiceMatchException.findFirst({where:{organizationId:org,supplierInvoiceId:invoice.id}});
  if(!exception){const draft={kind:'request' as const,invoiceId:invoice.id,reason:'Synthetic vendor surcharge requires independent review',evidenceReference:document.uri+' sha256:'+document.sha256,expiresAt:'2026-11-30T20:00:00.000Z'};const p=await previewInvoiceMatchException(draft,scope('owner'));ensure(!p.blockers.length,'Invoice exception request blockers: '+p.blockers.join(','));await confirmInvoiceMatchException({draft,expectedRevision:p.revision,idempotencyKey:key+':variance-request'},scope('owner'));exception=await db.supplierInvoiceMatchException.findFirstOrThrow({where:{organizationId:org,supplierInvoiceId:invoice.id}});}
  if(exception.status==='OPEN'){const draft={kind:'review' as const,invoiceId:invoice.id,exceptionId:exception.id,decision:'REJECT' as const,decisionReason:'Independent synthetic review rejects the unapproved vendor surcharge; request corrected invoice'};const p=await previewInvoiceMatchException(draft,scope('checker'));ensure(!p.blockers.length,'Invoice exception review blockers: '+p.blockers.join(','));await confirmInvoiceMatchException({draft,expectedRevision:p.revision,idempotencyKey:key+':variance-reject'},scope('checker'));}
  exception=await db.supplierInvoiceMatchException.findUniqueOrThrow({where:{id:exception.id}});ensure(exception.status==='REJECTED'&&exception.rejectedById===actors.checker.actorId&&exception.requestedById!==exception.rejectedById&&exception.varianceAmount.eq(200),'Independent invoice exception review failed');
  return{itemId,masterReferenceEvidenceSha256:master.sha256,orderId:order.id,receiptId:receipt.id,resolutionId:receipt.inspectionResolution.id,serialIds:retainedSerials.map(s=>s.id),stockQuantity:'2',stockValue:'2000.00',invoiceId:invoice.id,exceptionId:exception.id,exceptionStatus:exception.status,invoicePosted:false};
 });

 await run('cash-pos-sale-refund-stock-cash-ledger-round-trip',async()=>{
  const actor=actors.owner,terminalId=`${org}_remaining_refund_till`,locationId=`${org}_loc_0`,itemId=`${org}_item_0`,clientCommitId=`${org}:remaining:refund-sale`,reason='Synthetic customer returns unopened goods; full cash refund';
  await db.pOSStation.upsert({where:{id:terminalId},update:{},create:{id:terminalId,organizationId:org,locationId,terminalNumber:'SYN-REFUND',name:'Synthetic refund scenario till',hasCashDrawer:true}});
  let session=await db.pOSSession.findFirst({where:{organizationId:org,terminalId},orderBy:{startTime:'desc'}});
  if(!session){await openPOSShift({organizationId:org,userId:actor.actorId,terminalId,locationId,openingBalance:0,notes:'Synthetic isolated cash sale/refund round trip'});session=await db.pOSSession.findFirstOrThrow({where:{organizationId:org,terminalId,status:'ACTIVE'}});}
  const cartScope={organizationId:org,userId:actor.actorId,terminalId,locationId,sessionId:session.id,checkoutLeaseId:uuid(terminalId)},authority={sessionId:actor.sessionId,sessionToken:actor.sessionToken};
  let commit=await db.pOSCommitResult.findUnique({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
  if(!commit){ensure(session.status==='ACTIVE','Incomplete refund fixture has closed shift');await acquirePOSCheckout(cartScope);const initial=await getActivePOSCart(cartScope),existing=initial?await db.salesOrder.findUniqueOrThrow({where:{id:initial.id},include:{lines:true}}):null;
   ensure(!existing||existing.lines.every(l=>l.itemId===itemId&&l.quantity.eq(1))&&existing.lines.length<=1,'Existing refund cart differs from fixture');if(!existing?.lines.length)await addPOSCartLine({...cartScope,itemId,quantity:1});
   const active=await getActivePOSCart(cartScope);ensure(active,'Refund sale cart missing');const sale=await db.salesOrder.findUniqueOrThrow({where:{id:active.id},include:{lines:true}});ensure(sale.lines.length===1&&sale.lines[0].quantity.eq(1)&&sale.lines[0].itemId===itemId,'Refund cart differs from fixture');
   const draft={...cartScope,salesOrderId:sale.id,clientCommitId,expectedCartRevision:posCartRevision(sale),tenders:[{method:'CASH' as const,amount:Number(sale.total)}],receipt:{channel:'NONE' as const},notes:'Synthetic isolated refundable sale'};
   const workspace=await db.pOSCheckoutWorkspace.findUniqueOrThrow({where:{sessionId:session.id}}),retained=workspace.pendingRequest as Record<string,unknown>|null,request={...cartScope,...commitSaleSchema.parse(retained?.clientCommitId===clientCommitId?retained:draft)};
   ensure(request.salesOrderId===sale.id&&request.expectedCartRevision===posCartRevision(sale),'Uncertain refund checkout differs from retained basket');await preparePOSCheckout(request);await commitPOSSale(request,authority);await commitPOSSale(request,authority);commit=await db.pOSCommitResult.findUniqueOrThrow({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
  }
  ensure(commit.status==='COMPLETED'&&commit.salesOrderId,'Refund fixture checkout has not completed');let sale=await db.salesOrder.findUniqueOrThrow({where:{id:commit.salesOrderId},include:{payments:{include:{refunds:true}}}});
  if(sale.status==='COMPLETED')await refundPOSSale({...cartScope,salesOrderId:sale.id,reason,notes:'Synthetic full cash return; no external provider transfer'},authority);
  sale=await db.salesOrder.findUniqueOrThrow({where:{id:sale.id},include:{payments:{include:{refunds:true}}}});const refunds=sale.payments.flatMap(p=>p.refunds),moves=await db.inventoryTransaction.findMany({where:{organizationId:org,itemId,referenceId:sale.id}});
  ensure(sale.status==='RETURNED'&&sale.paymentStatus==='REFUNDED'&&sale.payments.length===1&&refunds.length===1&&refunds[0].status==='PROCESSED'&&refunds[0].reason===reason&&refunds[0].amount.eq(sale.total),'Retained cash refund differs from exact scenario');
  ensure(moves.length===2&&moves.reduce((sum,m)=>sum+Number(m.quantity),0)===0&&moves.reduce((sum,m)=>sum+Math.sign(Number(m.quantity))*Number(m.totalCost),0)===0,'Cash refund inventory movements do not cancel');
  const posted=await db.ledgerPostingBatch.findMany({where:{organizationId:org,sourceType:'POS_REFUND',sourceId:refunds[0].id,status:'POSTED'}});ensure(posted.length===1,'Cash refund ledger proof missing');
  session=await db.pOSSession.findUniqueOrThrow({where:{id:session.id}});ensure(session.expectedBalance?.eq(0),'Isolated sale/refund did not restore expected cash');if(session.status==='ACTIVE')await closePOSShift({organizationId:org,userId:actor.actorId,sessionId:session.id,actualBalance:0,notes:'Synthetic counted cash restored to zero after full refund'});
  const document=proof('cash-refund',{saleId:sale.id,paymentId:sale.payments[0].id,refundId:refunds[0].id,total:String(sale.total),inventoryMovementIds:moves.map(m=>m.id).sort(),refundPostingBatchId:posted[0].id,externalSettlementPerformed:false});
  return{saleId:sale.id,refundId:refunds[0].id,total:String(sale.total),status:sale.status,postingBatchId:posted[0].id,sessionId:session.id,netInventoryQuantity:0,netCash:0,evidenceSha256:document.sha256};
 });
 save();return report;
}
