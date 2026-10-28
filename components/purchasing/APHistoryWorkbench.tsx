"use client"

import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, CalendarClock, Database, Landmark, ReceiptText, Truck } from "lucide-react"

import {
  DetailLine,
  DetailSection,
  TransactionHistoryWorkbenchShell,
  type TransactionHistoryColumn,
  type TransactionHistoryFilters,
  type TransactionHistoryKpi,
} from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import {
  dashboardToneClass,
  type DashboardTone,
} from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { useAPHistoryWorkbench } from "@/hooks/useAPHistoryWorkbench"
import { cn } from "@/lib/utils"
import type { APHistoryResult, APHistoryRow } from "@/services/purchasing/ap-history.service"

type APHistoryT = ReturnType<typeof useTranslations<"apHistory">>

export function APHistoryWorkbench() {
  const t = useTranslations("apHistory")
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
    hasMore,
    nextPage,
    updateFilters,
    resetFilters,
    selectRow,
    exportHistory,
    exportStatus,
    isExporting,
  } = useAPHistoryWorkbench()
  const timezone = result?.snapshot.timezone ?? result?.appliedFilters.timezone ?? "UTC"
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null
  const isPartial = result?.completeness.state === "partial"
  const supplierScope = filters.supplierId
    ? rows.find((row) => row.supplier.id === filters.supplierId)?.supplier.name ??
      filters.supplierId
    : null
  const scopeLabel = supplierScope
    ? t("scopeSupplier", { supplier: supplierScope })
    : t("scopeLabel")

  return (
    <TransactionHistoryWorkbenchShell
      locale={locale === "fr" ? "fr" : "en"}
      labels={{
        eyebrow: t("eyebrow"),
        title: t("title"),
        summary: t("summary"),
        scopeLabel,
        filtersTitle: t("filters.title"),
        filtersDetail: t("filters.detail"),
        searchPlaceholder: t("filters.searchPlaceholder"),
        searchLabel: t("filters.searchLabel"),
        typeLabel: t("filters.type"),
        allTypesLabel: t("filters.allTypes"),
        dateFromLabel: t("filters.dateFrom"),
        dateToLabel: t("filters.dateTo"),
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
      filters={{ ...filters, type: filters.lane === "all" ? undefined : filters.lane }}
      typeOptions={[
        { value: "invoice", label: t("lanes.invoice") },
        { value: "payment", label: t("lanes.payment") },
      ]}
      kpis={buildKpis(result, t, locale)}
      actionItems={[]}
      columns={buildColumns(t, locale, timezone)}
      rows={rows}
      rowIdentity={{
        id: (row) => row.id,
        title: (row) => row.reference.invoiceNumber ?? row.reference.paymentNumber ?? row.sourceId,
        subtitle: (row) => `${row.supplier.name} / ${laneLabel(row.lane, t)}`,
        status: (row) => <StateBadge state={row.controlState} t={t} />,
        value: (row) => formatMoney(row.signedPayableMovement, row.currency, locale),
      }}
      drawerTitle={(row) => row.reference.invoiceNumber ?? row.reference.paymentNumber ?? row.sourceId}
      drawerDescription={(row) => `${row.supplier.name} / ${row.sourceType}`}
      drawerMetadata={(row) => [
        { label: t("drawer.effectiveAt"), value: formatHistoryDate(row.effectiveAt, locale, timezone), icon: CalendarClock },
        { label: t("drawer.recordedAt"), value: formatHistoryDate(row.recordedAt, locale, timezone), icon: Database },
        { label: t("drawer.supplier"), value: row.supplier.name, icon: Truck },
      ]}
      renderDrawer={(row) => <APHistoryDrawer row={row} locale={locale} timezone={timezone} t={t} />}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={(patch) => updateFilters(mapShellFilterPatch(patch))}
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
      partialSources={result?.completeness.sources.filter((source) => source.state === "partial").map((source) => source.source) ?? []}
      isExporting={isExporting}
      exportStatus={exportStatus ? t(`exportStatus.${exportStatus}`) : null}
      headerActions={
        filters.supplierId
          ? [
              {
                label: t("actions.backToSupplier"),
                href:
                  "/" +
                  locale +
                  "/dashboard/purchases/suppliers/" +
                  encodeURIComponent(filters.supplierId),
                icon: ArrowLeft,
                variant: "secondary",
              },
            ]
          : []
      }
      hideEmptyActionQueue
      snapshotMetadata={[
        ...(supplierScope
          ? [{ label: t("snapshot.supplier"), value: supplierScope, icon: Truck }]
          : []),
        { label: t("snapshot.timezone"), value: timezone, icon: Landmark },
        { label: t("snapshot.recordedThrough"), value: formatHistoryDate(result?.snapshot.recordedThrough, locale, timezone), icon: CalendarClock },
        { label: t("snapshot.generatedAt"), value: formatHistoryDate(result?.snapshot.generatedAt, locale, timezone), icon: Database },
      ]}
    />
  )
}

function APHistoryDrawer({ row, locale, timezone, t }: { row: APHistoryRow; locale: string; timezone: string; t: APHistoryT }) {
  return (
    <>
      <DetailSection title={t("drawer.businessIdentity")}>
        <dl>
          <DetailLine label={t("drawer.lane")} value={laneLabel(row.lane, t)} />
          <DetailLine label={t("drawer.source")} value={`${row.sourceType} / ${row.sourceId}`} />
          <DetailLine label={t("drawer.amount")} value={formatMoney(row.amount, row.currency, locale)} />
          <DetailLine label={t("drawer.signedMovement")} value={formatMoney(row.signedPayableMovement, row.currency, locale)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.accounting")}>
        <dl>
          <DetailLine label={t("drawer.businessState")} value={row.businessState} />
          <DetailLine label={t("drawer.ledgerPostingBatch")} value={row.accounting.ledgerPostingBatchId} />
          <DetailLine label={t("drawer.businessEvent")} value={row.accounting.postedBusinessEventId} />
          <DetailLine label={t("drawer.documentHash")} value={row.accounting.documentHash} />
          <DetailLine label={t("drawer.evidenceHash")} value={row.accounting.evidenceHash} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.sourceAttribution")}>
        <dl>
          <DetailLine label={t("drawer.supplier")} value={row.supplier.name} />
          <DetailLine label={t("drawer.purchaseOrder")} value={row.reference.purchaseOrderId} />
          <DetailLine label={t("drawer.dueDate")} value={formatHistoryDate(row.reference.dueDate, locale, timezone)} />
          <DetailLine label={t("drawer.bankDestination")} value={row.payment.bankDestination ?? t("proof.unavailableTitle")} />
          <DetailLine label={t("drawer.effectiveAt")} value={formatHistoryDate(row.effectiveAt, locale, timezone)} />
          <DetailLine label={t("drawer.recordedAt")} value={formatHistoryDate(row.recordedAt, locale, timezone)} />
        </dl>
      </DetailSection>
    </>
  )
}

function buildKpis(result: APHistoryResult | undefined, t: APHistoryT, locale: string): TransactionHistoryKpi[] {
  const summary = result?.summary
  return [
    { id: "transactions", label: t("kpis.transactions"), value: summary?.transactionCount ?? 0, tone: "brand" },
    { id: "openPayable", label: t("kpis.openPayable"), value: formatMoney(summary?.openPayable ?? "0", summary?.currency ?? "XAF", locale), tone: "gold" },
    { id: "releasedPayments", label: t("kpis.releasedPayments"), value: formatMoney(summary?.releasedPaymentTotal ?? "0", summary?.currency ?? "XAF", locale), tone: "success" },
    { id: "ledgerBlockers", label: t("kpis.ledgerBlockers"), value: summary?.ledgerBlockerCount ?? 0, tone: summary?.ledgerBlockerCount ? "danger" : "success" },
  ]
}

function buildColumns(t: APHistoryT, locale: string, timezone: string): TransactionHistoryColumn<APHistoryRow>[] {
  return [
    { id: "supplier", header: t("table.supplier"), cell: (row) => row.supplier.name },
    { id: "reference", header: t("table.reference"), cell: (row) => row.reference.invoiceNumber ?? row.reference.paymentNumber ?? row.sourceId },
    { id: "amount", header: t("table.amount"), cell: (row) => formatMoney(row.amount, row.currency, locale) },
    { id: "movement", header: t("table.movement"), cell: (row) => formatMoney(row.signedPayableMovement, row.currency, locale) },
    { id: "state", header: t("table.state"), cell: (row) => <StateBadge state={row.controlState} t={t} /> },
    { id: "effectiveAt", header: t("table.effectiveAt"), cell: (row) => formatHistoryDate(row.effectiveAt, locale, timezone) },
  ]
}

function mapShellFilterPatch(patch: Partial<TransactionHistoryFilters>) {
  return {
    ...(patch.type !== undefined ? { lane: patch.type === "all" ? undefined : (patch.type as "invoice" | "payment") } : {}),
    ...(patch.dateFrom !== undefined ? { dateFrom: patch.dateFrom } : {}),
    ...(patch.dateTo !== undefined ? { dateTo: patch.dateTo } : {}),
    ...(patch.pageSize !== undefined ? { pageSize: patch.pageSize } : {}),
    cursor: undefined,
    selected: undefined,
  }
}

function laneLabel(lane: APHistoryRow["lane"], t: APHistoryT) {
  return t(`lanes.${lane}`)
}

const apControlStateTones = {
  draft: "muted",
  matched: "info",
  posted: "brand",
  payment_pending: "gold",
  paid: "success",
  released: "spruce",
  exception: "danger",
  cancelled: "muted",
} satisfies Record<APHistoryRow["controlState"], DashboardTone>

function StateBadge({
  state,
  t,
}: {
  state: APHistoryRow["controlState"]
  t: APHistoryT
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md",
        dashboardToneClass(apControlStateTones[state]),
      )}
    >
      {controlStateLabel(state, t)}
    </Badge>
  )
}

function controlStateLabel(
  state: APHistoryRow["controlState"],
  t: APHistoryT,
) {
  switch (state) {
    case "draft":
      return t("controlStates.draft")
    case "matched":
      return t("controlStates.matched")
    case "posted":
      return t("controlStates.posted")
    case "payment_pending":
      return t("controlStates.paymentPending")
    case "paid":
      return t("controlStates.paid")
    case "released":
      return t("controlStates.released")
    case "exception":
      return t("controlStates.exception")
    case "cancelled":
      return t("controlStates.cancelled")
  }
}

function formatMoney(value: string | number, currency: string, locale: string) {
  const amount = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatHistoryDate(value: string | null | undefined, locale: string, timezone: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date)
}
