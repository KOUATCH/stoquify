import {randomUUID,createHash} from 'node:crypto'
import {Prisma} from '@prisma/client'
import {db} from '@/prisma/db'
import {settledFixture} from './remaining-local.fixture'
import {REQUIRED_ACCOUNTING_MAPPINGS,REQUIRED_READY_POSTING_PURPOSES,REQUIRED_READY_POSTING_SOURCES,markAccountingSetupReady} from '@/services/accounting/accounting-settings.service'
import {getDefaultPostingRuleTemplates} from '@/services/accounting/default-posting-rules.service'
import {createPostingRule} from '@/services/accounting/posting-rules.service'
import {ensureDefaultJournals} from '@/services/accounting/journals.service'
import {previewPaymentReconciliation,proposePaymentReconciliation,reviewPaymentReconciliation,decidePaymentReconciliation} from '@/services/purchasing/payment-reconciliation-service'
import {proposeBalanceSheetEvidence,decideBalanceSheetEvidence} from '@/services/accounting/balance-sheet-evidence.service'

export const docHash=(value:string)=>'sha256:'+createHash('sha256').update(value).digest('hex')
export async function certifiedFixture(){
 const f=await settledFixture(),organizationId=f.organizationId
 const aliases:Record<string,string>={CASH_ON_HAND:'TEST_CASH',ACCOUNTS_RECEIVABLE:'TEST_AR',SALES_REVENUE:'TEST_REVENUE',COGS:'TEST_COGS'}
 let n=0
 for(const m of REQUIRED_ACCOUNTING_MAPPINGS){
  const existing=await db.chartOfAccount.findFirst({where:{organizationId,OR:[{mappingKey:m.key},{code:aliases[m.key]??'__none__'}]}})
  const data={mappingKey:m.key,type:m.type,normalBalance:m.normalBalance,syscohadaClass:m.syscohadaClass,syscohadaReference:'Synthetic chart fixture '+m.key,code:m.syscohadaClass+'90'+String(++n).padStart(2,'0')}
  if(existing)await db.chartOfAccount.update({where:{id:existing.id},data})
  else await db.chartOfAccount.create({data:{...data,organizationId,nameEn:'Synthetic '+m.key,currency:'XAF'}})
 }
 await ensureDefaultJournals(organizationId,f.buyer.actorId)
 for(const purpose of REQUIRED_READY_POSTING_PURPOSES){
  if(purpose!=='PURCHASE_RETURN'&&await db.postingRule.count({where:{organizationId,postingPurpose:purpose}}))continue
  const template=getDefaultPostingRuleTemplates().find(t=>t.postingPurpose===purpose)
  // The two non-exercised readiness scaffolds have no shared template. Their
  // balanced synthetic lines are configuration only, not transaction evidence.
  await createPostingRule(organizationId,template??{code:'SYNTH_'+purpose,nameEn:'Synthetic readiness scaffold '+purpose,postingPurpose:purpose,sourceType:REQUIRED_READY_POSTING_SOURCES[purpose],lines:[{side:'DEBIT',mappingKey:'INVENTORY_VARIANCE',amountSource:'SOURCE_AMOUNT'},{side:'CREDIT',mappingKey:purpose==='CASH_DRAWER_CLOSE'?'CASH_ON_HAND':'ACCOUNTS_PAYABLE',amountSource:'SOURCE_AMOUNT'}]},f.buyer.actorId)
 }
 await markAccountingSetupReady(organizationId,f.receiver.actorId,{actorPermissions:['accounting.setup.manage'],lastAuthAt:new Date()})
 const role=await db.role.findUniqueOrThrow({where:{id:f.roleId}})
 await db.role.update({where:{id:f.roleId},data:{permissions:[...role.permissions,'payments.reconciliation.read','payments.reconciliation.exception.resolve','payments.reconciliation.sign','accounting.journal.read']}})
 const reviewer=await db.user.create({data:{organizationId,email:randomUUID()+'@close.invalid',firstName:'Independent',lastName:'Close reviewer',isActive:true,isVerified:true,emailVerified:true,mfaBackupCodes:[],roles:{connect:{id:f.roleId}}}})
 const session=await db.session.create({data:{userId:reviewer.id,token:randomUUID(),expiresAt:new Date(Date.now()+3600000),assuranceOrganizationId:organizationId,assuranceMethod:'password',assuranceLevel:1,assuranceVerifiedAt:new Date()}})
 const reviewerScope={organizationId,actorId:reviewer.id,sessionId:session.id,sessionToken:session.token}
 const payment=await db.supplierPayment.findFirstOrThrow({where:{organizationId}})
 const draft={paymentRequestId:payment.id,evidence:{kind:'CASH_VOUCHER' as const,voucherReference:'SYNTH-'+randomUUID(),evidenceUri:'https://example.invalid/close-cash-voucher',evidenceSha256:'f'.repeat(64),recipientName:'Synthetic supplier recipient',acknowledgedAt:new Date().toISOString(),purpose:'Synthetic cash payment review for local lifecycle',acknowledgment:'RECIPIENT_ACKNOWLEDGED' as const}}
 const preview=await previewPaymentReconciliation(draft,f.buyer)
 await proposePaymentReconciliation({draft,expectedRevision:preview.revision,idempotencyKey:randomUUID()},f.buyer)
 const review=await reviewPaymentReconciliation(payment.id,reviewerScope)
 const cashReceipt=await decidePaymentReconciliation({paymentRequestId:payment.id,proposalId:review.proposalId!,decision:'APPROVE',reason:'Independent synthetic cash receipt review',expectedRevision:review.revision,idempotencyKey:randomUUID()},reviewerScope)
 expect(cashReceipt.status).toBe('CASH_REVIEWED')
 // Complete the synthetic period after its real business steps. No status or
 // certificate is seeded. Subsequent balance schedules use the real owners.
 const period=await db.accountingPeriod.findFirstOrThrow({where:{organizationId}})
 const ended=await db.accountingPeriod.update({where:{id:period.id},data:{endDate:new Date(Date.now()-1)}})
 return {...f,period:ended,reviewerId:reviewer.id,cashReceipt}
}
export async function approveSchedules(f:Awaited<ReturnType<typeof certifiedFixture>>){
 const accounts=await db.chartOfAccount.findMany({where:{organizationId:f.organizationId,type:{in:['ASSET','CONTRA_ASSET','LIABILITY','EQUITY']}}}),receipts=[]
 for(const account of accounts){
  const lines=await db.journalEntryLine.findMany({where:{organizationId:f.organizationId,accountId:account.id,journalEntry:{periodId:f.period.id,status:{in:['POSTED','REVERSED']}}}})
  const additions=lines.reduce((v,l)=>v.plus(account.normalBalance==='DEBIT'?l.debit:l.credit),new Prisma.Decimal(0)),reductions=lines.reduce((v,l)=>v.plus(account.normalBalance==='DEBIT'?l.credit:l.debit),new Prisma.Decimal(0))
  const input={ledgerAccountId:account.id,periodId:f.period.id,currency:'XAF',idempotencyKey:randomUUID(),scheduleKind:'OTHER' as const,basis:lines.length?'SUPPORTING_SCHEDULE' as const:'ZERO_ACTIVITY' as const,explanation:'Synthetic source-document schedule for close lifecycle',sourceReference:'https://example.invalid/close-schedule/'+account.id,sourceDocumentHash:docHash(account.id),items:lines.length?[{reference:account.id,description:'Synthetic ledger-supported schedule',openingBalance:'0.00',additions:additions.toFixed(2),reductions:reductions.toFixed(2),closingBalance:additions.minus(reductions).toFixed(2),sourceReference:'https://example.invalid/close-schedule/'+account.id,sourceDocumentHash:docHash(account.id)}]:[]}
  const proposed=await proposeBalanceSheetEvidence(input,{organizationId:f.organizationId,actorId:f.buyer.actorId,actorPermissions:['accounting.close.run'],lastAuthAt:new Date()})
  const approved=await decideBalanceSheetEvidence({evidenceId:proposed.id,expectedEvidenceHash:proposed.evidenceHash,decision:'APPROVE'},{organizationId:f.organizationId,actorId:f.reviewerId,actorPermissions:['accounting.close.certify'],lastAuthAt:new Date()})
  receipts.push({id:approved.id,hash:approved.evidenceHash,accountCode:account.code,status:approved.status,balances:input.items})
 }
 return receipts
}
