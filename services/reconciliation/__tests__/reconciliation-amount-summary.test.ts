import { Prisma } from "@prisma/client"
import { reconciliationAmountSummary } from "../reconciliation-amount-summary"
const row = (value = "100.25", currencyCode = "XAF") => ({ amount: new Prisma.Decimal(value), currencyCode })
const input = () => ({ paymentTransactions: [row()], providerEvents: [row()], statementLines: [row()], matchRecords: [{ amountMatched: row().amount, currencyCode: "XAF", status: "APPROVED" }], suspenseItems: [{ ...row(), status: "RESOLVED" }] })
it("separates corroborating evidence from allocation and excludes resolved investigation from current suspense", () => {
  expect(reconciliationAmountSummary(input())).toEqual({ version: 1, basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY", currencies: [{ currencyCode: "XAF", amounts: { payments: "100.25", providerEvents: "100.25", statementLines: "100.25", matched: "100.25", unresolvedSuspense: "0.00" } }] })
})
it.each(["OPEN", "ASSIGNED", "IN_REVIEW", "POSTED_TO_SUSPENSE", "RESOLUTION_PROPOSED", "REOPENED"])("includes %s unresolved suspense", status => {
  expect(reconciliationAmountSummary({ ...input(), suspenseItems: [{ ...row(), status }] }).currencies[0].amounts.unresolvedSuspense).toBe("100.25")
})
it("never mixes currencies or loses decimal precision beyond the safe integer range", () => {
  const result = reconciliationAmountSummary({ ...input(), paymentTransactions: [row("90071992547409.91", "EUR"), row("0.02", "EUR"), row()] })
  expect(result.currencies.map(r => r.currencyCode)).toEqual(["EUR", "XAF"])
  expect(result.currencies[0].amounts.payments).toBe("90071992547409.93")
  expect(result.currencies[1].amounts.payments).toBe("100.25")
})
it("withholds an incomplete evidence amount instead of inventing zero", () => {
  expect(reconciliationAmountSummary({ ...input(), providerEvents: [{ amount: null, currencyCode: "XAF" }, row()] }).currencies[0].amounts).toMatchObject({ providerEvents: null, payments: "100.25" })
})
it.each(["CANDIDATE", "PROPOSED", "NEEDS_REVIEW", "REJECTED", "VOIDED"])("does not count %s as an allocation", status => {
  const data = input(); data.matchRecords[0].status = status
  expect(reconciliationAmountSummary(data).currencies[0].amounts.matched).toBe("0.00")
})
it("covers sources beyond presentation limits and has stable ordering", () => {
  const data = { ...input(), paymentTransactions: Array.from({ length: 251 }, () => row("0.01")) }
  expect(reconciliationAmountSummary(data).currencies[0].amounts.payments).toBe("2.51")
  expect(reconciliationAmountSummary(data)).toEqual(reconciliationAmountSummary({ ...data, paymentTransactions: [...data.paymentTransactions].reverse() }))
})
it.each([row("-1"), row("NaN"), row("1", "")])("refuses invalid amount/currency %j", invalid => {
  expect(() => reconciliationAmountSummary({ ...input(), paymentTransactions: [invalid] })).toThrow(/requires review/)
})
it("refuses unknown suspense states and excludes written-off records", () => {
  expect(() => reconciliationAmountSummary({ ...input(), suspenseItems: [{ ...row(), status: "UNKNOWN" }] })).toThrow(/status requires review/)
  expect(reconciliationAmountSummary({ ...input(), suspenseItems: [{ ...row(), status: "WRITTEN_OFF" }] }).currencies[0].amounts.unresolvedSuspense).toBe("0.00")
})

it("withholds a missing retained allocation amount", () => {
  expect(reconciliationAmountSummary({ ...input(), matchRecords: [{ amountMatched: null, currencyCode: "XAF", status: "APPROVED" }] }).currencies[0].amounts.matched).toBeNull()
})
