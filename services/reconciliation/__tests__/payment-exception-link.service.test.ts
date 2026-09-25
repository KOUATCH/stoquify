jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {} }))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
import { db } from "@/prisma/db"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
import { readReconciliationExceptionLink, repairReconciliationExceptionLink } from "../payment-exception-link.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"

const now = new Date("2026-09-09T12:00:00Z"), control = { organizationId: "org", actorId: "actor", actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.run"], lastAuthAt: now, now }
const item = () => ({ id: "item", organizationId: "org", reconciliationRunId: "run", providerAccountId: "provider", paymentTransactionId: "payment", correlationId: "original", status: "OPEN", evidence: { exceptionId: "exception", rule: "MISSING_EXTERNAL_EVIDENCE" } })
const exception = () => ({ id: "exception", organizationId: "org", suspenseItemId: null, reconciliationRunId: "run", sourceType: "ReconciliationRun", sourceId: "run", providerAccountId: "provider", paymentTransactionId: "payment", providerEventId: null, statementLineId: null, correlationId: "original", evidence: { rule: "MISSING_EXTERNAL_EVIDENCE" }, updatedAt: now, status: "OPEN" })
const run = () => ({ id: "run", status: "SIGNED", signedAt: now, signedById: "original-signer", certificateHash: "old-hash", certificatePayload: { privateEvidence: "retained" }, accountingPeriodId: "period", periodStart: now, periodEnd: now, metadata: { retained: true } })
const tx = { $queryRaw: jest.fn(), user: { findFirst: jest.fn() }, suspenseItem: { findFirst: jest.fn(), count: jest.fn() }, paymentException: { findFirst: jest.fn(), count: jest.fn(), updateMany: jest.fn() }, reconciliationRun: { findFirst: jest.fn(), update: jest.fn() }, paymentTransaction: { findFirst: jest.fn() }, providerEvent: { findFirst: jest.fn() }, statementLine: { findFirst: jest.fn() }, paymentReconciliationInboxItem: { findFirst: jest.fn(), create: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn(), create: jest.fn() } }
beforeEach(() => { jest.resetAllMocks(); (db.$transaction as jest.Mock).mockImplementation(work => work(tx)); tx.user.findFirst.mockResolvedValue({ id: "actor" }); tx.suspenseItem.findFirst.mockResolvedValue(item()); tx.suspenseItem.count.mockResolvedValue(1); tx.paymentException.findFirst.mockResolvedValue(exception()); tx.paymentException.count.mockResolvedValue(0); tx.paymentException.updateMany.mockResolvedValue({ count: 1 }); tx.reconciliationRun.findFirst.mockResolvedValue(run()); tx.paymentTransaction.findFirst.mockResolvedValue({ id: "payment", organizationId: "org" }); tx.paymentReconciliationInboxItem.findFirst.mockResolvedValue(null) })
async function command() { return { suspenseItemId: "item", reason: "Restore the original retained relation", expectedRevision: (await readReconciliationExceptionLink({ suspenseItemId: "item" }, control)).revision, idempotencyKey: "aabbccdd-1234-4123-8123-123456789abc" } }
it("previews a verified repair without revealing private certificate/source payloads", async () => {
  const result = await readReconciliationExceptionLink({ suspenseItemId: "item" }, control)
  expect(result).toMatchObject({ state: "REPAIRABLE", hasCurrentSignOff: true, willRequireRunReview: true })
  expect(JSON.stringify(result)).not.toContain("privateEvidence"); expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
})
it("restores only the relation, retains the prior certificate privately, and invalidates run/close evidence", async () => {
  const input = await command(); const result = await repairReconciliationExceptionLink(input, control)
  expect(tx.paymentException.updateMany).toHaveBeenCalledWith({ where: { id: "exception", organizationId: "org", suspenseItemId: null, updatedAt: now }, data: { suspenseItemId: "item" } })
  expect(tx.paymentReconciliationInboxItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payloadSummary: expect.objectContaining({ priorRunCertificate: expect.objectContaining({ certificatePayload: { privateEvidence: "retained" } }) }) }) }))
  expect(tx.reconciliationRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "NEEDS_REVIEW", signedAt: null, certificateHash: null, metadata: expect.objectContaining({ retained: true }) }) }))
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(tx, "org", expect.objectContaining({ sourceCode: "PAYMENT_RECONCILIATION_SOURCE_REPAIRED", sourceId: "run" }), expect.anything())
  expect(result.replayed).toBe(false); expect(JSON.stringify(result)).not.toContain("privateEvidence")
})
it.each(["missing", "foreign", "conflicting", "evidence", "duplicate", "claim", "voided", "source"])("refuses %s provenance before any update", async failure => {
  const input = await command()
  if (failure === "missing") tx.suspenseItem.findFirst.mockResolvedValue({ ...item(), evidence: {} })
  if (failure === "foreign") tx.paymentException.findFirst.mockResolvedValue(null)
  if (failure === "conflicting") tx.paymentException.findFirst.mockResolvedValue({ ...exception(), suspenseItemId: "different" })
  if (failure === "evidence") tx.paymentException.findFirst.mockResolvedValue({ ...exception(), evidence: { rule: "different" } })
  if (failure === "duplicate") tx.suspenseItem.count.mockResolvedValue(2)
  if (failure === "claim") tx.paymentException.count.mockResolvedValue(1)
  if (failure === "voided") tx.reconciliationRun.findFirst.mockResolvedValue({ ...run(), status: "VOIDED" })
  if (failure === "source") tx.paymentTransaction.findFirst.mockResolvedValue(null)
  await expect(repairReconciliationExceptionLink(input, control)).rejects.toMatchObject({ code: "CONFLICT" }); expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
})
it.each(["read", "run", "actor", "fresh", "future"])("requires current %s authority", async missing => {
  const input = await command(), restricted = { ...control }
  if (missing === "read") restricted.actorPermissions = ["payments.reconciliation.run"]
  if (missing === "run") restricted.actorPermissions = ["payments.reconciliation.read"]
  if (missing === "actor") tx.user.findFirst.mockResolvedValue(null)
  if (missing === "fresh") restricted.lastAuthAt = new Date(now.getTime() - 300001)
  if (missing === "future") restricted.lastAuthAt = new Date(now.getTime() + 1)
  await expect(repairReconciliationExceptionLink(input, restricted)).rejects.toThrow(); expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
})
it("rejects stale preview and late compare-and-set conflicts", async () => {
  const input = await command(); await expect(repairReconciliationExceptionLink({ ...input, expectedRevision: "sha256:" + "0".repeat(64) }, control)).rejects.toMatchObject({ code: "CONFLICT" })
  tx.paymentException.updateMany.mockResolvedValue({ count: 0 }); await expect(repairReconciliationExceptionLink(input, control)).rejects.toMatchObject({ code: "CONFLICT" }); expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("replays a verified retained request without rewriting its original evidence", async () => {
  const input = await command(); await repairReconciliationExceptionLink(input, control)
  const data = tx.paymentReconciliationInboxItem.create.mock.calls[0][0].data; tx.paymentReconciliationInboxItem.findFirst.mockResolvedValue(data); tx.paymentException.findFirst.mockResolvedValue({ ...exception(), suspenseItemId: "item" }); tx.ledgerAuditEvent.findFirst.mockResolvedValue({ id: "audit" }); tx.paymentException.updateMany.mockClear()
  expect(await repairReconciliationExceptionLink(input, control)).toMatchObject({ receiptId: data.id, replayed: true }); expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
  await expect(repairReconciliationExceptionLink({ ...input, reason: "Another requested repair" }, control)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  tx.ledgerAuditEvent.findFirst.mockResolvedValue(null); await expect(repairReconciliationExceptionLink(input, control)).rejects.toMatchObject({ code: "CONFLICT" })
  data.payloadHash = suspenseEvidenceHash({ changed: true }).slice(7); await expect(repairReconciliationExceptionLink(input, control)).rejects.toMatchObject({ code: "CONFLICT" })
})
