// Real source reader and declared-coverage validator; database reads are mocked.
jest.mock("server-only", () => ({}))
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { readBankBalanceSnapshot } from "../bank-balance-sources.service"
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), cutoff = new Date("2026-10-06")
function fixture() {
  const declared = { formatVersion: "stoquify-statement-v1", providerCode: "SYNTHETIC_PILOT", providerAccountId: "bank", currencyCode: "XAF", periodStart: start.toISOString(), periodEnd: end.toISOString() }
  const fileHash = createHash("sha256").update(JSON.stringify({ ...declared, lines: [{ transactionId: "line", direction: "CREDIT", amount: "100.00", currency: "XAF", occurredAt: start.toISOString() }] })).digest("hex")
  const statement = { id: "statement", organizationId: "org", providerAccountId: "bank", fileHash, periodStart: start, periodEnd: end,
    metadata: { coverageKind: "DECLARED", lineCount: 1, observedPeriodStart: start.toISOString(), observedPeriodEnd: start.toISOString(), declaredCoverage: { ...declared, sourceFileHash: fileHash } } }
  const tx = {
    accountingPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period", startDate: start, endDate: end }) },
    providerAccount: { findFirst: jest.fn().mockResolvedValue({ id: "bank", organizationId: "org", providerCode: "SYNTHETIC_PILOT", currencyCode: "XAF", externalAccountHash: "masked-hash", paymentRailId: "rail",
      paymentRail: { organizationId: "org", type: "BANK_TRANSFER" }, settlementLedgerAccount: { id: "ledger", organizationId: "org", type: "ASSET", normalBalance: "DEBIT", currency: "XAF", code: "512" }, settlementAccounts: [] }), count: jest.fn().mockResolvedValue(0) },
    settlementAccount: { count: jest.fn().mockResolvedValue(0) }, statementFile: { findFirst: jest.fn().mockResolvedValue(statement) },
    statementLine: { findMany: jest.fn().mockResolvedValue([{ id: "line", organizationId: "org", providerAccountId: "bank", amount: new Prisma.Decimal(100), feeAmount: null, currencyCode: "XAF", direction: "CREDIT", occurredAt: start, rawLineHash: "line-hash", createdAt: start }]) },
    journalEntryLine: { findMany: jest.fn().mockResolvedValue([{ id: "journal-line", organizationId: "org", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF", createdAt: start,
      journalEntry: { id: "journal", organizationId: "org", currency: "XAF", entryDate: start, postedAt: start, createdAt: start, postingBatchId: "posting", status: "POSTED" } }]) },
    matchRecord: { count: jest.fn() },
  }
  const input = { providerAccountId: "bank", periodId: "period", statementFileId: "statement", idempotencyKey: "test", openingBalance: "0.00", closingBalance: "100.00", sourceReference: "retained-statement", sourceDocumentHash: `sha256:${fileHash}`, timingItems: [] }
  return { tx, input, statement }
}
it("requires hash-bound declared coverage before reading a balanced bank statement", async () => {
  const { tx, input, statement } = fixture()
  const result = await readBankBalanceSnapshot(tx as any, "org", input, cutoff)
  expect(result.balances.balanced).toBe(true)
  expect(result.statementHash).toBe(statement.fileHash)
})
it.each(["legacy", "observed", "hash", "account", "range"])("rejects %s coverage before giving bank balance credit", async kind => {
  const { tx, input, statement } = fixture()
  if (kind === "legacy") (statement as any).metadata = null
  if (kind === "observed") statement.metadata.coverageKind = "OBSERVED"
  if (kind === "hash") statement.metadata.declaredCoverage.sourceFileHash = "b".repeat(64)
  if (kind === "account") statement.metadata.declaredCoverage.providerAccountId = "foreign"
  if (kind === "range") statement.metadata.declaredCoverage.periodEnd = start.toISOString()
  await expect(readBankBalanceSnapshot(tx as any, "org", input, cutoff)).rejects.toThrow(/declared exact-period/)
  expect(tx.statementLine.findMany).not.toHaveBeenCalled(); expect(tx.journalEntryLine.findMany).not.toHaveBeenCalled()
})
it("propagates an unexpected statement read failure", async () => {
  const { tx, input } = fixture(); tx.statementFile.findFirst.mockRejectedValue(new Error("statement unavailable"))
  await expect(readBankBalanceSnapshot(tx as any, "org", input, cutoff)).rejects.toThrow("statement unavailable")
})
