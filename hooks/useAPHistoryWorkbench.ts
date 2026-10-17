"use client"

import { useCallback, useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getAPHistoryAction,
  type APHistoryResult,
} from "@/actions/purchasing/ap-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"

const PAGE_SIZES = [25, 50, 100] as const
const LANES = ["all", "invoice", "payment"] as const

export type APHistoryUrlFilters = TransactionHistoryFilters & {
  lane?: "all" | "invoice" | "payment"
  invoiceId?: string
  supplierId?: string
  cursor?: string
  selected?: string
}

export function parseAPHistorySearchParams(params: URLSearchParams): APHistoryUrlFilters {
  const pageSize = Number(params.get("pageSize"))
  return {
    lane: enumValue(params.get("lane"), LANES),
    invoiceId: stringParam(params.get("invoiceId")),
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
    ...(filters.invoiceId ? { invoiceId: filters.invoiceId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    pageSize: filters.pageSize,
  }
}

export function useAPHistoryWorkbench({ organizationId, actorId }: { organizationId: string; actorId: string }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const filters = useMemo(() => parseAPHistorySearchParams(searchParams), [searchParams])
  const actionFilters = useMemo(() => filtersForAPHistoryAction(filters), [filters])
  const historyQuery = useQuery({
    queryKey: ["ap-history-workbench", organizationId, actorId, actionFilters],
    queryFn: async (): Promise<APHistoryResult> => {
      const response = await getAPHistoryAction({ filters: actionFilters })
      if (!response.success) throw Object.assign(new Error(response.error || "AP history failed to load"), { code: "code" in response ? response.code : undefined })
      if (response.data.scope?.organizationId !== organizationId || response.data.scope?.actorUserId !== actorId) throw Object.assign(new Error("History workspace changed. Refresh the current workspace."), { code: "FORBIDDEN" })
      return response.data
    },
    retry: (count, error) => !["CONFLICT", "VALIDATION_ERROR", "FORBIDDEN", "AUTH_REQUIRED"].includes((error as Error & { code?: string }).code ?? "") && count < 1,
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
    isStale: ["CONFLICT", "VALIDATION_ERROR"].includes((historyQuery.error as (Error & { code?: string }) | null)?.code ?? ""),
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    restartHistory: () => {
      // A rejected continuation must not recover into a still-fresh cached first page.
      queryClient.removeQueries({ queryKey: ["ap-history-workbench", organizationId, actorId], type: "inactive" })
      if (!filters.cursor) void historyQuery.refetch()
      replaceWith({ cursor: undefined, selected: undefined })
    },
    hasMore: historyQuery.data?.pageInfo.hasMore ?? false,
    updateFilters: replaceWith,
    resetFilters: () => replaceWith({ invoiceId: undefined, supplierId: filters.invoiceId ? undefined : filters.supplierId, lane: undefined, dateFrom: undefined, dateTo: undefined, pageSize: 50, cursor: undefined, selected: undefined }),
    // Selecting retained details does not reload the data. Tracking this as a
    // filter transition replaces the table with a loader and destroys the
    // drawer's focus-return target on both opening and closing.
    selectRow: (selected: string | null) => router.replace(
      buildAPHistoryHref(pathname, new URLSearchParams(searchParams.toString()), { selected: selected ?? undefined }),
      { scroll: false },
    ),
    nextPage: () => {
      if (historyQuery.data?.pageInfo.nextCursor) replaceWith({ cursor: historyQuery.data.pageInfo.nextCursor, selected: undefined })
    },
  }
}

export function buildAPHistoryHref(pathname: string, params: URLSearchParams, patch: Partial<APHistoryUrlFilters>) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") next.delete(key)
    else next.set(key, String(value))
  }
  if ("lane" in patch && patch.lane !== "invoice") next.delete("invoiceId")
  if (!("cursor" in patch) && Object.keys(patch).some(key => key !== "selected")) next.delete("cursor")
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
