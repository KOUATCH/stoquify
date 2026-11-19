import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { auth } from '../lib/auth';
import { stepUpSessionWithPassword } from '../services/security/step-up-auth.service';
import { createManualJournalEntry } from '../services/accounting/journals.service';
import { postJournalEntry } from '../services/accounting/posting.service';
import { createPurchaseOrder, getPurchaseOrderLifecyclePreview, executePurchaseOrderLifecycle, getPurchaseOrderApprovalPreview, approvePurchaseOrder } from '../services/purchase-order/purchase-order.service';
import { previewPurchaseReceiving, confirmPurchaseReceiving } from '../services/purchase-order/purchase-receiving-workbench.service';
import { previewInvoicePreparation, confirmInvoicePreparation } from '../services/purchasing/invoice-preparation.service';
import { previewInvoiceApproval, confirmInvoiceApproval } from '../services/purchasing/invoice-approval.service';
import { createPayrollPeriod, calculatePayrollRun } from '../services/payroll/payroll-control.service';
import { preparePeople, attendanceForPeriod } from './disposable-people-workflows';
import { seedPOSSales } from './disposable-pos-workflows';
import { seedSupplierPayments } from './disposable-payment-workflows';

type Credential = {organizationId:string;userId:string;role:string;email:string;password:string};
type Actor = {organizationId:string;actorId:string;sessionId:string;sessionToken:string;actorPermissions:string[];lastAuthAt:Date};
export async function signIn(credential:Credential):Promise<Actor> {
  const response = await auth.api.signInEmail({body:{email:credential.email,password:credential.password},headers:new Headers({'Origin':'http://localhost:3187'})});
  if(!response.token)throw new Error('No authenticated session returned');
  const session=await db.session.findUniqueOrThrow({where:{token:response.token}});
  const verified=await stepUpSessionWithPassword({sessionId:session.id,sessionToken:session.token,userId:credential.userId,organizationId:credential.organizationId,password:credential.password});
  if(verified.status!=='verified')throw new Error('Password assurance failed: '+verified.status);
  const user=await db.user.findUniqueOrThrow({where:{id:credential.userId},include:{roles:true}});
  return {organizationId:credential.organizationId,actorId:credential.userId,sessionId:session.id,sessionToken:session.token,actorPermissions:[...new Set(user.roles.flatMap(r=>r.permissions))],lastAuthAt:verified.verifiedAt};
}
const date=(m:number,day=10)=>new Date(Date.UTC(2025,10+m,day,10));
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export async function runBusinessWorkflows(org:string,credentials:Credential[],out:string,privateDir:string) {
  const actors:Record<string,Actor>={};
  // Authenticate through Better Auth and password step-up, never fabricate sessions.
  for(const role of ['owner','maker','checker','accountant','payroll_administrator','payroll_approver','cashier'])actors[role]=await signIn(credentials.find(c=>c.role===role)!);
  const scopes = Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{organizationId:a.organizationId,actorId:a.actorId,sessionId:a.sessionId,sessionToken:a.sessionToken}]));
  const findings:unknown[]=[],completed:unknown[]=[];
  const progress=()=>writeFileSync(path.join(out,`${org}-workflows.json`),JSON.stringify({completed,findings},null,2)+'\n');
  const account=async(mappingKey:string)=>(await db.chartOfAccount.findFirstOrThrow({where:{organizationId:org,mappingKey}})).id;
  const journal=await db.journal.findFirstOrThrow({where:{organizationId:org,code:'GEN'}});
  const cash=await account('CASH_ON_HAND'),capital=await account('OWNER_CAPITAL'),rent=await account('RENT'),utilities=await account('UTILITIES');
  const documents=path.join(out,'synthetic-documents');mkdirSync(documents,{recursive:true});
  async function manual(reference:string,entryDate:Date,amount:number,debit:string,credit:string,memo:string,locationId?:string) {
    const evidence={classification:'SYNTHETIC_TEST_DOCUMENT',reference,effectiveDate:entryDate.toISOString(),amount,currency:'XAF',memo,externalPaymentClaimed:false};
    writeFileSync(path.join(documents,reference+'.json'),JSON.stringify(evidence));
    let entry=await db.journalEntry.findFirst({where:{organizationId:org,reference}});
    if(!entry)entry=await createManualJournalEntry(org,{journalId:journal.id,entryDate,reference,memo,lines:[{accountId:debit,debit:amount,credit:0,currency:'XAF',locationId,metadata:{syntheticDocumentHash:hash(evidence)}},{accountId:credit,debit:0,credit:amount,currency:'XAF',locationId}]},actors.maker.actorId);
    if(entry.status==='DRAFT')await postJournalEntry(org,entry.id,actors.accountant.actorId,{actorPermissions:actors.accountant.actorPermissions,lastAuthAt:actors.accountant.lastAuthAt});
    const persisted=await db.journalEntry.findUniqueOrThrow({where:{id:entry.id}});
    if(persisted.status!=='POSTED')throw new Error('Journal was not posted through service');
    completed.push({scenario:'manual-journal',reference,id:entry.id,effectiveDate:entryDate.toISOString(),amount});progress();
  }
  await manual(`${org}-capital`,date(0,1),30000000,cash,capital,'Synthetic initial owner contribution');
  for(let m=0;m<12;m++)for(let branch=0;branch<3;branch++) {
    const loc=`${org}_loc_${branch}`,month=date(m).toISOString().slice(0,7);
    await manual(`${org}-${month}-rent-${branch}`,date(m,5),125000+25000*branch,rent,cash,`Synthetic ${month} rent`,loc);
    await manual(`${org}-${month}-utilities-${branch}`,date(m,18),18000+((m*13+branch*7)%19)*1000,utilities,cash,`Synthetic ${month} utilities`,loc);
  }
  // Receiving records the real execution time. Do not forge historical finalization.
  const today=new Date().toISOString().slice(0,10);
  for(let branch=0;branch<3;branch++) {
    const marker=`${org}:initial-procurement:${branch}`;
    let order=await db.purchaseOrder.findFirst({where:{organizationId:org,notes:marker},include:{lines:true}});
    if(!order){const items=await db.item.findMany({where:{organizationId:org},orderBy:{sku:'asc'}});
      const created=await createPurchaseOrder({organizationId:org,createdById:scopes.owner.actorId,supplierId:`${org}_supplier_${branch}`,locationId:`${org}_loc_${branch}`,date:today,expectedDeliveryDate:today,paymentTerms:'30 days',notes:marker,shippingCost:0,orderLines:items.map((item,i)=>({itemId:item.id,quantity:40+branch*10+i*3,unitPrice:Number(item.costPrice),taxRate:0,discount:0}))});
      order=await db.purchaseOrder.findUniqueOrThrow({where:{id:created.id},include:{lines:true}});
    }
    if(order.status==='DRAFT'){const p=await getPurchaseOrderLifecyclePreview(order.id,scopes.owner,'submit');await executePurchaseOrderLifecycle(order.id,scopes.owner,{kind:'submit',expectedRevision:p.revision,idempotencyKey:marker+':submit'});}
    order=await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id},include:{lines:true}});
    if(order.status==='SUBMITTED'){const p=await getPurchaseOrderApprovalPreview(order.id,scopes.checker);await approvePurchaseOrder(order.id,org,scopes.checker.actorId,{...scopes.checker,expectedRevision:p.revision,idempotencyKey:marker+':approve'});}
    let receipt=await db.goodsReceipt.findFirst({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true}});
    if(!receipt){const draft={kind:'receive' as const,orderId:order.id,inspectionOutcome:'PASSED' as const,items:order.lines.map(l=>({lineId:l.id,receivedQuantity:Number(l.orderedQuantity)}))};const p=await previewPurchaseReceiving(draft,scopes.owner);await confirmPurchaseReceiving({draft,expectedRevision:p.revision,idempotencyKey:marker+':receive'},scopes.owner);receipt=await db.goodsReceipt.findFirstOrThrow({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true}});}
    completed.push({scenario:'purchase-receipt',orderId:order.id,receiptId:receipt.id,branch,recordedAt:receipt.receiptDate,historyLimitation:'Receiving service uses execution date; this scenario is current activity.'});progress();
    const invoiceNumber=`SYN-${org}-${branch}-202610`;
    let invoice=await db.supplierInvoice.findFirst({where:{organizationId:org,invoiceNumber}});
    if(!invoice){const proof={invoiceNumber,receiptId:receipt.id,classification:'SYNTHETIC',lines:receipt.lines.map(l=>({id:l.id,quantity:String(l.receivedQuantity),unitCost:String(l.unitCost)}))};const proofFile=path.join(documents,invoiceNumber+'.json');writeFileSync(proofFile,JSON.stringify(proof));
      const draft={supplierId:`${org}_supplier_${branch}`,invoiceNumber,invoiceDate:today,currency:'XAF',documentReference:`http://127.0.0.1:3188/${invoiceNumber}.json`,documentSha256:hash(proof),lines:receipt.lines.map(l=>({goodsReceiptLineId:l.id,description:'Synthetic goods received',quantity:String(l.receivedQuantity),unitCost:String(l.unitCost),taxRate:'0'}))};const p=await previewInvoicePreparation(draft,scopes.owner);const result=await confirmInvoicePreparation({draft,expectedRevision:p.revision,idempotencyKey:marker+':invoice'},scopes.owner);invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:result.invoiceId}});
    }
    if(!['POSTED','PAYMENT_PENDING','PAID'].includes(invoice.status)){const p=await previewInvoiceApproval({invoiceId:invoice.id},scopes.checker);if(p.blockers.length){findings.push({scenario:'invoice-posting',invoiceId:invoice.id,blockers:p.blockers});progress();}else{await confirmInvoiceApproval({invoiceId:invoice.id,expectedRevision:p.revision,idempotencyKey:marker+':invoice-approve'},scopes.checker);}}
    completed.push({scenario:'supplier-invoice',invoiceId:invoice.id});progress();
  }
  const pos=await seedPOSSales(org,actors.cashier);completed.push({scenario:'pos-sales',results:pos});progress();
  try { const payments=await seedSupplierPayments(org,actors,out);completed.push({scenario:'supplier-payments',results:payments}); }
  catch(error){findings.push({scenario:'supplier-payments',message:error instanceof Error?error.message:String(error)});}
  progress();
  const peopleActors=Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{organizationId:a.organizationId,actorId:a.actorId,actorPermissions:a.actorPermissions}]));
  await preparePeople(org,peopleActors,out);
  for(let m=0;m<12;m++) {
    const start=date(m,1);start.setUTCHours(0,0,0,0);const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));
    let period;
    try { period=await createPayrollPeriod({organizationId:org,name:start.toISOString().slice(0,7),frequency:'MONTHLY',periodStart:start,periodEnd:end,payDate:end,countryCode:'CM',actorId:actors.payroll_administrator.actorId,metadata:{classification:'SYNTHETIC'}}); }
    catch(error) { findings.push({scenario:'payroll-period-prerequisite',month:start.toISOString().slice(0,7),message:error instanceof Error?error.message:String(error)}); const attendance=await attendanceForPeriod(org,null,peopleActors,out,{name:start.toISOString().slice(0,7),periodStart:start,periodEnd:end}); completed.push({scenario:'attendance',month:start.toISOString().slice(0,7),...attendance});progress();continue; }
    completed.push({scenario:'payroll-period',id:period.payrollPeriod.id,month:start.toISOString().slice(0,7)});
    const attendance=await attendanceForPeriod(org,period.payrollPeriod.id,peopleActors,out);
    completed.push({scenario:'attendance',periodId:period.payrollPeriod.id,...attendance});
    if(m===10)try{await calculatePayrollRun({organizationId:org,payrollPeriodId:period.payrollPeriod.id,preparedById:actors.payroll_administrator.actorId,idempotencyKey:`${org}:payroll:2026-09`,runDate:date(m,28)});}catch(error){findings.push({scenario:'payroll-calculation-prerequisite',message:error instanceof Error?error.message:String(error)});}
    progress();
  }
  return {completed:completed.length,findings};
}
