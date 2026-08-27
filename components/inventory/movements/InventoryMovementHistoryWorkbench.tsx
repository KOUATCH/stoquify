"use client"

import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CalendarClock, Database, Filter, PackageSearch } from "lucide-react"

import { DetailLine, DetailSection, TransactionHistoryWorkbenchShell, type TransactionHistoryFilters } from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { MovementTypeBadge, RowText, buildInventoryHistoryColumns, buildInventoryHistoryKpis, buildInventoryMovementTypeOptions, formatDecimal, formatHistoryDate, formatMoney, selectedInventoryRow, sourceNames, typeLabel } from "./inventoryMovementHistoryAdapter"
import { useInventoryMovementHistoryWorkbench } from "@/hooks/useInventoryMovementHistoryWorkbench"

type InventoryMovementHistoryT = ReturnType<typeof useTranslations<"inventoryMovementHistory">>

export function InventoryMovementHistoryWorkbench() {
  const t = useTranslations("inventoryMovementHistory")
  const locale = useLocale()
  const { filters, result, rows, selectedRowId, isLoading, isError, error, refetch, hasMore, nextPage, updateFilters, resetFilters, selectRow, exportHistory, exportStatus, isExporting } = useInventoryMovementHistoryWorkbench()
  const timezone = result?.snapshot.timezone ?? result?.appliedFilters.timezone ?? "UTC"
  const selectedRow = selectedInventoryRow(rows, selectedRowId)
  const partialSources = sourceNames(result)
  const isPartial = result?.completeness.state === "partial"

  return (
    <TransactionHistoryWorkbenchShell
      locale={locale === "fr" ? "fr" : "en"}
      labels={{ eyebrow: t("eyebrow"), title: t("title"), summary: t("summary"), scopeLabel: t("scopeLabel"), filtersTitle: t("filters.title"), filtersDetail: t("filters.detail"), searchPlaceholder: t("filters.searchPlaceholder"), searchLabel: t("filters.searchLabel"), typeLabel: t("filters.type"), allTypesLabel: t("filters.allTypes"), dateFromLabel: t("filters.dateFrom"), dateToLabel: t("filters.dateTo"), pageSizeLabel: t("filters.pageSize"), resetFilters: t("filters.reset"), retry: t("states.retry"), export: t("actions.export"), exporting: t("actions.exporting"), tableCaption: t("table.caption"), details: t("table.details"), nextPage: t("table.nextPage"), noNextPage: t("table.noNextPage"), loadingTitle: t("states.loadingTitle"), loadingMessage: t("states.loadingMessage"), emptyTitle: t("states.emptyTitle"), emptyMessage: t("states.emptyMessage"), emptyFilteredTitle: t("states.emptyFilteredTitle"), emptyFilteredMessage: t("states.emptyFilteredMessage"), errorTitle: t("states.errorTitle"), partialTitle: t("states.partialTitle"), partialMessage: t("states.partialMessage"), permissionTitle: t("states.permissionTitle"), permissionMessage: t("states.permissionMessage"), noOrgTitle: t("states.noOrgTitle"), noOrgMessage: t("states.noOrgMessage"), proofUnavailableTitle: t("proof.unavailableTitle"), proofUnavailableMessage: t("proof.unavailableMessage"), mobileCardAction: t("table.mobileCardAction"), resultCount: (count) => t("table.resultCount", { count }) }}
      filters={filters}
      typeOptions={buildInventoryMovementTypeOptions(t)}
      kpis={buildInventoryHistoryKpis(result, t)}
      actionItems={isPartial ? [{ id: "partial-source", title: t("actions.partialSourceTitle"), summary: t("actions.partialSourceSummary"), tone: "gold", icon: AlertTriangle, metadata: partialSources.map((source, index) => ({ label: t("actions.partialSource"), value: source || String(index + 1) })) }] : []}
      columns={buildInventoryHistoryColumns(t, locale, timezone)}
      rows={rows}
      rowIdentity={{ id: (row) => row.id, title: (row) => row.item.name, subtitle: (row) => `${row.item.sku} / ${row.location.name}`, status: (row) => <MovementTypeBadge type={row.type} label={typeLabel(row.type, t)} />, value: (row) => formatDecimal(row.quantity, row.item.unit) }}
      drawerTitle={(row) => row.item.name}
      drawerDescription={(row) => `${typeLabel(row.type, t)} / ${row.reference.number ?? row.reference.id ?? row.id}`}
      drawerMetadata={(row) => [{ label: t("drawer.effectiveAt"), value: formatHistoryDate(row.effectiveAt, locale, timezone), icon: CalendarClock }, { label: t("drawer.recordedAt"), value: formatHistoryDate(row.recordedAt, locale, timezone), icon: Database }, { label: t("drawer.location"), value: row.location.name, icon: PackageSearch }]}
      renderDrawer={(row) => <><DetailSection title={t("drawer.businessIdentity")}><dl><DetailLine label={t("drawer.item")} value={`${row.item.name} / ${row.item.sku}`} /><DetailLine label={t("drawer.type")} value={typeLabel(row.type, t)} /><DetailLine label={t("drawer.quantity")} value={formatDecimal(row.quantity, row.item.unit)} /><DetailLine label={t("drawer.value")} value={formatMoney(row.totalCost, row.currency)} /></dl></DetailSection><DetailSection title={t("drawer.sourceAttribution")}><dl><DetailLine label={t("drawer.reference")} value={row.reference.number ?? row.reference.id ?? row.reference.type} /><DetailLine label={t("drawer.actor")} value={row.actor?.name ?? row.actor?.id ?? "-"} /><DetailLine label={t("drawer.batch")} value={row.batchNumber} /><DetailLine label={t("drawer.expiryDate")} value={row.expiryDate} /></dl></DetailSection><DetailSection title={t("drawer.controlStates")}><dl><DetailLine label={t("drawer.correction")} value={row.correction.reversalOfTransactionId || row.correction.reversedByTransactionId ? t("drawer.correctionLinked") : t("drawer.correctionNone")} /><DetailLine label={t("drawer.proof")} value={t("proof.unavailableMessage")} /><DetailLine label={t("drawer.notes")} value={<RowText>{row.notes}</RowText>} /></dl></DetailSection></>}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={(patch: Partial<TransactionHistoryFilters>) => updateFilters(patch)}
      onResetFilters={resetFilters}
      onSelectRow={selectRow}
      onNextPage={nextPage}
      onRetry={() => refetch()}
      onExport={exportHistory}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error instanceof Error ? error.message : undefined}
      hasMore={hasMore}
      isPartial={isPartial}
      partialSources={partialSources}
      isExporting={isExporting}
      exportStatus={exportStatus ? exportStatusFromRaw(exportStatus, t) : null}
      snapshotMetadata={[{ label: t("snapshot.timezone"), value: timezone, icon: Filter }, { label: t("snapshot.recordedThrough"), value: formatHistoryDate(result?.snapshot.recordedThrough, locale, timezone), icon: CalendarClock }, { label: t("snapshot.generatedAt"), value: formatHistoryDate(result?.snapshot.generatedAt, locale, timezone), icon: Database }]}
    />
  )
}

function exportStatusFromRaw(raw: string, t: InventoryMovementHistoryT) {
  const [fileName, rowCount] = raw.split(" / ")
  const count = Number(rowCount)
  return fileName && Number.isFinite(count) ? t("actions.exportReady", { fileName, rowCount: count }) : raw
}
