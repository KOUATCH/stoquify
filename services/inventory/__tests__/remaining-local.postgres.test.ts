import {randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {Prisma} from '@prisma/client'
import {db} from '@/prisma/db'
import {assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {settledFixture,state} from './remaining-local.fixture'
import {postPurchaseReturn,reversePurchaseReturn,postSupplierCreditNote,reverseSupplierCreditNote} from '@/services/purchasing/purchase-return-credit.service'
import {readSupplierPaymentBalances} from '@/services/purchasing/supplier-payment-balance'
import {reopenAccountingPeriod} from '@/services/accounting/period-control.service'
import {closeAccountingPeriod} from '@/services/accounting/periods.service'

const evidence: unknown[]=[]
beforeAll(assertDisposableTarget)
afterAll(async()=>{writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'extended-reconciliation.json'),JSON.stringify(evidence,null,2));await db.$disconnect()})
// Synthetic closed-state setup with a retained transition receipt. This is
// correction/period enforcement evidence, not close-pack certification.
async function closedPeriodFixture(organizationId:string,actorId:string,periodId:string){
 return db.$transaction(async tx=>{
  const period=await tx.accountingPeriod.findUniqueOrThrow({where:{id:periodId}}),now=new Date()
  const event=await tx.periodControlEvent.create({data:{organizationId,periodId,version:period.controlVersion+1,operation:'CLOSE',fromStatus:'OPEN',toStatus:'CLOSED',actorId,reason:'Synthetic correction verification closed-state fixture',idempotencyKey:randomUUID(),sourceRevision:'0',approval:{syntheticFixture:true,notCloseCertification:true},createdAt:now}})
  return tx.accountingPeriod.update({where:{id:periodId},data:{status:'CLOSED',closedAt:now,lockedAt:now,closedById:actorId,controlVersion:event.version,lastControlEventId:event.id}})
 })
}
async function returnedFixture(){
 const f=await settledFixture(),organizationId=f.organizationId
 const claim=await db.chartOfAccount.create({data:{organizationId,code:'TEST_CLAIM',mappingKey:'SUPPLIER_RETURN_CLAIM',nameEn:'Synthetic supplier claim',type:'ASSET',normalBalance:'DEBIT',currency:'XAF'}})
 const rule=await db.postingRule.findFirstOrThrow({where:{organizationId,code:'TEST_RETURN'}})
 await db.postingRuleLine.create({data:{organizationId,postingRuleId:rule.id,accountId:claim.id,lineNumber:3,side:'DEBIT',amountSource:'NET_AMOUNT'}})
 const ap=await db.chartOfAccount.findFirstOrThrow({where:{organizationId,code:'TEST_AP'}})
 await db.postingRule.create({data:{organizationId,code:'TEST_CREDIT',nameEn:'Synthetic supplier credit',sourceType:'SUPPLIER_CREDIT_NOTE',postingPurpose:'SUPPLIER_CREDIT_NOTE',lines:{create:[{organizationId,accountId:ap.id,lineNumber:1,side:'DEBIT',amountSource:'GROSS_AMOUNT'},{organizationId,accountId:claim.id,lineNumber:2,side:'CREDIT',amountSource:'COST_AMOUNT'}]}}})
 const returned=await postPurchaseReturn({organizationId,purchaseOrderId:f.order.id,goodsReceiptId:f.receipt.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Synthetic settled return',occurredAt:new Date(),lines:[{sourceGoodsReceiptLineId:f.receipt.lines[0].id,quantity:'1'}]})
 expect(returned.purchaseReturn.journalEntryId).toBeTruthy()
 const invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:f.invoiceId},include:{lines:true}})
 const command={organizationId,purchaseReturnId:returned.purchaseReturn.id,supplierInvoiceId:invoice.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),creditNoteNumber:'CN-'+randomUUID(),creditDate:new Date(),documentHash:'sha256:'+'d'.repeat(64),reason:'Synthetic accepted return',lines:[{sourcePurchaseReturnLineId:returned.purchaseReturn.lines[0].id,sourceSupplierInvoiceLineId:invoice.lines[0].id}]}
 return {...f,returned,invoice,command}
}
async function balances(f:Awaited<ReturnType<typeof returnedFixture>>){
 const invoice=await db.supplierInvoice.findUniqueOrThrow({where:{id:f.invoiceId}})
 const supplier=await db.supplier.findUniqueOrThrow({where:{id:f.supplierId}})
 const outstanding=(await readSupplierPaymentBalances(db,f.organizationId,[invoice],'XAF')).get(invoice.id)!
 return {...await state(f.organizationId),paid:invoice.amountPaid.toFixed(2),invoiceStatus:invoice.status,outstanding:outstanding.toFixed(2),supplierBalance:supplier.currentBalance.toFixed(2),credits:await db.supplierCreditNote.count({where:{organizationId:f.organizationId}}),returns:await db.purchaseReturn.count({where:{organizationId:f.organizationId}})}
}
function reversal(f:Awaited<ReturnType<typeof returnedFixture>>,creditId:string,date=new Date()){
 return {organizationId:f.organizationId,supplierCreditNoteId:creditId,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),creditNoteNumber:'RV-'+randomUUID(),creditDate:date,documentHash:'sha256:'+'e'.repeat(64),reason:'Synthetic reversal'}
}
it('LOCAL-CREDIT settled invoice retains overpayment credit, prevents duplicate effects and reverses exactly',async()=>{
 const f=await returnedFixture(),before=await balances(f)
 const pair=await Promise.all([postSupplierCreditNote(f.command),postSupplierCreditNote(f.command)])
 expect(pair[0].supplierCreditNote.id).toBe(pair[1].supplierCreditNote.id)
 await expect(postSupplierCreditNote({...f.command,creditNoteNumber:'changed'})).rejects.toThrow()
 const credited=await balances(f)
 expect(credited).toMatchObject({paid:'200.00',outstanding:'-100.00',supplierBalance:'-100.00',invoiceStatus:'PAID',credits:1,transactions:1,supplierPayments:1})
 expect(credited.stock).toEqual([{quantity:'1.000',value:'100.00'}]);expect(credited.balances.TEST_AP).toBe('100.00');expect(credited.balances.TEST_CLAIM).toBe('0.00')
 const cmd=reversal(f,pair[0].supplierCreditNote.id),results=await Promise.all([reverseSupplierCreditNote(cmd),reverseSupplierCreditNote(cmd)])
 expect(results[0].supplierCreditNote.id).toBe(results[1].supplierCreditNote.id)
 const restored=await balances(f)
 expect(restored).toMatchObject({paid:'200.00',outstanding:'0.00',supplierBalance:'0.00',credits:2,transactions:1})
 expect(restored.balances.TEST_AP).toBe('0.00');expect(restored.stock).toEqual(before.stock)
 evidence.push({scenario:'LOCAL-CREDIT',organizationId:f.organizationId,before,credited,restored,creditId:pair[0].supplierCreditNote.id,reversalId:results[0].supplierCreditNote.id})
})
it('LOCAL-CORRECTION-RACE competing new credits for one return produce one credit, and active credit blocks return reversal',async()=>{
 const f=await returnedFixture(),results=await Promise.allSettled([postSupplierCreditNote(f.command),postSupplierCreditNote({...f.command,idempotencyKey:randomUUID(),creditNoteNumber:'OTHER-'+randomUUID()})])
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 const before=await balances(f)
 await expect(reversePurchaseReturn({organizationId:f.organizationId,purchaseReturnId:f.returned.purchaseReturn.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Must reject active credit',occurredAt:new Date()})).rejects.toThrow()
 expect(await balances(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-CORRECTION-RACE',organizationId:f.organizationId,outcomes:results.map(r=>r.status),after:before})
})
it('LOCAL-CLOSED requires controlled reopening of the source period before a later-period exact correction',async()=>{
 const f=await returnedFixture(),posted=await postSupplierCreditNote(f.command),before=await balances(f)
 const period=await db.accountingPeriod.findFirstOrThrow({where:{organizationId:f.organizationId}})
 await expect(closeAccountingPeriod(f.organizationId,period.id,f.receiver.actorId,{expectedVersion:period.controlVersion,actorPermissions:['accounting.period.close'],lastAuthAt:new Date()})).rejects.toThrow()
 expect((await db.accountingPeriod.findUniqueOrThrow({where:{id:period.id}})).status).toBe('OPEN')
 const split=new Date();split.setUTCHours(23,59,59,999)
 await db.accountingPeriod.update({where:{id:period.id},data:{endDate:split}})
 await closedPeriodFixture(f.organizationId,f.receiver.actorId,period.id)
 const tomorrow=new Date(split.getTime()+1)
 const next=await db.accountingPeriod.create({data:{organizationId:f.organizationId,fiscalYearId:period.fiscalYearId,periodNumber:2,name:'Synthetic next open period',startDate:tomorrow,endDate:period.endDate}})
 await expect(reverseSupplierCreditNote(reversal(f,posted.supplierCreditNote.id))).rejects.toThrow()
 expect((await postSupplierCreditNote(f.command)).supplierCreditNote.id).toBe(posted.supplierCreditNote.id)
 expect(await balances(f)).toEqual(before)
 const cmd=reversal(f,posted.supplierCreditNote.id,tomorrow)
 await expect(reverseSupplierCreditNote(cmd)).rejects.toThrow(/period is not open/i)
 expect(await balances(f)).toEqual(before)
 const reopen={periodId:period.id,expectedVersion:1,reason:'Synthetic controlled reopening for retained correction',idempotencyKey:randomUUID()},control={organizationId:f.organizationId,actorId:f.receiver.actorId,actorPermissions:['accounting.period.reopen'],lastAuthAt:new Date()}
 const reopened=await reopenAccountingPeriod(reopen,control)
 expect((await reopenAccountingPeriod(reopen,control)).event.id).toBe(reopened.event.id)
 await expect(reopenAccountingPeriod({...reopen,reason:'Changed retained reopen reason'},control)).rejects.toThrow()
 const reversed=await reverseSupplierCreditNote(cmd)
 const journal=await db.journalEntry.findUniqueOrThrow({where:{id:reversed.supplierCreditNote.journalEntryId!}})
 expect(journal.periodId).toBe(next.id)
 const restored=await balances(f);expect(restored.outstanding).toBe('0.00');expect(restored.paid).toBe('200.00')
 const ret=await reversePurchaseReturn({organizationId:f.organizationId,purchaseReturnId:f.returned.purchaseReturn.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Next period stock correction',occurredAt:tomorrow})
 expect(ret.purchaseReturn.journalEntryId).toBeTruthy()
 const final=await balances(f);expect(final.stock).toEqual([{quantity:'2.000',value:'200.00'}]);expect(final.balances.TEST_CLAIM).toBe('0.00');expect(final.balances.TEST_CASH).toBe('-200.00')
 evidence.push({scenario:'LOCAL-CLOSED',organizationId:f.organizationId,closedPeriodId:period.id,reversalPeriodId:next.id,reopenEventId:reopened.event.id,before,restored,final,contract:'Original posted journal metadata cannot change in a closed period. Existing controlled reopen is required; no period guard was relaxed.'})
})
it('LOCAL-CLOSED-NEW rejects a new credit in a closed period without payable or accounting effects',async()=>{
 const f=await returnedFixture(),before=await balances(f)
 const period=await db.accountingPeriod.findFirstOrThrow({where:{organizationId:f.organizationId}})
 await closedPeriodFixture(f.organizationId,f.receiver.actorId,period.id)
 await expect(postSupplierCreditNote(f.command)).rejects.toThrow(/closed|open/i)
 expect(await balances(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-CLOSED-NEW',organizationId:f.organizationId,before,after:await balances(f)})
})
