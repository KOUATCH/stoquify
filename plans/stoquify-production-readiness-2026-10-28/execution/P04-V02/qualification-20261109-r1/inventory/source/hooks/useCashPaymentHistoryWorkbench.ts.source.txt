"use client"

import { useCallback, useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getCashPaymentHistoryAction,
  prepareCashPaymentHistoryExportAction,
  type CashPaymentHistoryResult,
} from "@/actions/pos/cash-payment-history.actions"
import type { TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { usePermissions } from "@/hooks/usePermissions"

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
  const { user, organizationId, permissionState, permissions, hasAnyPermission } = usePermissions()
  const canRead = permissionState === "ready" && Boolean(user?.id && organizationId) && hasAnyPermission([
    "finance.cash-drawer.read", "finance.read", "payments.reconciliation.read", "finance.payments.read", "pos.read", "OPERATE_POS",
  ])
  const canExport = canRead && hasAnyPermission(["payments.export", "reports.export"])

  const filters = useMemo(
    () => parseCashPaymentHistorySearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )
  const actionFilters = useMemo(() => filtersForCashPaymentHistoryAction(filters), [filters])
  const authority = JSON.stringify([user?.id, organizationId, [...permissions].sort(), actionFilters])
  const historyQuery = useQuery({
    queryKey: ["cash-payment-history-workbench", authority],
    enabled: canRead,
    queryFn: async ({ signal }): Promise<CashPaymentHistoryResult> => {
      const response = await getCashPaymentHistoryAction({ filters: actionFilters })
      signal.throwIfAborted()
      if (!response.success) {
        throw Object.assign(new Error(response.error || "Cash/payment history failed to load"), { code: "code" in response ? response.code : undefined })
      }
      if (response.data.scope?.organizationId !== organizationId || response.data.scope?.actorUserId !== user?.id) {
        throw Object.assign(new Error("History workspace changed. Refresh the current workspace."), { code: "FORBIDDEN" })
      }
      return response.data
    },
    retry: false,
  })
  const result = canRead && !historyQuery.isError ? historyQuery.data : undefined
  const exportMutation = useMutation({
    mutationFn: async (request: { authority: string; filters: ReturnType<typeof filtersForCashPaymentHistoryExport>; rowCount: number }) => {
      const response = await prepareCashPaymentHistoryExportAction({ filters: request.filters, rowCount: request.rowCount })
      if (!response.success) throw new Error(response.error || "Cash/payment history export failed")
      return response.data
    },
  })
  const { reset: resetExport } = exportMutation
  const currentExport = canExport && exportMutation.variables?.authority === authority
  const replaceWith = useCallback(
    (patch: Partial<CashPaymentHistoryUrlFilters>) => {
      const href = buildCashPaymentHistoryHref(pathname, new URLSearchParams(searchParams.toString()), patch)
      resetExport()
      startTransition(() => router.replace(href, { scroll: false }))
    },
    [pathname, router, searchParams, resetExport],
  )
  const errorCode = (historyQuery.error as (Error & { code?: string }) | null)?.code

  return {
    filters,
    result,
    rows: result?.rows ?? [],
    selectedRowId: filters.selected ?? null,
    isLoading: permissionState === "loading" || (canRead && historyQuery.isPending) || isPending,
    isFetching: historyQuery.isFetching,
    isError: historyQuery.isError || permissionState === "error",
    permissionDenied: permissionState === "signed_out" || (permissionState === "ready" && !canRead) || ["FORBIDDEN", "UNAUTHORIZED", "UNAUTHENTICATED"].includes(errorCode ?? ""),
    noOrganization: permissionState === "ready" && !organizationId,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    hasMore: result?.pageInfo.hasMore ?? false,
    nextCursor: result?.pageInfo.nextCursor ?? null,
    exportStatus: currentExport && exportMutation.isSuccess ? "ready" : currentExport && exportMutation.isError ? exportMutation.error.message : null,
    isExporting: currentExport && exportMutation.isPending,
    canExport,
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
    selectRow: (selected: string | null) => router.replace(
      buildCashPaymentHistoryHref(pathname, new URLSearchParams(searchParams.toString()), { selected: selected ?? undefined }),
      { scroll: false },
    ),
    nextPage: () => {
      if (result?.pageInfo.nextCursor) replaceWith({ cursor: result.pageInfo.nextCursor, selected: undefined })
    },
    exportHistory: () => {
      if (canExport && !exportMutation.isPending) exportMutation.mutate({ authority, filters: filtersForCashPaymentHistoryExport(filters), rowCount: result?.summary.transactionCount ?? 0 })
    },
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
