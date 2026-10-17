"use client"

import { useRef, useState, type ReactNode } from "react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { AlertTriangle, CalendarClock, ChevronRight, Download, Eye, MoreHorizontal, RefreshCcw, RotateCcw, SlidersHorizontal } from "lucide-react"

import { ActionQueue, CommandBriefHeader, DetailDrawer, FilterBar, KpiTile, RouteStatePanel, dashboardPanelClass, dashboardRowClass, type ActionQueueItemData, type CommandCenterAction, type CommandMetadataItem, type DashboardTone } from "@/components/dashboard/primitives/command-center-primitives"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"

export type TransactionHistoryKpi = { id: string; label: string; value: ReactNode; detail?: ReactNode; tone?: DashboardTone }
export type TransactionHistoryFilterOption = { value: string; label: string }
export type TransactionHistoryFilters = { search?: string; type?: string; dateFrom?: string; dateTo?: string; pageSize: 25 | 50 | 100 }
export type TransactionHistoryColumn<Row> = { id: string; header: string; cell: (row: Row) => ReactNode }
export type TransactionHistoryRowIdentity<Row> = { id: (row: Row) => string; title: (row: Row) => string; subtitle?: (row: Row) => ReactNode; status?: (row: Row) => ReactNode; value?: (row: Row) => ReactNode }

export type TransactionHistoryShellLabels = {
  eyebrow: string; title: string; summary: string; scopeLabel: string; filtersTitle: string; filtersDetail: string
  searchPlaceholder: string; searchLabel: string; typeLabel: string; allTypesLabel: string; dateFromLabel: string; dateToLabel: string; pageSizeLabel: string
  resetFilters: string; retry: string; export: string; exporting: string; tableCaption: string; details: string; nextPage: string; noNextPage: string
  loadingTitle: string; loadingMessage: string; emptyTitle: string; emptyMessage: string; emptyFilteredTitle: string; emptyFilteredMessage: string
  errorTitle: string; partialTitle: string; partialMessage: string; permissionTitle: string; permissionMessage: string; noOrgTitle: string; noOrgMessage: string
  proofUnavailableTitle: string; proofUnavailableMessage: string; mobileCardAction: string; resultCount: (count: number) => string
  filter?: string; clearFilters?: string; liveData?: string; refresh?: string; refreshing?: string; viewColumns?: string
  selectAllRows?: string; selectRow?: (title: string) => string; selectedRows?: (selected: number, total: number) => string
  page?: (page: number) => string; firstPage?: string; previousPage?: string
}

export type TransactionHistoryWorkbenchShellProps<Row> = {
  labels: TransactionHistoryShellLabels; filters: TransactionHistoryFilters; typeOptions: TransactionHistoryFilterOption[]; kpis: TransactionHistoryKpi[]; actionItems: ActionQueueItemData[]
  columns: TransactionHistoryColumn<Row>[]; rows: Row[]; rowIdentity: TransactionHistoryRowIdentity<Row>; selectedRow: Row | null; selectedRowId: string | null
  drawerTitle: (row: Row) => string; drawerDescription?: (row: Row) => string; drawerMetadata: (row: Row) => CommandMetadataItem[]; renderDrawer: (row: Row) => ReactNode
  onFilterChange: (patch: Partial<TransactionHistoryFilters>) => void; onResetFilters: () => void; onSelectRow: (id: string | null) => void; onNextPage: () => void; onPreviousPage?: () => void; onFirstPage?: () => void; onRetry: () => void; onExport?: () => void
  isLoading?: boolean; isFetching?: boolean; isError?: boolean; errorMessage?: string; hasMore?: boolean; canPreviousPage?: boolean; pageIndex?: number; isPartial?: boolean; partialSources?: string[]; noOrganization?: boolean; permissionDenied?: boolean; isExporting?: boolean; exportStatus?: string | null; snapshotMetadata: CommandMetadataItem[]; headerActions?: CommandCenterAction[]; hideEmptyActionQueue?: boolean; locale?: Locale
  tableVariant?: "default" | "system"; rowActionVariant?: "button" | "icon"; enableRowSelection?: boolean; enableColumnVisibility?: boolean
  renderTable?: (onSelectRow: (id: string | null) => void) => ReactNode
  showProofSummary?: boolean
  wrapProofSummary?: boolean
  exportInHeader?: boolean
}

export function TransactionHistoryWorkbenchShell<Row>(props: TransactionHistoryWorkbenchShellProps<Row>) {
  const { labels, filters, typeOptions, kpis, actionItems, columns, rows, rowIdentity, selectedRow, selectedRowId, drawerTitle, drawerDescription, drawerMetadata, renderDrawer, onFilterChange, onResetFilters, onSelectRow, onNextPage, onPreviousPage, onFirstPage, onRetry, onExport, isLoading = false, isFetching = false, isError = false, errorMessage, hasMore = false, canPreviousPage = false, pageIndex = 0, isPartial = false, partialSources = [], noOrganization = false, permissionDenied = false, isExporting = false, exportStatus, snapshotMetadata, headerActions = [], hideEmptyActionQueue = false, locale = "en", tableVariant = "default", rowActionVariant = "button", enableRowSelection = false, enableColumnVisibility = false } = props
  const hasActiveFilters = Boolean(filters.search || filters.type || filters.dateFrom || filters.dateTo)
  const emptyFiltered = !isLoading && rows.length === 0 && hasActiveFilters
  const drawerOpener = useRef<HTMLElement | null>(null)
  const selectHistoryRow = (id: string | null) => {
    if (id && !selectedRow && document.activeElement instanceof HTMLElement) drawerOpener.current = document.activeElement
    onSelectRow(id)
  }

  return (
    <div className={cn("mx-auto flex w-full flex-col px-3 py-4 sm:px-4 lg:px-6", tableVariant === "system" ? "max-w-[88rem] gap-6 sm:py-6" : "max-w-7xl gap-4")}>
      <CommandBriefHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        summary={labels.summary}
        state={{ label: isPartial ? labels.partialTitle : labels.scopeLabel, tone: isPartial ? "gold" : "success", icon: isPartial ? AlertTriangle : CalendarClock }}
        metadata={snapshotMetadata}
        actions={[...headerActions, ...(!onExport || props.exportInHeader === false ? [] : [{ label: isExporting ? labels.exporting : labels.export, icon: Download, onClick: onExport, disabled: isExporting || isLoading || isError || noOrganization || permissionDenied, variant: "primary" as const }])]}
        proof={props.showProofSummary === false ? undefined : { state: "unavailable", label: labels.proofUnavailableTitle, source: labels.proofUnavailableMessage, ariaLabel: labels.proofUnavailableMessage, wrap: props.wrapProofSummary }}
      />

      {exportStatus ? <div className={cn(dashboardRowClass, "p-3 text-sm text-[var(--dash-text-soft)]")} role="status">{exportStatus}</div> : null}

      {noOrganization ? <RouteStatePanel kind="no_active_org" title={labels.noOrgTitle} message={labels.noOrgMessage} /> : permissionDenied ? <RouteStatePanel kind="permission_denied" title={labels.permissionTitle} message={labels.permissionMessage} /> : isError ? <RouteStatePanel kind="error" title={labels.errorTitle} message={errorMessage} action={{ label: labels.retry, icon: RefreshCcw, onClick: onRetry }} /> : <>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label={labels.resultCount(rows.length)}>{kpis.map((kpi) => <KpiTile key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone ?? "brand"} />)}</section>
        {actionItems.length || !hideEmptyActionQueue ? <ActionQueue items={actionItems} title={labels.partialTitle} detail={isPartial ? labels.partialMessage : labels.scopeLabel} emptyTitle={labels.scopeLabel} emptyMessage={labels.proofUnavailableMessage} /> : null}
        {props.renderTable ? props.renderTable(selectHistoryRow) : tableVariant === "system" ? <SystemHistoryTable labels={labels} filters={filters} typeOptions={typeOptions} columns={columns} rows={rows} rowIdentity={rowIdentity} selectedRowId={selectedRowId} onFilterChange={onFilterChange} onResetFilters={onResetFilters} onSelectRow={selectHistoryRow} onNextPage={onNextPage} onPreviousPage={onPreviousPage} onFirstPage={onFirstPage} onRetry={onRetry} onExport={onExport} isLoading={isLoading} isFetching={isFetching} emptyFiltered={emptyFiltered} hasMore={hasMore} canPreviousPage={canPreviousPage} pageIndex={pageIndex} isPartial={isPartial} partialSources={partialSources} isExporting={isExporting} locale={locale} rowActionVariant={rowActionVariant} enableRowSelection={enableRowSelection} enableColumnVisibility={enableColumnVisibility} /> : <>
        <FilterBar title={labels.filtersTitle} detail={labels.filtersDetail} search={{ value: filters.search ?? "", label: labels.searchLabel, placeholder: labels.searchPlaceholder, onChange: (search) => onFilterChange({ search }) }} actions={[{ label: labels.resetFilters, icon: RotateCcw, onClick: onResetFilters, disabled: !hasActiveFilters }]}>
          <label className="flex min-w-[min(100%,10rem)] flex-col gap-1 text-xs font-medium text-[var(--dash-text-soft)]">{labels.typeLabel}<Select value={filters.type ?? "all"} onValueChange={(value) => onFilterChange({ type: value === "all" ? undefined : value })}><SelectTrigger className="dashboard-control h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{labels.allTypesLabel}</SelectItem>{typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
          <TableDateRangePicker
            value={{ from: filters.dateFrom, to: filters.dateTo }}
            onChange={(range) => onFilterChange({ dateFrom: range.from, dateTo: range.to })}
            locale={locale}
            placeholder={labels.dateFromLabel + " - " + labels.dateToLabel}
            ariaLabel={labels.dateFromLabel + " - " + labels.dateToLabel}
            triggerClassName="h-10"
          />
          <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-medium text-[var(--dash-text-soft)]">{labels.pageSizeLabel}<Select value={String(filters.pageSize)} onValueChange={(value) => onFilterChange({ pageSize: Number(value) as 25 | 50 | 100 })}><SelectTrigger className="dashboard-control h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select></label>
        </FilterBar>
        {isPartial ? <section className={cn(dashboardRowClass, "p-3")} role="status"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-gold)] text-[var(--dash-gold)]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{labels.partialTitle}</Badge>{partialSources.map((source) => <Badge key={source} variant="outline" className="rounded-md border-[var(--dash-border-subtle)]">{source}</Badge>)}</div><p className="mt-2 text-sm text-[var(--dash-text-soft)]">{labels.partialMessage}</p></section> : null}
        {isLoading ? <RouteStatePanel kind="loading" title={labels.loadingTitle} message={labels.loadingMessage} /> : emptyFiltered ? <RouteStatePanel kind="empty" title={labels.emptyFilteredTitle} message={labels.emptyFilteredMessage} action={{ label: labels.resetFilters, icon: RotateCcw, onClick: onResetFilters }} /> : rows.length === 0 ? <RouteStatePanel kind="empty" title={labels.emptyTitle} message={labels.emptyMessage} /> : <HistoryRows labels={labels} rows={rows} columns={columns} rowIdentity={rowIdentity} selectedRowId={selectedRowId} onSelectRow={selectHistoryRow} tableVariant={tableVariant} rowActionVariant={rowActionVariant} />}
        <div className={cn(dashboardPanelClass, "dashboard-table-pagination flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between")}><p className="text-sm text-[var(--dash-text-soft)]">{labels.resultCount(rows.length)}</p><Button type="button" className="dashboard-button-secondary min-h-11 rounded-lg" onClick={onNextPage} disabled={!hasMore || isLoading}><ChevronRight className="h-4 w-4" aria-hidden="true" />{hasMore ? labels.nextPage : labels.noNextPage}</Button></div>
        </>}
      </>}

      <DetailDrawer closeLabel={locale === "fr" ? "Fermer" : "Close"} onCloseAutoFocus={(event) => { const opener = drawerOpener.current; if (opener?.isConnected && !opener.matches(":disabled")) { event.preventDefault(); opener.focus() } }} title={selectedRow ? drawerTitle(selectedRow) : labels.details} description={selectedRow && drawerDescription ? drawerDescription(selectedRow) : labels.proofUnavailableMessage} open={Boolean(selectedRow)} onOpenChange={(open) => { if (!open) onSelectRow(null) }} metadata={selectedRow ? drawerMetadata(selectedRow) : []}>{selectedRow ? renderDrawer(selectedRow) : null}</DetailDrawer>
    </div>
  )
}

type SystemHistoryTableProps<Row> = {
  labels: TransactionHistoryShellLabels
  filters: TransactionHistoryFilters
  typeOptions: TransactionHistoryFilterOption[]
  columns: TransactionHistoryColumn<Row>[]
  rows: Row[]
  rowIdentity: TransactionHistoryRowIdentity<Row>
  selectedRowId: string | null
  onFilterChange: (patch: Partial<TransactionHistoryFilters>) => void
  onResetFilters: () => void
  onSelectRow: (id: string | null) => void
  onNextPage: () => void
  onPreviousPage?: () => void
  onFirstPage?: () => void
  onRetry: () => void
  onExport?: () => void
  isLoading: boolean
  isFetching: boolean
  emptyFiltered: boolean
  hasMore: boolean
  canPreviousPage: boolean
  pageIndex: number
  isPartial: boolean
  partialSources: string[]
  isExporting: boolean
  locale: Locale
  rowActionVariant: "button" | "icon"
  enableRowSelection: boolean
  enableColumnVisibility: boolean
}

function SystemHistoryTable<Row>({ labels, filters, typeOptions, columns, rows, rowIdentity, selectedRowId, onFilterChange, onResetFilters, onSelectRow, onNextPage, onPreviousPage, onFirstPage, onRetry, onExport, isLoading, isFetching, emptyFiltered, hasMore, canPreviousPage, pageIndex, isPartial, partialSources, isExporting, locale, rowActionVariant, enableRowSelection, enableColumnVisibility }: SystemHistoryTableProps<Row>) {
  const paginationTable = useReactTable({
    data: rows, columns: [], getCoreRowModel: getCoreRowModel(), manualPagination: true,
    state: { pagination: { pageIndex, pageSize: filters.pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize: filters.pageSize }
      const next = typeof updater === "function" ? updater(current) : updater
      if (next.pageSize !== filters.pageSize) onFilterChange({ pageSize: next.pageSize as 25 | 50 | 100 })
    },
  })
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(() => new Set())
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set())
  const visibleColumns = columns.filter((column) => !hiddenColumnIds.has(column.id))
  const hasActiveFilters = Boolean(filters.search || filters.type || filters.dateFrom || filters.dateTo)
  const allRowsSelected = rows.length > 0 && rows.every((row) => selectedRowIds.has(rowIdentity.id(row)))
  const selectedCount = rows.reduce((count, row) => count + (selectedRowIds.has(rowIdentity.id(row)) ? 1 : 0), 0)
  const filterLabel = labels.filter ?? labels.filtersTitle
  const clearFiltersLabel = labels.clearFilters ?? labels.resetFilters
  const refreshLabel = isFetching ? labels.refreshing ?? labels.retry : labels.refresh ?? labels.retry

  const toggleColumn = (columnId: string) => {
    setHiddenColumnIds((current) => {
      const next = new Set(current)
      if (next.has(columnId)) next.delete(columnId)
      else next.add(columnId)
      return next
    })
  }

  const toggleRow = (rowId: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const toggleAllRows = () => {
    setSelectedRowIds(allRowsSelected ? new Set() : new Set(rows.map((row) => rowIdentity.id(row))))
  }

  return (
    <section className={cn(dashboardPanelClass, "min-w-0 overflow-hidden rounded-lg")} aria-label={labels.tableCaption}>
      <div className="flex flex-col gap-3 border-b border-[var(--dash-border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"><CalendarClock className="h-5 w-5" aria-hidden="true" /></div>
          <div className="min-w-0"><h2 className="truncate text-base font-semibold text-[var(--dash-text)]">{labels.tableCaption}</h2><p className="mt-1 text-xs text-[var(--dash-text-soft)]">{labels.resultCount(rows.length)}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)]">{labels.liveData ?? labels.scopeLabel}</Badge>
          <Button type="button" variant="outline" size="sm" className="dashboard-button-secondary h-9 rounded-lg" onClick={onRetry} disabled={isLoading || isFetching} aria-label={refreshLabel}><RefreshCcw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />{refreshLabel}</Button>
          {onExport && <Button type="button" size="sm" className="dashboard-button-primary h-9 rounded-lg" onClick={onExport} disabled={isLoading || isExporting}><Download className="mr-2 h-4 w-4" aria-hidden="true" />{isExporting ? labels.exporting : labels.export}</Button>}
        </div>
      </div>

      <div className="dashboard-table-toolbar flex flex-col gap-3 border-b border-[var(--dash-border-subtle)] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between" aria-label={filterLabel}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-[320px]"><DataTableSearch type="text" value={filters.search ?? ""} onChange={(value) => onFilterChange({ search: value || undefined })} placeholder={labels.searchPlaceholder} ariaLabel={labels.searchLabel} clearButtonLabel={clearFiltersLabel} /></div>
          {typeOptions.length > 0 ? <Select value={filters.type ?? "all"} onValueChange={(value) => onFilterChange({ type: value === "all" ? undefined : value })}>
            <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[180px]" aria-label={labels.typeLabel}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{labels.allTypesLabel}</SelectItem>{typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select> : null}
          <TableDateRangePicker value={{ from: filters.dateFrom, to: filters.dateTo }} onChange={(range) => onFilterChange({ dateFrom: range.from, dateTo: range.to })} locale={locale} placeholder={labels.dateFromLabel + " - " + labels.dateToLabel} ariaLabel={labels.dateFromLabel + " - " + labels.dateToLabel} triggerClassName="h-9 w-full sm:w-[230px]" />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="dashboard-button-secondary h-9 rounded-lg" onClick={onResetFilters} disabled={!hasActiveFilters}><RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />{clearFiltersLabel}</Button>
          {enableColumnVisibility ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" className="dashboard-button-secondary h-9 rounded-lg"><SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />{labels.viewColumns ?? labels.tableCaption}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[190px] border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">{columns.map((column) => <DropdownMenuCheckboxItem key={column.id} checked={!hiddenColumnIds.has(column.id)} onCheckedChange={() => toggleColumn(column.id)}>{column.header}</DropdownMenuCheckboxItem>)}</DropdownMenuContent>
          </DropdownMenu> : null}
        </div>
      </div>

      {isPartial ? <section className="border-b border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-3" role="status"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-gold)] text-[var(--dash-gold)]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{labels.partialTitle}</Badge>{partialSources.map((source) => <Badge key={source} variant="outline" className="rounded-md border-[var(--dash-border-subtle)]">{source}</Badge>)}</div><p className="mt-2 text-sm text-[var(--dash-text-soft)]">{labels.partialMessage}</p></section> : null}

      {isLoading ? <div className="p-3"><RouteStatePanel kind="loading" title={labels.loadingTitle} message={labels.loadingMessage} /></div> : emptyFiltered ? <div className="p-3"><RouteStatePanel kind="empty" title={labels.emptyFilteredTitle} message={labels.emptyFilteredMessage} action={{ label: clearFiltersLabel, icon: RotateCcw, onClick: onResetFilters }} /></div> : rows.length === 0 ? <div className="p-3"><RouteStatePanel kind="empty" title={labels.emptyTitle} message={labels.emptyMessage} /></div> : <>
        <div className="hidden overflow-x-auto md:block">
          <table className="dashboard-table-base min-w-[1040px] w-full text-left text-sm" aria-label={labels.tableCaption}>
            <thead className="border-b border-[var(--dash-border-subtle)] text-xs uppercase text-[var(--dash-text-soft)]"><tr>
              {enableRowSelection ? <th scope="col" className="w-11 px-3 py-3"><Checkbox checked={allRowsSelected ? true : selectedCount > 0 ? "indeterminate" : false} onCheckedChange={toggleAllRows} aria-label={labels.selectAllRows ?? labels.tableCaption} /></th> : null}
              {visibleColumns.map((column) => <th key={column.id} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">{column.header}</th>)}
              <th scope="col" className="sticky right-0 z-10 w-14 bg-[var(--dash-surface)] px-3 py-3 text-right font-semibold"><span className={rowActionVariant === "icon" ? "sr-only" : undefined}>{labels.details}</span></th>
            </tr></thead>
            <tbody>{rows.map((row) => {
              const id = rowIdentity.id(row)
              const title = rowIdentity.title(row)
              return <tr key={id} className={cn("group border-b border-[var(--dash-border-subtle)] align-middle transition-colors hover:bg-[rgba(47,125,246,0.085)]", selectedRowId === id && "bg-[var(--dash-brand-soft)]")}>
                {enableRowSelection ? <td className="w-11 px-3 py-3"><Checkbox checked={selectedRowIds.has(id)} onCheckedChange={() => toggleRow(id)} aria-label={labels.selectRow ? labels.selectRow(title) : `Select ${title}`} /></td> : null}
                {visibleColumns.map((column) => <td key={column.id} className="px-3 py-3">{column.cell(row)}</td>)}
                <td className="sticky right-0 z-10 w-14 bg-[var(--dash-surface)] px-3 py-2 text-right group-hover:bg-[rgba(47,125,246,0.085)]">{rowActionVariant === "icon" ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]" onClick={() => onSelectRow(id)} aria-label={`${labels.details}: ${title}`} title={labels.details}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button> : <Button type="button" size="sm" className="dashboard-button-secondary min-h-10 rounded-lg" onClick={() => onSelectRow(id)} aria-label={`${labels.details}: ${title}`}><Eye className="h-4 w-4" aria-hidden="true" />{labels.details}</Button>}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <div className="space-y-3 p-3 md:hidden">{rows.map((row) => {
          const id = rowIdentity.id(row)
          const title = rowIdentity.title(row)
          return <article key={id} data-table-mobile-row className={cn(dashboardRowClass, "p-3")}><div className="flex min-w-0 items-start gap-3">{enableRowSelection ? <Checkbox checked={selectedRowIds.has(id)} onCheckedChange={() => toggleRow(id)} aria-label={labels.selectRow ? labels.selectRow(title) : `Select ${title}`} className="mt-0.5" /> : null}<div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-[var(--dash-text)]">{title}</h3>{rowIdentity.subtitle ? <div className="mt-1 text-sm text-[var(--dash-text-soft)]">{rowIdentity.subtitle(row)}</div> : null}</div>{rowIdentity.status ? <div className="shrink-0">{rowIdentity.status(row)}</div> : null}</div></div>{rowIdentity.value ? <div className="mt-3 text-lg font-semibold">{rowIdentity.value(row)}</div> : null}<Button type="button" className="dashboard-button-secondary mt-3 min-h-11 w-full rounded-lg" onClick={() => onSelectRow(id)} aria-label={`${labels.mobileCardAction}: ${title}`}><Eye className="h-4 w-4" aria-hidden="true" />{labels.mobileCardAction}</Button></article>
        })}</div>
      </>}

      <div className="space-y-3 border-t border-[var(--dash-border-subtle)] p-3 sm:p-4">
{enableRowSelection ? <p className="text-sm text-[var(--dash-text-soft)]">{labels.selectedRows ? labels.selectedRows(selectedCount, rows.length) : selectedCount + " / " + rows.length}</p> : null}
<DataTablePagination table={paginationTable} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={[25, 50, 100]} copy={{ rowsPerPage: labels.pageSizeLabel, ...(labels.firstPage ? { firstPage: labels.firstPage } : {}), ...(labels.previousPage ? { previousPage: labels.previousPage } : {}), nextPage: hasMore ? labels.nextPage : labels.noNextPage }} cursor={{ hasMore, canPrevious: canPreviousPage && Boolean(onPreviousPage), canFirst: canPreviousPage && Boolean(onFirstPage), pending: isLoading || isFetching, onNext: onNextPage, onPrevious: () => onPreviousPage?.(), onFirst: () => onFirstPage?.(), summary: labels.page ? labels.page(pageIndex + 1) : "Page " + (pageIndex + 1) }} />
</div>
    </section>
  )
}

function HistoryRows<Row>({ labels, rows, columns, rowIdentity, selectedRowId, onSelectRow, tableVariant, rowActionVariant }: { labels: TransactionHistoryShellLabels; rows: Row[]; columns: TransactionHistoryColumn<Row>[]; rowIdentity: TransactionHistoryRowIdentity<Row>; selectedRowId: string | null; onSelectRow: (id: string | null) => void; tableVariant: "default" | "system"; rowActionVariant: "button" | "icon" }) {
  const isSystemTable = tableVariant === "system"

  return (
    <section className={cn(isSystemTable ? "dashboard-table-shell dashboard-data-table" : dashboardPanelClass, "min-w-0 overflow-hidden rounded-lg")}>
      <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dash-border-subtle)] px-3 py-3", !isSystemTable && "mx-3 px-0")}>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--dash-text)]">{labels.tableCaption}</h2>
          <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{labels.resultCount(rows.length)}</p>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-md border-[var(--dash-border-subtle)]">{labels.scopeLabel}</Badge>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className={cn("w-full text-left text-sm", isSystemTable ? "dashboard-table-base min-w-[1040px]" : "min-w-[760px]")} aria-label={labels.tableCaption}>
          <thead className="border-b border-[var(--dash-border-subtle)] text-xs uppercase text-[var(--dash-text-soft)]">
            <tr>
              {columns.map((column) => <th key={column.id} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">{column.header}</th>)}
              <th scope="col" className="sticky right-0 z-10 w-14 bg-[var(--dash-surface)] px-3 py-3 text-right font-semibold"><span className={rowActionVariant === "icon" ? "sr-only" : undefined}>{labels.details}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = rowIdentity.id(row)
              const actionLabel = `${labels.details}: ${rowIdentity.title(row)}`

              return (
                <tr key={id} className={cn("group border-b border-[var(--dash-border-subtle)] align-middle transition-colors hover:bg-[rgba(47,125,246,0.085)]", selectedRowId === id && "bg-[var(--dash-brand-soft)]")}>
                  {columns.map((column) => <td key={column.id} className="px-3 py-3">{column.cell(row)}</td>)}
                  <td className="sticky right-0 z-10 w-14 bg-[var(--dash-surface)] px-3 py-2 text-right group-hover:bg-[rgba(47,125,246,0.085)]">
                    {rowActionVariant === "icon" ? (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]" onClick={() => onSelectRow(id)} aria-label={actionLabel} title={labels.details}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button type="button" size="sm" className="dashboard-button-secondary min-h-10 rounded-lg" onClick={() => onSelectRow(id)} aria-label={actionLabel}><Eye className="h-4 w-4" aria-hidden="true" />{labels.details}</Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => {
          const id = rowIdentity.id(row)
          return <article key={id} data-table-mobile-row className={cn(dashboardRowClass, "p-3")}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-[var(--dash-text)]">{rowIdentity.title(row)}</h3>{rowIdentity.subtitle ? <div className="mt-1 text-sm text-[var(--dash-text-soft)]">{rowIdentity.subtitle(row)}</div> : null}</div>{rowIdentity.status ? <div className="shrink-0">{rowIdentity.status(row)}</div> : null}</div>{rowIdentity.value ? <div className="mt-3 text-lg font-semibold">{rowIdentity.value(row)}</div> : null}<Button type="button" className="dashboard-button-secondary mt-3 min-h-11 w-full rounded-lg" onClick={() => onSelectRow(id)} aria-label={`${labels.mobileCardAction}: ${rowIdentity.title(row)}`}><Eye className="h-4 w-4" aria-hidden="true" />{labels.mobileCardAction}</Button></article>
        })}
      </div>
    </section>
  )
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className={cn(dashboardRowClass, "p-3")}><h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3><div className="mt-3 space-y-2 text-sm text-[var(--dash-text-soft)]">{children}</div></section> }
export function DetailLine({ label, value }: { label: string; value: ReactNode }) { return <div className="grid gap-1 sm:grid-cols-[11rem,1fr]"><dt className="font-medium text-[var(--dash-text)]">{label}</dt><dd className="break-words">{value || "-"}</dd></div> }
