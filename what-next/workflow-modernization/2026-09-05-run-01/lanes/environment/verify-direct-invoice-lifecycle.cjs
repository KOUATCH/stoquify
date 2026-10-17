// Inspect actual persisted lifecycle in new owned fixtures. This does not modify
// production approval metadata or grant approval authority to any real user.
const h=require('./verify-invoice-receipt-handoff.cjs'),f=require('./supplier-ack-fixtures.cjs');
const {db,fs,path,crypto,assert}=f;
const ap=require(path.join(f.root,'services/purchasing/ap-control.service.ts'));
const recovery=require(path.join(f.root,'services/purchasing/invoice-ledger-recovery.service.ts'));
const run=crypto.randomUUID(),report={run,at:new Date().toISOString(),scope:'Synthetic owned-local internal-domain lifecycle probe; no production approval or metadata repair',cases:[]};
async function main(){
 await f.local.withClient(f.target,f.local.assertOwned);
 for(const accrued of [false,true]){
  const x=await h.fixture('direct-lifecycle-'+run+'-'+accrued,{legacyRule:true}),receipt=await h.receive(x,10);
  if(accrued)await h.recognizeReceipt(x,receipt);
  const result=await ap.postSupplierInvoice({organizationId:x.organizationId,supplierId:x.supplierId,purchaseOrderId:x.purchaseOrderId,invoiceNumber:'OWNED-DIRECT-'+run,invoiceDate:new Date().toISOString().slice(0,10),currency:'XAF',createdById:x.actorId,approvedById:x.scope.actorId,idempotencyKey:crypto.randomUUID(),lines:[{goodsReceiptLineId:receipt.lines[0].id,description:'Owned received stock',quantity:'6',unitCost:'2500',taxRate:'0'}]});
  const invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:result.supplierInvoice.id}}),match=await db.threeWayMatch.findFirstOrThrow({where:{organizationId:x.organizationId,supplierInvoiceId:invoice.id}}),event=await db.businessEvent.findUniqueOrThrow({where:{id:invoice.postedBusinessEventId}});
  const persistedApprovalAgrees=Boolean(invoice.createdById&&invoice.approvedById&&invoice.createdById!==invoice.approvedById&&invoice.createdById===x.actorId&&invoice.approvedById===x.scope.actorId&&invoice.status==='POSTED'&&invoice.postedAt&&match.supplierInvoiceId===invoice.id&&match.organizationId===x.organizationId&&match.status==='MATCHED'&&match.varianceAmount.eq(0));
  assert.equal(persistedApprovalAgrees,true);
  const checks={organizationId:x.organizationId,invoiceId:invoice.id,accrued,invoiceStatus:invoice.status,matchStatus:match.status,variance:match.varianceAmount.toFixed(2),persistedApprovalAgrees,ledgerStatus:result.ledgerStatus,eventHasMaker:event.payload.makerId===invoice.createdById,eventHasApprover:event.payload.approverId===invoice.approvedById,eventHasMatch:event.payload.matchStatus===match.status,eventHasIndependentEvidence:event.metadata?.makerCheckerVerified===true};
  assert.equal(checks.eventHasMaker,true);assert.equal(checks.eventHasApprover,true);assert.equal(checks.eventHasMatch,true);assert.equal(checks.eventHasIndependentEvidence,true);
  if(accrued){
   await db.postingRule.update({where:{id:x.invoiceRuleId},data:{isActive:false}});await h.installInvoiceRule(x);
   const preview=await recovery.previewInvoiceLedgerRecovery({invoiceId:invoice.id},x.scope);assert.deepEqual(preview.blockers,[]);
   const command={invoiceId:invoice.id,expectedRevision:preview.revision,idempotencyKey:crypto.randomUUID()};
   const recovered=await recovery.confirmInvoiceLedgerRecovery(command,x.scope);assert.equal(recovered.ledgerStatus,'POSTED');
   assert.equal((await recovery.confirmInvoiceLedgerRecovery(command,x.scope)).replayed,true);
   assert.equal(await db.supplierLedgerEntry.count({where:{organizationId:x.organizationId}}),1);
   await h.expectBalances(x,'25000.00','-10000.00','-15000.00');checks.recoveredWithoutDuplicateLiability=true;
  }
  assert.equal(await db.payment.count({where:{organizationId:x.organizationId}}),0);report.cases.push(checks);
 }
 report.passed=true;
}
main().catch(error=>{report.error=f.safe(error);report.passed=false}).finally(async()=>{report.sourceHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/purchasing/ap-control.service.ts'))).digest('hex');await db.$disconnect();const file='direct-invoice-lifecycle-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...report}));process.exitCode=report.passed?0:1});
