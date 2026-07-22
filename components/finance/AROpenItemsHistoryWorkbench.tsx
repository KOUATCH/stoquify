"use client"

import { useLocale, useTranslations } from "next-intl"
import { CalendarClock, Database, HandCoins, UserRound } from "lucide-react"

import {
  DetailLine,
  DetailSection,
  TransactionHistoryWorkbenchShell,
  type TransactionHistoryColumn,
  type TransactionHistoryFilters,
  type TransactionHistoryKpi,
} from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { Badge } from "@/components/ui/badge"
import { useAROpenItemsHistoryWorkbench } from "@/hooks/useAROpenItemsHistoryWorkbench"
import type { AROpenItem, AROpenItemResult } from "@/services/accounting/ar-open-item.service"

type ARHistoryT = ReturnType<typeof useTranslations<"arHistory">>

export function AROpenItemsHistoryWorkbench() {
  const t = useTranslations("arHistory")
  const locale = useLocale()
  const {
    filters,
    result,
    rows,
    selectedRowId,
    isLoading,
    isError,
    error,
    refetch,
    updateFilters,
    resetFilters,
    selectRow,
    exportHistory,
    exportStatus,
    isExporting,
  } = useAROpenItemsHistoryWorkbench()
  const selectedRow = rows.find((row) => row.referenceId === selectedRowId) ?? null
  const exportStatusLabel = exportStatus === "ready" ? t("exportStatus.ready") : exportStatus

  return (
    <TransactionHistoryWorkbenchShell
      labels={{
        eyebrow: t("eyebrow"),
        title: t("title"),
        summary: t("summary"),
        scopeLabel: t("scopeLabel"),
        filtersTitle: t("filters.title"),
        filtersDetail: t("filters.detail"),
        searchPlaceholder: t("filters.searchPlaceholder"),
        searchLabel: t("filters.searchLabel"),
        typeLabel: t("filters.type"),
        allTypesLabel: t("filters.allTypes"),
        dateFromLabel: t("filters.dateFrom"),
        dateToLabel: t("filters.asOf"),
        pageSizeLabel: t("filters.pageSize"),
        resetFilters: t("filters.reset"),
        retry: t("states.retry"),
        export: t("actions.export"),
        exporting: t("actions.exporting"),
        tableCaption: t("table.caption"),
        details: t("table.details"),
        nextPage: t("table.nextPage"),
        noNextPage: t("table.noNextPage"),
        loadingTitle: t("states.loadingTitle"),
        loadingMessage: t("states.loadingMessage"),
        emptyTitle: t("states.emptyTitle"),
        emptyMessage: t("states.emptyMessage"),
        emptyFilteredTitle: t("states.emptyFilteredTitle"),
        emptyFilteredMessage: t("states.emptyFilteredMessage"),
        errorTitle: t("states.errorTitle"),
        partialTitle: t("states.partialTitle"),
        partialMessage: t("states.partialMessage"),
        permissionTitle: t("states.permissionTitle"),
        permissionMessage: t("states.permissionMessage"),
        noOrgTitle: t("states.noOrgTitle"),
        noOrgMessage: t("states.noOrgMessage"),
        proofUnavailableTitle: t("proof.unavailableTitle"),
        proofUnavailableMessage: t("proof.unavailableMessage"),
        mobileCardAction: t("table.mobileCardAction"),
        resultCount: (count) => t("table.resultCount", { count }),
      }}
      filters={filters}
      typeOptions={[]}
      kpis={buildKpis(result, t, locale)}
      actionItems={[]}
      columns={buildColumns(t, locale)}
      rows={rows}
      rowIdentity={{
        id: (row) => row.referenceId,
        title: (row) => row.orderNumber ?? row.referenceId,
        subtitle: (row) => `${row.customerName} / ${row.agingBucket}`,
        status: (row) => <StateBadge state={row.status} />,
        value: (row) => formatMoney(row.openAmount, locale),
      }}
      drawerTitle={(row) => row.orderNumber ?? row.referenceId}
      drawerDescription={(row) => `${row.customerName} / ${row.referenceType}`}
      drawerMetadata={(row) => [
        { label: t("drawer.customer"), value: row.customerName, icon: UserRound },
        { label: t("drawer.dueDate"), value: formatDate(row.dueDate, locale), icon: CalendarClock },
        { label: t("drawer.recordedThrough"), value: formatDate(result?.recordedThrough, locale), icon: Database },
      ]}
      renderDrawer={(row) => <ARDrawer row={row} locale={locale} t={t} />}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={(patch) => updateFilters(mapPatch(patch))}
      onResetFilters={resetFilters}
      onSelectRow={selectRow}
      onNextPage={() => undefined}
      onRetry={() => refetch()}
      onExport={exportHistory}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error instanceof Error ? error.message : undefined}
      hasMore={false}
      isPartial={false}
      isExporting={isExporting}
      exportStatus={exportStatusLabel}
      snapshotMetadata={[
        { label: t("snapshot.asOf"), value: formatDate(result?.asOf, locale), icon: CalendarClock },
        { label: t("snapshot.recordedThrough"), value: formatDate(result?.recordedThrough, locale), icon: Database },
      ]}
    />
  )
}

function ARDrawer({ row, locale, t }: { row: AROpenItem; locale: string; t: ARHistoryT }) {
  return (
    <>
      <DetailSection title={t("drawer.openItem")}>
        <dl>
          <DetailLine label={t("drawer.customer")} value={row.customerName} />
          <DetailLine label={t("drawer.reference")} value={`${row.referenceType} / ${row.referenceId}`} />
          <DetailLine label={t("drawer.opened")} value={formatMoney(row.openingAmount, locale)} />
          <DetailLine label={t("drawer.allocated")} value={formatMoney(row.allocatedAmount, locale)} />
          <DetailLine label={t("drawer.open")} value={formatMoney(row.openAmount, locale)} />
          <DetailLine label={t("drawer.status")} value={row.status} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.aging")}>
        <dl>
          <DetailLine label={t("drawer.invoiceDate")} value={formatDate(row.invoiceDate, locale)} />
          <DetailLine label={t("drawer.dueDate")} value={formatDate(row.dueDate, locale)} />
          <DetailLine label={t("drawer.daysPastDue")} value={row.daysPastDue} />
          <DetailLine label={t("drawer.bucket")} value={row.agingBucket} />
          <DetailLine label={t("drawer.evidenceGrade")} value={row.evidenceGrade} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.allocations")}>
        <dl>
          {row.allocations.length === 0 ? <DetailLine label={t("drawer.allocations")} value={t("drawer.noAllocations")} /> : row.allocations.map((allocation) => (
            <DetailLine key={allocation.ledgerEntryId} label={allocation.type} value={`${formatMoney(allocation.amount, locale)} / ${formatDate(allocation.entryDate, locale)}`} />
          ))}
        </dl>
      </DetailSection>
    </>
  )
}

function buildKpis(result: AROpenItemResult | undefined, t: ARHistoryT, locale: string): TransactionHistoryKpi[] {
  return [
    { id: "items", label: t("kpis.items"), value: result?.summary.itemCount ?? 0, tone: "brand" },
    { id: "open", label: t("kpis.open"), value: formatMoney(result?.summary.totalOpen ?? "0", locale), tone: "gold" },
    { id: "overdue", label: t("kpis.overdue"), value: formatMoney(result?.summary.overdueAmount ?? "0", locale), tone: result?.summary.overdueAmount !== "0.00" ? "danger" : "success" },
    { id: "settled", label: t("kpis.settled"), value: result?.summary.settledItemCount ?? 0, tone: "success" },
  ]
}

function buildColumns(t: ARHistoryT, locale: string): TransactionHistoryColumn<AROpenItem>[] {
  return [
    { id: "customer", header: t("table.customer"), cell: (row) => row.customerName },
    { id: "reference", header: t("table.reference"), cell: (row) => row.orderNumber ?? row.referenceId },
    { id: "opened", header: t("table.opened"), cell: (row) => formatMoney(row.openingAmount, locale) },
    { id: "allocated", header: t("table.allocated"), cell: (row) => formatMoney(row.allocatedAmount, locale) },
    { id: "open", header: t("table.open"), cell: (row) => formatMoney(row.openAmount, locale) },
    { id: "status", header: t("table.status"), cell: (row) => <StateBadge state={row.status} /> },
  ]
}

function mapPatch(patch: Partial<TransactionHistoryFilters>) {
  return {
    ...(patch.dateTo !== undefined ? { dateTo: patch.dateTo } : {}),
    ...(patch.pageSize !== undefined ? { pageSize: patch.pageSize } : {}),
    selected: undefined,
  }
}

function StateBadge({ state }: { state: AROpenItem["status"] }) {
  return <Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)]">{state}</Badge>
}

function formatMoney(value: string | number, locale: string) {
  const amount = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat(locale, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}
