import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { paymentReleaseCommandSchema } from "./payment-release-contracts"
import { readVerifiedPaymentApproval } from "./payment-request-evidence"

export const PAYMENT_EXECUTION_EVENT = "supplier.payment.execution_recorded"
export const paymentExecutionKey = (method: string, reference: string) => `payment-execution:${hashBusinessPayload({ method, reference })}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const executionEvidenceRequired = () => new BusinessRuleError("Retained payment execution and release evidence requires review.", "REVIEW_REQUIRED")

/** Verifies recorded operator evidence and its source links; does not certify bank settlement. */
export async function readVerifiedPaymentExecution(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  const request = await readVerifiedPaymentApproval(tx, organizationId, id), payment = request.payment
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: id, eventType: PAYMENT_EXECUTION_EVENT } }), event = events[0], payload = record(event?.payload)
  const parsed = paymentReleaseCommandSchema.safeParse({ draft: { paymentRequestId: payload.paymentRequestId, executionReference: payload.executionReference, executedAt: payload.executedAt, evidenceUri: payload.evidenceUri, evidenceSha256: payload.evidenceSha256 }, expectedRevision: payload.reviewedRevision, idempotencyKey: payload.idempotencyKey })
  if (!parsed.success || events.length !== 1 || !event || !payment.releasedAt || !payment.releasedById || !payment.postedBusinessEventId || !payment.ledgerPostingBatchId) throw executionEvidenceRequired()
  const command = parsed.data
  if (event.schemaVersion !== 1 || event.eventSource !== "INTERNAL" || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload.version !== 1 || command.draft.paymentRequestId !== id || event.actorId !== payment.releasedById || payload.actorId !== payment.releasedById || [payment.requestedById, payment.approvedById].includes(payment.releasedById) || payload.recordedAt !== payment.releasedAt.toISOString() || event.occurredAt.toISOString() !== payload.recordedAt || payload.releaseEventId !== payment.postedBusinessEventId || payload.approvalEventId !== request.approvalEvent.id || payload.approvalEventHash !== request.approvalEvent.payloadHash || event.documentHash !== `sha256:${command.draft.evidenceSha256}` || payload.commandHash !== hashBusinessPayload({ command, actorId: event.actorId }) || event.idempotencyKey !== paymentExecutionKey(payment.method, command.draft.executionReference)) throw executionEvidenceRequired()
  const executedAt = new Date(command.draft.executedAt)
  if (executedAt < payment.approvedAt! || executedAt > payment.releasedAt || command.draft.executedAt.slice(0, 10) !== request.draft.paymentDate) throw executionEvidenceRequired()
  const release = await tx.businessEvent.findFirst({ where: { id: payment.postedBusinessEventId, organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: id, eventType: "supplier.payment.released" } }), releasePayload = record(release?.payload)
  if (!release || release.schemaVersion !== 1 || release.eventSource !== "INTERNAL" || release.status !== "APPLIED" || !release.processedAt || release.payloadHash !== hashBusinessPayload(release.payload) || release.actorId !== payment.releasedById || payload.releaseEventHash !== release.payloadHash || releasePayload.ledgerPostingBatchId !== payment.ledgerPostingBatchId || releasePayload.paymentTransactionId !== payload.paymentTransactionId) throw executionEvidenceRequired()
  return { request, payment, event, release, command, payload }
}
