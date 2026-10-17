jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {} }))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../reconciliation-close-order.service", () => ({
  ...jest.requireActual("../reconciliation-close-order.service"),
  lockReconciliationCloseCatalogInTx: jest.fn(), lockReconciliationClosePeriodsInTx: jest.fn(),
}))
jest.mock("../payment-suspense-resolution-evidence.service", () => ({ loadSuspenseResolutionEvidenceInTx: jest.fn() }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
import { db } from "@/prisma/db"
import { JournalReversalSnapshotChangedError } from "@/services/accounting/journal-reversal-order.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx } from "../reconciliation-close-order.service"
import { loadSuspenseResolutionEvidenceInTx } from "../payment-suspense-resolution-evidence.service"
import { decideSuspenseResolution } from "../payment-suspense-resolution.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"

const now = new Date("2026-10-04T10:00:00Z"), hash = suspenseEvidenceHash
const draft = { suspenseItemId: "item", clearingJournalId: "clearing", outcome: "RESOLVED" as const, reason: "Reviewed clearing evidence" }
const control = { organizationId: "org", actorId: "checker", actorPermissions: ["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.suspense.post"], now, lastAuthAt: now }
let rows: any[], proof: any, command: any
const tx = { user: { findFirst: jest.fn() }, $queryRaw: jest.fn(), paymentReconciliationInboxItem: { findFirst: jest.fn(), create: jest.fn() }, suspenseItem: { update: jest.fn() }, ledgerAuditEvent: { create: jest.fn() }, auditLog: { create: jest.fn() } }
beforeEach(() => {
  jest.resetAllMocks()
  proof = { item: { id: "item", reconciliationRunId: "run", metadata: { resolutionProposalId: "proposal" } }, journal: { id: "original", periodId: "current-period", entryDate: now }, clearing: { id: "clearing", periodId: "current-period", entryDate: now, createdById: "maker" }, financialHash: hash("financial"), revision: hash("current"), cycle: 1 }
  const payloadSummary = { kind: "SUSPENSE_RESOLUTION_PROPOSED_V1", draft, proposedById: "maker", financialHash: proof.financialHash }
  rows = [{ id: "proposal", organizationId: "org", source: "SUSPENSE_POST", status: "PROCESSED", externalId: "item", payloadSummary, payloadHash: hash(payloadSummary).slice(7) }]
  command = { suspenseItemId: "item", proposalId: "proposal", expectedRevision: hash({ proposalHash: rows[0].payloadHash, currentRevision: proof.revision }), decision: "APPROVE", reason: "Independent reviewed evidence" }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  tx.user.findFirst.mockResolvedValue({ id: "checker" })
  tx.paymentReconciliationInboxItem.findFirst.mockImplementation(({ where }) => Promise.resolve(rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null))
  tx.paymentReconciliationInboxItem.create.mockImplementation(({ data }) => { rows.push(data); return Promise.resolve(data) })
  tx.suspenseItem.update.mockImplementation(({ data }) => { proof.item = { ...proof.item, ...data }; return Promise.resolve(proof.item) })
  ;(loadSuspenseResolutionEvidenceInTx as jest.Mock).mockImplementation(async () => proof)
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockResolvedValue(["prior-period", "current-period"])
})
afterEach(() => jest.restoreAllMocks())

it("locks the complete Close scope before source rows and invalidates once in the transaction", async () => {
  const result = await decideSuspenseResolution(command, control)
  expect(result.replayed).toBe(false)
  expect(lockReconciliationCloseCatalogInTx).toHaveBeenCalledWith(tx, "org")
  expect((lockReconciliationCloseCatalogInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((lockReconciliationClosePeriodsInTx as jest.Mock).mock.invocationCallOrder[0])
  expect((lockReconciliationClosePeriodsInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(tx.$queryRaw.mock.invocationCallOrder[0])
  expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.suspenseItem.update.mock.invocationCallOrder[0])
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledTimes(1)
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(tx, "org", expect.objectContaining({ sourceCode: "PAYMENT_SUSPENSE_POSTING", periodIds: ["prior-period", "current-period"] }), expect.anything())
  const source = jest.mocked(recordCloseCertificationInvalidationsForSourceInTx).mock.calls[0][2]
  expect(source).not.toHaveProperty("periodId"); expect(source).not.toHaveProperty("periodStart")
})
it("rejects without taking new Close locks or changing the final suspense state", async () => {
  const result = await decideSuspenseResolution({ ...command, decision: "REJECT" }, control)
  expect(result.outcome).toBe("REJECTED")
  expect(lockReconciliationCloseCatalogInTx).not.toHaveBeenCalled()
  expect(recordCloseCertificationInvalidationsForSourceInTx).not.toHaveBeenCalled()
  expect(tx.suspenseItem.update.mock.calls[0][0].data).not.toHaveProperty("status")
})
it("coordinates a verified write-off through the same full Close scope", async () => {
  rows[0].payloadSummary.draft = { ...draft, outcome: "WRITTEN_OFF" }
  rows[0].payloadHash = hash(rows[0].payloadSummary).slice(7)
  command.expectedRevision = hash({ proposalHash: rows[0].payloadHash, currentRevision: proof.revision })
  const result = await decideSuspenseResolution(command, control)
  expect(result.outcome).toBe("WRITTEN_OFF")
  expect(tx.suspenseItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "WRITTEN_OFF" }) }))
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledTimes(1)
})
it("exact replay retains allocation evidence and repeats no new allocation or invalidation", async () => {
  const first = await decideSuspenseResolution(command, control), count = rows.length
  const second = await decideSuspenseResolution(command, control)
  expect(second).toEqual({ ...first, replayed: true }); expect(rows).toHaveLength(count)
  expect(lockReconciliationClosePeriodsInTx).toHaveBeenCalledTimes(1)
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledTimes(1)
  expect(loadSuspenseResolutionEvidenceInTx).toHaveBeenLastCalledWith(tx, draft, expect.objectContaining({ organizationId: "org" }), expect.any(String))
})
it("restarts only a proven membership change as a fresh transaction", async () => {
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockRejectedValueOnce(new JournalReversalSnapshotChangedError())
  await decideSuspenseResolution(command, control)
  expect(db.$transaction).toHaveBeenCalledTimes(2); expect(tx.suspenseItem.update).toHaveBeenCalledTimes(1)
})
it("bounds repeated membership changes without source mutation", async () => {
  ;(lockReconciliationCloseCatalogInTx as jest.Mock).mockRejectedValue(new JournalReversalSnapshotChangedError())
  await expect(decideSuspenseResolution(command, control)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(db.$transaction).toHaveBeenCalledTimes(3); expect(tx.suspenseItem.update).not.toHaveBeenCalled()
})
it("refuses authentication that expires while waiting before source mutation", async () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(0)
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockImplementation(async () => { clock.mockReturnValue(301000); return ["period"] })
  await expect(decideSuspenseResolution(command, control)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(tx.suspenseItem.update).not.toHaveBeenCalled(); expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("preserves maker and clearing-maker separation of duties", async () => {
  await expect(decideSuspenseResolution(command, { ...control, actorId: "maker" })).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  proof.clearing.createdById = "checker"
  await expect(decideSuspenseResolution(command, control)).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  expect(tx.suspenseItem.update).not.toHaveBeenCalled()
})
it("refuses a changed review and conflicting replay", async () => {
  await expect(decideSuspenseResolution({ ...command, expectedRevision: hash("stale") }, control)).rejects.toMatchObject({ code: "CONFLICT" })
  await decideSuspenseResolution(command, control)
  await expect(decideSuspenseResolution({ ...command, decision: "REJECT" }, control)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(tx.suspenseItem.update).toHaveBeenCalledTimes(1)
})
