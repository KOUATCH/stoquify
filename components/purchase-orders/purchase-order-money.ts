import type { Locale } from "@/types/bilingual"

// Purchase-order storage retains two decimal places. Show those retained
// fractions even when ISO display defaults to zero, and preserve higher ISO
// precision. This formatter does not decide admissible currency amounts.
export function formatPurchaseOrderMoney(amount: number, locale: Locale, currency: string) {
  if (!Number.isFinite(amount)) return "—"
  const isoDigits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2
  const digits = Math.max(2, isoDigits)
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount)
}
