import { bankBalanceInputSchema, bankBalanceHash, calculateBankBalance } from "../bank-balance-contract"
const base = { openingBalance: "100.00", closingBalance: "120.00", statementMovement: "20.00", ledgerOpening: "100.00", ledgerClosing: "120.00", openingTiming: "0.00", closingTiming: "0.00" }
it("reconciles opening, statement movement and closing exactly", () => {
  expect(calculateBankBalance(base)).toMatchObject({ balanced: true, openingDifference: "0.00", closingDifference: "0.00", rollForwardDifference: "0.00" })
})
it.each([
  { ledgerOpening: "99.99" }, { ledgerClosing: "120.01" }, { statementMovement: "19.99" },
])("does not hide a one-cent discrepancy in any control (%s)", patch => {
  expect(calculateBankBalance({ ...base, ...patch }).balanced).toBe(false)
})
it.each([
  ["20.00", "140.00"], ["-20.00", "100.00"],
])("uses debit-positive timing adjustments (%s)", (closingTiming, ledgerClosing) => {
  expect(calculateBankBalance({ ...base, closingTiming, ledgerClosing }).balanced).toBe(true)
})
it("reconciles a carried outstanding payment clearing in the current period", () => {
  expect(calculateBankBalance({ openingBalance: "100.00", openingTiming: "-20.00", ledgerOpening: "80.00", closingBalance: "80.00", closingTiming: "0.00", ledgerClosing: "80.00", statementMovement: "-20.00" }).balanced).toBe(true)
})
it("retains overdrafts and decimal precision", () => {
  expect(calculateBankBalance({ ...base, openingBalance: "-100.01", ledgerOpening: "-100.01", closingBalance: "-99.99", ledgerClosing: "-99.99", statementMovement: "0.02" }).balanced).toBe(true)
})
const proposal = { providerAccountId: "bank", periodId: "period", statementFileId: "statement", idempotencyKey: "key", openingBalance: "0.00", closingBalance: "0.00", sourceReference: "retained-bank-statement", sourceDocumentHash: "sha256:" + "a".repeat(64) }
it.each(["NaN", "1e4", "0.001", "+1.00", "01.00"])("rejects ambiguous money input %s", openingBalance => {
  expect(bankBalanceInputSchema.safeParse({ ...proposal, openingBalance }).success).toBe(false)
})
it("rejects caller authority fields and adjustment amounts", () => {
  expect(bankBalanceInputSchema.safeParse({ ...proposal, organizationId: "foreign" }).success).toBe(false)
  expect(bankBalanceInputSchema.safeParse({ ...proposal, timingItems: [{ boundary: "CLOSING", journalEntryLineId: "line", amount: "20.00", sourceReference: "proof", sourceDocumentHash: proposal.sourceDocumentHash }] }).success).toBe(false)
})
it("binds evidence to contents while tolerating JSON object key order", () => {
  expect(bankBalanceHash({ a: 1, b: { x: 2, y: 3 } })).toBe(bankBalanceHash({ b: { y: 3, x: 2 }, a: 1 }))
  expect(bankBalanceHash(proposal)).not.toBe(bankBalanceHash({ ...proposal, closingBalance: "1.00" }))
})
