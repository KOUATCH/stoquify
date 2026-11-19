import {randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {Prisma} from '@prisma/client'
import {db} from '@/prisma/db'
import {assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {fixture,approvedOrder,receivingCommand} from './workflow-closure-ap.fixture'
import {confirmPurchaseReceiving} from '@/services/purchase-order/purchase-receiving-workbench.service'
import {previewInvoicePreparation,confirmInvoicePreparation} from '@/services/purchasing/invoice-preparation.service'
import {previewInvoiceApproval,confirmInvoiceApproval} from '@/services/purchasing/invoice-approval.service'
import {previewPaymentRequest,submitPaymentRequest,reviewPaymentRequestApproval,confirmPaymentRequestApproval} from '@/services/purchasing/payment-request.service'
import {previewPaymentRelease,confirmPaymentRelease} from '@/services/purchasing/payment-release.service'
import {postPurchaseReturn,reversePurchaseReturn} from '@/services/purchasing/purchase-return-credit.service'
const evidence:unknown[]=[]
beforeAll(assertDisposableTarget)
afterAll(async()=>{writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'ap-reconciliation.json'),JSON.stringify(evidence,null,2));await db.$disconnect()})
async function setup(){
 const f=await fixture(),organizationId=f.organizationId
 await db.organization.update({where:{id:organizationId},data:{country:'CM'}})
 const role=await db.role.findUniqueOrThrow({where:{id:f.roleId}})
 await db.role.update({where:{id:f.roleId},data:{permissions:[...role.permissions,'purchasing.ap.invoice.post','purchasing.ap.payment.request','purchasing.ap.payment.approve','purchasing.ap.payment.release']}})
 const stock=await db.chartOfAccount.findFirstOrThrow({where:{organizationId,code:'TEST_STOCK'}}),cash=await db.chartOfAccount.findFirstOrThrow({where:{organizationId,code:'TEST_CASH'}})
 await db.chartOfAccount.update({where:{id:stock.id},data:{mappingKey:'INVENTORY'}})
 const grni=await db.chartOfAccount.create({data:{organizationId,code:'TEST_GRNI',mappingKey:'GRNI',nameEn:'Synthetic GRNI',type:'LIABILITY',normalBalance:'CREDIT',currency:'XAF'}})
 const ap=await db.chartOfAccount.create({data:{organizationId,code:'TEST_AP',mappingKey:'ACCOUNTS_PAYABLE',nameEn:'Synthetic payable',type:'LIABILITY',normalBalance:'CREDIT',currency:'XAF'}})
 await db.journal.createMany({data:[{organizationId,code:'TEST_INVENTORY',nameEn:'Synthetic receipt',type:'INVENTORY',isDefault:true},{organizationId,code:'TEST_PURCHASE',nameEn:'Synthetic invoice',type:'PURCHASE',isDefault:true}]})
 for(const [sourceType,debit,credit,amountSource] of [['GOODS_RECEIPT',stock.id,grni.id,'COST_AMOUNT'],['SUPPLIER_INVOICE',grni.id,ap.id,'GROSS_AMOUNT'],['SUPPLIER_PAYMENT',ap.id,cash.id,'SOURCE_AMOUNT']] as const){
  await db.postingRule.create({data:{organizationId,code:'TEST_'+sourceType,nameEn:'Synthetic '+sourceType,sourceType,postingPurpose:sourceType,lines:{create:[{organizationId,accountId:debit,lineNumber:1,side:'DEBIT',amountSource},{organizationId,accountId:credit,lineNumber:2,side:'CREDIT',amountSource}]}}})
 }
 await db.postingRule.create({data:{organizationId,code:'TEST_RETURN',nameEn:'Synthetic uninvoiced return',sourceType:'PURCHASE_RETURN',postingPurpose:'PURCHASE_RETURN',lines:{create:[{organizationId,accountId:grni.id,lineNumber:1,side:'DEBIT',amountSource:'VARIANCE_AMOUNT'},{organizationId,accountId:stock.id,lineNumber:2,side:'CREDIT',amountSource:'COST_AMOUNT'}]}}})
 const order=await approvedOrder(f,2,100);await confirmPurchaseReceiving(await receivingCommand(f,order,2),f.receiver)
 const receipt=await db.goodsReceipt.findFirstOrThrow({where:{purchaseOrderId:order.id},include:{lines:true}})
 return {...f,order,receipt}
}
async function state(org:string){
 const levels=await db.inventoryLevel.findMany({where:{item:{organizationId:org}}}),journals=await db.journalEntry.findMany({where:{organizationId:org},include:{lines:{include:{account:true}}}})
 const balances:Record<string,string>={}
 for(const journal of journals){expect(journal.lines.reduce((n,l)=>n.plus(l.debit).minus(l.credit),new Prisma.Decimal(0)).toFixed(2)).toBe('0.00');for(const l of journal.lines)balances[l.account.code]=new Prisma.Decimal(balances[l.account.code]||0).plus(l.debit).minus(l.credit).toFixed(2)}
 return {stock:levels.map(l=>({quantity:l.quantityOnHand.toFixed(3),value:l.totalValue.toFixed(2)})),balances,journals:journals.map(j=>({id:j.id,status:j.status})),supplierPayments:await db.supplierPayment.count({where:{organizationId:org}}),transactions:await db.paymentTransaction.count({where:{organizationId:org}})}
}
it('receives, prepares and independently approves an invoice, then records one reviewed supplier payment',async()=>{
 const f=await setup(),date=new Date().toISOString().slice(0,10),draft={supplierId:f.supplierId,invoiceNumber:'SYNTH-'+randomUUID(),invoiceDate:date,currency:'XAF',documentReference:'https://example.invalid/synthetic-invoice',documentSha256:'a'.repeat(64),lines:[{goodsReceiptLineId:f.receipt.lines[0].id,description:'Synthetic received stock',quantity:'2',unitCost:'100',taxRate:'0'}]}
 const review=await previewInvoicePreparation(draft,f.buyer),command={draft,expectedRevision:review.revision,idempotencyKey:randomUUID()},invoice=await confirmInvoicePreparation(command,f.buyer)
 expect((await confirmInvoicePreparation(command,f.buyer)).invoiceId).toBe(invoice.invoiceId)
 const approval=await previewInvoiceApproval({invoiceId:invoice.invoiceId},f.receiver)
 evidence.push({scenario:'AP invoice review',organizationId:f.organizationId,invoiceId:invoice.invoiceId,blockers:approval.blockers,warnings:approval.postingWarnings})
 expect(approval.blockers).toEqual([])
 const posted=await confirmInvoiceApproval({invoiceId:invoice.invoiceId,expectedRevision:approval.revision,idempotencyKey:randomUUID()},f.receiver)
 expect(posted.ledgerStatus).toBe('POSTED')
 const bank=await db.supplierBankAccount.create({data:{organizationId:f.organizationId,supplierId:f.supplierId,status:'APPROVED',bankName:'Synthetic approved destination',accountNumberMasked:'****1234',requestedById:f.buyer.actorId,approvedById:f.receiver.actorId,approvedAt:new Date()}})
 const paymentDraft={supplierId:f.supplierId,bankAccountId:bank.id,method:'CASH' as const,paymentDate:date,documentReference:'https://example.invalid/synthetic-payment',documentSha256:'b'.repeat(64),allocations:[{supplierInvoiceId:invoice.invoiceId,amount:'200.00'}]}
 const preview=await previewPaymentRequest(paymentDraft,f.buyer),request={draft:paymentDraft,expectedRevision:preview.revision,idempotencyKey:randomUUID()},payment=await submitPaymentRequest(request,f.buyer)
 expect((await submitPaymentRequest(request,f.buyer)).paymentRequestId).toBe(payment.paymentRequestId)
 await expect(reviewPaymentRequestApproval(payment.paymentRequestId,f.buyer)).rejects.toThrow()
 const approved=await reviewPaymentRequestApproval(payment.paymentRequestId,f.receiver)
 await confirmPaymentRequestApproval({paymentRequestId:payment.paymentRequestId,expectedRevision:approved.revision,idempotencyKey:randomUUID()},f.receiver)
 const user=await db.user.create({data:{organizationId:f.organizationId,email:randomUUID()+'@release.invalid',firstName:'Independent',lastName:'Recorder',isActive:true,isVerified:true,emailVerified:true,mfaBackupCodes:[],roles:{connect:{id:f.roleId}}}})
 const session=await db.session.create({data:{userId:user.id,token:randomUUID(),expiresAt:new Date(Date.now()+3600000),assuranceOrganizationId:f.organizationId,assuranceMethod:'password',assuranceLevel:1,assuranceVerifiedAt:new Date()}})
 const scope={organizationId:f.organizationId,actorId:user.id,sessionId:session.id,sessionToken:session.token},releaseDraft={paymentRequestId:payment.paymentRequestId,executionReference:'SYNTH-'+randomUUID(),executedAt:new Date().toISOString(),evidenceUri:'https://example.invalid/synthetic-execution',evidenceSha256:'c'.repeat(64)}
 const releasePreview=await previewPaymentRelease(releaseDraft,scope),releaseCommand={draft:releaseDraft,expectedRevision:releasePreview.revision,idempotencyKey:randomUUID()},released=await confirmPaymentRelease(releaseCommand,scope)
 expect((await confirmPaymentRelease(releaseCommand,scope)).paymentTransactionId).toBe(released.paymentTransactionId)
 await expect(confirmPaymentRelease({...releaseCommand,draft:{...releaseDraft,executionReference:'changed-reference'}},scope)).rejects.toThrow()
 const final=await state(f.organizationId)
 expect(final.stock).toEqual([{quantity:'2.000',value:'200.00'}]);expect(final.balances.TEST_GRNI).toBe('0.00');expect(final.balances.TEST_AP).toBe('0.00');expect(final.balances.TEST_CASH).toBe('-200.00');expect(final.transactions).toBe(1)
 evidence.push({scenario:'AP receipt → invoice → independent approval → recorded cash settlement',organizationId:f.organizationId,invoiceId:invoice.invoiceId,release:released,final,scope:'Synthetic execution evidence; no external money moved. Provider reconciliation remains separate.'})
})
it('retains a duplicate-safe purchase return and reconciles stock after its reversal',async()=>{
 const f=await setup(),before=await state(f.organizationId),command={organizationId:f.organizationId,purchaseOrderId:f.order.id,goodsReceiptId:f.receipt.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Synthetic damaged unit',occurredAt:new Date(),lines:[{sourceGoodsReceiptLineId:f.receipt.lines[0].id,quantity:'1.000'}]}
 const result=await postPurchaseReturn(command),after=await state(f.organizationId)
 expect((await postPurchaseReturn(command)).purchaseReturn.id).toBe(result.purchaseReturn.id)
 await expect(postPurchaseReturn({...command,lines:[{...command.lines[0],quantity:'2.000'}]})).rejects.toThrow()
 expect(after.stock).toEqual([{quantity:'1.000',value:'100.00'}]);expect(after.balances.TEST_STOCK).toBe('100.00')
 const reversal=await reversePurchaseReturn({organizationId:f.organizationId,purchaseReturnId:result.purchaseReturn.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Synthetic reversal verification',occurredAt:new Date()})
 const restored=await state(f.organizationId);expect(restored.stock).toEqual(before.stock);expect(restored.balances.TEST_STOCK).toBe('200.00')
 evidence.push({scenario:'Purchase return / changed payload / reversal',organizationId:f.organizationId,returnId:result.purchaseReturn.id,reversalId:reversal.purchaseReturn.id,before,after,restored})
})
