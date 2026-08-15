"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CalendarClock, ChevronRight, Download, Eye, RefreshCcw, RotateCcw } from "lucide-react"

import { ActionQueue, CommandBriefHeader, DetailDrawer, FilterBar, KpiTile, RouteStatePanel, dashboardPanelClass, dashboardRowClass, type ActionQueueItemData, type CommandCenterAction, type CommandMetadataItem, type DashboardTone } from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
}

export type TransactionHistoryWorkbenchShellProps<Row> = {
  labels: TransactionHistoryShellLabels; filters: TransactionHistoryFilters; typeOptions: TransactionHistoryFilterOption[]; kpis: TransactionHistoryKpi[]; actionItems: ActionQueueItemData[]
  columns: TransactionHistoryColumn<Row>[]; rows: Row[]; rowIdentity: TransactionHistoryRowIdentity<Row>; selectedRow: Row | null; selectedRowId: string | null
  drawerTitle: (row: Row) => string; drawerDescription?: (row: Row) => string; drawerMetadata: (row: Row) => CommandMetadataItem[]; renderDrawer: (row: Row) => ReactNode
  onFilterChange: (patch: Partial<TransactionHistoryFilters>) => void; onResetFilters: () => void; onSelectRow: (id: string | null) => void; onNextPage: () => void; onRetry: () => void; onExport: () => void
  isLoading?: boolean; isError?: boolean; errorMessage?: string; hasMore?: boolean; isPartial?: boolean; partialSources?: string[]; noOrganization?: boolean; permissionDenied?: boolean; isExporting?: boolean; exportStatus?: string | null; snapshotMetadata: CommandMetadataItem[]; headerActions?: CommandCenterAction[]; hideEmptyActionQueue?: boolean
}

export function TransactionHistoryWorkbenchShell<Row>(props: TransactionHistoryWorkbenchShellProps<Row>) {
  const { labels, filters, typeOptions, kpis, actionItems, columns, rows, rowIdentity, selectedRow, selectedRowId, drawerTitle, drawerDescription, drawerMetadata, renderDrawer, onFilterChange, onResetFilters, onSelectRow, onNextPage, onRetry, onExport, isLoading = false, isError = false, errorMessage, hasMore = false, isPartial = false, partialSources = [], noOrganization = false, permissionDenied = false, isExporting = false, exportStatus, snapshotMetadata, headerActions = [], hideEmptyActionQueue = false } = props
  const hasActiveFilters = Boolean(filters.search || filters.type || filters.dateFrom || filters.dateTo)
  const emptyFiltered = !isLoading && rows.length === 0 && hasActiveFilters

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6">
      <CommandBriefHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        summary={labels.summary}
        state={{ label: isPartial ? labels.partialTitle : labels.scopeLabel, tone: isPartial ? "gold" : "success", icon: isPartial ? AlertTriangle : CalendarClock }}
        metadata={snapshotMetadata}
        actions={[...headerActions, { label: isExporting ? labels.exporting : labels.export, icon: Download, onClick: onExport, disabled: isExporting || isLoading || isError || noOrganization || permissionDenied, variant: "primary" }]}
        proof={{ state: "unavailable", label: labels.proofUnavailableTitle, source: labels.proofUnavailableMessage, ariaLabel: labels.proofUnavailableMessage }}
      />

      {exportStatus ? <div className={cn(dashboardRowClass, "p-3 text-sm text-[var(--dash-text-soft)]")} role="status">{exportStatus}</div> : null}

      {noOrganization ? <RouteStatePanel kind="no_active_org" title={labels.noOrgTitle} message={labels.noOrgMessage} /> : permissionDenied ? <RouteStatePanel kind="permission_denied" title={labels.permissionTitle} message={labels.permissionMessage} /> : isError ? <RouteStatePanel kind="error" title={labels.errorTitle} message={errorMessage} action={{ label: labels.retry, icon: RefreshCcw, onClick: onRetry }} /> : <>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label={labels.resultCount(rows.length)}>{kpis.map((kpi) => <KpiTile key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone ?? "brand"} />)}</section>
        {actionItems.length || !hideEmptyActionQueue ? <ActionQueue items={actionItems} title={labels.partialTitle} detail={isPartial ? labels.partialMessage : labels.scopeLabel} emptyTitle={labels.scopeLabel} emptyMessage={labels.proofUnavailableMessage} /> : null}
        <FilterBar title={labels.filtersTitle} detail={labels.filtersDetail} search={{ value: filters.search ?? "", label: labels.searchLabel, placeholder: labels.searchPlaceholder, onChange: (search) => onFilterChange({ search }) }} actions={[{ label: labels.resetFilters, icon: RotateCcw, onClick: onResetFilters, disabled: !hasActiveFilters }]}>
          <label className="flex min-w-[min(100%,10rem)] flex-col gap-1 text-xs font-medium text-[var(--dash-text-soft)]">{labels.typeLabel}<Select value={filters.type ?? "all"} onValueChange={(value) => onFilterChange({ type: value === "all" ? undefined : value })}><SelectTrigger className="dashboard-control h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{labels.allTypesLabel}</SelectItem>{typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
          <LabeledInput label={labels.dateFromLabel} value={filters.dateFrom ?? ""} onChange={(dateFrom) => onFilterChange({ dateFrom })} />
          <LabeledInput label={labels.dateToLabel} value={filters.dateTo ?? ""} onChange={(dateTo) => onFilterChange({ dateTo })} />
          <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-medium text-[var(--dash-text-soft)]">{labels.pageSizeLabel}<Select value={String(filters.pageSize)} onValueChange={(value) => onFilterChange({ pageSize: Number(value) as 25 | 50 | 100 })}><SelectTrigger className="dashboard-control h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select></label>
        </FilterBar>
        {isPartial ? <section className={cn(dashboardRowClass, "p-3")} role="status"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-gold)] text-[var(--dash-gold)]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{labels.partialTitle}</Badge>{partialSources.map((source) => <Badge key={source} variant="outline" className="rounded-md border-[var(--dash-border-subtle)]">{source}</Badge>)}</div><p className="mt-2 text-sm text-[var(--dash-text-soft)]">{labels.partialMessage}</p></section> : null}
        {isLoading ? <RouteStatePanel kind="loading" title={labels.loadingTitle} message={labels.loadingMessage} /> : emptyFiltered ? <RouteStatePanel kind="empty" title={labels.emptyFilteredTitle} message={labels.emptyFilteredMessage} action={{ label: labels.resetFilters, icon: RotateCcw, onClick: onResetFilters }} /> : rows.length === 0 ? <RouteStatePanel kind="empty" title={labels.emptyTitle} message={labels.emptyMessage} /> : <HistoryRows labels={labels} rows={rows} columns={columns} rowIdentity={rowIdentity} selectedRowId={selectedRowId} onSelectRow={onSelectRow} />}
        <div className={cn(dashboardPanelClass, "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between")}><p className="text-sm text-[var(--dash-text-soft)]">{labels.resultCount(rows.length)}</p><Button type="button" className="dashboard-button-secondary min-h-11 rounded-lg" onClick={onNextPage} disabled={!hasMore || isLoading}><ChevronRight className="h-4 w-4" aria-hidden="true" />{hasMore ? labels.nextPage : labels.noNextPage}</Button></div>
      </>}

      <DetailDrawer title={selectedRow ? drawerTitle(selectedRow) : labels.details} description={selectedRow && drawerDescription ? drawerDescription(selectedRow) : labels.proofUnavailableMessage} open={Boolean(selectedRow)} onOpenChange={(open) => { if (!open) onSelectRow(null) }} metadata={selectedRow ? drawerMetadata(selectedRow) : []}>{selectedRow ? renderDrawer(selectedRow) : null}</DetailDrawer>
    </div>
  )
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string | undefined) => void }) {
  return <label className="flex min-w-[min(100%,10rem)] flex-col gap-1 text-xs font-medium text-[var(--dash-text-soft)]">{label}<Input type="date" value={value} onChange={(event) => onChange(event.target.value || undefined)} className="dashboard-control h-10 rounded-lg" /></label>
}

function HistoryRows<Row>({ labels, rows, columns, rowIdentity, selectedRowId, onSelectRow }: { labels: TransactionHistoryShellLabels; rows: Row[]; columns: TransactionHistoryColumn<Row>[]; rowIdentity: TransactionHistoryRowIdentity<Row>; selectedRowId: string | null; onSelectRow: (id: string | null) => void }) {
  return <section className={cn(dashboardPanelClass, "min-w-0 overflow-hidden p-3")}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-[var(--dash-text)]">{labels.tableCaption}</h2><Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)]">{labels.scopeLabel}</Badge></div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm" aria-label={labels.tableCaption}><thead className="border-b border-[var(--dash-border-subtle)] text-xs uppercase text-[var(--dash-text-soft)]"><tr>{columns.map((column) => <th key={column.id} scope="col" className="px-3 py-3 font-semibold">{column.header}</th>)}<th scope="col" className="px-3 py-3 font-semibold">{labels.details}</th></tr></thead><tbody>{rows.map((row) => { const id = rowIdentity.id(row); return <tr key={id} className={cn("border-b border-[var(--dash-border-subtle)] align-top", selectedRowId === id && "bg-[var(--dash-brand-soft)]")}>{columns.map((column) => <td key={column.id} className="px-3 py-3">{column.cell(row)}</td>)}<td className="px-3 py-3"><Button type="button" size="sm" className="dashboard-button-secondary min-h-10 rounded-lg" onClick={() => onSelectRow(id)} aria-label={`${labels.details}: ${rowIdentity.title(row)}`}><Eye className="h-4 w-4" aria-hidden="true" />{labels.details}</Button></td></tr> })}</tbody></table></div><div className="space-y-3 md:hidden">{rows.map((row) => { const id = rowIdentity.id(row); return <article key={id} className={cn(dashboardRowClass, "p-3")}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-[var(--dash-text)]">{rowIdentity.title(row)}</h3>{rowIdentity.subtitle ? <div className="mt-1 text-sm text-[var(--dash-text-soft)]">{rowIdentity.subtitle(row)}</div> : null}</div>{rowIdentity.status ? <div className="shrink-0">{rowIdentity.status(row)}</div> : null}</div>{rowIdentity.value ? <div className="mt-3 text-lg font-semibold">{rowIdentity.value(row)}</div> : null}<Button type="button" className="dashboard-button-secondary mt-3 min-h-11 w-full rounded-lg" onClick={() => onSelectRow(id)} aria-label={`${labels.mobileCardAction}: ${rowIdentity.title(row)}`}><Eye className="h-4 w-4" aria-hidden="true" />{labels.mobileCardAction}</Button></article> })}</div></section>
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className={cn(dashboardRowClass, "p-3")}><h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3><div className="mt-3 space-y-2 text-sm text-[var(--dash-text-soft)]">{children}</div></section> }
export function DetailLine({ label, value }: { label: string; value: ReactNode }) { return <div className="grid gap-1 sm:grid-cols-[11rem,1fr]"><dt className="font-medium text-[var(--dash-text)]">{label}</dt><dd className="break-words">{value || "-"}</dd></div> }
