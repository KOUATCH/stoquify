"use client"

import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, Banknote, CalendarClock, Database, Filter, Landmark, ReceiptText, UserRound } from "lucide-react"

import {
  DetailLine,
  DetailSection,
  TransactionHistoryWorkbenchShell,
  type TransactionHistoryColumn,
  type TransactionHistoryFilters,
  type TransactionHistoryFilterOption,
  type TransactionHistoryKpi,
} from "@/components/dashboard/history/TransactionHistoryWorkbenchShell"
import { Badge } from "@/components/ui/badge"
import { useCashPaymentHistoryWorkbench, type CashPaymentHistoryUrlFilters } from "@/hooks/useCashPaymentHistoryWorkbench"
import type { CashPaymentHistoryResult, CashPaymentHistoryRow } from "@/services/pos/cash-payment-history.service"

type CashPaymentHistoryT = ReturnType<typeof useTranslations<"cashPaymentHistory">>

const laneOptions = ["cash", "payment"] as const
const paymentMethodOptions = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"] as const
const paymentStatusOptions = ["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED", "FAILED"] as const
const cashTypeOptions = ["OPENING_BALANCE", "SALE", "RETURN", "CASH_IN", "CASH_OUT", "CLOSING_BALANCE", "REFUND", "PAYOUT"] as const

export function CashPaymentHistoryWorkbench() {
  const t = useTranslations("cashPaymentHistory")
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
  } = useCashPaymentHistoryWorkbench()
  const timezone = result?.snapshot.timezone ?? result?.appliedFilters.timezone ?? "UTC"
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null
  const partialSources = sourceNames(result)
  const isPartial = result?.completeness.state === "partial"
  const typeOptions = buildTypeOptions(t, filters.lane)

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
      filters={{ ...filters, type: filterTypeValue(filters) }}
      typeOptions={typeOptions}
      kpis={buildCashPaymentKpis(result, t)}
      actionItems={buildActionItems(result, t, partialSources, isPartial)}
      columns={buildColumns(t, locale, timezone)}
      rows={rows}
      rowIdentity={{
        id: (row) => row.id,
        title: (row) => row.reference.paymentNumber ?? row.reference.reason ?? row.sourceId,
        subtitle: (row) => `${laneLabel(row.lane, t)} / ${row.cashier.name ?? row.cashier.id ?? t("common.unknown")}`,
        status: (row) => <StateBadge state={row.controlState} label={controlLabel(row.controlState, t)} />,
        value: (row) => formatMoney(row.amount, row.currency, locale),
      }}
      drawerTitle={(row) => row.reference.paymentNumber ?? row.sourceId}
      drawerDescription={(row) => `${laneLabel(row.lane, t)} / ${row.sourceType}`}
      drawerMetadata={(row) => [
        { label: t("drawer.effectiveAt"), value: formatHistoryDate(row.effectiveAt, locale, timezone), icon: CalendarClock },
        { label: t("drawer.recordedAt"), value: formatHistoryDate(row.recordedAt, locale, timezone), icon: Database },
        { label: t("drawer.cashier"), value: row.cashier.name ?? row.cashier.id ?? t("common.unknown"), icon: UserRound },
      ]}
      renderDrawer={(row) => <CashPaymentDrawer row={row} locale={locale} timezone={timezone} t={t} />}
      selectedRow={selectedRow}
      selectedRowId={selectedRowId}
      onFilterChange={(patch: Partial<TransactionHistoryFilters>) => updateFilters(mapShellFilterPatch(patch, filters.lane))}
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
      snapshotMetadata={[
        { label: t("snapshot.timezone"), value: timezone, icon: Filter },
        { label: t("snapshot.recordedThrough"), value: formatHistoryDate(result?.snapshot.recordedThrough, locale, timezone), icon: CalendarClock },
        { label: t("snapshot.generatedAt"), value: formatHistoryDate(result?.snapshot.generatedAt, locale, timezone), icon: Database },
      ]}
    />
  )
}

function CashPaymentDrawer({ row, locale, timezone, t }: { row: CashPaymentHistoryRow; locale: string; timezone: string; t: CashPaymentHistoryT }) {
  return (
    <>
      <DetailSection title={t("drawer.businessIdentity")}>
        <dl>
          <DetailLine label={t("drawer.lane")} value={laneLabel(row.lane, t)} />
          <DetailLine label={t("drawer.source")} value={`${row.sourceType} / ${row.sourceId}`} />
          <DetailLine label={t("drawer.amount")} value={formatMoney(row.amount, row.currency, locale)} />
          <DetailLine label={t("drawer.direction")} value={directionLabel(row.direction, t)} />
          <DetailLine label={t("drawer.physicalCashImpact")} value={formatMoney(row.accounting.physicalCashImpact, row.currency, locale)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.sourceAttribution")}>
        <dl>
          <DetailLine label={t("drawer.location")} value={row.location.name ?? row.location.id} />
          <DetailLine label={t("drawer.cashier")} value={row.cashier.name ?? row.cashier.id} />
          <DetailLine label={t("drawer.drawer")} value={row.drawer.name ?? row.drawer.id} />
          <DetailLine label={t("drawer.session")} value={row.session.number ?? row.session.id} />
          <DetailLine label={t("drawer.effectiveAt")} value={formatHistoryDate(row.effectiveAt, locale, timezone)} />
          <DetailLine label={t("drawer.recordedAt")} value={formatHistoryDate(row.recordedAt, locale, timezone)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.controlStates")}>
        <dl>
          <DetailLine label={t("drawer.businessState")} value={businessLabel(row.businessState, t)} />
          <DetailLine label={t("drawer.controlState")} value={controlLabel(row.controlState, t)} />
          <DetailLine label={t("drawer.paymentMethod")} value={row.payment.method ? paymentMethodLabel(row.payment.method, t) : "-"} />
          <DetailLine label={t("drawer.paymentStatus")} value={row.payment.status ? paymentStatusLabel(row.payment.status, t) : "-"} />
          <DetailLine label={t("drawer.reconciliationState")} value={row.accounting.reconciliationState ?? "-"} />
          <DetailLine label={t("drawer.ledgerPostingBatch")} value={row.accounting.ledgerPostingBatchId} />
          <DetailLine label={t("drawer.providerReference")} value={row.payment.providerReference ?? t("proof.unavailableTitle")} />
          <DetailLine label={t("drawer.proof")} value={t("proof.unavailableMessage")} />
        </dl>
      </DetailSection>
    </>
  )
}

function buildCashPaymentKpis(result: CashPaymentHistoryResult | undefined, t: CashPaymentHistoryT): TransactionHistoryKpi[] {
  const summary = result?.summary
  return [
    { id: "transactions", label: t("kpis.transactionCount"), value: summary?.transactionCount ?? "-", detail: t("kpis.transactionCountDetail"), tone: "brand" },
    { id: "expected-cash", label: t("kpis.expectedPhysicalCash"), value: summary ? moneyText(summary.expectedPhysicalCash, summary.currency) : "-", detail: t("kpis.expectedPhysicalCashDetail"), tone: "success" },
    { id: "variance", label: t("kpis.cashVariance"), value: summary ? moneyText(summary.cashVariance, summary.currency) : "-", detail: t("kpis.cashVarianceDetail"), tone: summary && summary.cashVariance !== "0.00" ? "gold" : "success" },
    { id: "electronic", label: t("kpis.electronicTenderTotal"), value: summary ? moneyText(summary.electronicTenderTotal, summary.currency) : "-", detail: t("kpis.electronicTenderTotalDetail"), tone: "info" },
  ]
}

function buildActionItems(result: CashPaymentHistoryResult | undefined, t: CashPaymentHistoryT, partialSources: string[], isPartial: boolean) {
  const items = []
  if (isPartial) {
    items.push({
      id: "partial-source",
      title: t("actions.partialSourceTitle"),
      summary: t("actions.partialSourceSummary"),
      tone: "gold" as const,
      icon: AlertTriangle,
      metadata: partialSources.map((source, index) => ({ label: t("actions.partialSource"), value: source || String(index + 1) })),
    })
  }
  if (result?.summary.cashVariance && result.summary.cashVariance !== "0.00") {
    items.push({ id: "cash-variance", title: t("actions.cashVarianceTitle"), summary: t("actions.cashVarianceSummary"), tone: "gold" as const, icon: Banknote, metadata: [{ label: t("kpis.cashVariance"), value: moneyText(result.summary.cashVariance, result.summary.currency) }] })
  }
  if ((result?.summary.unresolvedPaymentCount ?? 0) > 0) {
    items.push({ id: "unresolved-payments", title: t("actions.unresolvedPaymentsTitle"), summary: t("actions.unresolvedPaymentsSummary"), tone: "gold" as const, icon: ReceiptText, metadata: [{ label: t("kpis.unresolvedPayments"), value: String(result?.summary.unresolvedPaymentCount ?? 0) }] })
  }
  return items
}

function buildColumns(t: CashPaymentHistoryT, locale: string, timezone: string): TransactionHistoryColumn<CashPaymentHistoryRow>[] {
  return [
    { id: "source", header: t("columns.source"), cell: (row) => <RowText primary={row.reference.paymentNumber ?? row.sourceId} secondary={laneLabel(row.lane, t)} /> },
    { id: "type", header: t("columns.type"), cell: (row) => businessLabel(row.sourceType, t) },
    { id: "amount", header: t("columns.amount"), cell: (row) => formatMoney(row.amount, row.currency, locale) },
    { id: "cashier", header: t("columns.cashier"), cell: (row) => row.cashier.name ?? row.cashier.id ?? "-" },
    { id: "status", header: t("columns.status"), cell: (row) => <StateBadge state={row.controlState} label={controlLabel(row.controlState, t)} /> },
    { id: "effectiveAt", header: t("columns.effectiveAt"), cell: (row) => formatHistoryDate(row.effectiveAt, locale, timezone) },
  ]
}

function RowText({ primary, secondary }: { primary: string; secondary?: string }) {
  return <span className="block min-w-0"><span className="block break-words font-medium text-[var(--dash-text)]">{primary}</span>{secondary ? <span className="block text-xs text-[var(--dash-text-soft)]">{secondary}</span> : null}</span>
}

function StateBadge({ state, label }: { state: string; label: string }) {
  const tone = state === "exception" || state === "suspense" ? "border-[var(--dash-warning)] text-[var(--dash-warning)]" : state === "reconciled" || state === "posted" ? "border-[var(--dash-success)] text-[var(--dash-success)]" : "border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
  return <Badge variant="outline" className={`rounded-md ${tone}`}>{label}</Badge>
}

function buildTypeOptions(t: CashPaymentHistoryT, lane?: string): TransactionHistoryFilterOption[] {
  const lanes = laneOptions.map((value) => ({ value: `lane:${value}`, label: t(`lanes.${value}`) }))
  const methods = paymentMethodOptions.map((value) => ({ value: `paymentMethod:${value}`, label: paymentMethodLabel(value, t) }))
  const statuses = paymentStatusOptions.map((value) => ({ value: `paymentStatus:${value}`, label: paymentStatusLabel(value, t) }))
  const cashTypes = cashTypeOptions.map((value) => ({ value: `cashType:${value}`, label: cashTypeLabel(value, t) }))
  if (lane === "cash") return [...lanes, ...cashTypes]
  if (lane === "payment") return [...lanes, ...methods, ...statuses]
  return [...lanes, ...cashTypes, ...methods, ...statuses]
}

function filterTypeValue(filters: { lane?: string; cashType?: string; paymentMethod?: string; paymentStatus?: string }) {
  if (filters.cashType) return `cashType:${filters.cashType}`
  if (filters.paymentMethod) return `paymentMethod:${filters.paymentMethod}`
  if (filters.paymentStatus) return `paymentStatus:${filters.paymentStatus}`
  if (filters.lane && filters.lane !== "all") return `lane:${filters.lane}`
  return undefined
}

function mapShellFilterPatch(patch: Partial<TransactionHistoryFilters>, currentLane?: CashPaymentHistoryUrlFilters["lane"]): Partial<CashPaymentHistoryUrlFilters> {
  if (!patch.type) return patch
  const [kind, value] = patch.type.split(":")
  if (kind === "lane") return { ...patch, type: undefined, lane: toLaneFilter(value), cashType: undefined, paymentMethod: undefined, paymentStatus: undefined }
  if (kind === "cashType") return { ...patch, type: undefined, lane: currentLane === "payment" ? "all" : currentLane, cashType: value, paymentMethod: undefined, paymentStatus: undefined }
  if (kind === "paymentMethod") return { ...patch, type: undefined, lane: currentLane === "cash" ? "all" : currentLane, paymentMethod: value, cashType: undefined }
  if (kind === "paymentStatus") return { ...patch, type: undefined, lane: currentLane === "cash" ? "all" : currentLane, paymentStatus: value, cashType: undefined }
  return patch
}

function toLaneFilter(value: string): CashPaymentHistoryUrlFilters["lane"] {
  return laneOptions.includes(value as (typeof laneOptions)[number]) ? (value as CashPaymentHistoryUrlFilters["lane"]) : "all"
}

function sourceNames(result: CashPaymentHistoryResult | undefined) {
  return result?.completeness.sources.filter((source) => source.state !== "complete").map((source) => source.source) ?? []
}

function exportStatusFromRaw(raw: string, t: CashPaymentHistoryT) {
  return raw === "ready" ? t("actions.exportReady") : raw
}

function formatHistoryDate(value: string | null | undefined, locale: string, timezone: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value))
}

function formatMoney(value: string, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2 }).format(Number(value))
}

function moneyText(value: string, currency: string) {
  return `${value} ${currency}`
}

function laneLabel(value: string, t: CashPaymentHistoryT) {
  return t(`lanes.${value}`)
}

function directionLabel(value: string, t: CashPaymentHistoryT) {
  return t(`directions.${value}`)
}

function controlLabel(value: string, t: CashPaymentHistoryT) {
  return t(`controlStates.${value}`)
}

function cashTypeLabel(value: string, t: CashPaymentHistoryT) {
  return t(`cashTypes.${value}`)
}

function paymentMethodLabel(value: string, t: CashPaymentHistoryT) {
  return t(`paymentMethods.${value}`)
}

function paymentStatusLabel(value: string, t: CashPaymentHistoryT) {
  return t(`paymentStatuses.${value}`)
}

function businessLabel(value: string, t: CashPaymentHistoryT) {
  const keys = [`cashTypes.${value}`, `paymentStatuses.${value}`]
  for (const key of keys) {
    try {
      return t(key)
    } catch {
      // Keep unknown source states visible without creating financial meaning in the client.
    }
  }
  return value.replaceAll("_", " ").toLowerCase()
}
