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

type LineAmounts = { quantity: string | number; unitPrice: string | number; taxRate: string | number; discount: string | number }

function scaledAmount(value: string | number, digits: number) {
  if (!/^\d+(?:\.\d*)?$/.test(String(value))) return null
  const [units, fraction = ""] = String(value).split(".")
  const rounded = BigInt(units) * BigInt(10 ** digits) + BigInt(fraction.padEnd(digits, "0").slice(0, digits))
  return Number(fraction[digits] ?? 0) >= 5 ? rounded + BigInt(1) : rounded
}

function lineAmounts(line: LineAmounts) {
  const quantity = scaledAmount(line.quantity, 3), unitPrice = scaledAmount(line.unitPrice, 2)
  const taxRate = scaledAmount(line.taxRate || 0, 3), discount = scaledAmount(line.discount || 0, 2)
  if (quantity === null || unitPrice === null || taxRate === null || discount === null || quantity <= BigInt(0) || taxRate > BigInt(100000)) return null
  // Match the server's half-up cent rounding and gross tax basis.
  const gross = (quantity * unitPrice + BigInt(500)) / BigInt(1000)
  if (discount > gross) return null
  const tax = (gross * taxRate + BigInt(50000)) / BigInt(100000)
  return { gross, tax, discount }
}

export function previewPurchaseOrderLine(line: LineAmounts) {
  const amounts = lineAmounts(line)
  return amounts === null ? Number.NaN : Number(amounts.gross + amounts.tax - amounts.discount) / 100
}

export function previewPurchaseOrderTotals(lines: LineAmounts[], shipping: string | number) {
  const freight = scaledAmount(shipping || 0, 2)
  let subtotal = BigInt(0), totalTax = BigInt(0), totalDiscount = BigInt(0)
  let valid = freight !== null
  for (const line of lines) {
    const amounts = lineAmounts(line)
    if (!amounts) {
      valid = false
      continue
    }
    subtotal += amounts.gross
    totalTax += amounts.tax
    totalDiscount += amounts.discount
  }
  const amount = (value: bigint) => valid ? Number(value) / 100 : Number.NaN
  return {
    subtotal: amount(subtotal), totalTax: amount(totalTax), totalDiscount: amount(totalDiscount),
    shippingCost: freight === null ? Number.NaN : Number(freight) / 100,
    total: amount(subtotal + totalTax - totalDiscount + (freight ?? BigInt(0))), valid,
  }
}
