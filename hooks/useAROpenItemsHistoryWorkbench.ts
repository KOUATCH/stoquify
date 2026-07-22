"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getAROpenItemsHistoryAction,
  prepareAROpenItemsHistoryExportAction,
  type AROpenItemResult,
} from "@/actions/finance/ar-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"

const PAGE_SIZES = [25, 50, 100] as const

export type AROpenItemsHistoryFilters = TransactionHistoryFilters & {
  selected?: string
}

function parseSearchParams(params: URLSearchParams): AROpenItemsHistoryFilters {
  const pageSize = Number(params.get("pageSize"))
  return {
    dateTo: validDateOnly(params.get("dateTo")),
    pageSize: PAGE_SIZES.includes(pageSize as 25 | 50 | 100) ? (pageSize as 25 | 50 | 100) : 50,
    selected: stringParam(params.get("selected")),
  }
}

function actionFilters(filters: AROpenItemsHistoryFilters) {
  return {
    ...(filters.dateTo ? { asOf: `${filters.dateTo}T23:59:59.999Z` } : {}),
  }
}

export function useAROpenItemsHistoryWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const filters = useMemo(() => parseSearchParams(searchParams), [searchParams])
  const queryFilters = useMemo(() => actionFilters(filters), [filters])
  const historyQuery = useQuery({
    queryKey: ["ar-open-items-history", queryFilters],
    queryFn: async (): Promise<AROpenItemResult> => {
      const response = await getAROpenItemsHistoryAction({ filters: queryFilters })
      if (!response.success) throw new Error(response.error || "AR open items failed to load")
      return response.data
    },
    placeholderData: (previous) => previous,
  })
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await prepareAROpenItemsHistoryExportAction({
        filters: queryFilters,
        rowCount: historyQuery.data?.summary.itemCount ?? 0,
      })
      if (!response.success) throw new Error(response.error || "AR open items export failed")
      return response.data
    },
    onSuccess: () => setExportStatus("ready"),
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

  return {
    filters,
    result: historyQuery.data,
    rows: historyQuery.data?.items.slice(0, filters.pageSize) ?? [],
    selectedRowId: filters.selected ?? null,
    isLoading: historyQuery.isLoading || isPending,
    isError: historyQuery.isError,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    hasMore: false,
    exportStatus,
    isExporting: exportMutation.isPending,
    updateFilters: replaceWith,
    resetFilters: () => replaceWith({ dateTo: undefined, pageSize: 50, selected: undefined }),
    selectRow: (selected: string | null) => replaceWith({ selected: selected ?? undefined }),
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
