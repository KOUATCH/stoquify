import { formatPurchaseOrderMoney } from "../purchase-order-money"

it.each([
  ["en", 243.5, "243.50"],
  ["en", 38.5, "38.50"],
  ["fr", 243.5, "243,50"],
  ["fr", 38.5, "38,50"],
] as const)("retains existing XAF fractional quote %s %s", (locale, amount, expected) => {
  const display = formatPurchaseOrderMoney(amount, locale, "XAF")
  expect(display).toContain(expected)
  expect(display).toContain("FCFA")
})
it.each([["en", "1.234"], ["fr", "1,234"]] as const)("retains higher KWD display precision in %s", (locale, expected) => {
  expect(formatPurchaseOrderMoney(1.234, locale, "KWD")).toContain(expected)
})
it("shows monetary zero at retained currency precision", () => {
  expect(formatPurchaseOrderMoney(0, "en", "KWD")).toContain("0.000")
  expect(formatPurchaseOrderMoney(0, "fr", "XAF")).toContain("0,00")
})
it.each([NaN, Infinity])("does not present unavailable amount %s as zero", amount => {
  expect(formatPurchaseOrderMoney(amount, "en", "XAF")).toBe("—")
})
