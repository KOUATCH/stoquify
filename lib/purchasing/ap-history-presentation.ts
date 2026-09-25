import type { APHistorySummary } from "@/services/purchasing/ap-history.service"

export function formatAPHistoryMoney(value: string | number | null | undefined, currency: string, locale: string) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return locale === "fr" ? "Indisponible" : "Unavailable"
  return new Intl.NumberFormat(locale, {style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2}).format(Number(value))
}

export function formatAPHistoryTotal(summary: APHistorySummary | undefined, field: "openPayable" | "releasedPaymentTotal", locale: string) {
  if (!summary || summary.financialBasis !== "current_remainder_of_filtered_recognized_invoices") return locale === "fr" ? "Indisponible" : "Unavailable"
  const groups = summary.currencyTotals ?? [summary]
  return groups.map(row => `${formatAPHistoryMoney(row[field], row.currency, locale)}${row[field] == null ? ` (${row.currency})` : ""}`).join(" · ")
}
