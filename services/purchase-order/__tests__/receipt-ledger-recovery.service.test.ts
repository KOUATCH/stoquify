/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { readReceiptRecognitionSource, readReceiptRecognitionEvidence } from "../receipt-recognition-source"
import { postReceiptRecognitionInTx } from "../receipt-recognition.service"
import { listReceiptReturnRecoverySources } from "@/services/purchasing/receipt-return-recognition"
import { recoverPurchaseReturnAccountingInTx } from "@/services/purchasing/purchase-return-credit.service"
import { receiptLedgerRecoveryAuthority } from "../receipt-ledger-recovery-authority"
import { previewReceiptLedgerRecovery, confirmReceiptLedgerRecovery } from "../receipt-ledger-recovery.service"

jest.mock("server-only", () => ({}))
jest.mock("@/services/accounting/posting-rules.service", () => ({ getActivePostingRule: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ hashBusinessPayload: (value: unknown) => require("crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
jest.mock("../receipt-recognition-source", () => ({ readReceiptRecognitionSource: jest.fn(), readReceiptRecognitionEvidence: jest.fn(), receiptRecognitionReviewRequired: () => new (require("@/services/_shared/action-errors").BusinessRuleError)("Review receipt evidence", "RECEIPT_EVIDENCE_REQUIRED") }))
jest.mock("../receipt-recognition.service", () => ({ postReceiptRecognitionInTx: jest.fn() }))
jest.mock("@/services/purchasing/receipt-return-recognition", () => ({ listReceiptReturnRecoverySources: jest.fn() }))
jest.mock("@/services/purchasing/purchase-return-credit.service", () => ({ recoverPurchaseReturnAccountingInTx: jest.fn() }))
jest.mock("../receipt-ledger-recovery-authority", () => ({ receiptLedgerRecoveryAuthority: jest.fn(), receiptLedgerRecoveryScopeSchema: require("zod").z.object({ organizationId: require("zod").z.string(), actorId: require("zod").z.string(), sessionId: require("zod").z.string(), sessionToken: require("zod").z.string() }).strict() }))

const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "session-test" }
const draft = { orderId: "po", receiptId: "gr" }, effectiveAt = "2026-08-10T12:00:00.000Z"
const source = { eventId: "source-event", sourceHash: "b".repeat(64), inventoryValue: new Prisma.Decimal("2500"), manifest: { effectiveAt, currency: "XAF", lines: [{ receiptLineId: "line" }] } }
function txMock() { return {
  $queryRaw: jest.fn().mockResolvedValue([]),
  goodsReceipt: { findFirst: jest.fn().mockResolvedValue({ id: "gr", purchaseOrderId: "po", receiptNumber: "GR-1", purchaseOrder: { supplier: { organizationId: "org", name: "Supplier" } }, organization: { currency: "XAF", accountingSettings: { retainedSettings: "original" } } }) },
  ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([{ id: "batch", periodId: "period", status: "FAILED", journalEntries: [], sourceLinks: [] }]) },
  accountingPeriod: { findMany: jest.fn().mockResolvedValue([{ id: "period", name: "August", status: "OPEN" }]) },
  journal: { findMany: jest.fn().mockResolvedValue([{ id: "inventory", code: "INV" }]) },
  chartOfAccount: { findMany: jest.fn().mockResolvedValue([{ id: "account", mappingKey: "INVENTORY", isActive: true }]) },
  supplierInvoice: { findMany: jest.fn().mockResolvedValue([]) }, purchaseReturnLine: { findMany: jest.fn().mockResolvedValue([]) },
  businessEvent: { findUnique: jest.fn().mockResolvedValue(null) },
} }
let tx: ReturnType<typeof txMock>
beforeEach(() => {
  jest.clearAllMocks(); tx = txMock()
  ;(db.$transaction as jest.Mock).mockImplementation((work: (value: unknown) => unknown) => work(tx))
  ;(receiptLedgerRecoveryAuthority as jest.Mock).mockResolvedValue({ fresh: true })
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([])
  ;(recoverPurchaseReturnAccountingInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "POSTED", ledgerBatch: { id: "return-batch" }, journalEntryId: "return-journal", accountingSourceLinkId: "return-link" })
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(source)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "BLOCKED", batchId: "batch", journalId: null, evidenceHash: null })
  ;(getActivePostingRule as jest.Mock).mockResolvedValue({ code: "GR", lines: [{ accountId: "account", mappingKey: null }] })
  ;(postReceiptRecognitionInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "POSTED", ledgerBatch: { id: "batch" }, journalEntryId: "journal", accountingSourceLinkId: "link" })
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ event: { id: "recovery-event" } })
})
async function command() { return { ...draft, expectedRevision: (await previewReceiptLedgerRecovery(draft, scope)).revision, idempotencyKey: "recovery-request" } }
test("previews and records only canonical recognition at the retained original date", async () => {
  const request = await command(), result = await confirmReceiptLedgerRecovery(request, scope)
  expect(getActivePostingRule).toHaveBeenCalledWith("org", { sourceType: "GOODS_RECEIPT", postingPurpose: "GOODS_RECEIPT", effectiveAt: new Date(effectiveAt) }, tx)
  expect(tx.accountingPeriod.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", startDate: { lte: new Date(effectiveAt) }, endDate: { gte: new Date(effectiveAt) } } }))
  expect(postReceiptRecognitionInTx).toHaveBeenCalledTimes(1)
  expect(postReceiptRecognitionInTx).toHaveBeenCalledWith(tx, { organizationId: "org", receiptId: "gr", actorId: "actor" })
  expect(result).toMatchObject({ ...draft, effectiveAt, sourceHash: source.sourceHash, ledgerStatus: "POSTED", journalEntryId: "journal", accountingSourceLinkId: "link", replayed: false })
  expect(recordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ documentHash: source.sourceHash, sourceId: "gr", actorId: "actor", postingBatchId: "batch", payload: { commandHash: hashBusinessPayload(request), result: expect.objectContaining({ requestReference: request.idempotencyKey }) } }))
  expect(markBusinessEventAppliedInTx).toHaveBeenCalledWith(tx, "org", "recovery-event")
})
test("unmarked historical receipts cannot be accrued", async () => {
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(null)
  const preview = await previewReceiptLedgerRecovery(draft, scope)
  expect(preview.blockers).toContain("LEGACY_SOURCE")
  await expect(confirmReceiptLedgerRecovery({ ...draft, expectedRevision: preview.revision, idempotencyKey: "legacy-request" }, scope)).rejects.toBeInstanceOf(BusinessRuleError)
  expect(postReceiptRecognitionInTx).not.toHaveBeenCalled()
})
test.each(["CLOSED", "LOCKED"])("blocks the original %s period", async status => {
  tx.accountingPeriod.findMany.mockResolvedValue([{ id: "period", name: "August", status }])
  expect((await previewReceiptLedgerRecovery(draft, scope)).blockers).toContain("PERIOD_UNAVAILABLE")
})
test.each(["rule", "accounts", "settings", "period"])("rejects changes to previewed %s before any posting", async changed => {
  const request = await command()
  if (changed === "rule") (getActivePostingRule as jest.Mock).mockResolvedValue({ code: "NEW", lines: [] })
  if (changed === "accounts") tx.chartOfAccount.findMany.mockResolvedValue([{ id: "account", mappingKey: "INVENTORY", isActive: false }])
  if (changed === "settings") tx.goodsReceipt.findFirst.mockResolvedValue({ ...(await tx.goodsReceipt.findFirst()), organization: { currency: "XAF", accountingSettings: { retainedSettings: "changed" } } })
  if (changed === "period") tx.accountingPeriod.findMany.mockResolvedValue([{ id: "period", name: "August", status: "CLOSED" }])
  await expect(confirmReceiptLedgerRecovery(request, scope)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(postReceiptRecognitionInTx).not.toHaveBeenCalled()
})
test("a failed evidence query propagates rather than becoming an empty or legacy success", async () => {
  ;(readReceiptRecognitionSource as jest.Mock).mockRejectedValue(new Error("query unavailable"))
  await expect(previewReceiptLedgerRecovery(draft, scope)).rejects.toThrow("query unavailable")
})
test("tenant-scoped receipt lookup rejects unavailable objects", async () => {
  tx.goodsReceipt.findFirst.mockResolvedValue(null as never)
  await expect(previewReceiptLedgerRecovery(draft, scope)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.goodsReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "gr", organizationId: "org", purchaseOrderId: "po" }) }))
  expect(readReceiptRecognitionSource).not.toHaveBeenCalled()
})
test("unverified return source evidence prevents late recognition", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockRejectedValue(new BusinessRuleError("Return proof unverified"))
  expect((await previewReceiptLedgerRecovery(draft, scope)).blockers).toContain("SOURCE_UNVERIFIED")
})
const returnSource = { returnId: "return", sourceDate: new Date("2026-08-12T11:00:00.000Z"), sourceHash: "c".repeat(64), currency: "XAF", inventoryAmount: "500.00", supplierClaimAmount: "0.00", grniAmount: "500.00" }
test("includes original return dates and posts all related accounting in the same transaction", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([returnSource])
  const preview = await previewReceiptLedgerRecovery(draft, scope)
  expect(preview.returns).toEqual([expect.objectContaining({ returnId: "return", effectiveAt: returnSource.sourceDate.toISOString(), value: "500.00", blockers: [] })])
  const result = await confirmReceiptLedgerRecovery({ ...draft, expectedRevision: preview.revision, idempotencyKey: "return-recovery" }, scope)
  expect(getActivePostingRule).toHaveBeenCalledWith("org", { sourceType: "PURCHASE_RETURN", postingPurpose: "PURCHASE_RETURN", effectiveAt: returnSource.sourceDate }, tx)
  expect(recoverPurchaseReturnAccountingInTx).toHaveBeenCalledWith(tx, { organizationId: "org", purchaseReturnId: "return", actorId: "actor" })
  expect(result.returnOutcomes).toEqual([expect.objectContaining({ returnId: "return", journalEntryId: "return-journal", sourceHash: returnSource.sourceHash })])
})
test("blocks a closed original return period before any posting", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([returnSource])
  tx.accountingPeriod.findMany.mockImplementation(async (args?: { where?: { startDate?: { lte?: Date } } }) => [{ id: "period", name: "August", status: args?.where?.startDate?.lte?.getTime() === returnSource.sourceDate.getTime() ? "CLOSED" : "OPEN" }])
  const preview = await previewReceiptLedgerRecovery(draft, scope)
  expect(preview.blockers).toContain("RETURN_UNAVAILABLE"); expect(preview.returns[0].blockers).toContain("PERIOD_UNAVAILABLE")
  await expect(confirmReceiptLedgerRecovery({ ...draft, expectedRevision: preview.revision, idempotencyKey: "closed-return" }, scope)).rejects.toBeInstanceOf(BusinessRuleError)
  expect(postReceiptRecognitionInTx).not.toHaveBeenCalled()
})
test("changed return evidence invalidates the reviewed receipt recovery", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([returnSource])
  const request = await command()
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([{ ...returnSource, sourceHash: "d".repeat(64) }])
  await expect(confirmReceiptLedgerRecovery(request, scope)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(postReceiptRecognitionInTx).not.toHaveBeenCalled()
})
test("a failed return aborts the outer transaction and cannot record success", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([returnSource])
  ;(recoverPurchaseReturnAccountingInTx as jest.Mock).mockRejectedValue(new BusinessRuleError("Return posting remains blocked"))
  await expect(confirmReceiptLedgerRecovery(await command(), scope)).rejects.toThrow("Return posting remains blocked")
  expect(recordBusinessEventInTx).not.toHaveBeenCalled()
})
test("already-posted receipt can recover a blocked return without requiring a new receipt journal", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([returnSource])
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED", batchId: "batch", journalId: "journal", evidenceHash: "e".repeat(64) })
  expect((await previewReceiptLedgerRecovery(draft, scope)).blockers).toEqual([])
})
test("exact replay returns retained outcome even when the original period later closes", async () => {
  const request = await command(), { replayed: _replayed, ...result } = await confirmReceiptLedgerRecovery(request, scope)
  const payload = { commandHash: hashBusinessPayload(request), result }
  tx.businessEvent.findUnique.mockResolvedValue({ actorId: "actor", eventType: "purchase.goods_receipt.ledger_recovery_recorded", schemaVersion: 1, status: "APPLIED", processedAt: new Date(), payload, payloadHash: hashBusinessPayload(payload), sourceType: "GOODS_RECEIPT", sourceId: "gr", occurredAt: new Date(result.recordedAt), postingBatchId: "batch", documentHash: source.sourceHash } as never)
  tx.accountingPeriod.findMany.mockRejectedValue(new Error("not needed for exact replay"))
  expect(await confirmReceiptLedgerRecovery(request, scope)).toEqual({ ...result, replayed: true })
  expect(postReceiptRecognitionInTx).toHaveBeenCalledTimes(1)
  expect(receiptLedgerRecoveryAuthority).toHaveBeenLastCalledWith(tx, scope, "submit")
  await expect(confirmReceiptLedgerRecovery({ ...request, receiptId: "other" }, scope)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
test("retains a verified zero-value return without requiring a monetary posting configuration", async () => {
  const zeroReturn = { ...returnSource, inventoryAmount: "0.00", supplierClaimAmount: "0.00", grniAmount: "0.00", accountingRequired: false }
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([zeroReturn])
  ;(recoverPurchaseReturnAccountingInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "NOT_REQUIRED", ledgerBatch: null, journalEntryId: null, accountingSourceLinkId: null })
  const preview = await previewReceiptLedgerRecovery(draft, scope)
  expect(preview.returns).toEqual([expect.objectContaining({ accountingRequired: false, value: "0.00", blockers: [], ruleCode: null, journalCode: null })])
  expect(getActivePostingRule).not.toHaveBeenCalledWith("org", expect.objectContaining({ sourceType: "PURCHASE_RETURN" }), tx)
  expect(tx.accountingPeriod.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ startDate: { lte: zeroReturn.sourceDate } }) }))
  const result = await confirmReceiptLedgerRecovery({ ...draft, expectedRevision: preview.revision, idempotencyKey: "zero-return-recovery" }, scope)
  expect(result.returnOutcomes).toEqual([{ returnId: "return", effectiveAt: zeroReturn.sourceDate.toISOString(), sourceHash: zeroReturn.sourceHash, ledgerStatus: "NOT_REQUIRED", postingBatchId: null, journalEntryId: null, accountingSourceLinkId: null }])
  expect(recordBusinessEventInTx).toHaveBeenCalledTimes(1)
})

test("refuses a no-journal outcome for a return that carries value", async () => {
  ;(listReceiptReturnRecoverySources as jest.Mock).mockResolvedValue([{ ...returnSource, accountingRequired: true }])
  ;(recoverPurchaseReturnAccountingInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "NOT_REQUIRED", ledgerBatch: null, journalEntryId: null, accountingSourceLinkId: null })
  await expect(confirmReceiptLedgerRecovery(await command(), scope)).rejects.toMatchObject({ code: "RECEIPT_EVIDENCE_REQUIRED" })
  expect(recordBusinessEventInTx).not.toHaveBeenCalled()
})

test("requires current authority even for a duplicate request", async () => {
  const request = await command()
  ;(receiptLedgerRecoveryAuthority as jest.Mock).mockRejectedValue(new BusinessRuleError("Verify password", "FRESH_AUTH_REQUIRED"))
  await expect(confirmReceiptLedgerRecovery(request, scope)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
  expect(postReceiptRecognitionInTx).not.toHaveBeenCalled()
})
