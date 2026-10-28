import type { InventoryLossQueryResult } from "@/actions/inventory/inventoryLossReadActions"

import type { InventoryLossWorkbenchCopy } from "./inventoryLossWorkbenchCopy"

export type InventoryLossData = InventoryLossQueryResult["data"]
export type InventoryLossRecord = InventoryLossData["records"][number]
export type InventoryLossValueGroup =
  InventoryLossData["groups"]["byLocation"][number]
export type InventoryLossProductGroup =
  InventoryLossData["groups"]["byProduct"][number]
export type InventoryLossScope = InventoryLossQueryResult["scope"]

export function scopeLabel(
  scope: InventoryLossScope,
  copy: InventoryLossWorkbenchCopy,
) {
  if (scope.kind === "TENANT") return copy.tenantScope
  return `${scope.authorizedLocationIds.length} ${copy.managedScope}`
}

export function categoryLabel(
  category: string,
  copy: InventoryLossWorkbenchCopy,
) {
  if (category === "COUNT_VARIANCE") return copy.countVariance
  if (category === "DAMAGED") return copy.damaged
  if (category === "EXPIRED") return copy.expired
  if (category === "RECORDED_THEFT") return copy.recordedTheft
  return copy.writeOff
}

export function formatMoney(
  value: string,
  currency: string,
  locale: string,
) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${value} ${currency}`

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`
  }
}

export function formatInteger(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export function formatQuantity(
  value: string,
  unit: string | null,
  locale: string,
) {
  const quantity = Number(value)
  const formatted = Number.isFinite(quantity)
    ? new Intl.NumberFormat(locale, {
        maximumFractionDigits: 3,
      }).format(quantity)
    : value

  return unit ? `${formatted} ${unit}` : formatted
}

export function formatDateTime(
  value: string,
  locale: string,
  timezone: string,
) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date)
  }
}
