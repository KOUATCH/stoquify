import { createElement, type ReactNode } from "react"
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, PackageCheck, ShieldAlert } from "lucide-react"

import type { TransactionHistoryColumn, TransactionHistoryFilterOption, TransactionHistoryKpi } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { Badge } from "@/components/ui/badge"
import type { InventoryMovementHistoryResult } from "@/actions/inventory/inventoryMovementHistoryActions"

import { inventoryMovementHistoryTypes } from "@/types/inventoryMovementHistory"
export { inventoryMovementHistoryTypes, type InventoryMovementHistoryType } from "@/types/inventoryMovementHistory"
type TFunction = (key: string, values?: Record<string, string | number | Date>) => string
type InventoryMovementHistoryRow = InventoryMovementHistoryResult["rows"][number]

export function buildInventoryMovementTypeOptions(t: TFunction): TransactionHistoryFilterOption[] { return inventoryMovementHistoryTypes.map((type) => ({ value: type, label: typeLabel(type, t) })) }
export function typeLabel(type: string, t: TFunction) { return t(`types.${type}`) }
export function formatHistoryDate(value: string | null | undefined, locale: string, timezone: string) { if (!value) return "-"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date) }
export function formatDecimal(value: string | null | undefined, unit?: string | null, locale = "en") {
  if (value === null || value === undefined || value === "") return "—"
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) return [value, unit].filter(Boolean).join(" ")
  const formatter = new Intl.NumberFormat(locale)
  const separator = formatter.formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? "."
  const number = match[1] + formatter.format(BigInt(match[2])) + (match[3] ? separator + match[3] : "")
  return [number, unit].filter(Boolean).join(" ")
}
export function formatMoney(value: string | null | undefined, currency?: string | null, locale = "en") { return formatDecimal(value, currency, locale) }

export function buildInventoryHistoryKpis(result: InventoryMovementHistoryResult | undefined, t: TFunction, locale = "en"): TransactionHistoryKpi[] {
  const summary = result?.summary
  return [
    { id: "transactionCount", label: t("kpis.transactionCount"), value: summary ? new Intl.NumberFormat(locale).format(summary.transactionCount) : "—", detail: t("kpis.transactionCountDetail"), tone: "brand" },
    { id: "netMovement", label: t("kpis.netMovement"), value: formatDecimal(summary?.netMovement, summary?.unit, locale), detail: t("kpis.netMovementDetail"), tone: "spruce" },
    { id: "valueChange", label: t("kpis.valueChange"), value: formatMoney(summary?.valueChange, summary?.currency, locale), detail: t("kpis.valueChangeDetail"), tone: "gold" },
    { id: "completeness", label: t("kpis.completeness"), value: result?.completeness.state ? t(`completeness.${result.completeness.state}`) : "-", detail: t("kpis.completenessDetail"), tone: result?.completeness.state === "partial" ? "warning" : "success" },
  ]
}

export function buildInventoryHistoryColumns(t: TFunction, locale: string, timezone: string): TransactionHistoryColumn<InventoryMovementHistoryRow>[] {
  return [
    { id: "identity", header: t("columns.item"), cell: (row) => createElement("div", { className: "min-w-0" }, createElement("div", { className: "break-words font-semibold text-[var(--dash-text)]" }, row.item.name), createElement("div", { className: "text-xs text-[var(--dash-text-soft)]" }, row.item.sku)) },
    { id: "type", header: t("columns.type"), cell: (row) => createElement(MovementTypeBadge, { type: row.type, label: typeLabel(row.type, t) }) },
    { id: "quantity", header: t("columns.quantity"), cell: (row) => formatDecimal(row.quantity, row.item.unit, locale) },
    { id: "value", header: t("columns.value"), cell: (row) => formatMoney(row.totalCost, row.currency, locale) },
    { id: "effectiveAt", header: t("columns.effectiveAt"), cell: (row) => formatHistoryDate(row.effectiveAt, locale, timezone) },
    { id: "recordedAt", header: t("columns.recordedAt"), cell: (row) => formatHistoryDate(row.recordedAt, locale, timezone) },
    { id: "location", header: t("columns.location"), cell: (row) => row.location.name },
    { id: "reference", header: t("columns.reference"), cell: (row) => row.reference.number ?? row.reference.id ?? "—" },
  ]
}

export function MovementTypeBadge({ type, label }: { type: string; label: string }) { const Icon = movementIcon(type); return createElement(Badge, { variant: "outline", className: `gap-1.5 rounded-md ${movementTone(type)}` }, createElement(Icon, { className: "h-3.5 w-3.5", "aria-hidden": true }), label) }
function movementIcon(type: string) { if (type.includes("TRANSFER")) return ArrowLeftRight; if (["SALE", "PURCHASE_RETURN", "PRODUCTION_OUT", "DAMAGED", "EXPIRED", "THEFT", "WRITE_OFF", "SAMPLE", "PROMOTION"].includes(type)) return ArrowUpFromLine; if (["ADJUSTMENT_IN", "ADJUSTMENT_OUT"].includes(type)) return PackageCheck; if (["RESERVATION", "RESERVATION_RELEASE"].includes(type)) return ShieldAlert; return ArrowDownToLine }
function movementTone(type: string) { if (type.includes("TRANSFER") || type.startsWith("RESERVATION")) return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"; if (["DAMAGED", "EXPIRED", "THEFT", "WRITE_OFF"].includes(type)) return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"; if (type.includes("OUT") || ["SALE", "PURCHASE_RETURN", "SAMPLE", "PROMOTION"].includes(type)) return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"; return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]" }
export function selectedInventoryRow(rows: InventoryMovementHistoryRow[], selectedRowId: string | null) { return selectedRowId ? rows.find((row) => row.id === selectedRowId) ?? null : null }
export function sourceNames(result: InventoryMovementHistoryResult | undefined) { return result?.completeness.sources.filter((source) => source.state === "partial").map((source) => source.reason ? `${source.source}: ${source.reason}` : source.source) ?? [] }
export function RowText({ children }: { children: ReactNode }) { return createElement("span", { className: "break-words text-sm text-[var(--dash-text-soft)]" }, children || "-") }


