import { AccountingSourceType, Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME } from "./customer-statement-delivery.service"
import { canRetryUnsentStatement, statementRecoveryRevision } from "./customer-statement-delivery-recovery"
import { retryCustomerStatementInputSchema, type RetryCustomerStatementInput } from "./customer-statement.schemas"

const id = z.string().trim().min(1).max(191)
export type CustomerStatementRetryReceipt = { deliveryId: string; statementId: string; eventId: string; requestedAt: string; replayed: boolean }
export const statementRecoveryQueueSelect = {
  id: true, status: true, attempts: true, maxAttempts: true, lastErrorCode: true,
  updatedAt: true, payloadHash: true, metadata: true,
} satisfies Prisma.BusinessEventOutboxSelect

export async function retryCustomerStatementDelivery(
  input: RetryCustomerStatementInput & { organizationId: string; actorId: string },
  client: typeof db = db,
): Promise<CustomerStatementRetryReceipt> {
  const { organizationId: rawOrg, actorId: rawActor, ...rawCommand } = input
  const organizationId = id.parse(rawOrg), actorId = id.parse(rawActor), command = retryCustomerStatementInputSchema.parse(rawCommand)
  const key = "statement-retry:" + command.idempotencyKey, payloadHash = hashBusinessPayload({ organizationId, actorId, ...command })
  const work = () => client.$transaction(async tx => {
    const actor = await tx.user.findFirst({ where: { id: actorId, organizationId, isActive: true, organization: { isActive: true, deletedAt: null } }, select: { id: true } })
    if (!actor) throw new NotFoundError("Active statement operator not found")
    const delivery = await tx.customerStatementDelivery.findFirst({
      where: { id: command.deliveryId, organizationId, statementSnapshotId: command.statementId, statementSnapshot: { customerId: command.customerId, organizationId } },
      include: { token: true, statementSnapshot: true, states: { orderBy: { version: "desc" }, take: 1 } },
    })
    if (!delivery) throw new NotFoundError("Customer statement delivery not found")
    const existing = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId, eventSource: "INTERNAL", idempotencyKey: key } } })
    if (existing) {
      if (existing.payloadHash !== payloadHash || existing.eventType !== "customer.statement.delivery.retry.requested" || existing.status !== "APPLIED") throw new IdempotencyConflictError()
      return { deliveryId: delivery.id, statementId: command.statementId, eventId: existing.id, requestedAt: existing.occurredAt.toISOString(), replayed: true }
    }
    const queue = await tx.businessEventOutbox.findFirst({ where: { id: delivery.outboxId, organizationId, eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME } })
    if (!queue) throw new NotFoundError("Statement processing request not found")
    if (statementRecoveryRevision(queue) !== command.expectedRevision) throw new ConflictError("Statement processing changed. Refresh its history before reviewing another retry.")
    if (!canRetryUnsentStatement(queue, delivery.states[0])) throw new BusinessRuleError("Only a verified unsent request waiting for setup can resume. Other outcomes require investigation.")
    const now = new Date(), snapshot = delivery.statementSnapshot, token = delivery.token
    if (token.organizationId !== organizationId || token.statementSnapshotId !== snapshot.id || token.status !== "ACTIVE" || token.revokedAt || token.expiresAt <= now ||
      snapshot.truncated || hashBusinessPayload(snapshot.statementPayload) !== snapshot.contentHash || snapshot.contentHash !== delivery.statementContentHash || token.statementContentHash !== snapshot.contentHash ||
      delivery.consentCapturedAt > now || !/^sha256:[0-9a-f]{64}$/.test(delivery.consentEvidenceHash)) {
      throw new BusinessRuleError("The recorded statement, consent or link is no longer valid for this retry.")
    }
    const payload = queue.payload as Record<string, unknown> | null
    if (hashBusinessPayload(queue.payload) !== queue.payloadHash || !payload || payload.organizationId !== organizationId || payload.deliveryId !== delivery.id ||
      payload.statementSnapshotId !== snapshot.id || payload.statementContentHash !== snapshot.contentHash || payload.tokenId !== token.id ||
      payload.channel !== delivery.channel || payload.destinationHash !== delivery.destinationHash || payload.consentEvidenceHash !== delivery.consentEvidenceHash) {
      throw new BusinessRuleError("The retained delivery evidence failed validation.")
    }
    // Requeue preserves the original consent, token, payload and attempt count.
    // The worker repeats full envelope/current-access checks before any dispatch.
    const updated = await tx.businessEventOutbox.updateMany({ where: {
      id: queue.id, organizationId, status: "DEFERRED", attempts: queue.attempts, updatedAt: queue.updatedAt,
      payloadHash: queue.payloadHash, lastErrorCode: "PROVIDER_NOT_CONFIGURED",
      metadata: { equals: queue.metadata === null ? Prisma.DbNull : queue.metadata },
    }, data: { status: "PENDING", availableAt: now, failedAt: null, lockedAt: null, lockedBy: null, lastErrorCode: null, lastErrorMessage: null } })
    if (updated.count !== 1) throw new ConflictError("Statement processing changed. Refresh its history.")
    // Serialize eligibility with link revocation; this does not reserve a send.
    const active = await tx.customerStatementAccessToken.updateMany({ where: { id: token.id, organizationId, status: "ACTIVE", revokedAt: null, expiresAt: { gt: now } }, data: { status: "ACTIVE" } })
    if (active.count !== 1) throw new ConflictError("Statement access changed before retry.")
    const event = await recordBusinessEventInTx(tx, {
      organizationId, actorId, eventSource: "INTERNAL", eventType: "customer.statement.delivery.retry.requested", idempotencyKey: key,
      occurredAt: now, payloadHash, payload: { ...command, organizationId, actorId },
      sourceType: AccountingSourceType.CUSTOMER_STATEMENT_DELIVERY, sourceId: delivery.id,
      metadata: { outboxId: queue.id, attemptsPreserved: queue.attempts },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.auditLog.create({ data: { organizationId, userId: actorId, entityType: "CustomerStatementDelivery", entityId: delivery.id,
      action: "CUSTOMER_STATEMENT_RETRY_REQUESTED", changes: { eventId: event.event.id, reason: command.reason, expectedRevision: command.expectedRevision, outboxId: queue.id, attemptsPreserved: queue.attempts, before: "DEFERRED", after: "PENDING" } } })
    return { deliveryId: delivery.id, statementId: command.statementId, eventId: event.event.id, requestedAt: now.toISOString(), replayed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  for (let attempt = 0; ; attempt++) {
    try { return await work() } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null
      if (attempt < 2 && (code === "P2034" || code === "P2002")) continue
      throw error
    }
  }
}
