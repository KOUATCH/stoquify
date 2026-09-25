import { formatAPHistoryMoney, formatAPHistoryTotal } from "../ap-history-presentation"

it.each(["en", "fr"])("does not render missing, invalid or old-schema amounts as zero in %s", locale => {
  const label=locale==="fr"?"Indisponible":"Unavailable"
  expect(formatAPHistoryMoney(null,"XAF",locale)).toBe(label)
  expect(formatAPHistoryMoney("invalid","XAF",locale)).toBe(label)
  expect(formatAPHistoryTotal(undefined,"openPayable",locale)).toBe(label)
  expect(formatAPHistoryTotal({openPayable:"2500",currency:"XAF"} as never,"openPayable",locale)).toBe(label)
})
it("keeps currency separation, cents and unavailable groups explicit", () => {
  const summary={financialBasis:"current_remainder_of_filtered_recognized_invoices",currencyTotals:[{currency:"EUR",openPayable:"2.50"},{currency:"XAF",openPayable:null}]} as never
  const text=formatAPHistoryTotal(summary,"openPayable","en")
  expect(text).toContain("2.5")
  expect(text).toContain("Unavailable (XAF)")
  expect(formatAPHistoryMoney("2449.75","XAF","en")).toContain("2,449.75")
})
