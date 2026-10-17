import type { SalesCashAttention } from "@/services/analytics/sales-cash-attention.service"
import type { getSalesReceivables } from "@/services/analytics/sales-collections.service"
import type { getSalesProducts } from "@/services/analytics/sales-products.service"

type Receivables = Awaited<ReturnType<typeof getSalesReceivables>>
type Products = Awaited<ReturnType<typeof getSalesProducts>>
export type SalesAttentionFinding = {
  id: string; kind: "overdue" | "cash" | "stock"; amount: string; currency?: string; unit?: string;
  checkedAt: string; timezone: string; href: string; name?: string; nameFr?: string | null;
  date?: string; location?: string; finalized?: boolean; stockStatus?: "low" | "out";
}
const positive = (value: string) => /^\d+(\.\d+)?$/.test(value) && /[1-9]/.test(value)
export function buildSalesAttention(input: { organizationId: string; receivables?: Receivables; products?: Products; cash?: SalesCashAttention }) {
  const findings: SalesAttentionFinding[] = []
  for (const row of [...(input.receivables?.currencies ?? [])].sort((a, b) => a.currency < b.currency ? -1 : a.currency > b.currency ? 1 : 0)) {
    if (positive(row.overdue)) findings.push({ id: "ar:" + row.currency, kind: "overdue", amount: row.overdue, currency: row.currency, checkedAt: input.receivables!.checkedAt, timezone: input.receivables!.timezone, href: "/dashboard/finance/receivables/history" })
  }
  for (const row of [...(input.cash?.findings ?? [])].sort((a, b) => b.date.localeCompare(a.date) || a.locationId.localeCompare(b.locationId) || a.id.localeCompare(b.id))) {
    const query = new URLSearchParams({ view: "daily", date: row.date, locationId: row.locationId, reportOrg: input.organizationId })
    findings.push({ id: "cash:" + row.id, kind: "cash", amount: row.amount, currency: input.cash!.currency, checkedAt: row.recordedAt, timezone: input.cash!.timezone, href: "/dashboard/sales?" + query, date: row.date, location: row.location, finalized: row.finalized })
  }
  if (input.products?.canReadStock) for (const row of [...input.products.rows].sort((a, b) => a.id.localeCompare(b.id))) {
    if (positive(row.quantity) && row.available !== null && (row.stockStatus === "low" || row.stockStatus === "out")) findings.push({ id: "stock:" + row.id, kind: "stock", amount: row.available, unit: row.unit?.symbol,
      checkedAt: input.products.stockCheckedAt!, timezone: input.products.timezone, href: row.active ? "/dashboard/inventory/items/" + encodeURIComponent(row.id) : "#sales-products", name: row.name, nameFr: row.nameFr, stockStatus: row.stockStatus })
  }
  return [...new Map(findings.map(row => [row.id, row])).values()]
}
