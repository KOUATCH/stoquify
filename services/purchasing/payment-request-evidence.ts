import "server-only"
import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { paymentRequestDraftSchema } from "./payment-request-contracts"
import type { ApproveSupplierPaymentInput } from "./ap-control.schemas"

export const PAYMENT_REQUEST_EVENT = "supplier.payment.requested"
export const PAYMENT_REQUEST_APPROVAL_EVENT = "supplier.payment.request_approved"
export const paymentRequestEventKey = (key: string) => `payment-request:${key}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
export async function readVerifiedPaymentRequest(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  const payment = await tx.supplierPayment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { allocations: { orderBy: { supplierInvoiceId: "asc" } } } })
  if (!payment) throw new NotFoundError("Payment request is unavailable.")
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: id, eventType: PAYMENT_REQUEST_EVENT }, orderBy: { id: "asc" } }), event = events[0], payload = record(event?.payload), parsed = paymentRequestDraftSchema.safeParse(payload.draft)
  const invalid = () => new BusinessRuleError("A retained authenticated payment request is required before approval.", "REVIEW_REQUIRED")
  if (events.length !== 1 || !event || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload.version !== 1 || payload.paymentRequestId !== payment.id || payload.organizationId !== organizationId || event.actorId !== payment.requestedById || payload.requesterId !== payment.requestedById || !parsed.success) throw invalid()
  const draft = parsed.data
  const signature = (rows: Array<{ supplierInvoiceId: string; amount: Prisma.Decimal | string }>) => JSON.stringify(rows.map(row => ({ supplierInvoiceId: row.supplierInvoiceId, amount: new Prisma.Decimal(row.amount).toFixed(2) })).sort((a,b) => a.supplierInvoiceId.localeCompare(b.supplierInvoiceId)))
  if (payment.supplierId !== draft.supplierId || payment.bankAccountId !== draft.bankAccountId || payment.method !== draft.method || payment.paymentDate.toISOString().slice(0,10) !== draft.paymentDate || payment.documentHash !== `sha256:${draft.documentSha256}` || (payment.notes ?? "") !== (draft.notes ?? "") || payment.currency !== payload.currency || payment.amount.toFixed(2) !== payload.total || signature(payment.allocations) !== signature(draft.allocations) || payment.allocations.some(row => row.organizationId !== organizationId || row.supplierPaymentId !== payment.id)) throw invalid()
  return { payment, event, payload, draft }
}

export async function assertPaymentRequestApprovalTerms(tx: Prisma.TransactionClient, input: ApproveSupplierPaymentInput) {
  if (!input.supplierPaymentRequestId) throw new BusinessRuleError("Submit an authenticated payment request before approval.", "REVIEW_REQUIRED")
  const request = await readVerifiedPaymentRequest(tx,input.organizationId,input.supplierPaymentRequestId)
  const terms = (rows: Array<{supplierInvoiceId:string;amount:unknown}>) => JSON.stringify(rows.map(row=>({id:row.supplierInvoiceId,amount:new Prisma.Decimal(String(row.amount)).toFixed(2)})).sort((a,b)=>a.id.localeCompare(b.id)))
  if (input.requestedById !== request.payment.requestedById || input.supplierId !== request.draft.supplierId || input.bankAccountId !== request.draft.bankAccountId || input.method !== request.draft.method || new Date(input.paymentDate ?? request.payment.paymentDate).toISOString().slice(0,10) !== request.draft.paymentDate || terms(input.allocations) !== terms(request.draft.allocations) || input.documentHash !== request.payment.documentHash || (input.notes ?? "") !== (request.payment.notes ?? "")) throw new BusinessRuleError("Approval must use the exact authenticated request terms.", "REVIEW_REQUIRED")
  return request
}

export async function readVerifiedPaymentApproval(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  const request=await readVerifiedPaymentRequest(tx,organizationId,id)
  const events=await tx.businessEvent.findMany({where:{organizationId,sourceType:"SUPPLIER_PAYMENT",sourceId:id,eventType:PAYMENT_REQUEST_APPROVAL_EVENT}}),event=events[0],payload=record(event?.payload)
  if(events.length!==1||!event||event.schemaVersion!==1||payload.version!==1||event.eventSource!=="INTERNAL"||event.status!=="APPLIED"||!event.processedAt||event.payloadHash!==hashBusinessPayload(event.payload)||!event.actorId||event.actorId!==request.payment.approvedById||event.actorId===request.payment.requestedById||payload.paymentRequestId!==id||payload.requestEventId!==request.event.id||payload.requestHash!==request.event.payloadHash||payload.approverId!==event.actorId||payload.approvedAt!==request.payment.approvedAt?.toISOString()||payload.approvedAt!==event.occurredAt.toISOString())throw new BusinessRuleError("Verified independent approval of the retained request is required.","REVIEW_REQUIRED")
  return {...request,approvalEvent:event,approvalPayload:payload}
}
