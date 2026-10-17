jest.mock("server-only", () => ({}))
import { Prisma } from "@prisma/client"
import { storedRegisterProof, storedMatchProof, resolveStoredSettlementProof } from "../payment-settlement-proof"

function fixture() {
  const batch = { id: "batch", organizationId: "org", payrollRunId: "run", currency: "XAF" }
  const run = { id: "run", organizationId: "org", runNumber: "PAY-001", version: 4, status: "POSTED", documentHash: "stored-register", ledgerPostingBatchId: "ledger", postedBusinessEventId: "posted", currency: "XAF", deletedAt: null, cancelledAt: null } as Parameters<typeof storedRegisterProof>[1]
  const transaction = { id: "tx", organizationId: "org", sourceType: "PAYROLL_PAYMENT", sourceId: "batch", currencyCode: "XAF", direction: "OUTBOUND", providerAccountId: "account", providerAccount: { organizationId: "org" } } as Parameters<typeof storedMatchProof>[1]
  const match = {
    id: "match", organizationId: "org", paymentTransactionId: "tx", providerAccountId: "account", status: "APPROVED", amountMatched: new Prisma.Decimal(100), currencyCode: "XAF", updatedAt: new Date("2026-10-01"), createdAt: new Date("2026-10-01"), providerEventId: "event", statementLineId: "line",
    providerEvent: { id: "event", organizationId: "org", providerAccountId: "account", signatureValid: true, status: "PROCESSED", rawPayloadHash: "payload", signatureHash: "signature", direction: "OUTBOUND", currencyCode: "XAF", amount: new Prisma.Decimal(100), archivedAt: null, providerTransactionId: "external", providerReference: "reference", occurredAt: new Date("2026-10-01") },
    statementLine: { id: "line", organizationId: "org", providerAccountId: "account", status: "MATCHED", rawLineHash: "line-hash", direction: "DEBIT", currencyCode: "XAF", amount: new Prisma.Decimal(100), archivedAt: null, providerTransactionId: "external", providerReference: "reference", occurredAt: new Date("2026-10-01"), statementFile: { id: "file", organizationId: "org", providerAccountId: "account", status: "PROCESSED", fileHash: "file-hash", archivedAt: null } },
  } as Parameters<typeof storedMatchProof>[2]
  const register = storedRegisterProof(batch, run)!
  const option = storedMatchProof(batch, transaction, match)!.option
  const selection = { payrollRunId: register.id, runVersion: register.version, runRevision: register.revision, matchRecordId: option.id, matchRevision: option.revision }
  return { batch, run, transaction, match, selection }
}

it("resolves stored proof without exposing raw hashes in the selector options", () => {
  const f = fixture()
  const proof = resolveStoredSettlementProof(f.batch, f.run, f.transaction, f.match, f.selection)
  expect(proof.sourceRegisterHash).toBe("stored-register")
  expect(proof.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  expect(proof.option).not.toHaveProperty("rawPayloadHash")
  expect(proof.option).not.toHaveProperty("sourceRegisterHash")
})

it.each(["organizationId", "providerAccountId"] as const)("rejects a foreign provider %s", key => {
  const f = fixture(); f.match.providerEvent![key] = "foreign"
  expect(storedMatchProof(f.batch, f.transaction, f.match)).toBeNull()
})
it("rejects foreign statement files and transaction accounts", () => {
  const f = fixture(); f.match.statementLine!.statementFile.organizationId = "foreign"
  expect(storedMatchProof(f.batch, f.transaction, f.match)).toBeNull()
  const g = fixture(); g.transaction.providerAccount!.organizationId = "foreign"
  expect(storedMatchProof(g.batch, g.transaction, g.match)).toBeNull()
})
it("rejects unsigned, disputed, mismatched or conflicting evidence", () => {
  const a = fixture(); a.match.providerEvent!.signatureValid = false
  const b = fixture(); b.match.statementLine!.status = "DISPUTED"
  const c = fixture(); c.match.providerEvent!.amount = new Prisma.Decimal(101)
  const d = fixture(); d.match.statementLine!.providerTransactionId = "different"
  for (const f of [a,b,c,d]) expect(storedMatchProof(f.batch, f.transaction, f.match)).toBeNull()
})
it("rejects missing posted proof, cancelled runs and foreign runs", () => {
  const a = fixture(); a.run.documentHash = null
  const b = fixture(); b.run.cancelledAt = new Date()
  const c = fixture(); c.run.organizationId = "foreign"
  for (const f of [a,b,c]) expect(storedRegisterProof(f.batch, f.run)).toBeNull()
})
it("rejects a changed run version or evidence hash after selection", () => {
  const a = fixture(); a.run.version++
  const b = fixture(); b.match.providerEvent!.rawPayloadHash = "changed"
  for (const f of [a,b]) expect(() => resolveStoredSettlementProof(f.batch, f.run, f.transaction, f.match, f.selection)).toThrow("changed after selection")
})
it("rejects an unapproved match after selection", () => {
  const f = fixture(); f.match.status = "CANDIDATE"
  expect(() => resolveStoredSettlementProof(f.batch, f.run, f.transaction, f.match, f.selection)).toThrow("no longer eligible")
})
