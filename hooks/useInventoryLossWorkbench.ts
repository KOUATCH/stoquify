"use client"

import { useCallback, useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import {
  getInventoryLossSummaryAction,
  type InventoryLossQueryResult,
} from "@/actions/inventory/inventoryLossReadActions"

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000
const DEFAULT_PERIOD_DAYS = 30
const MAX_PERIOD_DAYS = 366

export type InventoryLossPeriodFilters = {
  from: string
  to: string
}

type InventoryLossActionFilters = {
  from: string
  to: string
  detailLimit: number
  groupLimit: number
}

type InventoryLossActionError = Error & {
  status?: number
  code?: string
  retryable?: boolean
}

export type InventoryLossErrorState =
  | "stale_session"
  | "permission_denied"
  | "error"

export function defaultInventoryLossPeriod(
  now = new Date(),
): InventoryLossPeriodFilters {
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )
  const from = new Date(
    today.getTime() - (DEFAULT_PERIOD_DAYS - 1) * DAY_MILLISECONDS,
  )

  return {
    from: formatDateOnly(from),
    to: formatDateOnly(today),
  }
}

export function parseInventoryLossSearchParams(
  params: URLSearchParams,
  now = new Date(),
): InventoryLossPeriodFilters {
  const defaults = defaultInventoryLossPeriod(now)
  const from = validDateOnly(params.get("from"))
  const to = validDateOnly(params.get("to"))

  return {
    from: from ?? defaults.from,
    to: to ?? defaults.to,
  }
}

export function inventoryLossPeriodError(
  filters: InventoryLossPeriodFilters,
): string | null {
  const from = dateOnlyToUtc(filters.from)
  const to = dateOnlyToUtc(filters.to)

  if (!from || !to) {
    return "Choose a valid reporting period."
  }

  const periodDays =
    Math.floor((to.getTime() - from.getTime()) / DAY_MILLISECONDS) + 1
  if (periodDays <= 0) {
    return "The end date must be on or after the start date."
  }
  if (periodDays > MAX_PERIOD_DAYS) {
    return "The reporting period cannot exceed 366 days."
  }

  return null
}

export function filtersForInventoryLossAction(
  filters: InventoryLossPeriodFilters,
): InventoryLossActionFilters {
  const from = dateOnlyToUtc(filters.from)
  const through = dateOnlyToUtc(filters.to)

  if (!from || !through) {
    throw new Error("Inventory loss period is invalid.")
  }

  return {
    from: from.toISOString(),
    to: new Date(through.getTime() + DAY_MILLISECONDS).toISOString(),
    detailLimit: 100,
    groupLimit: 10,
  }
}

export function buildInventoryLossHref(
  pathname: string,
  current: URLSearchParams,
  patch: Partial<InventoryLossPeriodFilters>,
) {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function inventoryLossErrorState(
  error: unknown,
): InventoryLossErrorState {
  const actionError = error as InventoryLossActionError | null
  if (
    actionError?.status === 401 ||
    actionError?.code === "AUTH_REQUIRED"
  ) {
    return "stale_session"
  }
  if (
    actionError?.status === 403 ||
    actionError?.code === "FORBIDDEN" ||
    actionError?.code === "FRESH_AUTH_REQUIRED"
  ) {
    return "permission_denied"
  }
  return "error"
}

export function useInventoryLossWorkbench() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const filters = useMemo(
    () =>
      parseInventoryLossSearchParams(
        new URLSearchParams(searchParams.toString()),
      ),
    [searchParams],
  )
  const periodError = useMemo(
    () => inventoryLossPeriodError(filters),
    [filters],
  )
  const actionFilters = useMemo(
    () => filtersForInventoryLossAction(filters),
    [filters],
  )

  const lossQuery = useQuery({
    queryKey: ["inventory-loss-workbench", actionFilters],
    enabled: !periodError,
    queryFn: async (): Promise<InventoryLossQueryResult> => {
      const response = await getInventoryLossSummaryAction(actionFilters)
      if (!response.success) {
        const error = new Error(
          response.error || "Inventory loss summary failed to load.",
        ) as InventoryLossActionError
        error.status = response.status
        error.code = response.code
        error.retryable = response.retryable
        throw error
      }

      return response.data
    },
    placeholderData: (previous) => previous,
  })

  const updateFilters = useCallback(
    (patch: Partial<InventoryLossPeriodFilters>) => {
      const href = buildInventoryLossHref(
        pathname,
        new URLSearchParams(searchParams.toString()),
        patch,
      )
      startTransition(() => router.replace(href, { scroll: false }))
    },
    [pathname, router, searchParams],
  )

  return {
    filters,
    periodError,
    response: lossQuery.data,
    result: lossQuery.data?.data,
    scope: lossQuery.data?.scope,
    isLoading: lossQuery.isLoading || isPending,
    isFetching: lossQuery.isFetching,
    isError: lossQuery.isError,
    error: lossQuery.error,
    updateFilters,
    resetFilters: () =>
      updateFilters({ from: undefined, to: undefined }),
    refetch: lossQuery.refetch,
  }
}

function validDateOnly(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined
  }
  return dateOnlyToUtc(value) ? value : undefined
}

function dateOnlyToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}
