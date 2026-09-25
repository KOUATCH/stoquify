"use client"

import { useLocale, useTranslations } from "next-intl"
import { CalendarClock, Database, PackageSearch, RotateCcw } from "lucide-react"

import { DetailLine, DetailSection, TransactionHistoryWorkbenchShell } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { MovementTypeBadge, RowText, buildInventoryHistoryColumns, buildInventoryHistoryKpis, buildInventoryMovementTypeOptions, formatDecimal, formatHistoryDate, formatMoney, selectedInventoryRow, sourceNames, typeLabel } from "./inventoryMovementHistoryAdapter"
import { InventoryMovementHistoryTable } from "./InventoryMovementHistoryTable"
import { useInventoryMovementHistoryWorkbench } from "@/hooks/useInventoryMovementHistoryWorkbench"

export function InventoryMovementHistoryWorkbench() {
  const t = useTranslations("inventoryMovementHistory")
  const locale = useLocale()
  const history = useInventoryMovementHistoryWorkbench()
  const { filters, result, rows, selectedRowId, isLoading, isFetching, isError, refetch, hasMore, nextPage, previousPage, firstPage, canPreviousPage, updateFilters, resetFilters, selectRow, exportHistory, exportStatus, exportError, isExporting, permissionDenied, noOrganization } = history
  const timezone = result?.snapshot.timezone ?? result?.appliedFilters.timezone ?? "UTC"
  const selectedRow = selectedInventoryRow(isLoading ? [] : rows, selectedRowId)
  const partialSources = sourceNames(result)
  const isPartial = result?.completeness.state === "partial"

  return (
    <TransactionHistoryWorkbenchShell
      locale={locale === "fr" ? "fr" : "en"}
      labels={{ eyebrow: t("eyebrow"), title: t("title"), summary: t("summary"), scopeLabel: t(isLoading ? "states.loadingTitle" : "scopeLabel"), filtersTitle: t("filters.title"), filtersDetail: t("filters.detail"), searchPlaceholder: t("filters.searchPlaceholder"), searchLabel: t("filters.searchLabel"), typeLabel: t("filters.type"), allTypesLabel: t("filters.allTypes"), dateFromLabel: t("filters.dateFrom"), dateToLabel: t("filters.dateTo"), pageSizeLabel: t("filters.pageSize"), resetFilters: t("filters.reset"), retry: t("states.retry"), export: t("actions.export"), exporting: t("actions.exporting"), tableCaption: t("table.caption"), details: t("table.details"), nextPage: t("table.nextPage"), noNextPage: t("table.noNextPage"), loadingTitle: t("states.loadingTitle"), loadingMessage: t("states.loadingMessage"), emptyTitle: t("states.emptyTitle"), emptyMessage: t("states.emptyMessage"), emptyFilteredTitle: t("states.emptyFilteredTitle"), emptyFilteredMessage: t("states.emptyFilteredMessage"), errorTitle: t("states.errorTitle"), partialTitle: t("states.partialTitle"), partialMessage: t("states.partialMessage"), permissionTitle: t("states.permissionTitle"), permissionMessage: t("states.permissionMessage"), noOrgTitle: t("states.noOrgTitle"), noOrgMessage: t("states.noOrgMessage"), proofUnavailableTitle: t("proof.unavailableTitle"), proofUnavailableMessage: t("proof.unavailableMessage"), mobileCardAction: t("table.mobileCardAction"), resultCount: (count) => t("table.resultCount", { count }), filter: t("toolbar.filter"), clearFilters: t("toolbar.clearFilters"), liveData: t("toolbar.liveData"), refresh: t("toolbar.refresh"), refreshing: t("toolbar.refreshing"), viewColumns: t("toolbar.viewColumns"), selectAllRows: t("toolbar.selectAllRows"), selectRow: (title) => t("toolbar.selectRow", { title }), selectedRows: (selected, total) => t("toolbar.selectedRows", { selected, total }), page: (page) => t("toolbar.page", { page }), firstPage: t("toolbar.firstPage"), previousPage: t("toolbar.previousPage") }}
      filters={filters}
      typeOptions={buildInventoryMovementTypeOptions(t)}
      kpis={buildInventoryHistoryKpis(isLoading ? undefined : result, t, locale)}
      actionItems={[]}
      hideEmptyActionQueue
      columns={buildInventoryHistoryColumns(t, locale, timezone)}
      rows={rows}
      rowIdentity={{ id: (row) => row.id, title: (row) => row.item.name, subtitle: (row) => `${row.item.sku} / ${row.location.name}`, status: (row) => <MovementTypeBadge type={row.type} label={typeLabel(row.type, t)} />, value: (row) => formatDecimal(row.quantity, row.item.unit, locale) }}
      drawerTitle={(row) => row.item.name}
      drawerDescription={(row) => `${typeLabel(row.type, t)} / ${row.reference.number ?? row.reference.id ?? row.id}`}
      drawerMetadata={(row) => [{ label: t("drawer.effectiveAt"), value: formatHistoryDate(row.effectiveAt, locale, timezone), icon: CalendarClock }, { label: t("drawer.recordedAt"), value: formatHistoryDate(row.recordedAt, locale, timezone), icon: Database }, { label: t("drawer.location"), value: row.location.name, icon: PackageSearch }]}
      renderDrawer={(row) => <><DetailSection title={t("drawer.businessIdentity")}><dl><DetailLine label={t("drawer.item")} value={`${row.item.name} / ${row.item.sku}`} /><DetailLine label={t("drawer.type")} value={typeLabel(row.type, t)} /><DetailLine label={t("drawer.quantity")} value={formatDecimal(row.quantity, row.item.unit, locale)} /><DetailLine label={t("drawer.value")} value={formatMoney(row.totalCost, row.currency, locale)} /></dl></DetailSection><DetailSection title={t("drawer.sourceAttribution")}><dl><DetailLine label={t("drawer.reference")} value={row.reference.number ?? row.reference.id ?? row.reference.type} /><DetailLine label={t("drawer.actor")} value={row.actor?.name ?? row.actor?.id ?? "-"} /><DetailLine label={t("drawer.batch")} value={row.batchNumber} /><DetailLine label={t("drawer.expiryDate")} value={row.expiryDate} /></dl></DetailSection><DetailSection title={t("drawer.controlStates")}><dl><DetailLine label={t("drawer.correction")} value={row.correction.reversalOfTransactionId || row.correction.reversedByTransactionId ? t("drawer.correctionLinked") : t("drawer.correctionNone")} /><DetailLine label={t("drawer.proof")} value={t("proof.unavailableMessage")} /><DetailLine label={t("drawer.notes")} value={<RowText>{row.notes}</RowText>} /></dl></DetailSection></>}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={updateFilters}
      onResetFilters={resetFilters}
      onSelectRow={selectRow}
      onNextPage={nextPage}
      onPreviousPage={previousPage}
      onFirstPage={firstPage}
      onRetry={() => refetch()}
      onExport={exportHistory}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      errorMessage={t("states.errorMessage")}
      permissionDenied={permissionDenied}
      noOrganization={noOrganization}
      headerActions={isError ? [{ label: t("filters.reset"), icon: RotateCcw, onClick: resetFilters, variant: "secondary" }] : []}
      hasMore={hasMore}
      canPreviousPage={canPreviousPage}
      isPartial={isPartial}
      partialSources={partialSources}
      isExporting={isExporting}
      exportStatus={exportStatus ? t("actions.exportReady", exportStatus) : exportError ? t("actions.exportFailed") : null}
      tableVariant="system"
      exportInHeader={false}
      showProofSummary={false}
      renderTable={(onSelectRow) => <InventoryMovementHistoryTable history={history} locale={locale === "fr" ? "fr" : "en"} timezone={timezone} onSelectRow={onSelectRow} />}
      snapshotMetadata={[]}
    />
  )
}
