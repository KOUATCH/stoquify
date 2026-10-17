import { balanceSheetInputSchema, calculateBalanceSheet, balanceSheetHash, type BalanceSheetInput } from "../balance-sheet-contract"
const proof = { sourceReference: "retained:schedule", sourceDocumentHash: "sha256:" + "a".repeat(64) }
const item = { ...proof, reference: "invoice-1", description: "Independently supported balance", openingBalance: "100.00", additions: "30.00", reductions: "10.00", closingBalance: "120.00" }
const input: BalanceSheetInput = { ...proof, ledgerAccountId: "account", periodId: "period", currency: "XAF", idempotencyKey: "key", scheduleKind: "PAYABLES", basis: "SUPPORTING_SCHEDULE", explanation: "Retained supplier balance schedule", items: [item] }
const ledger = { openingBalance: "100.00", additions: "30.00", reductions: "10.00", closingBalance: "120.00" }
it("ties opening, gross flows and closing exactly without treating unpaid balances as exceptions", () => {
  expect(calculateBalanceSheet(input, ledger)).toMatchObject({ balanced: true, invalidItems: [], differences: { openingBalance: "0.00", additions: "0.00", reductions: "0.00", closingBalance: "0.00" } })
})
it.each(["openingBalance", "additions", "reductions", "closingBalance"] as const)("blocks a one-cent %s mismatch", key => {
  expect(calculateBalanceSheet(input, { ...ledger, [key]: "0.01" }).balanced).toBe(false)
})
it("does not let offsetting activity hide behind an equal closing balance", () => {
  expect(calculateBalanceSheet(input, { ...ledger, additions: "40.00", reductions: "20.00" }).balanced).toBe(false)
})
it("checks each schedule item's roll-forward even when all totals match", () => {
  const items = [{ ...item, openingBalance: "90.00" }, { ...item, reference: "two", openingBalance: "10.00", additions: "0.00", reductions: "0.00", closingBalance: "0.00" }]
  expect(calculateBalanceSheet({ ...input, items }, ledger)).toMatchObject({ balanced: false, invalidItems: ["invoice-1", "two"] })
})
it("allows evidenced contra balances and exact negative natural balances", () => {
  const values = { openingBalance: "-100.00", additions: "0.00", reductions: "20.00", closingBalance: "-120.00" }
  expect(calculateBalanceSheet({ ...input, items: [{ ...item, ...values }] }, values).balanced).toBe(true)
})
it("requires explicit zero-activity evidence instead of an empty supporting schedule", () => {
  expect(balanceSheetInputSchema.safeParse({ ...input, items: [] }).success).toBe(false)
  expect(balanceSheetInputSchema.safeParse({ ...input, basis: "ZERO_ACTIVITY" }).success).toBe(false)
  expect(balanceSheetInputSchema.safeParse({ ...input, basis: "ZERO_ACTIVITY", items: [] }).success).toBe(true)
})
it.each(["1e3", "NaN", "0.001", "+1.00"])("rejects ambiguous amount %s", value => {
  expect(balanceSheetInputSchema.safeParse({ ...input, items: [{ ...item, openingBalance: value }] }).success).toBe(false)
})
it("rejects negative gross flows, duplicate items, weak proof and caller authority", () => {
  for (const patch of [{ items: [{ ...item, additions: "-1.00" }] }, { items: [item, item] }, { sourceDocumentHash: "unverified" }, { organizationId: "foreign" }, { currency: "xaf" }])
    expect(balanceSheetInputSchema.safeParse({ ...input, ...patch }).success).toBe(false)
})
it("binds amounts, account, currency and supporting document contents into evidence hashes", () => {
  for (const patch of [{ currency: "EUR" }, { ledgerAccountId: "other" }, { sourceDocumentHash: "sha256:" + "b".repeat(64) }]) expect(balanceSheetHash(input)).not.toBe(balanceSheetHash({ ...input, ...patch }))
})
