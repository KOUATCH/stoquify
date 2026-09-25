import { db } from "@/prisma/db"
import { exportSuspenseResolution } from "../payment-suspense-resolution-export.service"
import { loadSuspenseResolutionArchiveInTx } from "../payment-suspense-resolution-archive.service"
import { suspenseResolutionRecordRevision } from "../payment-suspense-resolution-record"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../payment-suspense-resolution-archive.service", () => ({ loadSuspenseResolutionArchiveInTx: jest.fn() }))
jest.mock("@/services/controls/sensitive-action.service", () => ({ evaluateSensitiveAction: jest.fn(() => ({ allowed: true })), auditSensitiveActionDecision: jest.fn(), assertSensitiveActionAllowed: jest.fn() }))
const now = new Date(), control = { organizationId: "org", actorId: "actor", actorPermissions: ["payments.reconciliation.read", "accounting.journal.read", "payments.export"], now, lastAuthAt: now }
const row = { id: "record", payloadHash: "a".repeat(64), createdAt: now }, command = { suspenseItemId: "item", recordId: "record", expectedRevision: suspenseResolutionRecordRevision(row), idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
function fixture(previous: unknown = null) {
  const tx = { user: { findFirst: jest.fn().mockResolvedValue({ id: "actor" }) }, suspenseItem: { findFirst: jest.fn().mockResolvedValue({ id: "item", status: "POSTED_TO_SUSPENSE", updatedAt: now }) },
    paymentReconciliationInboxItem: { findFirst: jest.fn().mockImplementation(args => Promise.resolve(args.where.source === "CERTIFICATE_EXPORT" ? previous : row)), create: jest.fn() }, ledgerAuditEvent: { create: jest.fn() } }
  jest.mocked(db.$transaction).mockImplementation((async (work: (value: typeof tx) => Promise<unknown>) => work(tx)) as never)
  return tx
}
beforeEach(() => { jest.clearAllMocks(); jest.mocked(loadSuspenseResolutionArchiveInTx).mockResolvedValue({ originalJournal: { lines: [] }, clearingJournal: { lines: [] }, originalReversal: null, clearingReversal: null } as never) })
it.each([[], ["payments.reconciliation.read"], ["accounting.journal.read"]])("requires both read permissions before database access: %j", (...permissions) => {
  return expect(exportSuspenseResolution(command, { ...control, actorPermissions: permissions as string[] })).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("refuses inactive or foreign actors before financial evidence is read", async () => {
  const tx = fixture(); tx.user.findFirst.mockResolvedValue(null as never)
  await expect(exportSuspenseResolution(command, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(loadSuspenseResolutionArchiveInTx).not.toHaveBeenCalled(); expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("does not issue an export for stale revisions or failed financial proof", async () => {
  const tx = fixture()
  await expect(exportSuspenseResolution({ ...command, expectedRevision: "sha256:" + "b".repeat(64) }, control)).rejects.toMatchObject({ code: "CONFLICT" })
  jest.mocked(loadSuspenseResolutionArchiveInTx).mockRejectedValue(new Error("Financial proof failed"))
  await expect(exportSuspenseResolution(command, control)).rejects.toThrow("Financial proof failed")
  expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("rejects changed retained download bytes even when the outer record hash was recomputed", async () => {
  const payload = { kind: "SUSPENSE_RESOLUTION_EXPORT_V1", requestHash: suspenseEvidenceHash({ command, actorId: control.actorId }), content: "changed", sha256: "a".repeat(64), fileName: "file.json" }
  const tx = fixture({ id: "receipt", externalId: row.id, status: "PROCESSED", payloadSummary: payload, payloadHash: suspenseEvidenceHash(payload).slice(7) })
  await expect(exportSuspenseResolution(command, control)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(loadSuspenseResolutionArchiveInTx).toHaveBeenCalled(); expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("issues an immutable receipt without treating server preparation as a client download", async () => {
  const tx = fixture(), file = await exportSuspenseResolution(command, control)
  expect(file.replayed).toBe(false); expect(JSON.parse(file.content).purpose).toContain("not a new approval")
  expect(tx.paymentReconciliationInboxItem.create).toHaveBeenCalledTimes(1)
  expect(tx.ledgerAuditEvent.create.mock.calls[0][0].data.message).toContain("client download not attested")
})
