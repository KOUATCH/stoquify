import { Prisma } from "@prisma/client"
import { loadCorroboratingSourceInTx, assertCorroboratingDecisionState } from "../payment-corroborating-source-evidence"
import { loadReconciliationExceptionLinkSourceInTx } from "../payment-exception-source-evidence"
import { loadAdditionalSourcesReceiptInTx } from "../reconciliation-run-preparation-evidence"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"

jest.mock("../payment-exception-source-evidence", () => ({ loadReconciliationExceptionLinkSourceInTx: jest.fn() }))
jest.mock("../reconciliation-run-preparation-evidence", () => ({ loadAdditionalSourcesReceiptInTx: jest.fn() }))

const amount = new Prisma.Decimal("100.25"), now = new Date("2026-09-27T12:00:00Z")
let current: any, payment: any, match: any, line: any, event: any, file: any
const tx = { ledgerPostingBatch: { count: jest.fn() }, paymentTransaction: { findMany: jest.fn() }, matchRecord: { findMany: jest.fn(), count: jest.fn() },
  paymentException: { count: jest.fn() }, providerEvent: { findFirst: jest.fn() }, statementLine: { findFirst: jest.fn() }, statementFile: { findFirst: jest.fn() } }
const load = () => loadCorroboratingSourceInTx(tx as never, "org", "exception", "item")
beforeEach(() => {
  jest.resetAllMocks()
  payment = { id: "payment", state: "CONFIRMED", amount, providerTransactionId: "txn", providerReference: "ref", currencyCode: "XAF", direction: "INBOUND", occurredAt: now }
  match = { id: "match", paymentTransactionId: "payment", providerEventId: "event", statementLineId: null, reconciliationRunId: "run", status: "AUTO_MATCHED", amountMatched: amount, currencyCode: "XAF", matchedById: "matcher" }
  line = { id: "line", providerTransactionId: "txn", providerReference: "ref", amount, currencyCode: "XAF", direction: "CREDIT", occurredAt: now, status: "UNMATCHED", statementFileId: "file", fingerprint: "fingerprint" }
  event = { ...payment, id: "event", status: "VERIFIED", signatureValid: true, rawPayloadHash: "payload" }
  file = { id: "file", status: "IMPORTED", fileHash: "file-hash" }
  current = { exception: { id: "exception", type: "MANUAL_REVIEW_REQUIRED", evidence: { rule: "ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE" }, paymentTransactionId: null, statementLineId: "line", providerEventId: null, correlationId: "recovery" },
    item: { id: "item", providerAccountId: "provider", status: "OPEN", postedAt: null, ledgerPostingBatchId: null, amount, currencyCode: "XAF", direction: "INBOUND" },
    run: { id: "run", runById: "maker", periodStart: new Date("2026-09-27T00:00:00Z"), periodEnd: new Date("2026-09-28T00:00:00Z") }, revision: "revision" }
  jest.mocked(loadReconciliationExceptionLinkSourceInTx).mockImplementation(async () => current)
  jest.mocked(loadAdditionalSourcesReceiptInTx).mockResolvedValue({ row: { payloadHash: "recovery-hash" }, data: { actorId: "recovery-actor", additions: { statementLineIds: ["line"], providerEventIds: [] } } } as never)
  tx.ledgerPostingBatch.count.mockResolvedValue(0); tx.matchRecord.count.mockResolvedValue(0); tx.paymentException.count.mockResolvedValue(0)
  tx.paymentTransaction.findMany.mockImplementation(async () => [payment]); tx.matchRecord.findMany.mockImplementation(async () => [match])
  tx.statementLine.findFirst.mockImplementation(async () => line); tx.providerEvent.findFirst.mockImplementation(async () => event); tx.statementFile.findFirst.mockImplementation(async () => file)
})

it("binds an exact corroborating statement to the original full allocation and its recovery lineage", async () => {
  const result = await load()
  expect(result.financial).toBeNull()
  expect(result.sourceReview).toMatchObject({ kind: "CORROBORATING_SOURCE_V1", sourceId: "line", matchId: "match", paymentId: "payment", amount: "100.25", excludedApproverIds: ["maker", "matcher", "recovery-actor"] })
  expect(loadAdditionalSourcesReceiptInTx).toHaveBeenCalledWith(tx, "org", "run", "recovery")
  expect(tx.statementFile.findFirst).toHaveBeenCalledWith({ where: { id: "file", organizationId: "org", providerAccountId: "provider" } })
  expect(tx.paymentTransaction.findMany).toHaveBeenCalledWith({ where: { organizationId: "org", providerAccountId: "provider", providerTransactionId: { equals: "txn", mode: "insensitive" } } })
})

it.each(["amount", "currency", "direction", "reference", "transaction", "date", "file", "signature", "retained-amount", "retained-reference", "payment-state", "missing-payment-date", "partial", "ambiguous-payment", "multiple-matches", "foreign-run", "already-matched", "other-exception", "posted", "posting-history", "unsupported-rule", "dual-source", "unproven-recovery"])("keeps %s evidence in investigation", async kind => {
  if (kind === "amount") line.amount = new Prisma.Decimal("99.00")
  if (kind === "currency") line.currencyCode = "USD"
  if (kind === "direction") line.direction = "DEBIT"
  if (kind === "reference") line.providerReference = "different"
  if (kind === "transaction") line.providerTransactionId = null
  if (kind === "date") line.occurredAt = new Date("2026-09-28")
  if (kind === "file") file.status = "REJECTED"
  if (kind === "signature") event.signatureValid = false
  if (kind === "retained-amount") event.amount = new Prisma.Decimal("98")
  if (kind === "retained-reference") event.providerTransactionId = "different"
  if (kind === "payment-state") payment.state = "FAILED"
  if (kind === "missing-payment-date") payment.occurredAt = null
  if (kind === "partial") match.amountMatched = new Prisma.Decimal("50")
  if (kind === "ambiguous-payment") tx.paymentTransaction.findMany.mockResolvedValue([payment, { ...payment, id: "another" }])
  if (kind === "multiple-matches") tx.matchRecord.findMany.mockResolvedValue([match, { ...match, id: "another" }])
  if (kind === "foreign-run") match.reconciliationRunId = "other-run"
  if (kind === "already-matched") tx.matchRecord.count.mockResolvedValue(1)
  if (kind === "other-exception") tx.paymentException.count.mockResolvedValue(1)
  if (kind === "posted") current.item.postedAt = now
  if (kind === "posting-history") tx.ledgerPostingBatch.count.mockResolvedValue(1)
  if (kind === "unsupported-rule") current.exception.evidence.rule = "ORPHAN_STATEMENT_LINE"
  if (kind === "dual-source") current.exception.providerEventId = "other-event"
  if (kind === "unproven-recovery") jest.mocked(loadAdditionalSourcesReceiptInTx).mockResolvedValue({ row: { payloadHash: "hash" }, data: { additions: { statementLineIds: ["another"] } } } as never)
  await expect(load()).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
})

it("changes the reviewed revision when a retained allocation or source record changes", async () => {
  const first = await load(); file.fileHash = "changed"
  expect((await load()).revision).not.toBe(first.revision)
})

it("requires the resolved suspense pointer, timestamp and exact state hash", async () => {
  const proof = await load()
  await expect(() => assertCorroboratingDecisionState(proof, "decision", "forged")).toThrow(/retained investigation/)
  Object.assign(current.item, { status: "RESOLVED", resolvedAt: now, metadata: { nonfinancialExceptionId: "exception", nonfinancialClosureReceiptId: "decision" } })
  const resolved = await load(), stateHash = suspenseEvidenceHash(JSON.parse(JSON.stringify(current.item)))
  expect(() => assertCorroboratingDecisionState(resolved, "decision", stateHash)).not.toThrow()
  current.item.metadata.nonfinancialExceptionId = "foreign"
  expect(() => assertCorroboratingDecisionState(resolved, "decision", stateHash)).toThrow(/retained investigation/)
})
