jest.mock("server-only", () => ({}))
jest.mock("@/services/purchasing/ap-control.service", () => ({ apJournalEvidenceHash: jest.fn(() => "journal-hash") }))
jest.mock("@/services/purchasing/payment-release-evidence", () => ({ readVerifiedPaymentExecution: jest.fn() }))

import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { paymentReconciliationEvidenceSnapshotInTx, readPaymentReconciliationBankEvidenceInTx, readPaymentReconciliationMatchInTx, readPaymentReconciliationHistoryInTx, type PaymentReconciliationSource } from "../payment-reconciliation-evidence"
import { paymentReconciliationDraftSchema } from "../payment-reconciliation-contracts"

const cash = { kind: "CASH_VOUCHER" as const, voucherReference: "VOUCHER-1", evidenceUri: "https://evidence.example/voucher.pdf", evidenceSha256: "b".repeat(64), recipientName: "Supplier recipient", acknowledgedAt: "2026-09-01T12:01:00Z", purpose: "Receipt of the approved supplier payment", acknowledgment: "RECIPIENT_ACKNOWLEDGED" as const }
function fixture() {
  const source = { payment: { id: "payment", organizationId: "org", method: "BANK_TRANSFER", supplierId: "supplier", amount: new Prisma.Decimal(100), currency: "XAF", paymentDate: new Date("2026-09-01") },
    execution: { event: { id: "execution" }, command: { draft: { executionReference: "BANK-1", executedAt: "2026-09-01T12:00:00Z", evidenceSha256: "a".repeat(64) } } },
    transaction: { id: "transaction", providerAccountId: "provider", occurredAt: new Date("2026-09-01") },
    journal: { lines: [{ accountId: "settlement", credit: new Prisma.Decimal(100), debit: new Prisma.Decimal(0), currency: "XAF" }] } } as unknown as PaymentReconciliationSource
  const provider = { id: "provider", organizationId: "org", status: "ACTIVE", archivedAt: null, currencyCode: "XAF", settlementLedgerAccountId: "settlement", suspenseLedgerAccountId: "suspense",
    paymentRail: { isActive: true, type: "BANK_TRANSFER" }, settlementAccounts: [{ organizationId: "org", ledgerAccountId: "settlement", approvalStatus: "APPROVED", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }] }
  const line = { id: "line", organizationId: "org", providerAccountId: "provider", providerAccount: provider, statementFile: { id: "file", organizationId: "org", providerAccountId: "provider", fileHash: "file-hash", status: "IMPORTED", archivedAt: null },
    fingerprint: "fingerprint", rawLineHash: "raw-hash", direction: "DEBIT", amount: new Prisma.Decimal(100), currencyCode: "XAF", providerReference: "BANK-1", providerTransactionId: "bank-transaction", occurredAt: new Date("2026-09-01T12:00:00Z"), postedAt: null, status: "UNMATCHED", archivedAt: null }
  const match = { id: "match", organizationId: "org", paymentTransactionId: "transaction", providerAccountId: "provider", statementLineId: "line", providerEventId: null, reconciliationRunId: "run", amountMatched: new Prisma.Decimal(100), currencyCode: "XAF", status: "AUTO_MATCHED" }
  const run = { id: "run", organizationId: "org", providerAccountId: "provider", status: "READY_FOR_SIGNOFF", periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-02"), voidedAt: null }
  const tx = { statementLine: { findFirst: jest.fn(async () => line) }, chartOfAccount: { findFirst: jest.fn(async () => ({ id: "settlement" })) }, matchRecord: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [match]) }, reconciliationRun: { findFirst: jest.fn(async () => run) }, paymentException: { count: jest.fn(async () => 0) }, suspenseItem: { count: jest.fn(async () => 0) } }
  return { source, line, provider, match, run, tx, client: tx as unknown as Prisma.TransactionClient }
}

describe("supplier payment evidence boundaries", () => {
  it("retains bank source hashes and exact imported debit facts without creating effects", async () => {
    const f = fixture(), proof = await readPaymentReconciliationBankEvidenceInTx(f.client, f.source, "line", true)
    expect(proof.snapshot).toMatchObject({ kind: "BANK_STATEMENT", fileHash: "file-hash", rawLineHash: "raw-hash", total: "100.00", reference: "BANK-1", settlementLedgerAccountId: "settlement" })
    expect(f.tx.statementLine.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "line", organizationId: "org" } }))
  })
  it.each(["different amount", "different reference", "foreign file", "wrong rail", "wrong settlement", "inactive provider", "later day", "claimed line", "archived line", "disputed line"])("refuses %s", async kind => {
    const f = fixture()
    if (kind === "different amount") f.line.amount = new Prisma.Decimal(99)
    if (kind === "different reference") f.line.providerReference = "OTHER"
    if (kind === "foreign file") f.line.statementFile.organizationId = "foreign"
    if (kind === "wrong rail") f.provider.paymentRail.type = "MOBILE_MONEY"
    if (kind === "wrong settlement") f.provider.settlementLedgerAccountId = "other"
    if (kind === "inactive provider") f.provider.status = "SUSPENDED"
    if (kind === "later day") f.line.occurredAt = new Date("2026-09-02")
    if (kind === "claimed line") f.tx.matchRecord.count.mockResolvedValue(1)
    if (kind === "archived line") Object.assign(f.line, { archivedAt: new Date() })
    if (kind === "disputed line") f.line.status = "DISPUTED"
    await expect(readPaymentReconciliationBankEvidenceInTx(f.client, f.source, "line", true)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
  })
  it("allows a retained processed file and signed actual run, without treating signing as a changed match", async () => {
    const f = fixture(); f.line.statementFile.status = "PROCESSED"
    await expect(readPaymentReconciliationBankEvidenceInTx(f.client, f.source, "line", false)).resolves.toBeDefined()
    const prepared = await readPaymentReconciliationMatchInTx(f.client, f.source, "line")
    f.run.status = "SIGNED"
    expect(await readPaymentReconciliationMatchInTx(f.client, f.source, "line")).toEqual(prepared)
  })
  it.each(["missing run", "partial", "duplicate", "unresolved exception", "void run"])("cannot finalize %s evidence", async kind => {
    const f = fixture()
    if (kind === "missing run") Object.assign(f.match, { reconciliationRunId: null })
    if (kind === "partial") f.match.amountMatched = new Prisma.Decimal(40)
    if (kind === "duplicate") f.tx.matchRecord.findMany.mockResolvedValue([f.match, { ...f.match, id: "another" }])
    if (kind === "unresolved exception") f.tx.paymentException.count.mockResolvedValue(1)
    if (kind === "void run") Object.assign(f.run, { voidedAt: new Date() })
    await expect(readPaymentReconciliationMatchInTx(f.client, f.source, "line")).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
  })
  it("requires a distinct recipient acknowledgment artifact and preserves explicit internal scope", async () => {
    const f = fixture(); f.source.payment.method = "CASH"
    const proof = await paymentReconciliationEvidenceSnapshotInTx(f.client, f.source, cash, false)
    expect(proof).toMatchObject({ kind: "CASH_VOUCHER", acknowledgment: "RECIPIENT_ACKNOWLEDGED", recipientName: "Supplier recipient", total: "100.00", executionEventId: "execution" })
    await expect(paymentReconciliationEvidenceSnapshotInTx(f.client, f.source, { ...cash, evidenceSha256: "a".repeat(64) }, false)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
    await expect(paymentReconciliationEvidenceSnapshotInTx(f.client, f.source, { ...cash, acknowledgedAt: "2026-09-01T11:00:00Z" }, false)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
    expect(paymentReconciliationDraftSchema.safeParse({ paymentRequestId: "payment", evidence: { ...cash, acknowledgment: false } }).success).toBe(false)
  })
  it("rejects a forged history branch even if both payload hashes are self-consistent", async () => {
    const draft = { paymentRequestId: "payment", evidence: cash }, command = { draft, expectedRevision: "a".repeat(64), idempotencyKey: "request-0001" }, at = new Date("2026-09-01T12:02:00Z")
    const payload = { version: 1, organizationId: "org", actorId: "maker", paymentRequestId: "payment", operation: "propose", command, status: "PROPOSED", previousId: null, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, recordedAt: at.toISOString(), commandHash: hashBusinessPayload({ command, actorId: "maker", operation: "propose" }) }
    const row = { id: "one", organizationId: "org", schemaVersion: 1, eventSource: "INTERNAL", status: "APPLIED", processedAt: at, actorId: "maker", occurredAt: at, payload, payloadHash: hashBusinessPayload(payload), idempotencyKey: "payment-reconciliation:request-0001" }
    const tx = { businessEvent: { findMany: jest.fn(async () => [row, { ...row, id: "two" }]) }, auditLog: { findFirst: jest.fn(async () => ({ id: "audit" })) } } as unknown as Prisma.TransactionClient
    await expect(readPaymentReconciliationHistoryInTx(tx, "org", "payment")).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
  })
})
