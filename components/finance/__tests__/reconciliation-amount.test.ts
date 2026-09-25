import { formatReconciliationAmount } from "../reconciliation-amount"
it("keeps aggregate cents beyond Number's exact range in EN/FR", () => {
  expect(formatReconciliationAmount("9007199254740993.25", "en")).toBe("9,007,199,254,740,993.25")
  expect(formatReconciliationAmount("9007199254740993.25", "fr")).toBe("9 007 199 254 740 993,25")
  expect(formatReconciliationAmount("-0.25", "fr")).toBe("-0,25")
})
it("rejects malformed numeric text instead of rounding or coercing it", () => {
  expect(() => formatReconciliationAmount("NaN", "en")).toThrow()
  expect(() => formatReconciliationAmount("1.255", "en")).toThrow()
})
