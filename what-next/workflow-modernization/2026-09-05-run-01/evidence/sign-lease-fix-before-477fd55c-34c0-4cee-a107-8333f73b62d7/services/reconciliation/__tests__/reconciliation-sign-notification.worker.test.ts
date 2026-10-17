import { runReconciliationSignNotificationWorker } from "../reconciliation-sign-notification.worker"
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { runBusinessEventOutboxWorker } from "@/services/events/business-event-outbox.service"
import { publishPaymentReconciliationNotification } from "../payment-reconciliation-notifications"

jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/events/business-event-outbox.service", () => ({ runBusinessEventOutboxWorker: jest.fn() }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
const payload = { runId: "run-1", providerAccountId: "provider-1", certificateHash: "certificate-1", sourceVersionHash: "source-1", signedAt: "2026-09-27T13:00:00.000Z", correlationId: "correlation-1" }
const input = { organizationId: "org-1", workerId: "worker-1" }
let retained: Record<string, unknown>, message: Record<string, unknown>
const tx = { businessEventOutbox: { findFirst: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn() } }
beforeEach(() => {
  jest.clearAllMocks()
  message = { id: "message-1", organizationId: "org-1", attempts: 1, payload, payloadHash: hashBusinessPayload(payload) }
  retained = { ...message, businessEvent: { id: "event-1", organizationId: "org-1", eventType: "payment.reconciliation.signed", eventSource: "SYSTEM", sourceType: "PAYMENT_RECONCILIATION", sourceId: "run-1", actorId: "signer-1", documentHash: payload.certificateHash, payload: { ...payload, signedById: "signer-1" }, payloadHash: hashBusinessPayload({ ...payload, signedById: "signer-1" }) } }
  tx.businessEventOutbox.findFirst.mockImplementation(async () => retained)
  tx.ledgerAuditEvent.findFirst.mockResolvedValue({ id: "audit-1" })
  ;(db.$transaction as jest.Mock).mockImplementation(callback => callback(tx))
  ;(runBusinessEventOutboxWorker as jest.Mock).mockImplementation((_args, handler) => handler(message))
})
it("publishes only the retained signature event to its tenant inbox", async () => {
  await runReconciliationSignNotificationWorker(input)
  expect(runBusinessEventOutboxWorker).toHaveBeenCalledWith({ ...input, limit: 25, channels: ["NOTIFICATION"], eventNames: ["payment.reconciliation.signed"] }, expect.any(Function))
  expect(tx.businessEventOutbox.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", lockedBy: "worker-1", attempts: 1 }) }))
  expect(publishPaymentReconciliationNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "payment-reconciliation.run.signed", organizationId: "org-1", dedupeKey: "event-1", evidenceRef: { reconciliationRunId: "run-1" } }), tx)
})
it.each(["foreign-message", "lost-lease", "outbox-tampering", "event-tampering", "foreign-event", "missing-audit"])("refuses %s before publication", async kind => {
  if (kind === "foreign-message") message.organizationId = "other"
  if (kind === "lost-lease") tx.businessEventOutbox.findFirst.mockResolvedValue(null)
  if (kind === "outbox-tampering") retained.payload = { ...payload, runId: "different" }
  if (kind === "event-tampering") (retained.businessEvent as Record<string, unknown>).payloadHash = "incorrect"
  if (kind === "foreign-event") (retained.businessEvent as Record<string, unknown>).organizationId = "other"
  if (kind === "missing-audit") tx.ledgerAuditEvent.findFirst.mockResolvedValue(null)
  await expect(runReconciliationSignNotificationWorker(input)).rejects.toThrow()
  expect(publishPaymentReconciliationNotification).not.toHaveBeenCalled()
})
it("propagates failed publication so the outbox can schedule a retry", async () => {
  ;(publishPaymentReconciliationNotification as jest.Mock).mockRejectedValueOnce(new Error("Owned publication failure"))
  await expect(runReconciliationSignNotificationWorker(input)).rejects.toThrow("Owned publication failure")
})
it.each([{ ...input, organizationId: " " }, { ...input, limit: 101 }, { ...input, destination: "external" }])("rejects invalid worker scope before claiming", async value => {
  await expect(runReconciliationSignNotificationWorker(value)).rejects.toThrow()
  expect(runBusinessEventOutboxWorker).not.toHaveBeenCalled()
})
