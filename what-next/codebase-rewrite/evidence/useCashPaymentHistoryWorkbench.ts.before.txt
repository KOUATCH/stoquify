"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getCashPaymentHistoryAction,
  prepareCashPaymentHistoryExportAction,
  type CashPaymentHistoryResult,
} from "@/actions/pos/cash-payment-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"

const PAGE_SIZES = [25, 50, 100] as const
const LANES = ["all", "cash", "payment"] as const
const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE", "CREDIT", "STORE_CREDIT", "GIFT_CARD", "LOYALTY_POINTS", "MIXED", "OTHER"] as const
const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERPAID", "REFUNDED", "CANCELLED", "FAILED"] as const
const CASH_TYPES = ["OPENING_BALANCE", "SALE", "RETURN", "CASH_IN", "CASH_OUT", "CLOSING_BALANCE", "REFUND", "PAYOUT"] as const

export type CashPaymentHistoryUrlFilters = TransactionHistoryFilters & {
  lane?: "all" | "cash" | "payment"
  locationId?: string
  cashierId?: string
  paymentMethod?: string
  paymentStatus?: string
  cashType?: string
  effectiveAsOf?: string
  cursor?: string
  selected?: string
}

export function parseCashPaymentHistorySearchParams(params: URLSearchParams): CashPaymentHistoryUrlFilters {
  const pageSize = Number(params.get("pageSize"))
  return {
    lane: enumValue(params.get("lane"), LANES),
    locationId: stringParam(params.get("locationId")),
    cashierId: stringParam(params.get("cashierId")),
    paymentMethod: enumValue(params.get("paymentMethod"), PAYMENT_METHODS),
    paymentStatus: enumValue(params.get("paymentStatus"), PAYMENT_STATUSES),
    cashType: enumValue(params.get("cashType"), CASH_TYPES),
    dateFrom: validDateOnly(params.get("dateFrom")),
    dateTo: validDateOnly(params.get("dateTo")),
    effectiveAsOf: validDateTime(params.get("effectiveAsOf")),
    pageSize: isPageSize(pageSize) ? pageSize : 50,
    cursor: stringParam(params.get("cursor")),
    selected: stringParam(params.get("selected")),
  }
}

export function filtersForCashPaymentHistoryAction(filters: CashPaymentHistoryUrlFilters) {
  return {
    ...(filters.lane && filters.lane !== "all" ? { lane: filters.lane } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.cashType ? { cashType: filters.cashType } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.effectiveAsOf ? { effectiveAsOf: filters.effectiveAsOf } : {}),
    pageSize: filters.pageSize,
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
  }
}

export function filtersForCashPaymentHistoryExport(filters: CashPaymentHistoryUrlFilters) {
  const { cursor: _cursor, selected: _selected, search: _search, ...rest } = filters
  return filtersForCashPaymentHistoryAction(rest)
}

export function buildCashPaymentHistoryHref(pathname: string, current: URLSearchParams, patch: Partial<CashPaymentHistoryUrlFilters>) {
  const next = new URLSearchParams(current.toString())
  const cursorResetKeys = ["lane", "locationId", "cashierId", "paymentMethod", "paymentStatus", "cashType", "dateFrom", "dateTo", "effectiveAsOf", "pageSize"]
  let reset = false

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") next.delete(key)
    else next.set(key, String(value))
    if (cursorResetKeys.includes(key)) reset = true
  }

  if (reset) {
    next.delete("cursor")
    next.delete("selected")
  }

  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function useCashPaymentHistoryWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const filters = useMemo(
    () => parseCashPaymentHistorySearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )
  const actionFilters = useMemo(() => filtersForCashPaymentHistoryAction(filters), [filters])
  const historyQuery = useQuery({
    queryKey: ["cash-payment-history-workbench", actionFilters],
    queryFn: async (): Promise<CashPaymentHistoryResult> => {
      const response = await getCashPaymentHistoryAction({ filters: actionFilters })
      if (!response.success) {
        throw new Error(response.error || "Cash/payment history failed to load")
      }
      return response.data
    },
    placeholderData: (previous) => previous,
  })
  const exportMutation = useMutation({
    mutationFn: async () => {
      const rowCount = historyQuery.data?.summary.transactionCount ?? 0
      const response = await prepareCashPaymentHistoryExportAction({
        filters: filtersForCashPaymentHistoryExport(filters),
        rowCount,
      })
      if (!response.success) throw new Error(response.error || "Cash/payment history export failed")
      return response.data
    },
    onSuccess: () => setExportStatus("ready"),
    onError: (error) => setExportStatus(error instanceof Error ? error.message : "Cash/payment history export failed"),
  })
  const replaceWith = useCallback(
    (patch: Partial<CashPaymentHistoryUrlFilters>) => {
      const href = buildCashPaymentHistoryHref(pathname, new URLSearchParams(searchParams.toString()), patch)
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
    isFetching: historyQuery.isFetching,
    isError: historyQuery.isError,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    hasMore: historyQuery.data?.pageInfo.hasMore ?? false,
    nextCursor: historyQuery.data?.pageInfo.nextCursor ?? null,
    exportStatus,
    isExporting: exportMutation.isPending,
    updateFilters: replaceWith,
    resetFilters: () =>
      replaceWith({
        lane: undefined,
        locationId: undefined,
        cashierId: undefined,
        paymentMethod: undefined,
        paymentStatus: undefined,
        cashType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        effectiveAsOf: undefined,
        pageSize: 50,
        cursor: undefined,
        selected: undefined,
      }),
    selectRow: (selected: string | null) => replaceWith({ selected: selected ?? undefined }),
    nextPage: () => {
      if (historyQuery.data?.pageInfo.nextCursor) replaceWith({ cursor: historyQuery.data.pageInfo.nextCursor, selected: undefined })
    },
    exportHistory: () => exportMutation.mutate(),
  }
}

function stringParam(value: string | null) {
  return value && value.trim() ? value : undefined
}

function validDateOnly(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function validDateTime(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : value
}

function isPageSize(value: number): value is 25 | 50 | 100 {
  return PAGE_SIZES.includes(value as 25 | 50 | 100)
}

function enumValue<const Values extends readonly string[]>(value: string | null, values: Values): Values[number] | undefined {
  return value && values.includes(value) ? value : undefined
}
