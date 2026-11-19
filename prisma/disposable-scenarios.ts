/** Additional synthetic workflow scenarios, restricted to the owned disposable database. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {db} from './db';
import {signIn} from './disposable-business-workflows';
import {createStockTransfer} from '../services/inventory/inventory-transfer.service';
import {transitionStockTransfer} from '../services/inventory/inventory-transfer-lifecycle.service';
import {createStockCountSession,submitStockCountSession,postStockCount} from '../services/inventory/inventory-count.service';
import {postPurchaseReturn,postSupplierCreditNote} from '../services/purchasing/purchase-return-credit.service';
import {previewPaymentReconciliation,proposePaymentReconciliation,readPaymentReconciliation,decidePaymentReconciliation} from '../services/purchasing/payment-reconciliation-service';
import {executeHrisLeaveEntitlements} from '../services/hris/leave-entitlement.service';
import {requestOperationalTime,decideOperationalTimeRequest} from '../services/hris/operational-time.service';
import {requestSalaryChange} from '../services/payroll/compensation.service';
import {loadCorrectableAttendance} from '../services/hris/attendance-correction';
import {openPOSShift,closePOSShift,getActivePOSCart,addPOSCartLine,commitPOSSale} from '../services/pos/pos.service';
import {acquirePOSCheckout,preparePOSCheckout} from '../services/pos/checkout.service';
import {posCartRevision} from '../services/pos/cart-revision';
import {collectCustomerSettlementWithControls} from '../services/accounting/customer-settlement.service';
import {createSetupUnit} from '../services/hris/workspace-setup.service';
import {seedDeliveryScenario} from './disposable-delivery-scenarios';
import {seedBankScenario} from './disposable-bank-scenarios';
import {seedHrisStructure} from './disposable-hr-structure';
const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
const orgs=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
let clock:{uninstall:()=>void}|undefined;
const report:{generatedAt:string;scenarios:any[];issues:any[]}={generatedAt:new Date().toISOString(),scenarios:[],issues:[]};
const save=()=>writeFileSync(path.join(OUT,'additional-scenarios.json'),JSON.stringify(report,null,2)+'\n');
function doc(name:string,data:unknown){const file=path.join(OUT,'synthetic-documents',name+'.json');if(!existsSync(file))writeFileSync(file,JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',externalTransferPerformed:false,data}));const bytes=readFileSync(file);return{uri:`http://127.0.0.1:3188/${name}.json`,sha:createHash('sha256').update(bytes).digest('hex')};}
async function main(){
 const manifest=JSON.parse(readFileSync(path.join(OUT,'manifest.json'),'utf8'));assertManifestTarget(new URL(process.env.DATABASE_URL!),manifest);
 if(process.env.NODE_ENV!=='test'||(await db.$queryRaw<Array<{n:string}>>`SELECT current_database() AS n`)[0].n!==manifest.target.database)throw Error('Owned isolated test target required');
 clock=require('@sinonjs/fake-timers').install({now:new Date('2026-10-28T20:00:00Z').getTime(),toFake:['Date']});
 process.env.HRIS_SETUP_PILOT_ORGANIZATIONS=orgs.join(',');
 const credentials=JSON.parse(readFileSync('.seed-artifacts/disposable-dataset-2026-10-28/credentials.json','utf8'));
 for(const org of orgs){
  const actors:Record<string,Awaited<ReturnType<typeof signIn>>>={};
  const permissions=['payments.reconciliation.read','payments.reconciliation.exception.resolve','payments.reconciliation.sign','accounting.journal.read'];
  const role=await db.role.findUniqueOrThrow({where:{id:`${org}_role_manager`}});await db.role.update({where:{id:role.id},data:{permissions:[...new Set([...role.permissions,...permissions])]}});
  for(const role of ['owner','checker','manager','payroll_administrator','cashier','accountant'])actors[role]=await signIn(credentials.find((c:any)=>c.organizationId===org&&c.role===role));
  const scope=(role:string)=>({organizationId:org,actorId:actors[role].actorId,sessionId:actors[role].sessionId,sessionToken:actors[role].sessionToken});
  const run=async(name:string,action:()=>Promise<unknown>)=>{console.log('Additional scenario',org,name);try{report.scenarios.push({organizationId:org,scenario:name,result:await action()});}catch(error){report.issues.push({organizationId:org,scenario:name,message:error instanceof Error?error.message:String(error)});}save();};
  await run('catalog-and-partner-master-data',async()=>{
   await db.taxRate.upsert({where:{id:`${org}_tax_fixture`},update:{},create:{id:`${org}_tax_fixture`,organizationId:org,type:'SALES',rate:0,nameEn:'Synthetic zero-tax scenario (not statutory guidance)',nameFr:'Scénario synthétique sans taxe (sans portée réglementaire)'}});
   for(const [i,names]of [['Groceries','Épicerie'],['Office supplies','Fournitures de bureau'],['Household goods','Articles ménagers']].entries()){
    await db.category.upsert({where:{id:`${org}_category_${i}`},update:{},create:{id:`${org}_category_${i}`,organizationId:org,slug:`synthetic-category-${i}`,titleEn:names[0],titleFr:names[1]}});
    await db.brand.upsert({where:{id:`${org}_brand_${i}`},update:{},create:{id:`${org}_brand_${i}`,organizationId:org,slug:`synthetic-brand-${i}`,nameEn:['Wouri Essentials (Synthetic)','Mfoundi Office (Synthetic)','Plateaux Home (Synthetic)'][i]}});
   }
   for(let i=0;i<12;i++){
    const category=i>=4&&i<=7?1:[2,8].includes(i)?2:0,itemId=`${org}_item_${i}`;
    const categoryId=`${org}_category_${category}`,brandId=`${org}_brand_${category}`;
    let item=await db.item.findUniqueOrThrow({where:{id:itemId}});
    if(item.organizationId!==org||(item.categoryId!==null&&item.categoryId!==categoryId)||(item.brandId!==null&&item.brandId!==brandId))throw Error('Retained synthetic catalogue classification differs from fixture');
    if(item.categoryId!==categoryId||item.brandId!==brandId)item=await db.item.update({where:{id:itemId},data:{categoryId,brandId}});
    for(let k=0;k<2;k++){const supplierId=`${org}_supplier_${(i+k)%6}`;await db.itemSupplier.upsert({where:{itemId_supplierId:{itemId,supplierId}},update:{},create:{itemId,supplierId,unitCost:item.costPrice,minOrderQuantity:12,leadTimeDays:2+k*3,isPreferred:k===0,supplierSku:`SYN-${i}`,notes:'Synthetic supplier catalogue'}});}
    for(let branch=0;branch<2;branch++){const customerId=`${org}_customer_${i}`,locationId=`${org}_loc_${branch}`;await db.customerLocation.upsert({where:{organizationId_customerId_locationId:{organizationId:org,customerId,locationId}},update:{},create:{organizationId:org,customerId,locationId,source:'MANUAL'}});}
   }
   return{categories:3,brands:3,supplierCatalogLinks:24,customerLocationLinks:24};
  });
  await run('organization-branch-units',async()=>{
   const units=[];for(const [code,name,type]of [['SYN-BRANCH-0','Central store team','BRANCH'],['SYN-BRANCH-1','Neighbourhood store team','BRANCH'],['SYN-BRANCH-2','Warehouse team','BRANCH'],['SYN-RETAIL','Retail','DEPARTMENT'],['SYN-OPERATIONS','Operations','DEPARTMENT']]as const){const existing=await db.hrisOrgUnit.findFirst({where:{organizationId:org,code}});if(existing&&(existing.name!==name||existing.type!==type||existing.status!=='ACTIVE'||existing.effectiveFrom.toISOString()!=='2025-11-01T00:00:00.000Z'||existing.effectiveTo?.toISOString()!=='2026-11-01T00:00:00.000Z'))throw Error('Retained HRIS unit differs from fixture');const unit=existing??await createSetupUnit(actors.owner,{code,name,type,effectiveFrom:'2025-11-01',effectiveTo:'2026-11-01'});units.push(unit.id);}return{unitIds:units};
  });
  await run('hris-structure-and-access-scopes',()=>seedHrisStructure(org,actors,OUT));
  await run('cash-payment-independent-evidence-review',async()=>{
   const payment=await db.supplierPayment.findFirstOrThrow({where:{organizationId:org,notes:`${org}-payment-2`,status:'RELEASED'}});
   let current=await readPaymentReconciliation(payment.id,scope('owner'));
   if(current.canPropose){const acknowledgedAt=new Date(new Date(current.executedAt).getTime()+60000).toISOString();const proof=doc(`${org}-cash-voucher-after-execution`,{paymentId:payment.id,amount:String(payment.amount),recipient:'Synthetic supplier representative',acknowledgedAt});const draft={paymentRequestId:payment.id,evidence:{kind:'CASH_VOUCHER' as const,voucherReference:`${org}-cash-voucher-after-execution`,evidenceUri:proof.uri,evidenceSha256:proof.sha,recipientName:'Synthetic supplier representative',acknowledgedAt,purpose:'Simulated cash receipt for disposable test evidence',acknowledgment:'RECIPIENT_ACKNOWLEDGED' as const}};const preview=await previewPaymentReconciliation(draft,scope('owner'));await proposePaymentReconciliation({draft,expectedRevision:preview.revision,idempotencyKey:`${org}:cash-recon:propose`},scope('owner'));}
   current=await readPaymentReconciliation(payment.id,scope('manager'));
   if(current.status==='PROPOSED'&&org!=='synth12_bafoussam')await decidePaymentReconciliation({paymentRequestId:payment.id,proposalId:current.proposalId!,decision:'APPROVE',reason:'Independent review of synthetic voucher; no external cash settlement is represented',expectedRevision:current.revision,idempotencyKey:`${org}:cash-recon:approve`},scope('manager'));
   const result=await readPaymentReconciliation(payment.id,scope('manager'));const expected=org==='synth12_bafoussam'?'PROPOSED':'CASH_REVIEWED';if(result.status!==expected||!result.evidenceCurrent)throw Error('Cash reconciliation differs from expected current evidence state: '+result.status);return{paymentId:payment.id,status:result.status,evidenceCurrent:result.evidenceCurrent,independentReviewer:actors.manager.actorId};
  });
  await run('leave-entitlements-and-time-requests',async()=>{
   const policy=await db.hrisLeavePolicy.findFirstOrThrow({where:{organizationId:org,code:'SYNTHETIC-12M',status:'ACTIVE'}}),employees=await db.payrollEmployee.findMany({where:{organizationId:org},orderBy:{employeeNumber:'asc'}});
   for(const employee of employees)await executeHrisLeaveEntitlements({...actors.payroll_administrator,employeeId:employee.id,leavePolicyId:policy.id,throughDate:new Date('2026-10-28T00:00:00Z')});
   const leaveEmployee=employees[0],correctionKey=`${org}:attendance-correction:leave`;
   const entry=await db.hrisTimeEntry.findFirstOrThrow({where:{organizationId:org,employeeId:leaveEmployee.id,workDate:{gte:new Date('2026-10-27T00:00:00Z'),lt:new Date('2026-10-28T00:00:00Z')}}});
   let correction=await db.hrisTimeRequest.findUnique({where:{organizationId_idempotencyKey:{organizationId:org,idempotencyKey:correctionKey}}});
   const observation=await loadCorrectableAttendance(db,{organizationId:org,employeeId:leaveEmployee.id},entry.id);
   const correctionProof=doc(`${org}-leave-attendance-correction`,{entryId:entry.id,originalWorkedMinutes:entry.workedMinutes,originalAbsenceMinutes:entry.absenceMinutes,proposedWorkedMinutes:420,proposedAbsenceMinutes:60,reason:'One hour personal leave recorded against the original synthetic observation'});
   if(!correction)correction=(await requestOperationalTime({...actors.payroll_administrator,employeeId:leaveEmployee.id,type:'ATTENDANCE_CORRECTION',periodStart:entry.workDate,periodEnd:entry.workDate,requestedMinutes:60,targetTimeEntryId:entry.id,expectedEntryHash:observation.sourceHash,proposedWorkedMinutes:420,proposedAbsenceMinutes:60,reason:'Correct synthetic attendance to reflect one hour approved personal leave',requestEvidenceHash:correctionProof.sha,idempotencyKey:correctionKey})).request;
   if(correction.status==='REQUESTED')await decideOperationalTimeRequest({...actors.owner,employeeId:leaveEmployee.id,requestId:correction.id,decision:'APPROVE',decisionReason:'Independent review of synthetic attendance correction and leave evidence',approvalEvidenceHash:correctionProof.sha});
   const corrected=await loadCorrectableAttendance(db,{organizationId:org,employeeId:leaveEmployee.id},entry.id);if(corrected.entry.workedMinutes!==420||corrected.entry.absenceMinutes!==60)throw Error('Approved leave does not reconcile to corrected attendance');
   const results=[];
   for(const [i,type,date]of [[0,'LEAVE','2026-10-27'],[1,'OVERTIME','2026-10-26'],[2,'LEAVE','2026-10-28']]as const){
    const employee=employees[i],proof=doc(`${org}-time-request-${i}`,{employeeId:employee.id,type,date,minutes:60,classification:'Employer-authored synthetic request; not statutory payroll treatment'});
    const input={...actors.payroll_administrator,employeeId:employee.id,type,periodStart:new Date(date+'T00:00:00Z'),periodEnd:new Date(date+'T00:00:00Z'),requestedMinutes:60,reason:'Synthetic employee time scenario for workflow testing',requestEvidenceHash:proof.sha,idempotencyKey:`${org}:time-request:${i}`,...(type==='LEAVE'?{leavePolicyId:policy.id}:{})};
    let result=await requestOperationalTime(input);
    if(result.request.status==='REQUESTED'&&i<2)await decideOperationalTimeRequest({...actors.owner,employeeId:employee.id,requestId:result.request.id,decision:i===0?'APPROVE':'REJECT',decisionReason:i===0?'Approved synthetic personal leave':'Synthetic overtime request declined; no overtime authorized',approvalEvidenceHash:proof.sha});
    const saved=await db.hrisTimeRequest.findUniqueOrThrow({where:{id:result.request.id}});results.push({id:saved.id,type:saved.type,status:saved.status});
   }
   return{employeesCredited:employees.length,requests:results};
  });
  await run('pending-future-salary-review',async()=>{
   const employee=await db.payrollEmployee.findFirstOrThrow({where:{organizationId:org},orderBy:{employeeNumber:'desc'},include:{contracts:{where:{status:'ACTIVE'}}}}),contract=employee.contracts[0];
   const proof=doc(`${org}-salary-review`,{employeeId:employee.id,currentSalary:String(contract.baseSalary),proposedSalary:Number(contract.baseSalary)+10000,effectiveFrom:'2026-11-01',reason:'Synthetic future salary review'});
   const existing=await db.payrollSalaryChangeRequest.findFirst({where:{organizationId:org,employeeId:employee.id,sourceContractId:contract.id,evidenceDocumentHash:proof.sha}});if(existing){if(Number(existing.proposedBaseSalary)!==Number(contract.baseSalary)+10000||existing.effectiveFrom.toISOString().slice(0,10)!=='2026-11-01'||existing.requestedById!==actors.payroll_administrator.actorId)throw Error('Retained salary review differs from fixture');return{id:existing.id,status:existing.status,reused:true};}
   const result=await requestSalaryChange({...actors.payroll_administrator,employeeId:employee.id,sourceContractId:contract.id,proposedBaseSalary:Number(contract.baseSalary)+10000,effectiveFrom:'2026-11-01',requestReason:'Synthetic future salary increase awaiting independent approval',evidenceDocumentHash:proof.sha,sourceReference:{sourceSystem:'SYNTHETIC_DATASET',sourceRecordId:`${org}-salary-review`,sourceHash:proof.sha},idempotencyKey:`${org}:salary-review`});return result;
  });
  if(process.argv.includes('--foundation'))continue;
  await run('bank-payment-statement-reconciliation',()=>seedBankScenario(org,actors,OUT));
  await run('delivery-order-fulfillment-and-billing',()=>seedDeliveryScenario(org,actors,OUT));
  await run('customer-credit-and-collections',async()=>{
   const terminalId=`${org}_credit_terminal`,locationId=`${org}_loc_0`;
   await db.pOSStation.upsert({where:{id:terminalId},update:{},create:{id:terminalId,organizationId:org,locationId,terminalNumber:'SYN-CREDIT',name:'Synthetic customer credit scenario',hasCashDrawer:true}});
   let session=await db.pOSSession.findFirst({where:{organizationId:org,terminalId}});
   if(!session){await openPOSShift({organizationId:org,userId:actors.cashier.actorId,locationId,terminalId,openingBalance:0,notes:'Synthetic on-account sales'});session=await db.pOSSession.findFirstOrThrow({where:{organizationId:org,terminalId}});}
   const h=createHash('sha256').update(terminalId).digest('hex'),lease=`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
   const cartScope={organizationId:org,userId:actors.cashier.actorId,locationId,terminalId,sessionId:session.id,checkoutLeaseId:lease},results=[];
   for(let i=0;i<2;i++){
    const clientCommitId=`${org}:credit-sale:${i}`,customerId=`${org}_customer_${i}`;let prior=await db.pOSCommitResult.findUnique({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
    if(!prior){
     if(session.status!=='ACTIVE')throw Error('Closed credit shift missing expected sale');await acquirePOSCheckout(cartScope);
     const existing=await getActivePOSCart(cartScope),cart=existing?await db.salesOrder.findUniqueOrThrow({where:{id:existing.id},include:{lines:true}}):null,itemId=`${org}_item_${i===0?0:4}`;
     if(cart?.lines.some(l=>l.itemId!==itemId||Number(l.quantity)!==1)||cart&&cart.lines.length>1)throw Error('Unexpected credit cart');if(!cart?.lines.length)await addPOSCartLine({...cartScope,itemId,quantity:1});
     const active=await getActivePOSCart(cartScope);const sale=await db.salesOrder.findUniqueOrThrow({where:{id:active!.id},include:{lines:true}});
     const request={...cartScope,salesOrderId:sale.id,clientCommitId,expectedCartRevision:posCartRevision(sale),customerId,tenders:[{method:'ON_ACCOUNT' as const,amount:Number(sale.total)}],receipt:{channel:'NONE' as const},notes:'Synthetic customer credit sale'};await preparePOSCheckout(request);await commitPOSSale(request,{sessionId:actors.cashier.sessionId,sessionToken:actors.cashier.sessionToken});
     prior=await db.pOSCommitResult.findUniqueOrThrow({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
    }
    if(prior.status!=='COMPLETED'||!prior.salesOrderId)throw Error('Credit sale not completed');const sale=await db.salesOrder.findUniqueOrThrow({where:{id:prior.salesOrderId}}),amount=i===0?Number(sale.total)/2:Number(sale.total);
    const proof=doc(`${org}-customer-collection-${i}`,{salesOrderId:sale.id,customerId,amount,method:'SIMULATED_CASH',classification:'No real payment received'});
    const result=await collectCustomerSettlementWithControls({customerId,method:'CASH',amount,settlementDate:'2026-10-28',idempotencyKey:`${org}:customer-collection:${i}`,correlationId:`${org}:customer-collection:${i}`,documentHash:proof.sha,evidenceHash:proof.sha,notes:'Synthetic customer collection evidence',allocations:[{salesOrderId:sale.id,amount}]},actors.owner);results.push({salesOrderId:sale.id,amount,result});
   }
   session=await db.pOSSession.findUniqueOrThrow({where:{id:session.id}});if(session.status==='ACTIVE')await closePOSShift({organizationId:org,userId:actors.cashier.actorId,sessionId:session.id,actualBalance:Number(session.expectedBalance),notes:'Synthetic credit-only shift closed'});return results;
  });
  await run('warehouse-transfer-complete',async()=>{
   const marker=`${org}-warehouse-transfer`;let transfer=await db.stockTransfer.findFirst({where:{organizationId:org,notes:marker},include:{lines:true}});
   if(!transfer){const created=await createStockTransfer({organizationId:org,fromLocationId:`${org}_loc_2`,toLocationId:`${org}_loc_0`,createdById:actors.owner.actorId,notes:marker,lines:[{itemId:`${org}_item_0`,requestedQuantity:2},{itemId:`${org}_item_4`,requestedQuantity:3}]});transfer=await db.stockTransfer.findUniqueOrThrow({where:{id:created.transfer.id},include:{lines:true}});}
   for(const [status,operation,actor,branch]of [['DRAFT','SUBMIT','owner',2],['SUBMITTED','APPROVE','checker',2],['APPROVED','DISPATCH','owner',2],['IN_TRANSIT','RECEIVE','checker',0]]as const){if(transfer.status!==status)continue;await transitionStockTransfer({organizationId:org,transferId:transfer.id,actorId:actors[actor].actorId,operation,requestId:marker+':'+operation,expectedUpdatedAt:transfer.updatedAt.toISOString(),locationId:`${org}_loc_${branch}`,...(operation==='RECEIVE'?{lines:transfer.lines.map(l=>({lineId:l.id,quantity:Number(l.requestedQuantity)}))}:{})});transfer=await db.stockTransfer.findUniqueOrThrow({where:{id:transfer.id},include:{lines:true}});}
   if(transfer.status!=='COMPLETED')throw Error('Transfer not fully received: '+transfer.status);return{id:transfer.id,status:transfer.status};
  });
  if(!process.argv.includes('--skip-count'))await run('physical-count-and-approved-variance',async()=>{
   const marker=`${org}-synthetic-count`;let count=await db.stockCountSession.findFirst({where:{organizationId:org,countNumber:marker},include:{lines:true}});
   if(!count){const created=await createStockCountSession({organizationId:org,locationId:`${org}_loc_1`,createdById:actors.owner.actorId,countNumber:marker,itemIds:[`${org}_item_2`,`${org}_item_3`],notes:'Synthetic count: one soap carton damaged; water stock agrees',metadata:{synthetic:true}});count=await db.stockCountSession.findUniqueOrThrow({where:{id:created.id},include:{lines:true}});}
   const proof=doc(marker,{countSessionId:count.id,observations:count.lines.map(l=>({itemId:l.itemId,systemQuantity:String(l.systemQuantity),countedQuantity:Number(l.systemQuantity)-(l.itemId.endsWith('_item_2')?1:0)}))});
   if(['DRAFT','FROZEN'].includes(count.status)){await submitStockCountSession({organizationId:org,countSessionId:count.id,submittedById:actors.owner.actorId,countSheetHash:proof.sha,lines:count.lines.map(l=>({lineId:l.id,countedQuantity:Number(l.systemQuantity)-(l.itemId.endsWith('_item_2')?1:0),reasonCode:'SYNTHETIC_PHYSICAL_COUNT',evidenceHash:proof.sha}))});count=await db.stockCountSession.findUniqueOrThrow({where:{id:count.id},include:{lines:true}});}
   if(count.status!=='POSTED')await postStockCount({organizationId:org,countSessionId:count.id,approvedById:actors.checker.actorId,idempotencyKey:marker+':post',countSheetHash:proof.sha});
   const result=await db.stockCountSession.findUniqueOrThrow({where:{id:count.id}});return{id:result.id,status:result.status};
  });
  await run('supplier-return-and-credit',async()=>{
   const marker=`${org}-history-2026-01-0`,order=await db.purchaseOrder.findFirstOrThrow({where:{organizationId:org,notes:marker}}),receipt=await db.goodsReceipt.findFirstOrThrow({where:{organizationId:org,purchaseOrderId:order.id},include:{lines:true}}),invoice=await db.supplierInvoice.findFirstOrThrow({where:{organizationId:org,invoiceNumber:marker},include:{lines:true}});
   const source=receipt.lines.find(l=>l.itemId===`${org}_item_0`)!;const proof=doc(`${org}-supplier-return`,{receiptId:receipt.id,invoiceId:invoice.id,itemId:source.itemId,quantity:1,reason:'Damaged packaging discovered in retained synthetic stock'});
   const result=await postPurchaseReturn({organizationId:org,purchaseOrderId:order.id,goodsReceiptId:receipt.id,postedById:actors.owner.actorId,idempotencyKey:`${org}:supplier-return`,occurredAt:'2026-10-28T18:30:00Z',reason:'Synthetic damaged packaging returned to supplier',documentHash:proof.sha,evidenceHash:proof.sha,lines:[{sourceGoodsReceiptLineId:source.id,quantity:1}]});
   const returned=await db.purchaseReturn.findUniqueOrThrow({where:{id:result.purchaseReturn.id},include:{lines:true}});const invoiceLine=invoice.lines.find(l=>l.goodsReceiptLineId===source.id)!;
   const credit=await postSupplierCreditNote({organizationId:org,purchaseReturnId:returned.id,supplierInvoiceId:invoice.id,postedById:actors.checker.actorId,idempotencyKey:`${org}:supplier-credit`,creditNoteNumber:`SYN-CN-${org}`,creditDate:'2026-10-28T18:31:00Z',documentHash:proof.sha,evidenceHash:proof.sha,reason:'Supplier credit for synthetic returned merchandise',lines:[{sourcePurchaseReturnLineId:returned.lines[0].id,sourceSupplierInvoiceLineId:invoiceLine.id}]});return{returnId:returned.id,credit};
  });
 }
 if(report.issues.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{clock?.uninstall();save();await db.$disconnect()});
