import { retryCustomerStatementDelivery } from "../customer-statement-retry.service"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { statementRecoveryRevision } from "../customer-statement-delivery-recovery"
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))

function fixture() {
  const now = new Date(), statementPayload = { receivables: [] }, contentHash = hashBusinessPayload(statementPayload)
  const payload = { organizationId: "org", deliveryId: "delivery", statementSnapshotId: "statement", statementContentHash: contentHash, tokenId: "token", channel: "EMAIL", destinationHash: "destination-hash", consentEvidenceHash: "sha256:" + "a".repeat(64) }
  const queue = { id: "outbox", status: "DEFERRED" as const, attempts: 1, maxAttempts: 5, lastErrorCode: "PROVIDER_NOT_CONFIGURED", updatedAt: now, payloadHash: hashBusinessPayload(payload), payload,
    metadata: { statementDispatch: { version: 1, attempt: 1, executionId: "e0000000-0000-4000-8000-000000000001", reservedAt: now.toISOString(), outcome: "NOT_SENT" } } }
  const delivery = { id: "delivery", outboxId: "outbox", statementContentHash: contentHash, channel: "EMAIL", destinationHash: payload.destinationHash, consentEvidenceHash: payload.consentEvidenceHash, consentCapturedAt: now,
    statementSnapshot: { id: "statement", contentHash, statementPayload, truncated: false },
    token: { id: "token", organizationId: "org", statementSnapshotId: "statement", status: "ACTIVE", revokedAt: null as Date | null, expiresAt: new Date(now.getTime()+86400000), statementContentHash: contentHash },
    states: [{ status: "DEFERRED", errorCode: "PROVIDER_NOT_CONFIGURED" }] }
  const tx = { user: { findFirst: jest.fn().mockResolvedValue({ id: "actor" }) }, customerStatementDelivery: { findFirst: jest.fn().mockResolvedValue(delivery) }, businessEvent: { findUnique: jest.fn().mockResolvedValue(null) }, businessEventOutbox: { findFirst: jest.fn().mockResolvedValue(queue), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, customerStatementAccessToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, auditLog: { create: jest.fn() } }
  const client = { $transaction: jest.fn(async work => work(tx)) } as unknown as NonNullable<Parameters<typeof retryCustomerStatementDelivery>[1]>
  const input = { organizationId: "org", actorId: "actor", customerId: "customer", statementId: "statement", deliveryId: "delivery", expectedRevision: statementRecoveryRevision(queue), reason: "Provider setup reviewed", idempotencyKey: "b0000000-0000-4000-8000-000000000001" }
  return { input, tx, queue, delivery, client }
}
beforeEach(() => { jest.clearAllMocks(); (recordBusinessEventInTx as jest.Mock).mockResolvedValue({ event: { id: "event" }, created: true }) })
it("requeues the existing request, preserving attempts, consent, payload and delivery state", async () => {
  const { input, tx, client } = fixture(); const result = await retryCustomerStatementDelivery(input, client)
  expect(result).toMatchObject({ deliveryId: "delivery", eventId: "event", replayed: false })
  const change = tx.businessEventOutbox.updateMany.mock.calls[0][0]
  expect(change.where).toMatchObject({ organizationId: "org", status: "DEFERRED", attempts: 1 })
  expect(change.data).toMatchObject({ status: "PENDING", lastErrorCode: null })
  for (const field of ["attempts", "payload", "metadata", "maxAttempts"]) expect(change.data).not.toHaveProperty(field)
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CUSTOMER_STATEMENT_RETRY_REQUESTED", userId: "actor" }) }))
})
it.each(["UNKNOWN", "RESERVED", "ACCEPTED"])("does not retry %s outcomes", async outcome => {
  const { input, tx, queue, client } = fixture(); queue.metadata.statementDispatch.outcome = outcome; input.expectedRevision = statementRecoveryRevision(queue)
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); expect(tx.businessEventOutbox.updateMany).not.toHaveBeenCalled()
})
it("rejects stale previews and leaves the recorded request untouched", async () => {
  const { input, tx, queue, client } = fixture(); queue.attempts++
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "CONFLICT" }); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it.each(["revoked", "expired", "snapshot", "payload", "exhausted"])("does not resume when %s evidence is invalid", async kind => {
  const { input, tx, queue, delivery, client } = fixture()
  if (kind === "revoked") delivery.token.revokedAt = new Date()
  if (kind === "expired") delivery.token.expiresAt = new Date(0)
  if (kind === "snapshot") delivery.statementSnapshot.contentHash = "broken"
  if (kind === "payload") queue.payload.destinationHash = "tampered"
  if (kind === "exhausted") { queue.maxAttempts = 1; input.expectedRevision = statementRecoveryRevision(queue) }
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); expect(tx.businessEventOutbox.updateMany).not.toHaveBeenCalled()
})
it("scopes delivery to tenant, customer and statement before inspecting queue", async () => {
  const { input, tx, client } = fixture(); tx.customerStatementDelivery.findFirst.mockResolvedValue(null)
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.customerStatementDelivery.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "delivery", organizationId: "org", statementSnapshotId: "statement", statementSnapshot: { customerId: "customer", organizationId: "org" } } }))
  expect(tx.businessEventOutbox.findFirst).not.toHaveBeenCalled()
})
it("returns the original committed receipt on replay without requeuing", async () => {
  const { input, tx, client } = fixture()
  tx.businessEvent.findUnique.mockResolvedValue({ id: "old-event", payloadHash: hashBusinessPayload(input), eventType: "customer.statement.delivery.retry.requested", status: "APPLIED", occurredAt: new Date(0) })
  expect(await retryCustomerStatementDelivery(input, client)).toMatchObject({ eventId: "old-event", replayed: true })
  expect(tx.businessEventOutbox.findFirst).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("rejects reused keys with different evidence", async () => {
  const { input, tx, client } = fixture(); tx.businessEvent.findUnique.mockResolvedValue({ payloadHash: "different" })
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); expect(tx.businessEventOutbox.updateMany).not.toHaveBeenCalled()
})
it("does not append audit evidence after losing the queue revision", async () => {
  const { input, tx, client } = fixture(); tx.businessEventOutbox.updateMany.mockResolvedValue({ count: 0 })
  await expect(retryCustomerStatementDelivery(input, client)).rejects.toMatchObject({ code: "CONFLICT" }); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
