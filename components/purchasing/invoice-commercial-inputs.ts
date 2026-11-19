import type { InvoicePreparationSources } from "@/services/purchasing/invoice-preparation-contracts"

type ReceiptLine = InvoicePreparationSources["receipts"][number]
export const invoiceChargeFields = ["discount", "freight"] as const

function scaledInteger(value: string, places: number): bigint | undefined {
  const pattern = new RegExp(`^([0-9]{1,14})(?:\\.([0-9]{1,${places}}))?$`)
  const match = pattern.exec(value)
  if (!match) return undefined
  return BigInt(match[1] + (match[2] ?? "").padEnd(places, "0"))
}

export function suggestedInvoiceCharge(row: ReceiptLine | undefined, quantity: string, field: typeof invoiceChargeFields[number]): string | undefined {
  if (!row?.commercialBasis) return undefined
  const selected = scaledInteger(quantity, 3)
  const available = scaledInteger(row.available, 3)
  const amount = scaledInteger(row.commercialBasis[field], 2)
  if (!selected || !available || selected > available || amount === undefined) return undefined
  const cents = (amount * selected + available / BigInt(2)) / available
  const digits = String(cents).padStart(3, "0")
  return digits.slice(0, -2) + "." + digits.slice(-2)
}
