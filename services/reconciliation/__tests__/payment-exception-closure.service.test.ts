jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {} }))
import { exceptionClosureManifestEvidenceInTx } from "../payment-exception-closure-evidence.service"
jest.mock("server-only", () => ({}))
jest.mock("../reconciliation-close-order.service", () => ({
  ...jest.requireActual("../reconciliation-close-order.service"),
  lockReconciliationCloseCatalogInTx: jest.fn(), lockReconciliationClosePeriodsInTx: jest.fn(),
}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../payment-exception-source-evidence", () => ({ loadReconciliationExceptionLinkSourceInTx: jest.fn() }))
jest.mock("../payment-suspense-resolution-evidence.service", () => ({ suspenseResolutionManifestEvidenceInTx: jest.fn() }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
jest.mock("@/services/purchasing/payment-reconciliation-evidence", () => ({ readCurrentPaymentReconciliationEvidenceInTx: jest.fn() }))
import { readCurrentPaymentReconciliationEvidenceInTx } from "@/services/purchasing/payment-reconciliation-evidence"

import { db } from "@/prisma/db"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx } from "../reconciliation-close-order.service"
import { JournalReversalSnapshotChangedError } from "@/services/accounting/journal-reversal-order.service"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { loadReconciliationExceptionLinkSourceInTx } from "../payment-exception-source-evidence"
import { suspenseResolutionManifestEvidenceInTx } from "../payment-suspense-resolution-evidence.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { previewExceptionClosure, proposeExceptionClosure, reviewExceptionClosure, decideExceptionClosure, listExceptionClosureCases, readExceptionClosureHistory } from "../payment-exception-closure.service"

const now = new Date("2026-09-12T12:00:00Z"), hash = (v: unknown) => suspenseEvidenceHash(JSON.parse(JSON.stringify(v)))
let exception: any, item: any, run: any, rows: any[], audits: any[]
const tx = { user: { findFirst: jest.fn() }, paymentException: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() }, reconciliationRun: { update: jest.fn() },
  paymentReconciliationInboxItem: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn(), create: jest.fn() }, $queryRaw: jest.fn() }
const permissions = ["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.exception.resolve"]
const control = { organizationId: "org", actorId: "proposer", actorPermissions: permissions, lastAuthAt: now, now }
const checker = { ...control, actorId: "checker" }
beforeEach(() => {
  jest.resetAllMocks(); rows = []; audits = []
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockResolvedValue(["prior-period", "current-period"])
  exception = { id: "exception", organizationId: "org", type: "MISSING_PROVIDER_EVENT", status: "OPEN", suspenseItemId: "item", updatedAt: now, resolvedAt: null, resolutionNotes: null, metadata: { retained: true } }
  item = { id: "item", status: "RESOLVED", metadata: {}, amount: "10.00" }; run = { id: "run", runById: "maker", status: "NEEDS_REVIEW", metadata: {}, signedAt: null, signedById: null, certificateHash: null, certificatePayload: null }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx)); tx.user.findFirst.mockResolvedValue({ id: "active" })
  tx.paymentException.findFirst.mockImplementation(({ where }) => Promise.resolve(where.organizationId === "org" && where.id === exception.id ? { ...exception } : null))
  tx.paymentException.updateMany.mockImplementation(({ data }) => { exception = { ...exception, ...data, updatedAt: now }; return Promise.resolve({ count: 1 }) })
  tx.reconciliationRun.update.mockImplementation(({ data }) => { run = { ...run, ...data }; return Promise.resolve(run) })
  tx.paymentReconciliationInboxItem.create.mockImplementation(({ data }) => { const row = { ...data, createdAt: now }; rows.push(row); return Promise.resolve(row) })
  tx.paymentReconciliationInboxItem.findFirst.mockImplementation(({ where }) => Promise.resolve(rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null))
  tx.ledgerAuditEvent.create.mockImplementation(({ data }) => { audits.push(data); return Promise.resolve(data) })
  tx.ledgerAuditEvent.findFirst.mockImplementation(({ where }) => Promise.resolve(audits.find(a => a.organizationId === where.organizationId && a.resourceId === where.resourceId && a.actorId === where.actorId && a.action === where.action && a.metadata[where.metadata.path[0]] === where.metadata.equals) ?? null))
  ;(loadReconciliationExceptionLinkSourceInTx as jest.Mock).mockImplementation(async () => ({ exception: { ...exception }, item, run, references: [{ source: "original" }], revision: hash({ exception, item, run }) }))
  ;(suspenseResolutionManifestEvidenceInTx as jest.Mock).mockResolvedValue({ decisionId: "financial-decision", decisionHash: "f", allocationId: "allocation", allocationHash: "a", financialHash: "verified-financial" })
  tx.paymentReconciliationInboxItem.findMany.mockImplementation(() => Promise.resolve(rows.map(row => ({ id: row.id, createdAt: row.createdAt }))))
  tx.paymentReconciliationInboxItem.count.mockImplementation(() => Promise.resolve(rows.length))
})

it("paginates scoped cases with complete counts and honest investigation availability", async () => {
  tx.paymentException.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: `case-${i}`, createdAt: now, type: i === 0 ? "TAMPER_SIGNAL" : "MISSING_PROVIDER_EVENT", status: "OPEN", suspenseItemId: "item" })))
  tx.paymentException.count.mockResolvedValue(123)
  const cursor = { id: "before", createdAt: now.toISOString() }
  const result = await listExceptionClosureCases({ cursor, suspenseItemId: "item" }, control)
  expect(result.items).toHaveLength(20); expect(result.total).toBe(123)
  expect(result.items[0].closurePath).toBe("INVESTIGATION_REQUIRED"); expect(result.items[1].closurePath).toBe("FINANCIAL_REVIEW")
  expect(result.nextCursor).toEqual({ id: "case-19", createdAt: now.toISOString() })
  expect(tx.paymentException.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", status: { notIn: ["RESOLVED", "DISMISSED"] }, suspenseItemId: "item", OR: [{ createdAt: { lt: now } }, { createdAt: now, id: { lt: "before" } }] }, take: 21 }))
  expect(tx.paymentException.count).toHaveBeenCalledWith({ where: { organizationId: "org", status: { notIn: ["RESOLVED", "DISMISSED"] }, suspenseItemId: "item" } })
  expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
})

it("uses source-owned AP proof without inventing a suspense or reconciliation run", async () => {
  exception = { ...exception, sourceType: "SUPPLIER_PAYMENT", sourceId: "supplier-payment", type: "MISSING_STATEMENT_LINE", suspenseItemId: null, status: "RESOLVED" }
  const proof = { paymentRequestId: "supplier-payment", exceptionId: exception.id, decisionId: "ap-decision", decisionHash: "ap-hash", proposalId: "ap-proposal", proposalHash: "ap-proposal-hash", kind: "CASH_VOUCHER" }
  jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockResolvedValue(proof as never)
  await expect(exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).resolves.toMatchObject({ receiptId: "ap-decision", supplierPaymentReview: proof, suspenseItemId: null, financialDecisionId: null })
  expect(loadReconciliationExceptionLinkSourceInTx).not.toHaveBeenCalled()
  jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockResolvedValue(null)
  await expect(exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).rejects.toThrow(/missing or changed/)
})
it("reads all-case history without converting a failed case query into empty results", async () => {
  tx.paymentException.findMany.mockResolvedValue([]); tx.paymentException.count.mockResolvedValue(0)
  expect(await listExceptionClosureCases({ view: "ALL" }, control)).toMatchObject({ total: 0, nextCursor: null })
  expect(tx.paymentException.count).toHaveBeenCalledWith({ where: { organizationId: "org" } })
  tx.paymentException.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(listExceptionClosureCases({}, control)).rejects.toThrow("database unavailable")
})
it("retains verified history after reopening without reporting an old proposal as current approval", async () => {
  const p = await proposal(); const before = await readExceptionClosureHistory({ exceptionId: "exception" }, checker)
  expect(before.items[0]).toMatchObject({ kind: "PROPOSED", requiresCurrentReview: true, decisionId: null })
  const decided = await decideExceptionClosure(p.decision, checker)
  exception.status = "REOPENED"
  ;(suspenseResolutionManifestEvidenceInTx as jest.Mock).mockRejectedValue(new Error("old financial state is no longer current"))
  const history = await readExceptionClosureHistory({ exceptionId: "exception" }, checker)
  expect(history.exception.status).toBe("REOPENED")
  expect(history.items[0]).toMatchObject({ decisionId: decided.receiptId, requiresCurrentReview: false })
  expect(history.items[1]).toMatchObject({ kind: "APPROVED", actorId: "checker" })
  expect(JSON.stringify(history)).not.toMatch(/beforeException|priorRunCertificate|reviewedRevision|financialHash|requestHash/)
})
it("marks rejected proposals decided and keeps independent reasons in history", async () => {
  const p = await proposal(); await decideExceptionClosure({ ...p.decision, decision: "REJECT" }, checker)
  const result = await readExceptionClosureHistory({ exceptionId: "exception" }, checker)
  expect(result.items[0].requiresCurrentReview).toBe(false); expect(result.items[1]).toMatchObject({ kind: "REJECTED", reason: p.decision.reason })
})
it.each(["payload", "audit", "lineage"])("fails history with altered %s rather than displaying verified approval", async corruption => {
  const p = await proposal(); await decideExceptionClosure(p.decision, checker)
  if (corruption === "payload") rows[0].payloadSummary.reason = "Altered reason"
  if (corruption === "audit") audits.pop()
  if (corruption === "lineage") { rows[1].payloadSummary.sourceHash = "changed"; rows[1].payloadHash = hash(rows[1].payloadSummary).slice(7) }
  await expect(readExceptionClosureHistory({ exceptionId: "exception" }, checker)).rejects.toMatchObject({ code: "CONFLICT" })
})
it("scopes history before loading private receipts and denies inactive or insufficient readers", async () => {
  await expect(readExceptionClosureHistory({ exceptionId: "foreign" }, checker)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.paymentReconciliationInboxItem.findMany).not.toHaveBeenCalled()
  await expect(listExceptionClosureCases({}, { ...control, actorPermissions: ["payments.reconciliation.read"] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  tx.user.findFirst.mockResolvedValue(null)
  await expect(readExceptionClosureHistory({ exceptionId: "exception" }, checker)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
async function proposal() {
  const preview = await previewExceptionClosure({ exceptionId: "exception" }, control)
  const command = { exceptionId: "exception", expectedRevision: preview.revision, reason: "Reviewed the missing source and retained financial treatment", idempotencyKey: "f79a0761-bdbb-42a9-833a-7b9c30680c0a" }
  const proposed = await proposeExceptionClosure(command, control)
  return { command, proposed, decision: { exceptionId: "exception", proposalId: proposed.proposalId, expectedRevision: preview.revision, decision: "APPROVE" as const, reason: "Independently reviewed cause and outcome" } }
}
it("retains a proposal without closing the exception, then records an independent decision and proof", async () => {
  const p = await proposal(); expect(exception.status).toBe("OPEN"); expect((await reviewExceptionClosure("exception", p.proposed.proposalId, checker)).reason).toBe(p.command.reason)
  const result = await decideExceptionClosure(p.decision, checker)
  expect(exception).toMatchObject({ status: "RESOLVED", metadata: { retained: true, closureReceiptId: result.receiptId } }); expect(run.status).toBe("NEEDS_REVIEW")
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(tx, "org", expect.objectContaining({ sourceCode: "PAYMENT_RECONCILIATION_EXCEPTION_DECIDED", periodIds: ["prior-period", "current-period"] }), expect.anything())
  expect((lockReconciliationCloseCatalogInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((lockReconciliationClosePeriodsInTx as jest.Mock).mock.invocationCallOrder[0])
  expect((lockReconciliationClosePeriodsInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(tx.$queryRaw.mock.invocationCallOrder[0])
  expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.paymentException.updateMany.mock.invocationCallOrder[0])
  expect(await exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).toMatchObject({ receiptId: result.receiptId, financialDecisionId: "financial-decision" })
  expect(JSON.stringify(await previewExceptionClosure({ exceptionId: "exception" }, checker))).not.toContain("retained")
})
it("replays the exact proposal and decision without duplicate writes and rejects changed reuse", async () => {
  const p = await proposal(); expect(await proposeExceptionClosure(p.command, control)).toEqual({ ...p.proposed, replayed: true })
  const first = await decideExceptionClosure(p.decision, checker), size = rows.length
  expect(await decideExceptionClosure(p.decision, checker)).toEqual({ ...first, replayed: true }); expect(rows).toHaveLength(size)
  expect(lockReconciliationClosePeriodsInTx).toHaveBeenCalledTimes(1)
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledTimes(1)
  await expect(decideExceptionClosure({ ...p.decision, reason: "Different reason" }, checker)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it.each(["proposer", "maker"])("rejects approval by %s", async actorId => {
  const p = await proposal(); await expect(decideExceptionClosure(p.decision, { ...checker, actorId })).rejects.toMatchObject({ code: "SOD_VIOLATION" }); expect(exception.status).toBe("OPEN")
})
it("records rejection without closing the exception or changing run evidence", async () => {
  const p = await proposal(); expect(await decideExceptionClosure({ ...p.decision, decision: "REJECT" }, checker)).toMatchObject({ outcome: "REJECTED" }); expect(exception.status).toBe("OPEN"); expect(tx.reconciliationRun.update).not.toHaveBeenCalled()
  expect(lockReconciliationCloseCatalogInTx).not.toHaveBeenCalled()
  expect(lockReconciliationClosePeriodsInTx).not.toHaveBeenCalled()
  expect(recordCloseCertificationInvalidationsForSourceInTx).not.toHaveBeenCalled()
})
it("restarts a stale Close snapshot as a new transaction before any exception effect", async () => {
  const p = await proposal(), calls = (db.$transaction as jest.Mock).mock.calls.length
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockRejectedValueOnce(new JournalReversalSnapshotChangedError())
  await expect(decideExceptionClosure(p.decision, checker)).resolves.toMatchObject({ outcome: "RESOLVED", replayed: false })
  expect((db.$transaction as jest.Mock).mock.calls.length - calls).toBe(2)
  expect(tx.paymentException.updateMany).toHaveBeenCalledTimes(1)
})
it("bounds repeated membership changes without exception writes", async () => {
  const p = await proposal()
  ;(lockReconciliationCloseCatalogInTx as jest.Mock).mockRejectedValue(new JournalReversalSnapshotChangedError())
  await expect(decideExceptionClosure(p.decision, checker)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(lockReconciliationCloseCatalogInTx).toHaveBeenCalledTimes(3)
  expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
  expect(rows).toHaveLength(1)
})
it("refuses authentication that expires while waiting before committing a decision", async () => {
  const p = await proposal(), clock = jest.spyOn(Date, "now").mockReturnValue(1000)
  ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockImplementation(async () => { clock.mockReturnValue(301001); return ["period"] })
  try {
    await expect(decideExceptionClosure(p.decision, checker)).rejects.toBeInstanceOf(FreshAuthRequiredError)
    expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
    expect(recordCloseCertificationInvalidationsForSourceInTx).not.toHaveBeenCalled()
    expect(rows).toHaveLength(1)
  } finally { clock.mockRestore() }
})
it.each(["TAMPER_SIGNAL", "SIGNATURE_FAILURE", "REPLAY_SPIKE", "DUPLICATE_PROVIDER_REFERENCE", "OTHER"])("does not let financial clearing close %s", async type => {
  exception.type = type; await expect(previewExceptionClosure({ exceptionId: "exception" }, checker)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
})
it("rejects missing financial approval and pending recovery", async () => {
  ;(suspenseResolutionManifestEvidenceInTx as jest.Mock).mockResolvedValueOnce(null)
  await expect(previewExceptionClosure({ exceptionId: "exception" }, checker)).rejects.toMatchObject({ code: "CONFLICT" })
  item.metadata = { resolutionRecoveryProposalId: "pending" }; await expect(previewExceptionClosure({ exceptionId: "exception" }, checker)).rejects.toMatchObject({ code: "CONFLICT" })
})
it("rejects stale preview, stale proposal and a lost conditional update", async () => {
  const p = await proposal(); exception.metadata.extra = "changed"
  await expect(decideExceptionClosure(p.decision, checker)).rejects.toMatchObject({ code: "CONFLICT" }); delete exception.metadata.extra
  tx.paymentException.updateMany.mockResolvedValue({ count: 0 }); await expect(decideExceptionClosure(p.decision, checker)).rejects.toMatchObject({ code: "CONFLICT" })
})
it.each(["permission", "expired", "future", "inactive", "foreign"])("refuses %s authority before proposal writes", async kind => {
  const p = await proposal(); const c = { ...control }
  if (kind === "permission") c.actorPermissions = ["payments.reconciliation.read", "accounting.journal.read"]
  if (kind === "expired") c.lastAuthAt = new Date(0)
  if (kind === "future") c.lastAuthAt = new Date(now.getTime() + 1)
  if (kind === "inactive") tx.user.findFirst.mockResolvedValue(null)
  if (kind === "foreign") c.organizationId = "foreign"
  await expect(proposeExceptionClosure({ ...p.command, idempotencyKey: "b3930c01-69e0-407e-bc97-4968dcc135bc" }, c)).rejects.toThrow(); expect(rows.filter(r => r.payloadSummary.kind === "EXCEPTION_CLOSURE_PROPOSED_V1")).toHaveLength(1)
})
it("refuses terminal status without retained proof and rejects altered or reopened evidence", async () => {
  const p = await proposal(); const result = await decideExceptionClosure(p.decision, checker)
  exception.resolutionNotes = "altered"; await expect(exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).rejects.toMatchObject({ code: "CONFLICT" })
  exception.resolutionNotes = p.decision.reason; audits = audits.filter(a => a.action !== "EXCEPTION_CLOSURE_APPROVE")
  await expect(decideExceptionClosure(p.decision, checker)).rejects.toMatchObject({ code: "CONFLICT" }); expect(rows.find(r => r.id === result.receiptId)).toBeTruthy()
  exception.status = "REOPENED"; expect(await exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).toBeNull()
})
it("refuses a terminal label with no closure receipt and a replay with missing proposal audit", async () => {
  exception.status = "RESOLVED"
  await expect(exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).rejects.toMatchObject({ code: "CONFLICT" })
  exception.status = "OPEN"; const p = await proposal(); audits = []
  await expect(proposeExceptionClosure(p.command, control)).rejects.toMatchObject({ code: "CONFLICT" })
})
it("invalidates closure proof when original provider source changes", async () => {
  const p = await proposal(); await decideExceptionClosure(p.decision, checker)
  ;(loadReconciliationExceptionLinkSourceInTx as jest.Mock).mockResolvedValue({ exception, item, run, references: [{ source: "changed" }], revision: "changed" })
  await expect(exceptionClosureManifestEvidenceInTx(tx as never, "org", exception)).rejects.toMatchObject({ code: "CONFLICT" })
})
