jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../payment-reconciliation-authority", () => ({ paymentReconciliationAuthority: jest.fn() }))
jest.mock("../payment-reconciliation-close", () => ({ lockPaymentReconciliationCloseScopeInTx: jest.fn(), invalidatePaymentReconciliationCloseScopeInTx: jest.fn() }))
jest.mock("../ap-control.service", () => ({ apJournalEvidenceHash: jest.fn() }))
jest.mock("../payment-reconciliation-evidence", () => ({ ...jest.requireActual("../payment-reconciliation-evidence"), readPaymentReconciliationSourceInTx: jest.fn(), readPaymentReconciliationHistoryInTx: jest.fn(), readPaymentReconciliationBankEvidenceInTx: jest.fn(), paymentReconciliationEvidenceSnapshotInTx: jest.fn(), readPaymentReconciliationMatchInTx: jest.fn(), readCurrentPaymentReconciliationEvidenceInTx: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { paymentReconciliationAuthority } from "../payment-reconciliation-authority"
import { lockPaymentReconciliationCloseScopeInTx, invalidatePaymentReconciliationCloseScopeInTx } from "../payment-reconciliation-close"
import { readPaymentReconciliationSourceInTx, readPaymentReconciliationHistoryInTx, paymentReconciliationEvidenceSnapshotInTx, readPaymentReconciliationMatchInTx, readCurrentPaymentReconciliationEvidenceInTx } from "../payment-reconciliation-evidence"
import { previewPaymentReconciliation, proposePaymentReconciliation, reviewPaymentReconciliation, decidePaymentReconciliation, reopenPaymentReconciliation, loadPaymentReconciliationSources } from "../payment-reconciliation-service"

const scope = { organizationId: "org", actorId: "proposer", sessionId: "session", sessionToken: "token" }, checker = { ...scope, actorId: "checker" }
const permissions = ["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.exception.resolve", "payments.reconciliation.sign"]
const draft = { paymentRequestId: "payment", evidence: { kind: "CASH_VOUCHER" as const, voucherReference: "CASH-1", evidenceUri: "https://evidence.example/cash", evidenceSha256: "b".repeat(64), recipientName: "Supplier recipient", acknowledgedAt: "2026-09-01T12:01:00Z", purpose: "Acknowledgment of full supplier payment", acknowledgment: "RECIPIENT_ACKNOWLEDGED" as const } }
type Event = { id: string; actorId: string; eventType: string; sourceId: string; payload: Record<string, unknown>; payloadHash: string; occurredAt: Date }
let events: Event[], source: Record<string, any>
const tx = { $queryRaw: jest.fn(), supplierBankAccount: { findFirst: jest.fn() }, statementLine: { findFirst: jest.fn() }, businessEvent: { findFirst: jest.fn(), findMany: jest.fn() }, paymentTransaction: { updateMany: jest.fn() }, paymentException: { updateMany: jest.fn() }, matchRecord: { count: jest.fn() }, suspenseItem: { count: jest.fn() }, supplierPayment: { findMany: jest.fn() }, auditLog: { create: jest.fn() } }
beforeEach(() => {
  jest.clearAllMocks(); events = []
  source = { payment: { id: "payment", organizationId: "org", paymentNumber: "PAY-1", supplierId: "supplier", method: "CASH", amount: new Prisma.Decimal(100), currency: "XAF", bankAccountId: null, requestedById: "requester", approvedById: "approver", releasedById: "executor" }, supplier: { name: "Supplier" },
    execution: { command: { draft: { executionReference: "CASH-EXEC-1", executedAt: "2026-09-01T12:00:00Z" } } }, sourceHash: "source-hash", batch: { id: "batch", status: "POSTED" }, journal: { status: "POSTED" },
    transaction: { id: "transaction", state: "PENDING", providerAccountId: null, providerAuthorityEventId: null, metadata: {}, updatedAt: new Date("2026-09-01") }, exception: { id: "exception", status: "OPEN", metadata: {}, updatedAt: new Date("2026-09-01") } }
  jest.mocked(db.$transaction).mockImplementation((async (work: (client: typeof tx) => unknown) => work(tx)) as never)
  jest.mocked(paymentReconciliationAuthority).mockReset().mockResolvedValue({ permissions, fresh: true })
  jest.mocked(lockPaymentReconciliationCloseScopeInTx).mockResolvedValue(["earlier", "current"])
  jest.mocked(readPaymentReconciliationSourceInTx).mockImplementation(async () => source as never)
  jest.mocked(readPaymentReconciliationHistoryInTx).mockImplementation(async () => events as never)
  jest.mocked(paymentReconciliationEvidenceSnapshotInTx).mockImplementation(async (_tx, _source, evidence) => ({ ...evidence, total: "100.00" }) as never)
  jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockReset().mockResolvedValue({ receiptId: "verified" } as never)
  jest.mocked(readPaymentReconciliationMatchInTx).mockReset().mockRejectedValue(new BusinessRuleError("not yet matched", "REVIEW_REQUIRED"))
  jest.mocked(recordBusinessEventInTx).mockImplementation(async (_tx, input) => {
    const event = { id: `receipt-${events.length + 1}`, actorId: input.actorId!, eventType: input.eventType, sourceId: input.sourceId!, payload: input.payload as Record<string, unknown>, payloadHash: hashBusinessPayload(input.payload), occurredAt: new Date(input.occurredAt!) }
    events.push(event); return { event, created: true } as never
  })
  tx.businessEvent.findFirst.mockImplementation(async ({ where }) => events.find(event => `payment-reconciliation:${event.payload.requestReference}` === where.idempotencyKey) ?? null)
  tx.businessEvent.findMany.mockResolvedValue([]); tx.supplierBankAccount.findFirst.mockResolvedValue(null); tx.statementLine.findFirst.mockResolvedValue(null); tx.supplierPayment.findMany.mockResolvedValue([])
  tx.matchRecord.count.mockResolvedValue(0); tx.suspenseItem.count.mockResolvedValue(0)
  tx.paymentTransaction.updateMany.mockImplementation(async ({ data }) => { Object.assign(source.transaction, data); return { count: 1 } })
  tx.paymentException.updateMany.mockImplementation(async ({ data }) => { Object.assign(source.exception, data); return { count: 1 } })
})
async function propose() {
  const preview = await previewPaymentReconciliation(draft, scope), command = { draft, expectedRevision: preview.revision, idempotencyKey: "proposal-0001" }
  return { command, result: await proposePaymentReconciliation(command, scope) }
}
async function approve() {
  await propose(); const review = await reviewPaymentReconciliation("payment", checker)
  const command = { paymentRequestId: "payment", proposalId: review.proposalId!, decision: "APPROVE" as const, reason: "Recipient acknowledgment independently checked", expectedRevision: review.revision, idempotencyKey: "decision-0001" }
  return { command, result: await decidePaymentReconciliation(command, checker) }
}
it("uses Read Committed and obtains full Close scope before any payment row lock", async () => {
  await propose()
  expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "ReadCommitted" }))
  expect(jest.mocked(lockPaymentReconciliationCloseScopeInTx).mock.invocationCallOrder[0]).toBeLessThan(tx.$queryRaw.mock.invocationCallOrder[0])
  expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled(); expect(tx.paymentException.updateMany).not.toHaveBeenCalled()
})
it("binds the exact reviewed draft and fails stale submissions before event or payment writes", async () => {
  await expect(proposePaymentReconciliation({ draft, expectedRevision: "f".repeat(64), idempotencyKey: "proposal-0001" }, scope)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(recordBusinessEventInTx).not.toHaveBeenCalled(); expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
})
it.each(["requester", "approver", "executor", "proposer"])("prevents %s from approving their own execution chain", async actorId => {
  await propose(); const review = await reviewPaymentReconciliation("payment", { ...checker, actorId })
  expect(review.canDecide).toBe(false)
  await expect(decidePaymentReconciliation({ paymentRequestId: "payment", proposalId: review.proposalId!, decision: "APPROVE", reason: "Reviewed the acknowledgment evidence", expectedRevision: review.revision, idempotencyKey: "decision-0001" }, { ...checker, actorId })).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
})
it("rejects expired final authority after waits before durable effects", async () => {
  const preview = await previewPaymentReconciliation(draft, scope)
  jest.mocked(paymentReconciliationAuthority).mockReset().mockResolvedValueOnce({ permissions, fresh: true }).mockRejectedValueOnce(new BusinessRuleError("expired", "FRESH_AUTH_REQUIRED"))
  await expect(proposePaymentReconciliation({ draft, expectedRevision: preview.revision, idempotencyKey: "proposal-0001" }, scope)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(recordBusinessEventInTx).not.toHaveBeenCalled(); expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
})
it("cash review closes only the retained obligation and never manufactures a provider or financial effect", async () => {
  const { result } = await approve()
  expect(result.status).toBe("CASH_REVIEWED"); expect(source.transaction.state).toBe("CONFIRMED"); expect(source.transaction.providerAccountId).toBeNull()
  expect(tx.paymentException.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "exception", organizationId: "org", status: "OPEN" }), data: expect.objectContaining({ status: "RESOLVED" }) }))
  expect(invalidatePaymentReconciliationCloseScopeInTx).toHaveBeenLastCalledWith(tx, "org", expect.objectContaining({ affectedPeriodIds: ["earlier", "current"], receiptId: result.receiptId }))
})
it("exact replay returns current observation without repeating effects and changed payload cannot reuse the key", async () => {
  const { command } = await approve(), writes = tx.paymentTransaction.updateMany.mock.calls.length
  const replay = await decidePaymentReconciliation(command, checker)
  expect(replay.replayed).toBe(true); expect(tx.paymentTransaction.updateMany).toHaveBeenCalledTimes(writes)
  await expect(decidePaymentReconciliation({ ...command, reason: "Changed reviewer decision reason" }, checker)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("exposes stale proof honestly and permits deliberate cash withdrawal without repairing proof first", async () => {
  await approve(); jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockRejectedValue(new BusinessRuleError("changed pointer", "REVIEW_REQUIRED"))
  const review = await reviewPaymentReconciliation("payment", checker)
  expect(review).toMatchObject({ status: "CASH_REVIEWED", evidenceCurrent: false, evidenceIssue: "REVIEW_REQUIRED", canReopen: true })
  const result = await reopenPaymentReconciliation({ paymentRequestId: "payment", expectedRevision: review.revision, reason: "Recipient evidence was withdrawn after review", idempotencyKey: "reopen-0001" }, checker)
  expect(result.status).toBe("REOPENED"); expect(source.transaction.state).toBe("PENDING"); expect(source.exception.status).toBe("OPEN")
  expect(events.map(event => event.payload.status)).toEqual(["PROPOSED", "CASH_REVIEWED", "REOPENED"])
})
it("never turns a failed queue query into zero records", async () => {
  tx.supplierPayment.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(loadPaymentReconciliationSources({}, scope)).rejects.toThrow("database unavailable")
})
