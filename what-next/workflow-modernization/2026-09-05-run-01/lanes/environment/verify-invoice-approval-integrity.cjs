const f=require('./supplier-ack-fixtures.cjs'),{db,fs,path,crypto,assert}=f,ap=require(path.join(f.root,'services/purchasing/ap-control.service.ts')),receiving=require(path.join(f.root,'services/purchase-order/purchase-receiving-workbench.service.ts'));
const run=crypto.randomUUID().slice(0,12),report={run,at:new Date().toISOString(),checks:[],scope:'Owned local PostgreSQL; synthetic independent actors, real receiving and AP kernel. Missing posting rules must remain blocked; this does not verify current-session approval transport.'};
const source='services/purchasing/ap-control.service.ts',hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,source))).digest('hex');report.sourceBefore=hash();
async function fixture(name){
 const x=await f.fixture('en','approval-integrity-'+run+'-'+name,{skipInvite:true});await db.role.update({where:{id:x.roleId},data:{permissions:['purchases.orders.read','purchases.orders.receive']}});
 await require(path.join(f.root,'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(x.organizationId,{name:'Owned AP approval 2026',startDate:new Date('2026-01-01T00:00:00Z'),endDate:new Date('2026-12-31T23:59:59.999Z')},x.actorId);
 const session=await db.session.findUniqueOrThrow({where:{id:x.sessionId}}),scope={organizationId:x.organizationId,actorId:x.actorId,sessionId:session.id,sessionToken:session.token},draft={kind:'receive',orderId:x.purchaseOrderId,inspectionOutcome:'PASSED',items:[{lineId:x.lineId,receivedQuantity:10}]},preview=await receiving.previewPurchaseReceiving(draft,scope),receipt=await receiving.confirmPurchaseReceiving({draft,expectedRevision:preview.revision,idempotencyKey:crypto.randomUUID()},scope),line=await db.goodsReceiptLine.findFirstOrThrow({where:{goodsReceiptId:receipt.goodsReceiptId}}),order=await db.purchaseOrder.findUniqueOrThrow({where:{id:x.purchaseOrderId}});
 const checker=await db.user.create({data:{organizationId:x.organizationId,name:'Owned independent AP checker',email:crypto.randomUUID()+'@example.invalid',isActive:true,isVerified:true,emailVerified:true}});
 const invoices=[];for(let i=0;i<2;i++)invoices.push((await ap.prepareSupplierInvoice({organizationId:x.organizationId,supplierId:order.supplierId,createdById:x.actorId,invoiceNumber:'OWNED-'+name+'-'+i,invoiceDate:'2026-08-10',lines:[{goodsReceiptLineId:line.id,description:'Owned received stock',quantity:'1',unitCost:'2500.00'}]},db)).supplierInvoice);
 return{...x,supplierId:order.supplierId,checkerId:checker.id,invoices};
}
// Delay the supplier balance snapshot to exercise overlapping approvals. After the
// correction, the same delay runs while holding the supplier lock, serializing reads.
const delayed={$transaction:(callback,options)=>db.$transaction(tx=>callback(new Proxy(tx,{get(target,key){
 if(key!=='supplierInvoice')return target[key];
 return new Proxy(target.supplierInvoice,{
   get(model,method){
     if(method!=='findFirst')return model[method];
     return async args=>{
       const result=await model.findFirst(args);
       if(args.include?.supplier)await new Promise(resolve=>setTimeout(resolve,100));
       return result;
     };
   }
 });
}})),options)};
async function check(name,fn){try{report.checks.push({name,status:'passed',...await fn()})}catch(e){report.checks.push({name,status:'failed',message:f.safe(e)});process.exitCode=1}}
(async()=>{await f.local.withClient(f.target,f.local.assertOwned);const original=await f.stable();
await check('Concurrent different invoices preserve both supplier liabilities',async()=>{
 const x=await fixture('balance');const results=await Promise.all(x.invoices.map(invoice=>ap.approveSupplierInvoice({organizationId:x.organizationId,supplierInvoiceId:invoice.id,approvedById:x.checkerId},delayed)));
 assert.ok(results.every(r=>r.ledgerStatus==='BLOCKED_PENDING_RULES'));
 const supplier=await db.supplier.findUniqueOrThrow({where:{id:x.supplierId}}),entries=await db.supplierLedgerEntry.findMany({where:{organizationId:x.organizationId,supplierId:x.supplierId},orderBy:{balanceAfter:'asc'}});
 assert.equal(entries.length,2);assert.equal(supplier.currentBalance.toFixed(2),'5000.00');assert.deepEqual(entries.map(e=>e.balanceAfter.toFixed(2)),['2500.00','5000.00']);assert.equal(await db.journalEntry.count({where:{organizationId:x.organizationId}}),0);return{balance:'5000.00',ledgerStatus:results[0].ledgerStatus};
});
await check('Concurrent identical approvals return one liability and one retained outcome',async()=>{
 const x=await fixture('replay'),input={organizationId:x.organizationId,supplierInvoiceId:x.invoices[0].id,approvedById:x.checkerId};const results=await Promise.all([ap.approveSupplierInvoice(input,delayed),ap.approveSupplierInvoice(input,delayed)]);assert.equal(results[0].postingBatchId,results[1].postingBatchId);assert.equal(await db.supplierLedgerEntry.count({where:{organizationId:x.organizationId}}),1);assert.equal((await db.supplier.findUniqueOrThrow({where:{id:x.supplierId}})).currentBalance.toFixed(2),'2500.00');return{liabilityCount:1};
});
await check('Approval records operation time while preserving the effective invoice date',async()=>{
 const x=await fixture('time'),before=new Date();await ap.approveSupplierInvoice({organizationId:x.organizationId,supplierInvoiceId:x.invoices[0].id,approvedById:x.checkerId},db);const after=new Date(),invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:x.invoices[0].id}}),event=await db.businessEvent.findFirstOrThrow({where:{organizationId:x.organizationId,eventType:'purchase.supplier_invoice.posted'}});assert.equal(invoice.invoiceDate.toISOString().slice(0,10),'2026-08-10');assert.ok(invoice.postedAt>=before&&invoice.postedAt<=after,'Posting timestamp was backdated to the invoice date');assert.ok(event.occurredAt>=before&&event.occurredAt<=after,'Approval event was backdated');return{operationTimeRecorded:true};
});
await check('Replay without ledger-status metadata does not claim a posted journal',async()=>{
 const x=await fixture('uncertain'),input={organizationId:x.organizationId,supplierInvoiceId:x.invoices[0].id,approvedById:x.checkerId};await ap.approveSupplierInvoice(input,db);await db.supplierInvoice.update({where:{id:x.invoices[0].id},data:{metadata:{}}});const result=await ap.approveSupplierInvoice(input,db);assert.equal(result.ledgerStatus,'UNVERIFIED');assert.equal(await db.journalEntry.count({where:{organizationId:x.organizationId}}),0);return{ledgerStatus:result.ledgerStatus};
});
report.originalUnchanged=original===await f.stable();assert.ok(report.originalUnchanged);report.sourceAfter=hash();assert.equal(report.sourceBefore,report.sourceAfter);
})().catch(e=>{report.error=f.safe(e);process.exitCode=1}).finally(async()=>{await db.$disconnect();const file='invoice-approval-integrity-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file,checks:report.checks,error:report.error,originalUnchanged:report.originalUnchanged}))});
