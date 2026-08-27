"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from "lucide-react"

import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { Button } from "@/components/ui/button"
import type { Locale } from "@/types/bilingual"

type SortValue = string | number | boolean | Date | null | undefined

export type HrPayrollSortOption<T> = {
  key: string
  label: string
  value: (row: T) => SortValue
}

type UseHrPayrollTableOptions<T> = {
  rows: readonly T[]
  searchText: (row: T) => string
  dateValue: (row: T) => string | Date | null | undefined
  sortOptions: readonly HrPayrollSortOption<T>[]
  initialPageSize?: number
}

function comparable(value: SortValue) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") return value.toLocaleLowerCase()
  if (typeof value === "boolean") return value ? 1 : 0
  return value ?? ""
}

function dateTimestamp(value: string | Date | null | undefined) {
  if (!value) return null
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function useHrPayrollTable<T>({
  rows,
  searchText,
  dateValue,
  sortOptions,
  initialPageSize = 10,
}: UseHrPayrollTableOptions<T>) {
  const [query, setQueryState] = useState("")
  const [fromDate, setFromDateState] = useState("")
  const [toDate, setToDateState] = useState("")
  const [sortKey, setSortKeyState] = useState("")
  const [sortDirection, setSortDirectionState] = useState<"asc" | "desc">("asc")
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [pageIndex, setPageIndex] = useState(0)

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null

    const matches = rows.filter((row) => {
      if (normalizedQuery && !searchText(row).toLocaleLowerCase().includes(normalizedQuery)) return false

      if (from !== null && to !== null) {
        const timestamp = dateTimestamp(dateValue(row))
        if (timestamp === null) return false
        if (timestamp < from) return false
        if (timestamp > to) return false
      }

      return true
    })

    const selectedSort = sortOptions.find((option) => option.key === sortKey)
    if (!selectedSort) return matches

    return matches
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const leftValue = comparable(selectedSort.value(left.row))
        const rightValue = comparable(selectedSort.value(right.row))
        const comparison =
          typeof leftValue === "number" && typeof rightValue === "number"
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true })

        if (comparison === 0) return left.index - right.index
        return sortDirection === "asc" ? comparison : -comparison
      })
      .map(({ row }) => row)
  }, [dateValue, fromDate, query, rows, searchText, sortDirection, sortKey, sortOptions, toDate])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRows = filteredRows.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize)

  const resetPage = () => setPageIndex(0)
  const setQuery = (value: string) => {
    setQueryState(value)
    resetPage()
  }
  const setFromDate = (value: string) => {
    setFromDateState(value)
    resetPage()
  }
  const setToDate = (value: string) => {
    setToDateState(value)
    resetPage()
  }
  const setDateRange = (from: string, to: string) => {
    setFromDateState(from)
    setToDateState(to)
    resetPage()
  }
  const setSortKey = (value: string) => {
    setSortKeyState(value)
    resetPage()
  }
  const setSortDirection = (value: "asc" | "desc") => {
    setSortDirectionState(value)
    resetPage()
  }
  const setPageSize = (value: number) => {
    setPageSizeState(value)
    resetPage()
  }
  const clear = () => {
    setQueryState("")
    setFromDateState("")
    setToDateState("")
    setSortKeyState("")
    setSortDirectionState("asc")
    resetPage()
  }

  return {
    rows: pageRows,
    filteredRows,
    query,
    fromDate,
    toDate,
    sortKey,
    sortDirection,
    sortOptions,
    pageSize,
    pageIndex: safePageIndex,
    pageCount,
    totalCount: rows.length,
    filteredCount: filteredRows.length,
    setQuery,
    setFromDate,
    setToDate,
    setDateRange,
    setSortKey,
    setSortDirection,
    setPageSize,
    firstPage: () => setPageIndex(0),
    previousPage: () => setPageIndex(Math.max(0, safePageIndex - 1)),
    nextPage: () => setPageIndex(Math.min(pageCount - 1, safePageIndex + 1)),
    lastPage: () => setPageIndex(pageCount - 1),
    canPreviousPage: safePageIndex > 0,
    canNextPage: safePageIndex < pageCount - 1,
    clear,
  }
}

export type HrPayrollTableState<T> = ReturnType<typeof useHrPayrollTable<T>>

const COPY = {
  en: {
    search: "Search",
    from: "From",
    to: "To",
    dateRange: "Date range",
    sort: "Sort by",
    original: "Original order",
    ascending: "Ascending",
    descending: "Descending",
    clear: "Clear table filters",
    rows: "Rows per page",
    page: "Page",
    firstPage: "First page",
    previous: "Previous",
    next: "Next",
    lastPage: "Last page",
    of: "of",
  },
  fr: {
    search: "Rechercher",
    from: "Du",
    to: "Au",
    dateRange: "Période",
    sort: "Trier par",
    original: "Ordre initial",
    ascending: "Croissant",
    descending: "Décroissant",
    clear: "Effacer les filtres",
    rows: "Lignes par page",
    page: "Page",
    firstPage: "Première page",
    previous: "Précédent",
    next: "Suivant",
    lastPage: "Dernière page",
    of: "sur",
  },
} as const

export function HrPayrollTableControls<T>({
  table,
  locale,
  searchPlaceholder,
  tableLabel,
}: {
  table: HrPayrollTableState<T>
  locale: Locale
  searchPlaceholder?: string
  tableLabel: string
}) {
  const copy = COPY[locale]
  const hasActiveFilters = Boolean(table.query || table.fromDate || table.toDate || table.sortKey)

  return (
    <div
      className="dashboard-table-toolbar flex flex-col gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3 lg:flex-row lg:items-center lg:justify-between xl:flex-nowrap"
      aria-label={`${tableLabel} controls`}
    >
      <label className="relative w-full min-w-0 flex-1 lg:min-w-[18rem] xl:min-w-0">
        <span className="sr-only">{copy.search} {tableLabel}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" aria-hidden="true" />
        <input
          type="search"
          value={table.query}
          onChange={(event) => table.setQuery(event.target.value)}
          placeholder={searchPlaceholder ?? `${copy.search} ${tableLabel.toLocaleLowerCase()}`}
          className="dashboard-control h-9 w-full rounded-lg pl-9 pr-9 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
        />
        {table.query ? (
          <button
            type="button"
            onClick={() => table.setQuery("")}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--dash-text-faint)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
            aria-label={`${copy.clear}: ${copy.search.toLocaleLowerCase()}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>
      <div
        className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:justify-end xl:flex-none xl:flex-nowrap"
        data-slot="hr-payroll-table-filter-controls"
      >
        <TableDateRangePicker
          value={{
            from: table.fromDate || undefined,
            to: table.toDate || undefined,
          }}
          onChange={(range) => table.setDateRange(range.from ?? "", range.to ?? "")}
          locale={locale}
          placeholder={copy.dateRange}
          ariaLabel={copy.dateRange}
          className="min-w-[210px] flex-1 sm:flex-none xl:w-[230px] xl:min-w-0 xl:flex-none"
        />
        <label className="min-w-[165px] flex-1 sm:flex-none xl:w-[180px] xl:min-w-0 xl:flex-none">
          <span className="sr-only">{copy.sort} {tableLabel}</span>
          <select
            value={table.sortKey}
            onChange={(event) => table.setSortKey(event.target.value)}
            className="dashboard-control h-9 w-full rounded-lg px-3 text-sm text-[var(--dash-text)] sm:w-[180px]"
          >
            <option value="">{copy.original}</option>
            {table.sortOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => table.setSortDirection(table.sortDirection === "asc" ? "desc" : "asc")}
          disabled={!table.sortKey}
          className="dashboard-button-secondary h-9 w-9 shrink-0 rounded-lg"
          aria-label={table.sortDirection === "asc" ? copy.ascending : copy.descending}
          title={table.sortDirection === "asc" ? copy.ascending : copy.descending}
        >
          {table.sortDirection === "asc" ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={table.clear}
          disabled={!hasActiveFilters}
          className="dashboard-button-secondary h-9 shrink-0 whitespace-nowrap rounded-lg"
        >
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          {copy.clear}
        </Button>
      </div>
    </div>
  )
}

export function HrPayrollTablePagination<T>({
  table,
  locale,
}: {
  table: HrPayrollTableState<T>
  locale: Locale
}) {
  const copy = COPY[locale]
  const first = table.filteredCount === 0 ? 0 : table.pageIndex * table.pageSize + 1
  const last = Math.min((table.pageIndex + 1) * table.pageSize, table.filteredCount)

  return (
    <div className="dashboard-table-pagination flex min-w-0 flex-col gap-3 px-2 py-3 text-sm text-[var(--dash-text-soft)] sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">{first}–{last} {copy.of} {table.filteredCount}</p>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
        <label className="inline-flex items-center gap-2">
          <span>{copy.rows}</span>
          <select
            aria-label={copy.rows}
            value={table.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="dashboard-control h-8 w-[70px] rounded-lg border-[var(--dash-border-subtle)] px-2 text-[var(--dash-text)]"
          >
            {[10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>{copy.page} {table.pageIndex + 1} {copy.of} {table.pageCount}</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={table.firstPage} disabled={!table.canPreviousPage} className="dashboard-button-secondary hidden h-8 w-8 rounded-lg lg:inline-flex" aria-label={copy.firstPage} title={copy.firstPage}>
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={table.previousPage} disabled={!table.canPreviousPage} className="dashboard-button-secondary h-8 w-8 rounded-lg" aria-label={copy.previous} title={copy.previous}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={table.nextPage} disabled={!table.canNextPage} className="dashboard-button-secondary h-8 w-8 rounded-lg" aria-label={copy.next} title={copy.next}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={table.lastPage} disabled={!table.canNextPage} className="dashboard-button-secondary hidden h-8 w-8 rounded-lg lg:inline-flex" aria-label={copy.lastPage} title={copy.lastPage}>
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
