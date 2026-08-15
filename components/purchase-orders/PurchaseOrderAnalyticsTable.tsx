"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc"
type SortValue = string | number | null | undefined

export type AnalyticsTableColumn<Row> = {
  id: string
  header: string
  accessor: (row: Row) => SortValue
  cell: (row: Row) => ReactNode
  align?: "left" | "right"
  className?: string
  sortable?: boolean
}

export type AnalyticsTableFacet<Row> = {
  id: string
  label: string
  allLabel: string
  value: (row: Row) => string
  options: Array<{ value: string; label: string }>
}

type AnalyticsTableLabels = {
  clearSearch: string
  clearFilters: string
  exportCsv: string
  rowsPerPage: string
  previousPage: string
  nextPage: string
  firstPage: string
  lastPage: string
  page: (current: number, total: number) => string
  results: (from: number, to: number, total: number) => string
  sortBy: (column: string) => string
}

type PurchaseOrderAnalyticsTableProps<Row> = {
  rows: Row[]
  columns: Array<AnalyticsTableColumn<Row>>
  rowKey: (row: Row) => string
  searchText: (row: Row) => string
  searchPlaceholder: string
  emptyMessage: string
  rangeLabel: string
  labels: AnalyticsTableLabels
  exportFilename: string
  facets?: Array<AnalyticsTableFacet<Row>>
  defaultSort?: { id: string; direction: SortDirection }
  pageSizeOptions?: number[]
}

function compareValues(left: SortValue, right: SortValue) {
  if (left === right) return 0
  if (left === null || left === undefined) return 1
  if (right === null || right === undefined) return -1
  if (typeof left === "number" && typeof right === "number") return left - right

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function csvValue(value: SortValue) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function PurchaseOrderAnalyticsTable<Row>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder,
  emptyMessage,
  rangeLabel,
  labels,
  exportFilename,
  facets = [],
  defaultSort,
  pageSizeOptions = [10, 25, 50],
}: PurchaseOrderAnalyticsTableProps<Row>) {
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10)
  const [pageIndex, setPageIndex] = useState(0)
  const [sort, setSort] = useState(defaultSort)
  const [facetValues, setFacetValues] = useState<Record<string, string>>({})

  const processedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = rows.filter(row => {
      const matchesSearch = normalizedQuery
        ? searchText(row).toLocaleLowerCase().includes(normalizedQuery)
        : true
      const matchesFacets = facets.every(facet => {
        const selectedValue = facetValues[facet.id]
        return !selectedValue || selectedValue === "all" || facet.value(row) === selectedValue
      })

      return matchesSearch && matchesFacets
    })

    if (!sort) return filtered
    const column = columns.find(candidate => candidate.id === sort.id)
    if (!column) return filtered

    return [...filtered].sort((left, right) => {
      const comparison = compareValues(column.accessor(left), column.accessor(right))
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [columns, facetValues, facets, query, rows, searchText, sort])

  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageStart = safePageIndex * pageSize
  const pageRows = processedRows.slice(pageStart, pageStart + pageSize)

  useEffect(() => {
    setPageIndex(0)
  }, [facetValues, pageSize, query, sort])

  function toggleSort(column: AnalyticsTableColumn<Row>) {
    if (column.sortable === false) return
    setSort(current => {
      if (!current || current.id !== column.id) return { id: column.id, direction: "asc" }
      if (current.direction === "asc") return { id: column.id, direction: "desc" }
      return undefined
    })
  }

  function clearFilters() {
    setQuery("")
    setFacetValues({})
    setSort(defaultSort)
  }

  function exportRows() {
    const csv = [
      columns.map(column => csvValue(column.header)).join(","),
      ...processedRows.map(row =>
        columns.map(column => csvValue(column.accessor(row))).join(","),
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = exportFilename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = Boolean(query) || Object.values(facetValues).some(value => value && value !== "all")
  const resultFrom = processedRows.length ? pageStart + 1 : 0
  const resultTo = Math.min(pageStart + pageSize, processedRows.length)

  return (
    <div className="space-y-3" data-testid="analytics-table-workbench">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/72 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 xl:max-w-xl">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              className="dashboard-control h-10 w-full rounded-lg border-[var(--dash-border-subtle)] pl-9 pr-9 text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
            />
            {query ? (
              <button
                type="button"
                aria-label={labels.clearSearch}
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--dash-text-faint)] transition hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {facets.map(facet => (
            <Select
              key={facet.id}
              value={facetValues[facet.id] ?? "all"}
              onValueChange={value => setFacetValues(current => ({ ...current, [facet.id]: value }))}
            >
              <SelectTrigger
                aria-label={facet.label}
                className="dashboard-control h-10 w-full rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] sm:w-48"
              >
                <SelectValue placeholder={facet.allLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{facet.allLabel}</SelectItem>
                {facet.options.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] px-3 py-2 text-xs font-medium text-[var(--dash-text-soft)]">
            {rangeLabel}
          </span>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-10 rounded-lg text-[var(--dash-text-soft)]">
              {labels.clearFilters}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={exportRows} disabled={!processedRows.length} className="dashboard-button-secondary h-10 rounded-lg">
            <Download aria-hidden="true" className="mr-2 h-4 w-4" />
            {labels.exportCsv}
          </Button>
        </div>
      </div>

      <div className="dashboard-table-shell overflow-hidden rounded-xl border border-[var(--dash-border-subtle)]">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead className="bg-[var(--dash-surface-raised)] text-xs uppercase tracking-[0.08em] text-[var(--dash-text-faint)]">
              <tr>
                {columns.map(column => {
                  const direction = sort?.id === column.id ? sort.direction : undefined
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={direction ? (direction === "asc" ? "ascending" : "descending") : "none"}
                      className={cn("whitespace-nowrap px-4 py-3 font-semibold", column.align === "right" && "text-right", column.className)}
                    >
                      {column.sortable === false ? column.header : (
                        <button
                          type="button"
                          aria-label={labels.sortBy(column.header)}
                          onClick={() => toggleSort(column)}
                          className={cn("inline-flex items-center gap-1.5 rounded-md py-1 transition hover:text-[var(--dash-text)]", column.align === "right" && "ml-auto")}
                        >
                          {column.header}
                          {direction === "asc" ? <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /> : direction === "desc" ? <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-65" />}
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dash-border-subtle)]">
              {pageRows.length ? pageRows.map(row => (
                <tr key={rowKey(row)} className="text-[var(--dash-text-soft)] transition-colors hover:bg-[rgba(47,125,246,0.075)]">
                  {columns.map(column => (
                    <td key={column.id} className={cn("px-4 py-3.5 align-middle", column.align === "right" && "text-right tabular-nums", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length} className="h-32 px-4 text-center text-sm text-[var(--dash-text-soft)]">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-1 text-sm text-[var(--dash-text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">{labels.results(resultFrom, resultTo, processedRows.length)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">{labels.rowsPerPage}</span>
          <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
            <SelectTrigger aria-label={labels.rowsPerPage} className="dashboard-control h-9 w-20 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="min-w-24 text-center text-xs font-medium">{labels.page(safePageIndex + 1, pageCount)}</span>
          <Button type="button" variant="outline" size="icon" aria-label={labels.firstPage} onClick={() => setPageIndex(0)} disabled={safePageIndex === 0} className="dashboard-button-secondary hidden h-9 w-9 rounded-lg sm:inline-flex">
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={labels.previousPage} onClick={() => setPageIndex(index => Math.max(0, index - 1))} disabled={safePageIndex === 0} className="dashboard-button-secondary h-9 w-9 rounded-lg">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={labels.nextPage} onClick={() => setPageIndex(index => Math.min(pageCount - 1, index + 1))} disabled={safePageIndex >= pageCount - 1} className="dashboard-button-secondary h-9 w-9 rounded-lg">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={labels.lastPage} onClick={() => setPageIndex(pageCount - 1)} disabled={safePageIndex >= pageCount - 1} className="dashboard-button-secondary hidden h-9 w-9 rounded-lg sm:inline-flex">
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
