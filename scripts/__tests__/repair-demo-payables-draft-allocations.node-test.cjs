const {test}=require('node:test')
const assert=require('node:assert/strict')
const {validateSnapshot}=require('../repair-demo-payables-draft-allocations.cjs')
const nil=fields=>Object.fromEntries(fields.map(f=>[f,null]))
function fixture(){
  const s={invoices:[],payments:[],allocations:[],priorAudits:[],ledger:[],journals:[],events:[],batches:[],fiscalDocuments:[],sourceLinks:[]}
  for(let i=1;i<=12;i++){
    const suffix=String(i).padStart(3,'0'),org='rds_org_001',id=`${org}_supplier_invoice_${suffix}`,paymentId=`${org}_supplier_payment_${suffix}`
    s.invoices.push({id,organizationId:org,supplierId:`${org}_supplier_${suffix}`,invoiceNumber:`RDS001-INVOICENUMBER-${suffix}`,status:'DRAFT',currency:'XAF',total:'100.10',subtotal:'100.10',taxAmount:'0',discount:'0',amountPaid:'0',supplierCreditNotes:[],
      ...nil(['purchaseOrderId','approvedById','postedAt','postedBusinessEventId','ledgerPostingBatchId','documentHash','evidenceHash','cancelledAt','deletedAt','metadata']),
      lines:[{id:`${org}_supplier_invoice_line_${suffix}`,organizationId:org,supplierInvoiceId:id,quantity:'1',unitCost:'100.10',matchStatus:'EXCEPTION',goodsReceiptLineId:null,purchaseOrderLineId:null}]})
    s.payments.push({id:paymentId,organizationId:org,supplierId:`${org}_supplier_${suffix}`,currency:'XAF',status:'DRAFT',amount:'80.05',
      ...nil(['bankAccountId','approvedById','releasedById','approvedAt','releasedAt','postedBusinessEventId','ledgerPostingBatchId','documentHash','evidenceHash','deletedAt','metadata'])})
    s.allocations.push({id:`${org}_supplier_payment_allocation_${suffix}`,organizationId:org,supplierInvoiceId:id,supplierPaymentId:paymentId,amount:'80.05'})
    s.priorAudits.push({entityId:id,action:'SYSTEMATIC_SEED_DRAFT_ARITHMETIC_REPAIRED'})
  }
  return s
}
test('plans only 12 synthetic draft links without changing invoice values',()=>{
  const s=fixture(),before=structuredClone(s)
  assert.deepEqual(validateSnapshot(s),{invoiceCount:12,allocationsToArchive:12,preservedDraftInvoiceTotal:'1201.20',archivedDraftAllocationTotal:'960.60',recognizedPayableAfterRepair:'0.00',currency:'XAF'})
  assert.deepEqual(s,before)
})
for(const [name,change] of [
  ['posted invoice',s=>s.invoices[0].status='POSTED'],
  ['approved invoice',s=>s.invoices[0].approvedById='actor'],
  ['paid invoice',s=>s.invoices[0].amountPaid='1'],
  ['released payment',s=>s.payments[0].status='RELEASED'],
  ['retained request proof',s=>s.payments[0].documentHash='sha256:evidence'],
  ['actual business event',s=>s.events.push({id:'event'})],
  ['actual ledger proof',s=>s.ledger.push({id:'ledger'})],
  ['unrelated allocation',s=>s.allocations[0].supplierInvoiceId='foreign-invoice'],
  ['cross-tenant allocation',s=>s.allocations[0].organizationId='another-org'],
  ['cross-supplier payment',s=>s.payments[0].supplierId='another-supplier'],
  ['partial repair',s=>s.allocations.pop()],
  ['missing seed provenance',s=>s.priorAudits.pop()],
  ['bound receipt',s=>s.invoices[0].lines[0].goodsReceiptLineId='receipt'],
  ['conflicting arithmetic',s=>s.invoices[0].total='99'],
])test(`refuses ${name}`,()=>{const s=fixture();change(s);assert.throws(()=>validateSnapshot(s))})
test('recognizes the repaired allocation-free drafts',()=>{const s=fixture();s.allocations=[];assert.equal(validateSnapshot(s).allocationsToArchive,0)})
