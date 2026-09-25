"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  type CanonicalTableContract,
  type CanonicalTableQuery,
  createCanonicalTableQuery,
  parseCanonicalTableQuery,
  serializeCanonicalTableQuery,
} from "./table-system-contract"

export function useCanonicalTableUrlState(contract: CanonicalTableContract, debounceMs = 300) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const serializedSearchParams = searchParams.toString()
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const sequence = React.useRef(0)
  const activeRequest = React.useRef<AbortController | null>(null)
  const query = React.useMemo(
    () => parseCanonicalTableQuery(contract, serializedSearchParams),
    [contract, serializedSearchParams],
  )

  const commit = React.useCallback(
    (patch: Partial<CanonicalTableQuery>, options?: { replace?: boolean }) => {
      const next = createCanonicalTableQuery(contract, { ...query, ...patch })
      const serialized = serializeCanonicalTableQuery(contract, next, serializedSearchParams)
      const href = serialized.size ? `${pathname}?${serialized.toString()}` : pathname
      const currentParams = new URLSearchParams(serializedSearchParams)
      const current = currentParams.size ? `${pathname}?${currentParams.toString()}` : pathname
      if (href === current) return next
      if (options?.replace === false) router.push(href, { scroll: false })
      else router.replace(href, { scroll: false })
      return next
    },
    [contract, pathname, query, router, serializedSearchParams],
  )

  const setSearch = React.useCallback(
    (search: string) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => commit({ search, pageIndex: 0 }), debounceMs)
    },
    [commit, debounceMs],
  )

  const beginLatestRequest = React.useCallback(() => {
    sequence.current += 1
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    const requestSequence = sequence.current
    return {
      signal: controller.signal,
      isLatest: () => requestSequence === sequence.current && !controller.signal.aborted,
    }
  }, [])

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      activeRequest.current?.abort()
    },
    [],
  )

  return { query, commit, setSearch, beginLatestRequest }
}
