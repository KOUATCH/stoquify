"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { exportInventoryMovementHistoryAction, getInventoryMovementHistoryAction, type InventoryHistoryExportResult, type InventoryMovementHistoryResult } from "@/actions/inventory/inventoryMovementHistoryActions"
import { inventoryMovementHistoryTypes, inventoryMovementHistoryTypeAliases, type InventoryMovementHistoryType } from "@/types/inventoryMovementHistory"
import { inventoryMovementsTableContract } from "@/components/DataTableComponents/inventory-movements-table-contract"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { usePermissions } from "@/hooks/usePermissions"

export type InventoryMovementHistoryUrlFilters = TransactionHistoryFilters & {
  itemId?: string; locationId?: string; effectiveAsOf?: string; cursor?: string; selected?: string; direction?: "next" | "previous"
}

export function parseInventoryMovementHistorySearchParams(params: URLSearchParams): InventoryMovementHistoryUrlFilters {
  const query = createCanonicalTableQuery(inventoryMovementsTableContract, { search: params.get("search") ?? "", pageSize: Number(params.get("pageSize")) })
  const rawType = params.get("type") ?? ""
  const type = inventoryMovementHistoryTypeAliases[rawType] ?? rawType
  return {
    search: query.search || undefined,
    itemId: params.get("itemId") || undefined, locationId: params.get("locationId") || undefined,
    type: inventoryMovementHistoryTypes.includes(type as InventoryMovementHistoryType) ? type : undefined,
    dateFrom: validDateOnly(params.get("dateFrom")), dateTo: validDateOnly(params.get("dateTo")), effectiveAsOf: validDateTime(params.get("effectiveAsOf")),
    pageSize: query.pageSize as 25 | 50 | 100, cursor: params.get("cursor") || undefined, selected: params.get("selected") || undefined,
    direction: params.get("cursor") && params.get("direction") === "previous" ? "previous" : undefined,
  }
}

export function filtersForInventoryMovementHistoryAction(filters: InventoryMovementHistoryUrlFilters) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.itemId ? { itemId: filters.itemId } : {}), ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.type ? { type: filters.type as InventoryMovementHistoryType } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}), ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.effectiveAsOf ? { effectiveAsOf: filters.effectiveAsOf } : {}), pageSize: filters.pageSize,
    ...(filters.cursor ? { cursor: filters.cursor, ...(filters.direction ? { direction: filters.direction } : {}) } : {}),
  }
}

export function filtersForInventoryMovementHistoryExport(filters: InventoryMovementHistoryUrlFilters) {
  return filtersForInventoryMovementHistoryAction({ ...filters, cursor: undefined, direction: undefined, selected: undefined })
}

export function buildInventoryMovementHistoryHref(pathname: string, current: URLSearchParams, patch: Partial<InventoryMovementHistoryUrlFilters>) {
  const next = new URLSearchParams(current.toString())
  const resetKeys = ["search", "itemId", "locationId", "type", "dateFrom", "dateTo", "effectiveAsOf", "pageSize"]
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") next.delete(key)
    else next.set(key, String(value))
  }
  if (Object.keys(patch).some((key) => resetKeys.includes(key))) {
    next.delete("cursor"); next.delete("direction"); next.delete("selected")
  } else if ("cursor" in patch) {
    next.delete("selected")
    if (!patch.cursor) next.delete("direction")
  }
  return next.size ? pathname + "?" + next : pathname
}

export function downloadInventoryHistoryArtifact(result: InventoryHistoryExportResult) {
  const url = URL.createObjectURL(new Blob([result.content], { type: result.fileType }))
  const link = document.createElement("a")
  link.href = url
  link.download = result.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useInventoryMovementHistoryWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [exportStatus, setExportStatus] = useState<{ fileName: string; rowCount: number } | null>(null)
  const { user, organizationId, permissionState, hasPermission } = usePermissions()
  const canRead = permissionState === "ready" && hasPermission("inventory.levels.read")
  const canExport = canRead && hasPermission("reports.export")
  const authority = JSON.stringify([user?.id, organizationId])
  const exportAuthority = useRef<string | null>(null)
  useEffect(() => {
    exportAuthority.current = canExport ? authority : null
    setExportStatus(null)
    return () => { exportAuthority.current = null }
  }, [authority, canExport])
  const filters = useMemo(() => parseInventoryMovementHistorySearchParams(new URLSearchParams(searchParams.toString())), [searchParams])
  const actionFilters = useMemo(() => filtersForInventoryMovementHistoryAction(filters), [filters])
  const historyQuery = useQuery({
    queryKey: ["inventory-movement-history-workbench", user?.id, organizationId, actionFilters],
    enabled: canRead && Boolean(organizationId),
    queryFn: async ({ signal }): Promise<InventoryMovementHistoryResult> => {
      const response = await getInventoryMovementHistoryAction({ filters: actionFilters })
      signal.throwIfAborted()
      if (!response.success) throw Object.assign(new Error(response.error || "History failed to load"), { status: response.status, code: response.code })
      return response.data
    },
    // Never present an earlier query's rows as matching newer filters or permissions.
    retry: false,
  })
  const exportMutation = useMutation({
    mutationFn: async (request: { authority: string; filters: ReturnType<typeof filtersForInventoryMovementHistoryExport> }): Promise<InventoryHistoryExportResult> => {
      const response = await exportInventoryMovementHistoryAction({ filters: request.filters })
      if (!response.success) throw new Error(response.error || "History export failed")
      return response.data
    },
    onMutate: () => setExportStatus(null),
    onSuccess: (result, request) => {
      if (exportAuthority.current !== request.authority) return
      downloadInventoryHistoryArtifact(result)
      setExportStatus({ fileName: result.fileName, rowCount: result.manifest.rowCount })
    },
  })
  const updateFilters = useCallback((patch: Partial<InventoryMovementHistoryUrlFilters>, replace = false) => {
    const href = buildInventoryMovementHistoryHref(pathname, new URLSearchParams(searchParams.toString()), patch)
    setExportStatus(null)
    startTransition(() => replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false }))
  }, [pathname, router, searchParams])
  const result = canRead && !historyQuery.isError ? historyQuery.data : undefined
  const errorCode = (historyQuery.error as { code?: string } | null)?.code
  return {
    filters, result, rows: result?.rows ?? [], selectedRowId: filters.selected ?? null,
    isLoading: permissionState === "loading" || (canRead && historyQuery.isPending) || isPending,
    isFetching: historyQuery.isFetching,
    isError: historyQuery.isError || permissionState === "error", error: historyQuery.error,
    permissionDenied: permissionState === "signed_out" || (permissionState === "ready" && !canRead) || ["FORBIDDEN", "UNAUTHORIZED", "UNAUTHENTICATED"].includes(errorCode ?? ""),
    noOrganization: (permissionState === "ready" && !organizationId) || errorCode === "NO_ACTIVE_ORG",
    refetch: historyQuery.refetch, hasMore: result?.pageInfo.hasMore ?? false,
    canPreviousPage: Boolean(result?.pageInfo.previousCursor), canFirstPage: Boolean(filters.cursor),
    updateFilters,
    resetFilters: () => updateFilters({ search: undefined, itemId: undefined, locationId: undefined, type: undefined, dateFrom: undefined, dateTo: undefined, effectiveAsOf: undefined, pageSize: 50, cursor: undefined, direction: undefined, selected: undefined }),
    selectRow: (selected: string | null) => updateFilters({ selected: selected ?? undefined }, true),
    nextPage: () => { if (result?.pageInfo.nextCursor) updateFilters({ cursor: result.pageInfo.nextCursor, direction: undefined }) },
    previousPage: () => { if (result?.pageInfo.previousCursor) updateFilters({ cursor: result.pageInfo.previousCursor, direction: "previous" }) },
    firstPage: () => updateFilters({ cursor: undefined, direction: undefined }),
    canExport, exportHistory: () => { if (canExport && !exportMutation.isPending) exportMutation.mutate({ authority, filters: filtersForInventoryMovementHistoryExport(filters) }) },
    exportStatus, exportError: canExport && exportMutation.variables?.authority === authority && exportMutation.isError, isExporting: exportMutation.isPending,
  }
}

function validDateOnly(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(value + "T00:00:00Z")
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined
}
function validDateTime(value: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : undefined
}
