// Aggregated Decimal amounts can exceed Number's cent precision. Keep the integer
// in BigInt and the two decimal digits as text; EN/FR share Latin decimal digits.
export function formatReconciliationAmount(value: string, locale: string) {
  if (!/^-?\d+\.\d{2}$/.test(value)) throw new Error("Invalid reconciliation amount")
  const negative = value.startsWith("-"), [whole, fraction] = value.replace(/^-/, "").split(".")
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const separator = new Intl.NumberFormat(locale).formatToParts(0.1).find(part => part.type === "decimal")?.value ?? "."
  return `${negative ? "-" : ""}${formatter.format(BigInt(whole))}${separator}${fraction}`
}
