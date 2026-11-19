import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {db} from './db';
import {signIn} from './disposable-business-workflows';
import {createPurchaseOrder,getPurchaseOrderLifecyclePreview,executePurchaseOrderLifecycle,getPurchaseOrderApprovalPreview,approvePurchaseOrder} from '../services/purchase-order/purchase-order.service';
import {previewPurchaseReceiving,confirmPurchaseReceiving} from '../services/purchase-order/purchase-receiving-workbench.service';
import {previewInvoicePreparation,confirmInvoicePreparation} from '../services/purchasing/invoice-preparation.service';
import {previewInvoiceApproval,confirmInvoiceApproval} from '../services/purchasing/invoice-approval.service';
import {openPOSShift,closePOSShift,getActivePOSCart,addPOSCartLine,commitPOSSale} from '../services/pos/pos.service';
import {acquirePOSCheckout,preparePOSCheckout} from '../services/pos/checkout.service';
import {posCartRevision} from '../services/pos/cart-revision';
import {commitSaleSchema} from '../services/pos/pos.schemas';
const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
const RealDate=Date;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const uuid=(s:string)=>{const h=hash(s);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`};
const orgs=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const output=path.join(OUT,'history-results.json');
const progress:{generatedAt:string;classification:string;months:any[];issues:any[]}={generatedAt:new RealDate().toISOString(),classification:'SYNTHETIC_HISTORICAL_SIMULATION_DATE_ONLY_REAL_TIMERS',months:[],issues:[]};
const save=()=>writeFileSync(output,JSON.stringify(progress,null,2)+'\n');
async function main(){
 const manifest=JSON.parse(readFileSync(path.join(OUT,'manifest.json'),'utf8'));assertManifestTarget(new URL(process.env.DATABASE_URL!),manifest);
 if(process.env.NODE_ENV!=='test')throw Error('Historical simulation requires isolated test child process');
 if((await db.$queryRaw<Array<{n:string}>>`SELECT current_database() AS n`)[0].n!==manifest.target.database)throw Error('Wrong database');
 const credentials=JSON.parse(readFileSync('.seed-artifacts/disposable-dataset-2026-10-28/credentials.json','utf8'));
 const clock=require('@sinonjs/fake-timers').install({now:new RealDate('2025-11-10T10:00:00Z').getTime(),toFake:['Date']});
 try{
 for(let m=0;m<(process.argv.includes('--pilot')?1:12);m++)for(const org of process.argv.includes('--pilot')?orgs.slice(0,1):orgs){
  const date=new RealDate(Date.UTC(2025,10+m,10,10)),month=date.toISOString().slice(0,7);clock.setSystemTime(date.getTime());
  console.log(`Historical workflow ${org} ${month}`);
  try{
   const actors:Record<string,Awaited<ReturnType<typeof signIn>>>={};
   for(const role of ['owner','checker','cashier'])actors[role]=await signIn(credentials.find((c:any)=>c.organizationId===org&&c.role===role));
   const scope=(role:string)=>({organizationId:org,actorId:actors[role].actorId,sessionId:actors[role].sessionId,sessionToken:actors[role].sessionToken});
   const result:any={organizationId:org,month,simulatedAt:date.toISOString(),generatedAt:new RealDate().toISOString(),purchases:[],sales:[],shifts:[]};
   for(let branch=0;branch<3;branch++){
    const marker=`${org}-history-${month}-${branch}`,supplierId=`${org}_supplier_${(m+branch)%6}`,locationId=`${org}_loc_${branch}`;
    let order=await db.purchaseOrder.findFirst({where:{organizationId:org,notes:marker},include:{lines:true}});
    if(!order){const items=await db.item.findMany({where:{organizationId:org},orderBy:{sku:'asc'}});const created=await createPurchaseOrder({organizationId:org,createdById:actors.owner.actorId,supplierId,locationId,date:date.toISOString().slice(0,10),expectedDeliveryDate:date.toISOString().slice(0,10),shippingCost:0,notes:marker,paymentTerms:'30 days',orderLines:items.map((item,i)=>({itemId:item.id,quantity:12+((m*5+branch*3+i)%9),unitPrice:Number(item.costPrice),taxRate:0,discount:0}))});order=await db.purchaseOrder.findUniqueOrThrow({where:{id:created.id},include:{lines:true}});}
    if(order.status==='DRAFT'){const p=await getPurchaseOrderLifecyclePreview(order.id,scope('owner'),'submit');await executePurchaseOrderLifecycle(order.id,scope('owner'),{kind:'submit',expectedRevision:p.revision,idempotencyKey:marker+':submit'});}
    order=await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id},include:{lines:true}});
    if(order.status==='SUBMITTED'){const p=await getPurchaseOrderApprovalPreview(order.id,scope('checker'));await approvePurchaseOrder(order.id,org,actors.checker.actorId,{...scope('checker'),expectedRevision:p.revision,idempotencyKey:marker+':approve'});}
    let receipt=await db.goodsReceipt.findFirst({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true}});
    if(!receipt){const draft={kind:'receive' as const,orderId:order.id,inspectionOutcome:'PASSED' as const,inspectionEvidenceNotes:'Synthetic historical simulation; actual generation timestamp retained in history-results.json',items:order.lines.map(l=>({lineId:l.id,receivedQuantity:Number(l.orderedQuantity)}))};const p=await previewPurchaseReceiving(draft,scope('owner'));await confirmPurchaseReceiving({draft,expectedRevision:p.revision,idempotencyKey:marker+':receive'},scope('owner'));receipt=await db.goodsReceipt.findFirstOrThrow({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true}});}
    let invoice=await db.supplierInvoice.findFirst({where:{organizationId:org,invoiceNumber:marker}});
    if(!invoice){const bytes=JSON.stringify({classification:'SYNTHETIC_HISTORICAL_INVOICE',generatedAt:result.generatedAt,simulatedAt:date.toISOString(),receiptId:receipt.id,lines:receipt.lines.map(l=>({itemId:l.itemId,quantity:String(l.receivedQuantity),unitCost:String(l.unitCost)}))});writeFileSync(path.join(OUT,'synthetic-documents',marker+'.json'),bytes);const draft={supplierId,invoiceNumber:marker,invoiceDate:date.toISOString().slice(0,10),currency:'XAF',documentReference:`http://127.0.0.1:3188/${marker}.json`,documentSha256:hash(bytes),lines:receipt.lines.map(l=>({goodsReceiptLineId:l.id,description:'Synthetic historical merchandise',quantity:String(l.receivedQuantity),unitCost:String(l.unitCost),taxRate:'0'}))};const p=await previewInvoicePreparation(draft,scope('owner'));const r=await confirmInvoicePreparation({draft,expectedRevision:p.revision,idempotencyKey:marker+':invoice'},scope('owner'));invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:r.invoiceId}});}
    if(!['POSTED','PAYMENT_PENDING','PAID'].includes(invoice.status)){const p=await previewInvoiceApproval({invoiceId:invoice.id},scope('checker'));if(p.blockers.length){if(p.blockers.some(b=>b!=='COUNTRY_SETUP'))throw Error('Historical invoice blockers '+JSON.stringify(p.blockers));progress.issues.push({organizationId:org,month,invoiceId:invoice.id,scenario:'invoice-country-prerequisite',blockers:p.blockers});}else await confirmInvoiceApproval({invoiceId:invoice.id,expectedRevision:p.revision,idempotencyKey:marker+':invoice-approve'},scope('checker'));}
    result.purchases.push({orderId:order.id,receiptId:receipt.id,invoiceId:invoice.id});
   }
   for(let branch=0;branch<2;branch++){
    const terminalId=`${org}_hist_${month}_${branch}`,locationId=`${org}_loc_${branch}`;
    await db.pOSStation.upsert({where:{id:terminalId},update:{},create:{id:terminalId,organizationId:org,locationId,terminalNumber:`HIST-${month}-${branch}`,name:`Historical simulation ${month} store ${branch+1}`,hasCashDrawer:true}});
    let session=await db.pOSSession.findFirst({where:{organizationId:org,terminalId},orderBy:{startTime:'desc'}});
    if(!session){await openPOSShift({organizationId:org,userId:actors.cashier.actorId,locationId,terminalId,openingBalance:0,notes:'Synthetic historical trading'});session=await db.pOSSession.findFirstOrThrow({where:{organizationId:org,terminalId}});}
    const cartScope={organizationId:org,userId:actors.cashier.actorId,locationId,terminalId,sessionId:session.id,checkoutLeaseId:uuid(terminalId)};
    for(let n=0;n<6;n++){
     const clientCommitId=`${org}:history:${month}:${branch}:${n}`,prior=await db.pOSCommitResult.findUnique({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
     if(prior){if(prior.status!=='COMPLETED')throw Error('Historical sale recovery required');result.sales.push({id:prior.salesOrderId,reused:true});continue;}
     if(session.status!=='ACTIVE')throw Error('Closed historical shift lacks expected completed sales');
     await acquirePOSCheckout(cartScope);
     const existing=await getActivePOSCart(cartScope),saved=existing?await db.salesOrder.findUniqueOrThrow({where:{id:existing.id},include:{lines:true}}):null;
     const quantity=1+((m+n+branch)%3),expected=new Set(Array.from({length:3},(_,i)=>`${org}_item_${(n*2+i+m)%12}`));
     if(saved?.lines.some(l=>!expected.has(l.itemId)||Number(l.quantity)>quantity))throw Error('Historical cart differs from deterministic basket');
     for(const itemId of expected){const current=saved?.lines.filter(l=>l.itemId===itemId).reduce((sum,l)=>sum+Number(l.quantity),0)||0;if(current<quantity)await addPOSCartLine({...cartScope,itemId,quantity:quantity-current});}
     const cart=await getActivePOSCart(cartScope);if(!cart)throw Error('Missing historical cart');const sale=await db.salesOrder.findUniqueOrThrow({where:{id:cart.id},include:{lines:true}});
     if(sale.lines.length!==3||sale.lines.some(l=>Number(l.quantity)!==quantity||!expected.has(l.itemId)))throw Error('Incomplete historical basket');
     const draft={...cartScope,salesOrderId:sale.id,clientCommitId,expectedCartRevision:posCartRevision(sale),tenders:[{method:'CASH' as const,amount:Number(sale.total)}],receipt:{channel:'NONE' as const},notes:`Synthetic historical simulation ${month}`};
     const workspace=await db.pOSCheckoutWorkspace.findUniqueOrThrow({where:{sessionId:session.id}}),retained=workspace.pendingRequest as Record<string,unknown>|null;
     const request={...cartScope,...commitSaleSchema.parse(retained?.clientCommitId===clientCommitId?retained:draft)};
     if(request.salesOrderId!==sale.id||request.expectedCartRevision!==posCartRevision(sale))throw Error('Retained historical checkout differs from current basket');
     await preparePOSCheckout(request);await commitPOSSale(request,{sessionId:actors.cashier.sessionId,sessionToken:actors.cashier.sessionToken});await commitPOSSale(request,{sessionId:actors.cashier.sessionId,sessionToken:actors.cashier.sessionToken});result.sales.push({id:sale.id,total:String(sale.total)});
    }
    session=await db.pOSSession.findUniqueOrThrow({where:{id:session.id}});
    if(session.status==='ACTIVE')await closePOSShift({organizationId:org,userId:actors.cashier.actorId,sessionId:session.id,actualBalance:Number(session.expectedBalance),notes:'Synthetic counted cash equals recorded cash; no external cash claim'});
    result.shifts.push(session.id);
   }
   progress.months.push(result);save();
  }catch(error){progress.issues.push({organizationId:org,month,message:error instanceof Error?error.message:String(error)});save();throw error;}
 }
 }finally{clock.uninstall();save();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
