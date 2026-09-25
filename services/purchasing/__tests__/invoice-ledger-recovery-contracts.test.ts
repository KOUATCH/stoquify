import { invoiceLedgerRecoveryCommandSchema, invoiceLedgerRecoveryDecisionSchema } from "../invoice-ledger-recovery-contracts"

const command = { invoiceId: "invoice", expectedRevision: "a".repeat(64), idempotencyKey: "request-1" }
test("requires a reviewed revision and rejects client authority", () => {
  expect(invoiceLedgerRecoveryCommandSchema.safeParse(command).success).toBe(true)
  for (const addition of [{ organizationId: "other" }, { actorId: "other" }, { approved: true }, { expectedRevision: "old" }, { idempotencyKey: "short" }]) expect(invoiceLedgerRecoveryCommandSchema.safeParse({ ...command, ...addition }).success).toBe(false)
})
const decision = { organizationId: "org", actorId: "actor", invoiceId: "invoice", invoiceNumber: "INV-1", requestReference: "request-1", reviewedRevision: "a".repeat(64), recordedAt: "2026-09-08T09:00:00.000Z", approvalEventId: "approval", supplierLiabilityId: "liability", postingBatchId: "batch", ledgerStatus: "POSTED", journalEntryId: "journal", accountingSourceLinkId: "link", blockerCode: null, total: "2500.00", currency: "XAF" }
test("posted decisions require journal and source-link references", () => {
  expect(invoiceLedgerRecoveryDecisionSchema.safeParse(decision).success).toBe(true)
  expect(invoiceLedgerRecoveryDecisionSchema.safeParse({ ...decision, journalEntryId: null }).success).toBe(false)
  expect(invoiceLedgerRecoveryDecisionSchema.safeParse({ ...decision, accountingSourceLinkId: null }).success).toBe(false)
})
test("blocked decisions cannot claim a journal", () => {
  expect(invoiceLedgerRecoveryDecisionSchema.safeParse({ ...decision, ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "RULE" }).success).toBe(false)
  expect(invoiceLedgerRecoveryDecisionSchema.safeParse({ ...decision, ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "RULE", journalEntryId: null, accountingSourceLinkId: null }).success).toBe(true)
})
