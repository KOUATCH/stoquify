import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { releaseSupplierPaymentWithControls, resolveAPCountryPackStatus } from "./ap-control.service"
import { paymentRequestAuthority } from "./payment-request-authority"
import { readPaymentTermsInTx } from "./payment-request.service"
import { readVerifiedPaymentApproval } from "./payment-request-evidence"
import { PAYMENT_EXECUTION_EVENT as eventType, executionEvidenceRequired as evidenceRequired, paymentExecutionKey, readVerifiedPaymentExecution } from "./payment-release-evidence"
import { paymentRequestScopeSchema, type PaymentRequestScope } from "./payment-request-contracts"
import { paymentReleaseDraftSchema, paymentReleaseCommandSchema, paymentReleaseQueueQuerySchema, type PaymentReleaseDraft, type PaymentReleaseCommand, type PaymentReleaseQueueQuery } from "./payment-release-contracts"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt=0;;attempt++) {
    try { return await db.$transaction(work,{timeout:20000,isolationLevel:Prisma.TransactionIsolationLevel.Serializable}) }
    catch(error){const retry=error instanceof Prisma.PrismaClientKnownRequestError&&(error.code==="P2034"||error.code==="P2002"||(error.code==="P2010"&&["40001","40P01"].includes(String(error.meta?.code))));if(!retry)throw error;if(attempt>=2)throw new ConflictError("Concurrent payment recording interrupted this operation. Retry the same confirmation.")}
  }
}
async function approved(tx: Prisma.TransactionClient, id: string, scope: PaymentRequestScope) {
  await tx.$queryRaw`SELECT id FROM supplier_payments WHERE id = ${id} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const request=await readVerifiedPaymentApproval(tx,scope.organizationId,id)
  if([request.payment.requestedById,request.payment.approvedById].includes(scope.actorId))throw new BusinessRuleError("Recording execution requires a user other than the requester and approver.","SOD_VIOLATION")
  return request
}
async function plan(tx: Prisma.TransactionClient,draft:PaymentReleaseDraft,scope:PaymentRequestScope,fresh:boolean) {
  const request=await approved(tx,draft.paymentRequestId,scope),payment=request.payment,executedAt=new Date(draft.executedAt)
  if(payment.status!=="APPROVED")throw new ConflictError("This payment is no longer awaiting execution recording. Inspect its retained outcome.")
  if(executedAt>new Date()||executedAt<request.payment.approvedAt!)throw new BusinessRuleError("Execution must be after independent approval and cannot be in the future.","EXECUTION_EVIDENCE_REQUIRED")
  if(draft.executedAt.slice(0,10)!==request.draft.paymentDate)throw new BusinessRuleError("Execution date differs from the approved accounting date. Review the request before recording payment.","EXECUTION_EVIDENCE_REQUIRED")
  const terms=await readPaymentTermsInTx(tx,request.draft,scope,fresh)
  const periods=await tx.accountingPeriod.findMany({where:{organizationId:scope.organizationId,startDate:{lte:payment.paymentDate},endDate:{gte:payment.paymentDate}},orderBy:{id:"asc"}}),period=periods[0]
  if(periods.length!==1||period.status!=="OPEN")throw new BusinessRuleError("One open accounting period is required for the approved payment date.","PERIOD_UNAVAILABLE")
  await tx.$queryRaw`SELECT id FROM accounting_periods WHERE id = ${period.id} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  const organization=await tx.organization.findUniqueOrThrow({where:{id:scope.organizationId},select:{currency:true,country:true,accountingSettings:true}})
  if(organization.currency!==payment.currency)throw new BusinessRuleError("A supported currency-conversion workflow is required before recording payment.")
  const country=await resolveAPCountryPackStatus(tx,{organizationId:scope.organizationId,documentDate:payment.paymentDate,taxAmount:new Prisma.Decimal(0),purpose:"SUPPLIER_PAYMENT"}),warnings:string[]=[]
  let rule:Awaited<ReturnType<typeof getActivePostingRule>>=null
  try{rule=await getActivePostingRule(scope.organizationId,{sourceType:"SUPPLIER_PAYMENT",postingPurpose:"SUPPLIER_PAYMENT",effectiveAt:payment.paymentDate},tx)}catch(error){if(!(error instanceof BusinessRuleError)&&!(error instanceof NotFoundError))throw error;warnings.push("POSTING_RULE_REVIEW")}
  if(!rule)warnings.push("POSTING_RULE_UNAVAILABLE")
  const journalType=payment.method==="CASH"?"CASH":"BANK",journals=await tx.journal.findMany({where:{organizationId:scope.organizationId,type:journalType,isActive:true},orderBy:{id:"asc"}})
  if(!journals.length)warnings.push("JOURNAL_UNAVAILABLE")
  if(country.countryPackStatus!=="RESOLVED"||country.withholdingTreatmentStatus!=="RESOLVED"||country.operatorActionRequired)warnings.push("COUNTRY_TREATMENT_REVIEW")
  const accounts=rule?await tx.chartOfAccount.findMany({where:{organizationId:scope.organizationId,OR:[{id:{in:rule.lines.map(line=>line.accountId).filter((id):id is string=>!!id)}},{mappingKey:{in:rule.lines.map(line=>line.mappingKey).filter((key):key is string=>!!key)}}]},include:{_count:{select:{children:true}}},orderBy:{id:"asc"}}):[]
  const revision=hashBusinessPayload({version:1,draft,termsRevision:terms.revision,requestEvent:request.event,approvalEvent:request.approvalEvent,payment,periods,organization,country,rule,journals,accounts,warnings})
  return{...terms,draft,paymentRequestId:payment.id,paymentNumber:payment.paymentNumber,approvedAt:payment.approvedAt!.toISOString(),approvedDate:request.draft.paymentDate,approvedMethod:request.draft.method,periodName:period.name,warnings,revision,effect:"RECORD_EXECUTED_PAYMENT_AWAITING_RECONCILIATION" as const}
}
export async function previewPaymentRelease(input:PaymentReleaseDraft,scopeInput:PaymentRequestScope){const draft=paymentReleaseDraftSchema.parse(input),scope=paymentRequestScopeSchema.parse(scopeInput);return transaction(async tx=>{const authority=await paymentRequestAuthority(tx,scope,"release",false);return plan(tx,draft,scope,authority.fresh)})}

async function observed(tx:Prisma.TransactionClient,id:string,scope:PaymentRequestScope){
  const {payment,event,release,command,payload}=await readVerifiedPaymentExecution(tx,scope.organizationId,id)
  const batch=await tx.ledgerPostingBatch.findFirst({where:{id:payment.ledgerPostingBatchId!,organizationId:scope.organizationId,sourceType:"SUPPLIER_PAYMENT",sourceId:id}})
  const transactions=await tx.paymentTransaction.findMany({where:{organizationId:scope.organizationId,sourceType:"SUPPLIER_PAYMENT",sourceId:id}}),paymentTransaction=transactions[0]
  if(!batch||transactions.length!==1||!paymentTransaction||paymentTransaction.direction!=="OUTBOUND"||!paymentTransaction.amount.eq(payment.amount)||paymentTransaction.currencyCode!==payment.currency||paymentTransaction.id!==payload.paymentTransactionId)throw evidenceRequired()
  return{organizationId:scope.organizationId,actorId:scope.actorId,paymentRequestId:id,paymentNumber:payment.paymentNumber,status:payment.status,total:payment.amount.toFixed(2),currency:payment.currency,recordedAt:payment.releasedAt!.toISOString(),executedAt:command.draft.executedAt,executionReference:command.draft.executionReference,requestReference:command.idempotencyKey,reviewedRevision:command.expectedRevision,executionEventId:event.id,releaseEventId:release.id,postingBatchId:batch.id,ledgerStatus:batch.status,paymentTransactionId:paymentTransaction.id,reconciliationState:paymentTransaction.state,observedAt:new Date().toISOString()}
}
export async function confirmPaymentRelease(input:PaymentReleaseCommand,scopeInput:PaymentRequestScope){
  const command=paymentReleaseCommandSchema.parse(input),scope=paymentRequestScopeSchema.parse(scopeInput),commandHash=hashBusinessPayload({command,actorId:scope.actorId})
  return transaction(async tx=>{
    const authority=await paymentRequestAuthority(tx,scope,"release",true),request=await approved(tx,command.draft.paymentRequestId,scope)
    const existing=await tx.businessEvent.findFirst({where:{organizationId:scope.organizationId,eventSource:"INTERNAL",eventType,payload:{path:["idempotencyKey"],equals:command.idempotencyKey}}})
    if(existing){if(existing.sourceId!==request.payment.id||existing.actorId!==scope.actorId||record(existing.payload).commandHash!==commandHash)throw new IdempotencyConflictError("This confirmation reference has different execution evidence.");const result=await observed(tx,request.payment.id,scope);if(result.requestReference!==command.idempotencyKey||result.reviewedRevision!==command.expectedRevision)throw evidenceRequired();return{...result,replayed:true}}
    if(request.payment.status!=="APPROVED")throw evidenceRequired()
    const key=paymentExecutionKey(request.payment.method,command.draft.executionReference)
    if(await tx.businessEvent.findFirst({where:{organizationId:scope.organizationId,eventSource:"INTERNAL",idempotencyKey:key}}))throw new IdempotencyConflictError("This execution reference is already recorded. Review its existing payment instead of applying it again.")
    const preview=await plan(tx,command.draft,scope,true)
    if(preview.revision!==command.expectedRevision)throw new ConflictError("Payment or accounting evidence changed. Review the current execution record again.")
    const result=await releaseSupplierPaymentWithControls({organizationId:scope.organizationId,supplierPaymentId:request.payment.id,releasedById:scope.actorId,idempotencyKey:`payment-record:${command.idempotencyKey}`},{organizationId:scope.organizationId,actorId:scope.actorId,actorPermissions:authority.permissions,lastAuthAt:authority.lastAuthAt},tx)
    const payment=await tx.supplierPayment.findUniqueOrThrow({where:{id:request.payment.id}}),release=await tx.businessEvent.findFirstOrThrow({where:{id:result.businessEventId!,organizationId:scope.organizationId}})
    if(!payment.releasedAt||!('paymentTransactionId'in result)||!result.paymentTransactionId)throw evidenceRequired()
    const payload={version:1,paymentRequestId:payment.id,actorId:scope.actorId,commandHash,idempotencyKey:command.idempotencyKey,reviewedRevision:command.expectedRevision,executionReference:command.draft.executionReference,executedAt:command.draft.executedAt,evidenceUri:command.draft.evidenceUri,evidenceSha256:command.draft.evidenceSha256,recordedAt:payment.releasedAt.toISOString(),approvalEventId:request.approvalEvent.id,approvalEventHash:request.approvalEvent.payloadHash,releaseEventId:release.id,releaseEventHash:release.payloadHash,paymentTransactionId:result.paymentTransactionId}
    const event=await recordBusinessEventInTx(tx,{organizationId:scope.organizationId,eventType,eventSource:"INTERNAL",idempotencyKey:key,actorId:scope.actorId,occurredAt:payment.releasedAt,sourceType:"SUPPLIER_PAYMENT",sourceId:payment.id,documentHash:`sha256:${command.draft.evidenceSha256}`,payload})
    if(!event.created)throw new ConflictError("Execution evidence already exists. Retry the same confirmation.")
    await markBusinessEventAppliedInTx(tx,scope.organizationId,event.event.id)
    await tx.auditLog.create({data:{organizationId:scope.organizationId,userId:scope.actorId,entityType:"SupplierPayment",entityId:payment.id,action:"SUPPLIER_PAYMENT_EXECUTION_RECORDED",changes:{executionEventId:event.event.id,releaseEventId:release.id,commandHash,reviewedRevision:command.expectedRevision}}})
    return{...await observed(tx,payment.id,scope),replayed:false}
  })
}
export async function loadPaymentReleaseQueue(input:PaymentReleaseQueueQuery,scopeInput:PaymentRequestScope){const query=paymentReleaseQueueQuerySchema.parse(input),scope=paymentRequestScopeSchema.parse(scopeInput);return transaction(async tx=>{await paymentRequestAuthority(tx,scope,"release",false);const rows=await tx.supplierPayment.findMany({where:{organizationId:scope.organizationId,deletedAt:null,status:{in:["APPROVED","RELEASED","POSTED"]},supplier:{organizationId:scope.organizationId},...(query.after?{id:{gt:query.after}}:{}),OR:[{paymentNumber:{contains:query.search,mode:"insensitive"}},{supplier:{name:{contains:query.search,mode:"insensitive"}}}]},select:{id:true,paymentNumber:true,paymentDate:true,status:true,amount:true,currency:true,requestedById:true,approvedById:true,supplier:{select:{name:true}}},orderBy:{id:"asc"},take:26});return{organizationId:scope.organizationId,actorId:scope.actorId,checkedAt:new Date().toISOString(),rows:rows.slice(0,25).map(row=>({id:row.id,number:row.paymentNumber,paymentDate:row.paymentDate.toISOString().slice(0,10),supplierName:row.supplier.name,status:row.status,amount:row.amount.toFixed(2),currency:row.currency,independentRecorderRequired:[row.requestedById,row.approvedById].includes(scope.actorId)})),next:rows.length>25?rows[24].id:null}})}
export async function readPaymentReleaseOutcome(idInput:string,scopeInput:PaymentRequestScope){const id=paymentReleaseDraftSchema.shape.paymentRequestId.parse(idInput),scope=paymentRequestScopeSchema.parse(scopeInput);return transaction(async tx=>{await paymentRequestAuthority(tx,scope,"release",false);return observed(tx,id,scope)})}
