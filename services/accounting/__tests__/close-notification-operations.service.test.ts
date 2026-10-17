jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), $queryRaw: jest.fn(), accountingPeriod: { findFirst: jest.fn() }, businessEventOutbox: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn(), create: jest.fn() } } }))
jest.mock("../close-evidence-workflow.service", () => ({ assertCloseEvidenceActor: jest.fn() }))
jest.mock("../close-evidence-acceptance-authority.service", () => ({ lockCloseEvidenceAcceptanceAuthorityInTx: jest.fn() }))
jest.mock("../close-assurance.service", () => ({ runMissingCloseEvidenceTransaction: jest.fn() }))
jest.mock("../close-assessment-order.service", () => ({ readCloseAssessmentPublicationTimeInTx: jest.fn() }))
jest.mock("../close-evidence-notification.worker", () => ({ CLOSE_EVIDENCE_NOTIFICATION_EVENTS: ["close.assurance.missing_evidence.requested", "close.assurance.missing_evidence.response_submitted", "close.assurance.missing_evidence.response_accepted"] }))
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { assertCloseEvidenceActor } from "../close-evidence-workflow.service"
import { lockCloseEvidenceAcceptanceAuthorityInTx } from "../close-evidence-acceptance-authority.service"
import { runMissingCloseEvidenceTransaction } from "../close-assurance.service"
import { readCloseAssessmentPublicationTimeInTx } from "../close-assessment-order.service"
import { getCloseNotificationOperations, retryCloseNotification } from "../close-notification-operations.service"
const actor = { organizationId: "org", actorId: "operator" }, session = { id: "session", token: "private-token" }, now = new Date("2026-10-04T10:00:00Z"), revalidate = jest.fn()
const eventName = "close.assurance.missing_evidence.requested", source = { periodId: "period", findingId: "finding", closeRunId: "run", requestId: "request" }
const payload = { evidenceRef: { periodId: "period", findingId: "finding", closeRunId: "run" }, notification: { type: eventName }, message: "private source text" }
const base = { id: "outbox", organizationId: "org", channel: "NOTIFICATION", eventName, idempotencyKey: "event:notification", payload, payloadHash: hashBusinessPayload(payload), status: "DEAD_LETTER", attempts: 5, maxAttempts: 5, availableAt: now, createdAt: now, updatedAt: now, lockedAt: null, lockedBy: null, closeEvidenceNotification: null,
  businessEvent: { organizationId: "org", payload: source, payloadHash: hashBusinessPayload(source), eventSource: "SYSTEM", sourceType: "MANUAL", sourceId: "finding", eventType: eventName, idempotencyKey: "event" } }
let row: typeof base
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(now); row = { ...base }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db)); (runMissingCloseEvidenceTransaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(assertCloseEvidenceActor as jest.Mock).mockResolvedValue({ writable: true })
  ;(lockCloseEvidenceAcceptanceAuthorityInTx as jest.Mock).mockResolvedValue({ revalidate })
  ;(readCloseAssessmentPublicationTimeInTx as jest.Mock).mockResolvedValue(now)
  ;(db.accountingPeriod.findFirst as jest.Mock).mockResolvedValue({ id: "period" })
  ;(db.businessEventOutbox.findMany as jest.Mock).mockImplementation(async () => [row]); (db.businessEventOutbox.findFirst as jest.Mock).mockImplementation(async () => row)
  ;(db.ledgerAuditEvent.create as jest.Mock).mockResolvedValue({ id: "audit" })
})
afterEach(() => jest.useRealTimers())
const preview = async () => (await getCloseNotificationOperations(actor, { periodId: "period" })).items[0]
const command = async () => ({ periodId: "period", outboxId: "outbox", expectedRevision: (await preview()).revision, reason: "Investigated and restored the local storage service.", correlationId: "retry-key" })
it("returns bounded period-scoped state without private payloads or errors", async () => {
  const result = await getCloseNotificationOperations(actor, { periodId: "period" })
  expect(result.items[0]).toMatchObject({ status: "DEAD_LETTER", reason: "RETRY_AVAILABLE", publishedAt: null, attempts: 5 })
  expect(JSON.stringify(result)).not.toContain("private")
  expect(db.businessEventOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 51, where: expect.objectContaining({ organizationId: "org", channel: "NOTIFICATION", businessEvent: { organizationId: "org", payload: { path: ["periodId"], equals: "period" } } }) }))
  expect(assertCloseEvidenceActor).toHaveBeenCalledTimes(2)
})
it("does not return records when access is revoked during the read", async () => {
  ;(assertCloseEvidenceActor as jest.Mock).mockResolvedValueOnce({ writable: true }).mockRejectedValueOnce(new ForbiddenError())
  await expect(preview()).rejects.toThrow()
})
it("does not convert a storage failure into zero deliveries", async () => {
  ;(db.businessEventOutbox.findMany as jest.Mock).mockRejectedValue(new Error("offline"))
  await expect(preview()).rejects.toThrow("offline")
})
it("queues a retained dead letter with one extra attempt, immutable payload and atomic audit", async () => {
  const input = await command(); expect(await retryCloseNotification(actor, input, session)).toEqual({ auditId: "audit", outboxId: "outbox", state: "RETRY_REQUESTED" })
  expect(lockCloseEvidenceAcceptanceAuthorityInTx).toHaveBeenCalledWith(db, { ...actor, homeOrganizationId: "org", session, requireCloseRead: true })
  expect(db.businessEventOutbox.update).toHaveBeenCalledWith({ where: { id: "outbox", organizationId: "org" }, data: { status: "PENDING", maxAttempts: 6, availableAt: now } })
  expect(db.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: "operator", resourceId: "outbox", metadata: expect.objectContaining({ command: input, attempts: 5, previousMaxAttempts: 5, previousStatus: "DEAD_LETTER" }) }) }))
  expect(revalidate).toHaveBeenCalledWith(now)
})
it("recovers the exact command outcome without requeuing after processing", async () => {
  const input = await command()
  ;(db.ledgerAuditEvent.findFirst as jest.Mock).mockResolvedValue({ id: "audit", actorId: "operator", resourceType: "BusinessEventOutbox", resourceId: "outbox", metadata: { command: input } })
  expect(await retryCloseNotification(actor, input, session)).toMatchObject({ auditId: "audit" }); expect(db.businessEventOutbox.update).not.toHaveBeenCalled()
})
it("rejects changed commands under the same idempotency key", async () => {
  const input = await command()
  ;(db.ledgerAuditEvent.findFirst as jest.Mock).mockResolvedValue({ id: "audit", actorId: "operator", resourceType: "BusinessEventOutbox", resourceId: "outbox", metadata: { command: { ...input, reason: "Different reason" } } })
  await expect(retryCloseNotification(actor, input, session)).rejects.toThrow("different request"); expect(db.businessEventOutbox.update).not.toHaveBeenCalled()
})
it("rejects worker changes after the displayed preview", async () => {
  const input = await command(); row = { ...row, attempts: 6 }
  await expect(retryCloseNotification(actor, input, session)).rejects.toThrow("changed"); expect(db.businessEventOutbox.update).not.toHaveBeenCalled()
})
it.each(["PENDING", "LOCKED", "CANCELLED", "DEFERRED"])("does not override %s", async status => {
  row = { ...row, status }; const input = await command()
  await expect(retryCloseNotification(actor, input, session)).rejects.toThrow("cannot be retried"); expect(db.businessEventOutbox.update).not.toHaveBeenCalled()
})
it("preserves retry backoff", async () => {
  row = { ...row, status: "FAILED", availableAt: new Date(now.getTime() + 60000) }; expect((await preview()).reason).toBe("BACKOFF")
  await expect(retryCloseNotification(actor, await command(), session)).rejects.toThrow("cannot be retried")
})
it("refuses malformed payloads even under otherwise valid status", async () => {
  row = { ...row, payloadHash: "tampered" }; expect((await preview()).reason).toBe("SOURCE_REVIEW")
  await expect(retryCloseNotification(actor, await command(), session)).rejects.toThrow("cannot be retried")
})
it("permits reconciliation of SENT without a publication through the validating worker", async () => {
  row = { ...row, status: "SENT" }; expect((await preview()).retryAvailable).toBe(true)
  await retryCloseNotification(actor, await command(), session); expect(db.businessEventOutbox.update).toHaveBeenCalledTimes(1)
})
it("does not requeue a successfully published and acknowledged event", async () => {
  const publication = { organizationId: "org", periodId: "period", findingId: "finding", requestId: "request", responseId: null, eventName, payloadHash: row.payloadHash, publishedAt: now }
  ;(db.businessEventOutbox.findMany as jest.Mock).mockResolvedValue([{ ...row, status: "SENT", closeEvidenceNotification: publication }])
  ;(db.businessEventOutbox.findFirst as jest.Mock).mockResolvedValue({ ...row, status: "SENT", closeEvidenceNotification: publication })
  expect((await preview()).reason).toBe("PUBLISHED")
  await expect(retryCloseNotification(actor, await command(), session)).rejects.toThrow("cannot be retried")
})
it("does not mistake a mismatched publication for successful delivery", async () => {
  ;(db.businessEventOutbox.findMany as jest.Mock).mockResolvedValue([{ ...row, status: "SENT", closeEvidenceNotification: { organizationId: "other" } }])
  expect(await preview()).toMatchObject({ reason: "SOURCE_REVIEW", publishedAt: null, retryAvailable: false })
})
it("denies before row access without current locked authority", async () => {
  const input = await command(); (lockCloseEvidenceAcceptanceAuthorityInTx as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(retryCloseNotification(actor, input, session)).rejects.toThrow(); expect(db.businessEventOutbox.findFirst).not.toHaveBeenCalled()
})
