"use client"

import { OpenItemsReturnLink } from "@/components/finance/OpenItemsReturnLink"
import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { financeReceivablesHistoryTableContract } from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
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
    canExport,
    exportStatus,
    isExporting,
  } = useAROpenItemsHistoryWorkbench()
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const loadedRows = result?.items ?? rows
  const filteredRows = loadedRows.filter((row) => [
    row.documentNumber, row.customerName, formatDate(row.dueDate, locale), row.status, t(`status.${row.status}`), row.currency,
    row.agingBucket, t(`aging.${row.agingBucket}`),
    formatMoney(row.openingAmount, locale, row.currency), formatMoney(row.openAmount, locale, row.currency), row.evidenceGrade, evidenceLabel(row, t),
  ].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const currentPage = Math.min(pageIndex, Math.max(0, Math.ceil(filteredRows.length / filters.pageSize) - 1))
  const visibleRows = filteredRows.slice(currentPage * filters.pageSize, (currentPage + 1) * filters.pageSize)
  const selectedRow = loadedRows.find((row) => row.referenceId === selectedRowId) ?? null
  const exportStatusLabel = exportStatus === "ready" ? t("exportStatus.ready") : exportStatus
  const canonicalQuery = createCanonicalTableQuery(financeReceivablesHistoryTableContract, {
    search,
    filters: filters.dateTo ? { asOf: [filters.dateTo] } : {},
    sort: [{ id: "dueDate", desc: false }],
    pageIndex: currentPage,
    pageSize: filters.pageSize,
  })
  const canonicalState = isError
    ? "error"
    : isLoading && rows.length === 0
      ? "loading"
      : filteredRows.length === 0
        ? search || filters.dateTo
          ? "no-results"
          : "empty"
        : isLoading
          ? "refreshing"
          : "ready"

  return (
    <CanonicalTableBoundary
      contract={financeReceivablesHistoryTableContract}
      locale={locale === "fr" ? "fr" : "en"}
      query={canonicalQuery}
      state={canonicalState}
    >
      <OpenItemsReturnLink locale={locale === "fr" ? "fr" : "en"} />
      {filters.customerId && <p className="px-4 pb-3 text-sm">{locale === "fr" ? "Filtre client appliqué. Les exports couvrent ses factures dans la période de l’historique, y compris les factures réglées. Réinitialisez les filtres pour toute l’organisation." : "Customer filter applied. Exports cover this customer’s invoices in the history scope, including settled records. Reset filters for the whole organization."}</p>}
      {filters.customerId && <Button className="mx-4 mb-3" variant="outline" disabled={isLoading} onClick={resetFilters}>{locale === "fr" ? "Effacer le filtre client" : "Clear customer filter"}</Button>}
      <TransactionHistoryWorkbenchShell
        tableVariant="system"
        locale={locale === "fr" ? "fr" : "en"}
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
      filters={{ ...filters, search }}
      typeOptions={[]}
      kpis={buildKpis(result, t, locale)}
      actionItems={[]}
      columns={buildColumns(t, locale)}
      rows={visibleRows}
      rowIdentity={{
        id: (row) => row.referenceId,
        title: (row) => row.orderNumber ?? row.referenceId,
        subtitle: (row) => `${row.customerName} / ${t(`aging.${row.agingBucket}`)}`,
        status: (row) => <StateBadge state={row.status} t={t} />,
        value: (row) => <div className="space-y-2"><div>{formatMoney(row.openAmount, locale, row.currency)}</div><p className="break-words text-sm font-normal text-[var(--dash-text-soft)]">{t("drawer.evidenceGrade")}: {evidenceLabel(row, t)}</p></div>,
      }}
      drawerTitle={(row) => row.orderNumber ?? row.referenceId}
      drawerDescription={(row) => `${row.customerName} / ${t("drawer.documentType")}`}
      drawerMetadata={(row) => [
        { label: t("drawer.customer"), value: row.customerName, icon: UserRound },
        { label: t("drawer.dueDate"), value: formatDate(row.dueDate, locale), icon: CalendarClock },
        { label: t("drawer.recordedThrough"), value: formatDate(result?.recordedThrough, locale), icon: Database },
      ]}
      renderDrawer={(row) => <ARDrawer row={row} locale={locale} t={t} />}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={(patch) => {
        setPageIndex(0)
        if ("search" in patch) setSearch(patch.search ?? "")
        if ("dateTo" in patch || "pageSize" in patch) updateFilters(mapPatch(patch))
      }}
      onResetFilters={() => { setSearch(""); setPageIndex(0); resetFilters() }}
      onSelectRow={selectRow}
      pageIndex={currentPage}
      canPreviousPage={currentPage > 0}
      onFirstPage={() => setPageIndex(0)}
      onPreviousPage={() => setPageIndex(Math.max(0, currentPage - 1))}
      onNextPage={() => setPageIndex(currentPage + 1)}
      onRetry={() => refetch()}
      onExport={canExport ? exportHistory : undefined}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error instanceof Error ? error.message : undefined}
      hasMore={(currentPage + 1) * filters.pageSize < filteredRows.length}
      isPartial={false}
      wrapProofSummary
      isExporting={isExporting}
      exportStatus={exportStatusLabel}
      snapshotMetadata={[
        { label: t("snapshot.asOf"), value: formatDate(result?.asOf, locale), icon: CalendarClock },
        { label: t("snapshot.recordedThrough"), value: formatDate(result?.recordedThrough, locale), icon: Database },
      ]}
      />
    </CanonicalTableBoundary>
  )
}

function ARDrawer({ row, locale, t }: { row: AROpenItem; locale: string; t: ARHistoryT }) {
  return (
    <>
      <DetailSection title={t("drawer.openItem")}>
        <dl>
          <DetailLine label={t("drawer.customer")} value={row.customerName} />
          <DetailLine label={t("drawer.reference")} value={<span className="break-all">{row.referenceId}</span>} />
          <DetailLine label={t("drawer.currency")} value={row.currency} />
          <DetailLine label={t("drawer.opened")} value={formatMoney(row.openingAmount, locale, row.currency)} />
          <DetailLine label={t("drawer.allocated")} value={formatMoney(row.allocatedAmount, locale, row.currency)} />
          <DetailLine label={t("drawer.open")} value={formatMoney(row.openAmount, locale, row.currency)} />
          <DetailLine label={t("drawer.status")} value={t(`status.${row.status}`)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.aging")}>
        <dl>
          <DetailLine label={t("drawer.invoiceDate")} value={formatDate(row.invoiceDate, locale)} />
          <DetailLine label={t("drawer.dueDate")} value={formatDate(row.dueDate, locale)} />
          <DetailLine label={t("drawer.daysPastDue")} value={row.daysPastDue} />
          <DetailLine label={t("drawer.bucket")} value={t(`aging.${row.agingBucket}`)} />
          <DetailLine label={t("drawer.evidenceGrade")} value={evidenceLabel(row, t)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.allocations")}>
        <dl>
          {row.allocations.length === 0 ? <DetailLine label={t("drawer.allocations")} value={t("drawer.noAllocations")} /> : row.allocations.map((allocation) => (
            <DetailLine key={allocation.ledgerEntryId} label={t(`allocationTypes.${allocation.type}`)} value={`${formatMoney(allocation.amount, locale, row.currency)} / ${formatDate(allocation.entryDate, locale)}`} />
          ))}
        </dl>
      </DetailSection>
    </>
  )
}

function buildKpis(result: AROpenItemResult | undefined, t: ARHistoryT, locale: string): TransactionHistoryKpi[] {
  return [
    { id: "items", label: t("kpis.items"), value: result?.summary.itemCount ?? 0, tone: "brand" },
    ...(result?.summariesByCurrency.flatMap((summary) => [
      {
        id: `open-${summary.currency}`,
        label: `${t("kpis.open")} (${summary.currency})`,
        value: formatMoney(summary.totalOpen, locale, summary.currency),
        tone: "gold" as const,
      },
      {
        id: `overdue-${summary.currency}`,
        label: `${t("kpis.overdue")} (${summary.currency})`,
        value: formatMoney(summary.overdueAmount, locale, summary.currency),
        tone: Number(summary.overdueAmount) > 0 ? "danger" as const : "success" as const,
      },
    ]) ?? []),
    { id: "settled", label: t("kpis.settled"), value: result?.summary.settledItemCount ?? 0, tone: "success" },
  ]
}

function buildColumns(t: ARHistoryT, locale: string): TransactionHistoryColumn<AROpenItem>[] {
  return [
    { id: "documentNumber", header: t("table.reference"), cell: (row) => row.documentNumber },
    { id: "counterparty", header: t("table.customer"), cell: (row) => row.customerName },
    { id: "dueDate", header: t("drawer.dueDate"), cell: (row) => formatDate(row.dueDate, locale) },
    { id: "status", header: t("table.status"), cell: (row) => <StateBadge state={row.status} t={t} /> },
    { id: "currency", header: t("table.currency"), cell: (row) => row.currency },
    { id: "amount", header: t("table.opened"), cell: (row) => formatMoney(row.openingAmount, locale, row.currency) },
    { id: "balance", header: t("table.open"), cell: (row) => formatMoney(row.openAmount, locale, row.currency) },
    { id: "evidence", header: t("drawer.evidenceGrade"), cell: (row) => evidenceLabel(row, t) },
  ]
}

function evidenceLabel(row: AROpenItem, t: ARHistoryT) {
  if (row.evidenceGrade === "posted") return t("proof.posted")
  if (row.evidenceGrade === "operational") return t("proof.operational")
  return t("proof.statusUnavailable")
}

function mapPatch(patch: Partial<TransactionHistoryFilters>) {
  return {
    ...("dateTo" in patch ? { dateTo: patch.dateTo } : {}),
    ...(patch.pageSize !== undefined ? { pageSize: patch.pageSize } : {}),
    selected: undefined,
  }
}

function StateBadge({ state, t }: { state: AROpenItem["status"]; t: ARHistoryT }) {
  return <Badge variant="outline" className="whitespace-normal break-words rounded-md border-[var(--dash-border-subtle)]">{t(`status.${state}`)}</Badge>
}

function formatMoney(value: string | number, locale: string, currency: string) {
  const amount = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}
