"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getAROpenItemsHistoryAction,
  prepareAROpenItemsHistoryExportAction,
  type AROpenItemResult,
} from "@/actions/finance/ar-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { useClientAuth } from "@/hooks/useClientAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"

const PAGE_SIZES = [25, 50, 100] as const

export type AROpenItemsHistoryFilters = TransactionHistoryFilters & {
  selected?: string
  customerId?: string
}

function parseSearchParams(params: URLSearchParams): AROpenItemsHistoryFilters {
  const pageSize = Number(params.get("pageSize"))
  return {
    dateTo: validDateOnly(params.get("dateTo")),
    pageSize: PAGE_SIZES.includes(pageSize as 25 | 50 | 100) ? (pageSize as 25 | 50 | 100) : 50,
    selected: stringParam(params.get("selected")),
    customerId: stringParam(params.get("customerId")),
  }
}

function actionFilters(filters: AROpenItemsHistoryFilters) {
  return {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.dateTo ? { asOf: `${filters.dateTo}T23:59:59.999Z` } : {}),
  }
}

export function useAROpenItemsHistoryWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const auth = useClientAuth(), permissions = usePermissions()
  const userId = auth.user?.id, organizationId = permissions.organizationId
  const permissionKey = [...(permissions.permissions ?? [])].sort().join("|")
  const enabled = !auth.isLoading && permissions.permissionState === "ready" && Boolean(userId && organizationId && auth.organizationId === organizationId) && hasAnyRbacPermission(permissions.permissions ?? [], ["finance.receivables.read", "finance.read"])
  const canExport = enabled && hasAnyRbacPermission(permissions.permissions ?? [], ["finance.reports.export", "reports.export"])
  const [isPending, startTransition] = useTransition()
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const filters = useMemo(() => parseSearchParams(searchParams), [searchParams])
  const queryFilters = useMemo(() => actionFilters(filters), [filters])
  const scopeKey = JSON.stringify([userId, organizationId, permissionKey, enabled, queryFilters])
  const currentScope = useRef(scopeKey)
  currentScope.current = scopeKey
  useEffect(() => { currentScope.current = scopeKey; return () => { currentScope.current = "" } }, [scopeKey])
  const historyQuery = useQuery({
    queryKey: ["ar-open-items-history", userId, organizationId, permissionKey, queryFilters],
    enabled,
    queryFn: async (): Promise<AROpenItemResult> => {
      const response = await getAROpenItemsHistoryAction({ filters: queryFilters })
      if (!response.success) throw new Error(response.error || "AR open items failed to load")
      if (response.data.scope.organizationId !== organizationId || response.data.scope.actorUserId !== userId) throw new Error("History workspace changed")
      return response.data
    },
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!canExport) throw new Error("AR read and export permissions are required")
      const requestedScope = scopeKey
      const response = await prepareAROpenItemsHistoryExportAction({
        filters: queryFilters,
      })
      if (!response.success) throw new Error(response.error || "AR open items export failed")
      if (response.data.scope.organizationId !== organizationId || response.data.scope.actorUserId !== userId) throw new Error("Export workspace changed")
      return { file: response.data, requestedScope }
    },
    onSuccess: ({ file, requestedScope }) => {
      if (currentScope.current !== requestedScope) return
      downloadExport(file)
      setExportStatus("ready")
    },
    onError: (error) => setExportStatus(error instanceof Error ? error.message : "AR open items export failed"),
  })
  const replaceWith = useCallback(
    (patch: Partial<AROpenItemsHistoryFilters>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key)
        else next.set(key, String(value))
      }
      if (!("selected" in patch)) next.delete("selected")
      const query = next.toString()
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
    },
    [pathname, router, searchParams],
  )
  const selectRow = useCallback((selected: string | null) => {
    // Details use the already authorized rows. Avoid a server navigation (and
    // its pending/loading state) just to open or close the drawer. Next keeps
    // useSearchParams in sync with native history updates.
    const url = new URL(window.location.href)
    if (selected) url.searchParams.set("selected", selected)
    else url.searchParams.delete("selected")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  }, [])

  return {
    filters,
    result: enabled && !historyQuery.isError ? historyQuery.data : undefined,
    rows: enabled && !historyQuery.isError ? historyQuery.data?.items.slice(0, filters.pageSize) ?? [] : [],
    selectedRowId: filters.selected ?? null,
    isLoading: historyQuery.isLoading || isPending || auth.isLoading || permissions.permissionState === "loading",
    isError: historyQuery.isError || (!auth.isLoading && permissions.permissionState !== "loading" && !enabled),
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    hasMore: false,
    exportStatus,
    isExporting: exportMutation.isPending,
    canExport,
    updateFilters: replaceWith,
    resetFilters: () => replaceWith({ customerId: undefined, dateTo: undefined, pageSize: 50, selected: undefined }),
    selectRow,
    nextPage: () => undefined,
    exportHistory: () => exportMutation.mutate(),
  }
}

function stringParam(value: string | null) {
  return value && value.trim() ? value : undefined
}

function validDateOnly(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function downloadExport(exportFile: {
  content: string
  fileName: string
  mimeType: string
}) {
  const url = URL.createObjectURL(
    new Blob([exportFile.content], { type: exportFile.mimeType }),
  )
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = exportFile.fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
