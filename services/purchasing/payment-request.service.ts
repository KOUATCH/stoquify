import "server-only"
import { randomUUID } from "crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { lockSupplierPaymentSources, readSupplierPaymentBalances } from "./supplier-payment-balance"
import { paymentRequestAuthority } from "./payment-request-authority"
import { PAYMENT_REQUEST_EVENT, PAYMENT_REQUEST_APPROVAL_EVENT, paymentRequestEventKey, readVerifiedPaymentRequest, readVerifiedPaymentApproval } from "./payment-request-evidence"
import { approveSupplierPaymentWithControls } from "./ap-control.service"
import { paymentRequestApprovalSchema, type PaymentRequestApproval } from "./payment-request-contracts"
import { paymentRequestCommandSchema, paymentRequestDraftSchema, paymentRequestScopeSchema, type PaymentRequestCommand, type PaymentRequestDraft, type PaymentRequestPreview, type PaymentRequestScope } from "./payment-request-contracts"

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) { const retry = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002" || (error.code === "P2010" && ["40001","40P01"].includes(String(error.meta?.code)))); if (!retry) throw error; if (attempt >= 2) throw new ConflictError("Concurrent payment changes interrupted this operation. Retry the same request.") }
  }
}
const normalize = (input: PaymentRequestDraft): PaymentRequestDraft => ({ ...input, allocations: input.allocations.map(row => ({...row,amount:new Prisma.Decimal(row.amount).toFixed(2)})).sort((a,b)=>a.supplierInvoiceId.localeCompare(b.supplierInvoiceId)) })

/** Shared terms read inside an already-authorized transaction; never establishes actor authority. */
export async function readPaymentTermsInTx(tx: Prisma.TransactionClient, draft: PaymentRequestDraft, scope: PaymentRequestScope, fresh: boolean): Promise<PaymentRequestPreview> {
  await lockSupplierPaymentSources(tx,scope.organizationId,draft.supplierId,draft.allocations.map(row=>row.supplierInvoiceId))
  const supplier = await tx.supplier.findFirst({where:{id:draft.supplierId,organizationId:scope.organizationId,isActive:true,deletedAt:null},select:{id:true,name:true}})
  const bank = await tx.supplierBankAccount.findFirst({where:{id:draft.bankAccountId,organizationId:scope.organizationId,supplierId:draft.supplierId,status:"APPROVED",deletedAt:null}})
  if (!supplier || !bank) throw new NotFoundError("Supplier or approved payment destination is unavailable.")
  if (await tx.supplierBankChangeRequest.count({where:{organizationId:scope.organizationId,supplierId:draft.supplierId,status:"PENDING"}})) throw new BusinessRuleError("A pending destination change must be resolved before requesting payment.")
  const invoices = await tx.supplierInvoice.findMany({where:{organizationId:scope.organizationId,supplierId:draft.supplierId,id:{in:draft.allocations.map(row=>row.supplierInvoiceId)},deletedAt:null,status:{in:["POSTED","PAYMENT_PENDING"]}},orderBy:{id:"asc"}})
  if(invoices.length!==draft.allocations.length)throw new BusinessRuleError("Every payment allocation must reference an eligible invoice for this supplier.")
  const currency=invoices[0].currency,balances=await readSupplierPaymentBalances(tx,scope.organizationId,invoices,currency),credits=await tx.supplierCreditNote.findMany({where:{organizationId:scope.organizationId,supplierInvoiceId:{in:invoices.map(row=>row.id)}},orderBy:{id:"asc"}})
  const rows=draft.allocations.map(allocation=>{const invoice=invoices.find(row=>row.id===allocation.supplierInvoiceId)!,available=balances.get(invoice.id)!;if(new Prisma.Decimal(allocation.amount).gt(available))throw new BusinessRuleError("Payment allocation exceeds the current invoice balance after credits.");return{id:invoice.id,number:invoice.invoiceNumber,available:available.toFixed(2),amount:allocation.amount}})
  const total=rows.reduce((sum,row)=>sum.plus(row.amount),new Prisma.Decimal(0)).toFixed(2),revision=hashBusinessPayload({version:1,draft,invoices,credits,bank,supplier,total,currency})
  return {organizationId:scope.organizationId,actorId:scope.actorId,draft,revision,total,currency,supplierName:supplier.name,bankLabel:[bank.bankName,bank.accountNumberMasked,bank.mobileMoneyProvider,bank.mobileMoneyPhoneMasked].filter(Boolean).join(" · "),checkedAt:new Date().toISOString(),fresh,invoices:rows}
}
export async function previewPaymentRequest(input: PaymentRequestDraft, scopeInput: PaymentRequestScope) {
  const draft=normalize(paymentRequestDraftSchema.parse(input)),scope=paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx=>{const authority=await paymentRequestAuthority(tx,scope,"request",false);return readPaymentTermsInTx(tx,draft,scope,authority.fresh)})
}
export async function submitPaymentRequest(input: PaymentRequestCommand, scopeInput: PaymentRequestScope) {
  const parsed=paymentRequestCommandSchema.parse(input),draft=normalize(parsed.draft),scope=paymentRequestScopeSchema.parse(scopeInput),requestHash=hashBusinessPayload({draft,expectedRevision:parsed.expectedRevision,requesterId:scope.actorId}),key=paymentRequestEventKey(parsed.idempotencyKey)
  return transaction(async tx=>{
    await paymentRequestAuthority(tx,scope,"request",true)
    const replay=await tx.businessEvent.findFirst({where:{organizationId:scope.organizationId,eventSource:"INTERNAL",idempotencyKey:key}})
    if(replay){const verified=await readVerifiedPaymentRequest(tx,scope.organizationId,replay.sourceId!);if(verified.payload.requestHash!==requestHash||verified.payment.requestedById!==scope.actorId)throw new IdempotencyConflictError("This request reference already belongs to different payment terms.");return{paymentRequestId:verified.payment.id,eventId:verified.event.id,requesterId:verified.payment.requestedById,status:verified.payment.status,replayed:true}}
    const preview=await readPaymentTermsInTx(tx,draft,scope,true)
    if(preview.revision!==parsed.expectedRevision)throw new ConflictError("Payment sources changed. Review the current terms before submitting.")
    const id=randomUUID(),at=new Date(),payload={version:1,paymentRequestId:id,organizationId:scope.organizationId,requesterId:scope.actorId,draft,total:preview.total,currency:preview.currency,reviewedRevision:preview.revision,requestHash,requestedAt:at.toISOString()}
    await tx.supplierPayment.create({data:{id,organizationId:scope.organizationId,supplierId:draft.supplierId,bankAccountId:draft.bankAccountId,paymentNumber:`REQ-${id}`,status:"DRAFT",method:draft.method,amount:new Prisma.Decimal(preview.total),currency:preview.currency,paymentDate:new Date(draft.paymentDate+"T00:00:00Z"),idempotencyKey:key,documentHash:`sha256:${draft.documentSha256}`,evidenceHash:`sha256:${hashBusinessPayload(payload)}`,requestedById:scope.actorId,notes:draft.notes,metadata:{requestVersion:1,requestHash},allocations:{create:draft.allocations.map(row=>({organizationId:scope.organizationId,supplierInvoiceId:row.supplierInvoiceId,amount:new Prisma.Decimal(row.amount)}))}}})
    const event=await recordBusinessEventInTx(tx,{organizationId:scope.organizationId,eventType:PAYMENT_REQUEST_EVENT,eventSource:"INTERNAL",idempotencyKey:key,actorId:scope.actorId,occurredAt:at,sourceType:"SUPPLIER_PAYMENT",sourceId:id,documentHash:`sha256:${draft.documentSha256}`,payload})
    if(!event.created)throw new ConflictError("Request evidence already exists. Retry the same request reference.")
    await markBusinessEventAppliedInTx(tx,scope.organizationId,event.event.id)
    await tx.auditLog.create({data:{organizationId:scope.organizationId,userId:scope.actorId,entityType:"SupplierPayment",entityId:id,action:"SUPPLIER_PAYMENT_REQUESTED",changes:{eventId:event.event.id,requestHash,reviewedRevision:preview.revision,amount:preview.total,currency:preview.currency}}})
    return{paymentRequestId:id,eventId:event.event.id,requesterId:scope.actorId,status:"DRAFT" as const,replayed:false}
  })
}

async function approvalPlan(tx: Prisma.TransactionClient, paymentRequestId: string, scope: PaymentRequestScope, fresh: boolean) {
  await tx.$queryRaw`SELECT id FROM supplier_payments WHERE id = ${paymentRequestId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const request=await readVerifiedPaymentRequest(tx,scope.organizationId,paymentRequestId)
  if(request.payment.requestedById===scope.actorId)throw new BusinessRuleError("An independent approver must review this payment request.","SOD_VIOLATION")
  if(request.payment.status!=="DRAFT")throw new ConflictError("This payment request is no longer awaiting approval.")
  const preview=await readPaymentTermsInTx(tx,request.draft,scope,fresh)
  if(preview.total!==request.payment.amount.toFixed(2)||preview.currency!==request.payment.currency)throw new ConflictError("The requested payment terms changed.")
  return {...preview,paymentRequestId,requesterId:request.payment.requestedById,requestEventId:request.event.id,revision:hashBusinessPayload({version:1,sourceRevision:preview.revision,paymentRequestId,requestHash:request.event.payloadHash})}
}
export async function reviewPaymentRequestApproval(paymentRequestId: string, scopeInput: PaymentRequestScope) {
  const scope=paymentRequestScopeSchema.parse(scopeInput)
  paymentRequestApprovalSchema.shape.paymentRequestId.parse(paymentRequestId)
  return transaction(async tx=>{const authority=await paymentRequestAuthority(tx,scope,"approve",false);return approvalPlan(tx,paymentRequestId,scope,authority.fresh)})
}
export async function confirmPaymentRequestApproval(input: PaymentRequestApproval, scopeInput: PaymentRequestScope) {
  const parsed=paymentRequestApprovalSchema.parse(input),scope=paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx=>{
    const authority=await paymentRequestAuthority(tx,scope,"approve",true)
    await tx.$queryRaw`SELECT id FROM supplier_payments WHERE id = ${parsed.paymentRequestId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const request=await readVerifiedPaymentRequest(tx,scope.organizationId,parsed.paymentRequestId)
    if(request.payment.requestedById===scope.actorId)throw new BusinessRuleError("An independent approver must review this payment request.","SOD_VIOLATION")
    const metadata=request.payment.metadata as Record<string,unknown> | null
    if(request.payment.status!=="DRAFT"){
      const evidence=await readVerifiedPaymentApproval(tx,scope.organizationId,request.payment.id)
      if(evidence.approvalPayload.idempotencyKey!==parsed.idempotencyKey||evidence.approvalPayload.reviewedRevision!==parsed.expectedRevision)throw new IdempotencyConflictError("This request has different retained approval evidence.")
      if(request.payment.approvedById!==scope.actorId||metadata?.requestApprovalKey!==parsed.idempotencyKey||metadata?.requestApprovalRevision!==parsed.expectedRevision)throw new IdempotencyConflictError("This request already has a different approval decision.")
      return{paymentRequestId:request.payment.id,status:request.payment.status,replayed:true}
    }
    const preview=await approvalPlan(tx,parsed.paymentRequestId,scope,true)
    if(preview.revision!==parsed.expectedRevision)throw new ConflictError("Request evidence changed. Review the current payment request again.")
    const result=await approveSupplierPaymentWithControls({supplierPaymentRequestId:request.payment.id,organizationId:scope.organizationId,supplierId:request.draft.supplierId,bankAccountId:request.draft.bankAccountId,method:request.draft.method,paymentDate:request.draft.paymentDate,requestedById:request.payment.requestedById,approvedById:scope.actorId,allocations:request.draft.allocations,documentHash:request.payment.documentHash!,evidenceHash:request.payment.evidenceHash!,notes:request.draft.notes,idempotencyKey:`payment-approval:${parsed.idempotencyKey}`},{organizationId:scope.organizationId,actorId:scope.actorId,actorPermissions:authority.permissions,lastAuthAt:authority.lastAuthAt},tx)
    const approvedAt=new Date(),event=await recordBusinessEventInTx(tx,{organizationId:scope.organizationId,eventType:PAYMENT_REQUEST_APPROVAL_EVENT,eventSource:"INTERNAL",idempotencyKey:`payment-request-approval:${parsed.idempotencyKey}`,actorId:scope.actorId,occurredAt:approvedAt,sourceType:"SUPPLIER_PAYMENT",sourceId:request.payment.id,payload:{version:1,paymentRequestId:request.payment.id,requestEventId:request.event.id,requestHash:request.event.payloadHash,approverId:scope.actorId,reviewedRevision:parsed.expectedRevision,idempotencyKey:parsed.idempotencyKey,approvedAt:approvedAt.toISOString()}})
    if(!event.created)throw new ConflictError("Approval evidence already exists. Retry the same decision.")
    await markBusinessEventAppliedInTx(tx,scope.organizationId,event.event.id)
    await tx.supplierPayment.update({where:{id:request.payment.id},data:{approvedAt,metadata:{...(result.supplierPayment.metadata as Record<string,Prisma.InputJsonValue>),requestApprovalKey:parsed.idempotencyKey,requestApprovalRevision:parsed.expectedRevision}}})
    return{paymentRequestId:result.supplierPayment.id,status:result.supplierPayment.status,replayed:false}
  })
}
