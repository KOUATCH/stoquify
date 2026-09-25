"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { Download, Eye, RefreshCcw, RotateCcw, Search, X } from "lucide-react"
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { CanonicalTableDensityControl } from "@/components/DataTableComponents/CanonicalTableDensityControl"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { DataTableViewOptions } from "@/components/DataTableComponents/DataTableViewOptions"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { useCanonicalTablePreferences } from "@/components/DataTableComponents/useCanonicalTablePreferences"
import { inventoryMovementsTableContract as contract } from "@/components/DataTableComponents/inventory-movements-table-contract"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
import { RouteStatePanel } from "@/components/dashboard/primitives/command-center-primitives"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { buildInventoryHistoryColumns, buildInventoryMovementTypeOptions, formatHistoryDate } from "./inventoryMovementHistoryAdapter"
import type { useInventoryMovementHistoryWorkbench } from "@/hooks/useInventoryMovementHistoryWorkbench"

type Workbench = ReturnType<typeof useInventoryMovementHistoryWorkbench>
type Row = Workbench["rows"][number]

export function InventoryMovementHistoryTable({ history, locale, timezone, onSelectRow }: {
  history: Workbench; locale: "en" | "fr"; timezone: string; onSelectRow: (id: string | null) => void
}) {
  const t = useTranslations("inventoryMovementHistory")
  const { filters, rows, result, isLoading, isFetching, updateFilters } = history
  const preferences = useCanonicalTablePreferences(contract)
  const definitions = useMemo(() => buildInventoryHistoryColumns(t, locale, timezone), [t, locale, timezone])
  const columns = useMemo<ColumnDef<Row>[]>(() => [
    ...definitions.map((column) => ({
      id: column.id, header: column.header, accessorFn: column.cell,
      cell: ({ row }: { row: { original: Row } }) => column.cell(row.original),
      enableHiding: contract.columns.allowed.find((entry) => entry.id === column.id)?.hideable !== false,
    })),
    { id: "actions", header: t("table.details"), enableHiding: false, cell: ({ row }) =>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => onSelectRow(row.original.id)} aria-label={t("table.detailsFor", { item: row.original.item.name })}>
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Button> },
  ], [definitions, t, onSelectRow])
  const table = useReactTable({
    data: rows, columns, getRowId: (row) => row.id, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualFiltering: true, manualSorting: true,
    enableSorting: false, enableRowSelection: false, pageCount: -1,
    state: { columnVisibility: preferences.columnVisibility, columnOrder: preferences.columnOrder, pagination: { pageIndex: 0, pageSize: filters.pageSize } },
    onColumnVisibilityChange: preferences.setColumnVisibility, onColumnOrderChange: preferences.setColumnOrder,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex: 0, pageSize: filters.pageSize }) : updater
      if (next.pageSize !== filters.pageSize) updateFilters({ pageSize: next.pageSize as 25 | 50 | 100 })
    },
  })
  const [search, setSearch] = useState(filters.search ?? "")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serializedFilters = JSON.stringify(filters)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearch(filters.search ?? "")
  }, [serializedFilters, filters.search])
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])
  const changeSearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => updateFilters({ search: value.trim() || undefined }), 300)
  }
  const pendingSearch = search.trim() !== (filters.search ?? "")
  const changeFilters = (patch: Parameters<typeof updateFilters>[0]) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    updateFilters({ ...(pendingSearch ? { search: search.trim() || undefined } : {}), ...patch })
  }
  const busy = isLoading || isFetching || pendingSearch
  const activeFilters = Boolean(filters.search || filters.type || filters.dateFrom || filters.dateTo || filters.itemId || filters.locationId || filters.effectiveAsOf)
  const query = createCanonicalTableQuery(contract, {
    search: filters.search, pageSize: filters.pageSize, cursor: filters.cursor,
    filters: Object.fromEntries(contract.query.allowedFilters.flatMap(({ id }) => {
      const value = filters[id as keyof typeof filters]
      return value ? [[id, [String(value)]]] : []
    })),
  })
  const state = isLoading ? "loading" : isFetching || pendingSearch ? "refreshing" : rows.length ? "ready" : activeFilters ? "no-results" : "empty"
  const columnLabels = Object.fromEntries(columns.map((column) => [column.id!, String(column.header)]))
  const cellClass = (id: string) => cn(
    preferences.density === "compact" ? "py-1.5" : "py-3",
    ["quantity", "value"].includes(id) && "text-right tabular-nums whitespace-nowrap",
    id === "identity" && "min-w-[180px]",
    id === "location" && "min-w-[160px] max-w-[230px] break-words",
    id === "actions" && "sticky right-0 bg-[var(--dash-surface)] text-right",
  )

  return <CanonicalTableBoundary contract={contract} query={query} locale={locale} state={state} density={preferences.density}>
    <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dash-border-subtle)] p-4">
        <div><h2 className="text-base font-semibold">{t("table.caption")}</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]" role="status">{result ? t("table.scopeCount", { shown: rows.length, total: result.summary.transactionCount }) : t("states.loadingTitle")}</p>
          <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{t("table.order")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="dashboard-button-secondary" onClick={() => history.refetch()} disabled={busy}>
            <RefreshCcw aria-hidden="true" className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />{t(isFetching ? "toolbar.refreshing" : "toolbar.refresh")}
          </Button>
          {history.canExport ? <Button type="button" size="sm" className="dashboard-button-primary" onClick={history.exportHistory} disabled={busy || history.isExporting || !result} title={t("actions.exportScope")}>
            <Download aria-hidden="true" className="mr-2 h-4 w-4" />{t(history.isExporting ? "actions.exporting" : "actions.export")}
          </Button> : null}
        </div>
      </div>
      <div className="dashboard-table-toolbar flex flex-wrap items-center gap-2 border-b border-[var(--dash-border-subtle)] p-3 sm:p-4">
        <div className="relative min-w-[180px] flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--dash-text-soft)]" />
          <Input value={search} onChange={(event) => changeSearch(event.target.value)} maxLength={200} aria-label={t("filters.searchLabel")} placeholder={t("filters.searchPlaceholder")} className="dashboard-control h-10 pl-9 pr-9" />
          {search ? <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => changeSearch("")} aria-label={t("toolbar.clearSearch")}><X className="h-4 w-4" aria-hidden="true" /></Button> : null}
        </div>
        <Select value={filters.type ?? "all"} onValueChange={(type) => changeFilters({ type: type === "all" ? undefined : type })}>
          <SelectTrigger aria-label={t("filters.type")} className="dashboard-control h-10 w-full sm:w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("filters.allTypes")}</SelectItem>{buildInventoryMovementTypeOptions(t).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <TableDateRangePicker locale={locale} value={{ from: filters.dateFrom, to: filters.dateTo }} onChange={(range) => changeFilters({ dateFrom: range.from, dateTo: range.to })} ariaLabel={t("filters.dateRange")} triggerClassName="h-10 w-full sm:w-auto" />
        <Button type="button" variant="outline" size="sm" className="dashboard-button-secondary h-10" disabled={!activeFilters && !pendingSearch} onClick={() => { if (searchTimer.current) clearTimeout(searchTimer.current); setSearch(""); history.resetFilters() }}><RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />{t("toolbar.clearFilters")}</Button>
        <DataTableViewOptions table={table} label={t("toolbar.viewColumns")} columnLabels={columnLabels} className="dashboard-button-secondary h-10" />
        <CanonicalTableDensityControl locale={locale} density={preferences.density} onDensityChange={preferences.setDensity} />
      </div>
      {filters.itemId || filters.locationId || filters.effectiveAsOf ? <p className="border-b border-[var(--dash-border-subtle)] px-4 py-2 text-sm text-[var(--dash-text-soft)]">{t("filters.scoped")}</p> : null}
      {result?.completeness.state === "partial" ? <div role="status" className="border-b border-[var(--dash-border-subtle)] bg-[var(--dash-warning-soft)] px-4 py-3 text-sm">
        <p className="font-medium">{t("states.partialTitle")}</p>
        <ul className="mt-1 list-inside list-disc">{result.completeness.sources.filter((source) => source.state === "partial").map((source) => <li key={source.source}>{t(source.source.includes("quantity") ? "states.mixedUnits" : source.source.includes("timeProvenance") ? "states.legacyTimes" : "states.partialMessage")}</li>)}</ul>
      </div> : null}
      {isLoading ? <RouteStatePanel kind="loading" title={t("states.loadingTitle")} message={t("states.loadingMessage")} /> : rows.length === 0 ? <RouteStatePanel kind="empty" title={t(activeFilters ? "states.emptyFilteredTitle" : "states.emptyTitle")} message={t(activeFilters ? "states.emptyFilteredMessage" : "states.emptyMessage")} action={activeFilters ? { label: t("toolbar.clearFilters"), onClick: history.resetFilters } : undefined} /> : <>
        <div className="hidden md:block"><Table aria-label={t("table.caption")} scrollRegionLabel={t("table.scrollRegion")} className="min-w-[1000px]">
          <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} scope="col" className={cellClass(header.column.id)}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} className={cn(history.selectedRowId === row.id && "bg-[var(--dash-brand-soft)]")}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cellClass(cell.column.id)}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody>
        </Table></div>
        <div className="space-y-3 p-3 md:hidden">{table.getRowModel().rows.map((row) => <article key={row.id} data-table-mobile-row className="rounded-lg border border-[var(--dash-border-subtle)] p-3">
          <h3 className="font-semibold">{row.original.item.name}</h3><p className="text-xs text-[var(--dash-text-soft)]">{row.original.item.sku}</p>
          <dl className="mt-3 space-y-2">{row.getVisibleCells().filter((cell) => !["identity", "actions"].includes(cell.column.id)).map((cell) => <div key={cell.id} className="flex items-start justify-between gap-3 text-sm"><dt className="text-[var(--dash-text-soft)]">{columnLabels[cell.column.id]}</dt><dd className="min-w-0 break-words text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd></div>)}</dl>
          <Button type="button" variant="outline" className="dashboard-button-secondary mt-3 min-h-11 w-full" onClick={() => onSelectRow(row.id)} aria-label={t("table.detailsFor", { item: row.original.item.name })}>{t("table.mobileCardAction")}</Button>
        </article>)}</div>
      </>}
      <div className="border-t border-[var(--dash-border-subtle)] p-3"><DataTablePagination table={table} locale={locale} variant="landing" showSelectionCount={false} pageSizeOptions={contract.query.allowedPageSizes} cursor={{ hasMore: history.hasMore, canPrevious: history.canPreviousPage, canFirst: history.canFirstPage, pending: busy, onNext: history.nextPage, onPrevious: history.previousPage, onFirst: history.firstPage, summary: t("table.resultCount", { count: rows.length }) }} /></div>
    </div>
    {result ? <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--dash-text-soft)]">
      <div><dt>{t("snapshot.timezone")}</dt><dd>{timezone}</dd></div>
      <div><dt>{t("snapshot.recordedThrough")}</dt><dd>{formatHistoryDate(result.snapshot.recordedThrough, locale, timezone)}</dd></div>
    </dl> : null}
  </CanonicalTableBoundary>
}
