"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getAPHistoryAction,
  prepareAPHistoryExportAction,
  type APHistoryResult,
} from "@/actions/purchasing/ap-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"

const PAGE_SIZES = [25, 50, 100] as const
const LANES = ["all", "invoice", "payment"] as const

export type APHistoryUrlFilters = TransactionHistoryFilters & {
  lane?: "all" | "invoice" | "payment"
  supplierId?: string
  cursor?: string
  selected?: string
}

export function parseAPHistorySearchParams(params: URLSearchParams): APHistoryUrlFilters {
  const pageSize = Number(params.get("pageSize"))
  return {
    lane: enumValue(params.get("lane"), LANES),
    supplierId: stringParam(params.get("supplierId")),
    dateFrom: validDateOnly(params.get("dateFrom")),
    dateTo: validDateOnly(params.get("dateTo")),
    pageSize: PAGE_SIZES.includes(pageSize as 25 | 50 | 100) ? (pageSize as 25 | 50 | 100) : 50,
    cursor: stringParam(params.get("cursor")),
    selected: stringParam(params.get("selected")),
  }
}

export function filtersForAPHistoryAction(filters: APHistoryUrlFilters) {
  return {
    ...(filters.lane && filters.lane !== "all" ? { lane: filters.lane } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    pageSize: filters.pageSize,
  }
}

export function useAPHistoryWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const filters = useMemo(() => parseAPHistorySearchParams(searchParams), [searchParams])
  const actionFilters = useMemo(() => filtersForAPHistoryAction(filters), [filters])
  const historyQuery = useQuery({
    queryKey: ["ap-history-workbench", actionFilters],
    queryFn: async (): Promise<APHistoryResult> => {
      const response = await getAPHistoryAction({ filters: actionFilters })
      if (!response.success) throw new Error(response.error || "AP history failed to load")
      return response.data
    },
    placeholderData: (previous) => previous,
  })
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await prepareAPHistoryExportAction({
        filters: filtersForAPHistoryExport(filters),
        rowCount: historyQuery.data?.summary.transactionCount ?? 0,
      })
      if (!response.success) throw new Error(response.error || "AP history export failed")
      return response.data
    },
    onSuccess: () => setExportStatus("ready"),
    onError: (error) => setExportStatus(error instanceof Error ? error.message : "AP history export failed"),
  })
  const replaceWith = useCallback(
    (patch: Partial<APHistoryUrlFilters>) => {
      const href = buildAPHistoryHref(pathname, new URLSearchParams(searchParams.toString()), patch)
      startTransition(() => router.replace(href, { scroll: false }))
    },
    [pathname, router, searchParams],
  )

  return {
    filters,
    result: historyQuery.data,
    rows: historyQuery.data?.rows ?? [],
    selectedRowId: filters.selected ?? null,
    isLoading: historyQuery.isLoading || isPending,
    isError: historyQuery.isError,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    hasMore: historyQuery.data?.pageInfo.hasMore ?? false,
    exportStatus,
    isExporting: exportMutation.isPending,
    updateFilters: replaceWith,
    resetFilters: () => replaceWith({ lane: undefined, dateFrom: undefined, dateTo: undefined, pageSize: 50, cursor: undefined, selected: undefined }),
    selectRow: (selected: string | null) => replaceWith({ selected: selected ?? undefined }),
    nextPage: () => {
      if (historyQuery.data?.pageInfo.nextCursor) replaceWith({ cursor: historyQuery.data.pageInfo.nextCursor, selected: undefined })
    },
    exportHistory: () => exportMutation.mutate(),
  }
}

function filtersForAPHistoryExport(filters: APHistoryUrlFilters) {
  const { cursor: _cursor, selected: _selected, search: _search, type: _type, ...rest } = filters
  return filtersForAPHistoryAction(rest)
}

function buildAPHistoryHref(pathname: string, params: URLSearchParams, patch: Partial<APHistoryUrlFilters>) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") next.delete(key)
    else next.set(key, String(value))
  }
  if (!("cursor" in patch)) next.delete("cursor")
  if (!("selected" in patch)) next.delete("selected")
  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

function stringParam(value: string | null) {
  return value && value.trim() ? value : undefined
}

function validDateOnly(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function enumValue<const Values extends readonly string[]>(value: string | null, values: Values): Values[number] | undefined {
  return value && values.includes(value) ? value : undefined
}
