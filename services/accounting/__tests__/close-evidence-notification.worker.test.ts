import { runCloseEvidenceNotificationWorker, CLOSE_EVIDENCE_NOTIFICATION_EVENTS as events } from "../close-evidence-notification.worker"
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { runBusinessEventOutboxWorker } from "@/services/events/business-event-outbox.service"
import { parseCloseEvidenceNotificationArgs, executeCloseEvidenceNotificationWorker } from "@/scripts/close-evidence-notification-worker"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/events/business-event-outbox.service", () => ({ runBusinessEventOutboxWorker: jest.fn() }))
const tx = { businessEventOutbox: { findFirst: jest.fn() }, accountantComment: { findFirst: jest.fn() }, closeAssuranceFinding: { findFirst: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn() }, closeEvidenceNotification: { createMany: jest.fn(), findUnique: jest.fn() } }
const input = { organizationId: "org", workerId: "worker" }, lockedAt = new Date("2026-10-04T10:00:00Z")
const request = { id: "request", authorId: "maker", correlationId: "corr", metadata: { requestType: "MISSING_CLOSE_EVIDENCE", requestedById: "maker", requestedFromId: "recipient" } }
const response = { id: "response", authorId: "recipient", correlationId: "corr", metadata: { requestId: "request", respondedById: "recipient" } }
// Fixture bags deliberately allow corrupt values for boundary tests.
let retained: any, message: any, published: any
function fixture(stage = 0) {
  const payload = { periodId: "period", closeRunId: "run", findingId: "finding", requestId: "request", correlationId: "corr", message: "Notice", severity: "INFO", dueAt: null,
    ownerId: stage === 1 ? "maker" : "recipient", requestedFromId: "recipient", ...(stage ? { responseId: "response", respondedById: "recipient" } : {}), ...(stage === 2 ? { acceptanceId: "acceptance" } : {}) }
  const notice = { notification: { type: events[stage], ownerId: payload.ownerId, severity: "INFO", dueAt: null, status: "UNREAD" }, evidenceRef: { periodId: "period", closeRunId: "run", findingId: "finding" }, message: "Notice", correlationId: "corr" }
  message = { id: "outbox", organizationId: "org", eventName: events[stage], attempts: 1, lockedAt, payload: notice, payloadHash: hashBusinessPayload(notice) }
  retained = { ...message, idempotencyKey: "event-key:notification", businessEvent: { organizationId: "org", eventType: events[stage], eventSource: "SYSTEM", sourceType: "MANUAL", sourceId: "finding", actorId: stage === 0 ? "maker" : stage === 1 ? "recipient" : "checker", idempotencyKey: "event-key", payload, payloadHash: hashBusinessPayload(payload) } }
}
beforeEach(() => {
  jest.clearAllMocks(); fixture(); published = null
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  ;(runBusinessEventOutboxWorker as jest.Mock).mockImplementation((_input, fn) => fn(message))
  tx.businessEventOutbox.findFirst.mockImplementation(async ({ where }) => retained && where.attempts === retained.attempts && where.lockedAt.getTime() === retained.lockedAt.getTime() ? retained : null)
  tx.accountantComment.findFirst.mockImplementation(async ({ where }) => where.id === "request" ? request : where.id === "response" ? response : { id: "acceptance", authorId: "checker", correlationId: "corr", metadata: { requestId: "request", responseId: "response", decision: "ACCEPTED" } })
  tx.closeAssuranceFinding.findFirst.mockResolvedValue({ id: "finding" })
  tx.ledgerAuditEvent.findFirst.mockResolvedValue({ id: "audit" })
  tx.closeEvidenceNotification.createMany.mockImplementation(async ({ data }) => { published ??= data[0]; return { count: 1 } })
  tx.closeEvidenceNotification.findUnique.mockImplementation(async () => published)
})
it.each([0, 1, 2])("publishes retained stage %s with a tenant source binding", async stage => {
  fixture(stage); await runCloseEvidenceNotificationWorker(input)
  expect(published).toMatchObject({ organizationId: "org", outboxId: "outbox", requestId: "request", responseId: stage ? "response" : null, eventName: events[stage] })
  expect(runBusinessEventOutboxWorker).toHaveBeenCalledWith({ ...input, limit: 25, channels: ["NOTIFICATION"], eventNames: [...events] }, expect.any(Function))
  expect(tx.businessEventOutbox.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", status: "LOCKED", lockedBy: "worker", attempts: 1, lockedAt }) }))
})
it.each(["foreign-message", "foreign-event", "lost-lease", "attempt", "lease-time", "payload", "event-hash", "source", "event-name", "idempotency", "request", "finding", "audit", "recipient", "publication-conflict"])("rejects %s", async kind => {
  if (kind === "foreign-message") message.organizationId = "foreign"
  if (kind === "foreign-event") retained.businessEvent.organizationId = "foreign"
  if (kind === "lost-lease") retained = null
  if (kind === "attempt") retained.attempts++
  if (kind === "lease-time") retained.lockedAt = new Date(lockedAt.getTime() + 1)
  if (kind === "payload") retained.payload = {}
  if (kind === "event-hash") retained.businessEvent.payloadHash = "wrong"
  if (kind === "source") retained.businessEvent.sourceId = "foreign"
  if (kind === "event-name") retained.businessEvent.eventType = "other"
  if (kind === "idempotency") retained.idempotencyKey = "other"
  if (kind === "request") tx.accountantComment.findFirst.mockResolvedValue(null)
  if (kind === "finding") tx.closeAssuranceFinding.findFirst.mockResolvedValue(null)
  if (kind === "audit") tx.ledgerAuditEvent.findFirst.mockResolvedValue(null)
  if (kind === "recipient") { retained.businessEvent.payload.ownerId = "other"; retained.businessEvent.payloadHash = hashBusinessPayload(retained.businessEvent.payload) }
  if (kind === "publication-conflict") published = { organizationId: "foreign" }
  await expect(runCloseEvidenceNotificationWorker(input)).rejects.toThrow()
  if (kind !== "publication-conflict") expect(tx.closeEvidenceNotification.createMany).not.toHaveBeenCalled()
})
it("deduplicates publication after an acknowledgement is lost", async () => {
  await runCloseEvidenceNotificationWorker(input); const first = published
  await runCloseEvidenceNotificationWorker(input); expect(published).toBe(first)
  expect(tx.closeEvidenceNotification.createMany).toHaveBeenLastCalledWith(expect.objectContaining({ skipDuplicates: true }))
})
it("propagates storage failure for outbox retry", async () => {
  tx.closeEvidenceNotification.createMany.mockRejectedValueOnce(new Error("storage failed"))
  await expect(runCloseEvidenceNotificationWorker(input)).rejects.toThrow("storage failed")
})
it.each([{ ...input, organizationId: " " }, { ...input, limit: 101 }, { ...input, destination: "external" }])("rejects invalid worker input", async args => {
  await expect(runCloseEvidenceNotificationWorker(args)).rejects.toThrow(); expect(runBusinessEventOutboxWorker).not.toHaveBeenCalled()
})
it("keeps help inert and requires explicit CLI scope", async () => {
  expect(await executeCloseEvidenceNotificationWorker(parseCloseEvidenceNotificationArgs(["--help"]))).toMatchObject({ exitCode: 0 })
  expect(runBusinessEventOutboxWorker).not.toHaveBeenCalled()
  expect(() => parseCloseEvidenceNotificationArgs([])).toThrow()
  expect(() => parseCloseEvidenceNotificationArgs(["--organization-id", "org", "--worker-id", "worker", "--limit", "101"])).toThrow()
  expect(parseCloseEvidenceNotificationArgs(["--organization-id", "org", "--worker-id", "worker"])).toMatchObject(input)
})
