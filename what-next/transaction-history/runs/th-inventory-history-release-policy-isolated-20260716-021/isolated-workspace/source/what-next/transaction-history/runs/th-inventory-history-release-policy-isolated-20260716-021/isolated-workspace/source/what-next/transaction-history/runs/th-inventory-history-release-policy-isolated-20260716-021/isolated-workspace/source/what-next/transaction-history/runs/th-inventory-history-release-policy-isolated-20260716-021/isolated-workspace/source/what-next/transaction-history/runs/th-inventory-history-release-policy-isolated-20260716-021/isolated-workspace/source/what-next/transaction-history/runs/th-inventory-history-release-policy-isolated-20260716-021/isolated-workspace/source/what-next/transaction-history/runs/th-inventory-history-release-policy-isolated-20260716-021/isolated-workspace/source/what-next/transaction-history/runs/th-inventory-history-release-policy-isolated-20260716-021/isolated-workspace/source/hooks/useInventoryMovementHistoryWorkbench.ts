"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import { exportInventoryMovementHistoryAction, getInventoryMovementHistoryAction, type InventoryHistoryExportResult, type InventoryMovementHistoryResult } from "@/actions/inventory/inventoryMovementHistoryActions"
import { inventoryMovementHistoryTypes, type InventoryMovementHistoryType } from "@/components/inventory/movements/inventoryMovementHistoryAdapter"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"

const PAGE_SIZES = [25, 50, 100] as const
export type InventoryMovementHistoryUrlFilters = TransactionHistoryFilters & { itemId?: string; locationId?: string; effectiveAsOf?: string; cursor?: string; selected?: string }

export function parseInventoryMovementHistorySearchParams(params: URLSearchParams): InventoryMovementHistoryUrlFilters {
  const pageSize = Number(params.get("pageSize")); const type = params.get("type") ?? undefined
  return { search: params.get("search") ?? undefined, itemId: params.get("itemId") ?? undefined, locationId: params.get("locationId") ?? undefined, type: type && isInventoryMovementType(type) ? type : undefined, dateFrom: validDateOnly(params.get("dateFrom")), dateTo: validDateOnly(params.get("dateTo")), effectiveAsOf: validDateTime(params.get("effectiveAsOf")), pageSize: isPageSize(pageSize) ? pageSize : 50, cursor: params.get("cursor") ?? undefined, selected: params.get("selected") ?? undefined }
}
export function filtersForInventoryMovementHistoryAction(filters: InventoryMovementHistoryUrlFilters) { return { ...(filters.itemId ? { itemId: filters.itemId } : {}), ...(filters.locationId ? { locationId: filters.locationId } : {}), ...(filters.type ? { type: filters.type as InventoryMovementHistoryType } : {}), ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}), ...(filters.dateTo ? { dateTo: filters.dateTo } : {}), ...(filters.effectiveAsOf ? { effectiveAsOf: filters.effectiveAsOf } : {}), pageSize: filters.pageSize, ...(filters.cursor ? { cursor: filters.cursor } : {}) } }
export function filtersForInventoryMovementHistoryExport(filters: InventoryMovementHistoryUrlFilters) { const { cursor: _cursor, selected: _selected, search: _search, ...rest } = filters; return filtersForInventoryMovementHistoryAction(rest) }
export function buildInventoryMovementHistoryHref(pathname: string, current: URLSearchParams, patch: Partial<InventoryMovementHistoryUrlFilters>) {
  const next = new URLSearchParams(current.toString()); const cursorResetKeys = ["search", "itemId", "locationId", "type", "dateFrom", "dateTo", "effectiveAsOf", "pageSize"]; let reset = false
  for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === null || value === "") next.delete(key); else next.set(key, String(value)); if (cursorResetKeys.includes(key)) reset = true }
  if (reset) { next.delete("cursor"); next.delete("selected") }
  const query = next.toString(); return query ? `${pathname}?${query}` : pathname
}

export function useInventoryMovementHistoryWorkbench() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams(); const [isPending, startTransition] = useTransition(); const [exportStatus, setExportStatus] = useState<string | null>(null)
  const filters = useMemo(() => parseInventoryMovementHistorySearchParams(new URLSearchParams(searchParams.toString())), [searchParams])
  const actionFilters = useMemo(() => filtersForInventoryMovementHistoryAction(filters), [filters])
  const historyQuery = useQuery({ queryKey: ["inventory-movement-history-workbench", actionFilters], queryFn: async (): Promise<InventoryMovementHistoryResult> => { const response = await getInventoryMovementHistoryAction({ filters: actionFilters }); if (!response.success) { const error = new Error(response.error || "Inventory movement history failed to load"); Object.assign(error, { status: response.status, code: response.code }); throw error } return response.data }, placeholderData: (previous) => previous })
  const exportMutation = useMutation({ mutationFn: async (): Promise<InventoryHistoryExportResult> => { const response = await exportInventoryMovementHistoryAction({ filters: filtersForInventoryMovementHistoryExport(filters) }); if (!response.success) throw new Error(response.error || "Inventory movement history export failed"); return response.data }, onSuccess: (result) => setExportStatus(`${result.fileName} / ${result.manifest.rowCount}`), onError: (error) => setExportStatus(error instanceof Error ? error.message : "Inventory movement history export failed") })
  const replaceWith = useCallback((patch: Partial<InventoryMovementHistoryUrlFilters>) => { const href = buildInventoryMovementHistoryHref(pathname, new URLSearchParams(searchParams.toString()), patch); startTransition(() => router.replace(href, { scroll: false })) }, [pathname, router, searchParams])
  return { filters, result: historyQuery.data, rows: historyQuery.data?.rows ?? [], selectedRowId: filters.selected ?? null, isLoading: historyQuery.isLoading || isPending, isFetching: historyQuery.isFetching, isError: historyQuery.isError, error: historyQuery.error, refetch: historyQuery.refetch, hasMore: historyQuery.data?.pageInfo.hasMore ?? false, nextCursor: historyQuery.data?.pageInfo.nextCursor ?? null, exportStatus, isExporting: exportMutation.isPending, updateFilters: replaceWith, resetFilters: () => replaceWith({ search: undefined, itemId: undefined, locationId: undefined, type: undefined, dateFrom: undefined, dateTo: undefined, effectiveAsOf: undefined, pageSize: 50, cursor: undefined, selected: undefined }), selectRow: (selected: string | null) => replaceWith({ selected: selected ?? undefined }), nextPage: () => { if (historyQuery.data?.pageInfo.nextCursor) replaceWith({ cursor: historyQuery.data.pageInfo.nextCursor, selected: undefined }) }, exportHistory: () => exportMutation.mutate() }
}
function validDateOnly(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined }
function validDateTime(value: string | null) { if (!value) return undefined; const date = new Date(value); return Number.isNaN(date.getTime()) ? undefined : value }
function isPageSize(value: number): value is 25 | 50 | 100 { return PAGE_SIZES.includes(value as 25 | 50 | 100) }
function isInventoryMovementType(value: string): value is InventoryMovementHistoryType { return inventoryMovementHistoryTypes.includes(value as InventoryMovementHistoryType) }
