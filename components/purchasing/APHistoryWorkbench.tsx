"use client"

import { OpenItemsReturnLink } from "@/components/finance/OpenItemsReturnLink"
import { useState } from "react"
import Link from "next/link"
import { paymentReconciliationCopy } from "./payment-reconciliation-copy"
import { APHistoryExportDialog } from "./APHistoryExportDialog"

import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, CalendarClock, Database, Landmark, ReceiptText, RotateCcw, Truck } from "lucide-react"

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
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { financePayablesHistoryTableContract } from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
import { useAPHistoryWorkbench } from "@/hooks/useAPHistoryWorkbench"
import { formatAPHistoryMoney, formatAPHistoryTotal } from "@/lib/purchasing/ap-history-presentation"
import { cn } from "@/lib/utils"
import type { APHistoryResult, APHistoryRow } from "@/services/purchasing/ap-history.service"

type APHistoryT = ReturnType<typeof useTranslations<"apHistory">>

export function APHistoryWorkbench({ organizationId, actorId, canExport = false }: { organizationId: string; actorId: string; canExport?: boolean }) {
  const [exportOpen, setExportOpen] = useState(false)
  const t = useTranslations("apHistory")
  const locale = useLocale()
  const {
    filters,
    result,
    rows,
    selectedRowId,
    isLoading,
    isError,
    isStale,
    restartHistory,
    error,
    refetch,
    hasMore,
    nextPage,
    updateFilters,
    resetFilters,
    selectRow,
  } = useAPHistoryWorkbench({ organizationId, actorId })
  const timezone = result?.snapshot.timezone ?? result?.appliedFilters.timezone ?? "UTC"
  const selectedRow = isError ? null : rows.find((row) => row.id === selectedRowId) ?? null
  const isPartial = result?.completeness.state === "partial"
  const supplierScope = filters.supplierId
    ? rows.find((row) => row.supplier.id === filters.supplierId)?.supplier.name ??
      filters.supplierId
    : null
  const scopeLabel = supplierScope
    ? t("scopeSupplier", { supplier: supplierScope })
    : t("scopeLabel")
  const canonicalQuery = createCanonicalTableQuery(financePayablesHistoryTableContract, {
    filters: {
      ...(filters.lane && filters.lane !== "all" ? { lane: [filters.lane] } : {}),
      ...(filters.supplierId ? { supplierId: [filters.supplierId] } : {}),
      ...(filters.dateFrom ? { dateFrom: [filters.dateFrom] } : {}),
      ...(filters.dateTo ? { dateTo: [filters.dateTo] } : {}),
    },
    sort: [{ id: "effectiveAt", desc: true }],
    pageIndex: 0,
    pageSize: filters.pageSize,
    cursor: filters.cursor,
  })
  const hasActiveFilters = Boolean(
    (filters.lane && filters.lane !== "all") ||
      filters.supplierId ||
      filters.dateFrom ||
      filters.dateTo,
  )
  const canonicalState = isError
    ? "error"
    : isLoading && rows.length === 0
      ? "loading"
      : rows.length === 0
        ? hasActiveFilters
          ? "no-results"
          : "empty"
        : isLoading
          ? "refreshing"
          : "ready"

  return (
    <>
    <OpenItemsReturnLink locale={locale === "fr" ? "fr" : "en"} />
    {filters.invoiceId && <p className="px-4 pb-3 text-sm">{locale === "fr" ? "Facture sélectionnée uniquement ; les totaux et exports suivent ce filtre. Réinitialisez les filtres pour l’historique global." : "Selected invoice only; totals and exports follow this filter. Reset filters for full history."}</p>}
    <APHistoryExportDialog open={exportOpen} onOpenChange={setExportOpen} organizationId={organizationId} actorId={actorId} filters={{ invoiceId: filters.invoiceId, lane: filters.lane, supplierId: filters.supplierId, dateFrom: filters.dateFrom, dateTo: filters.dateTo }} />
    <CanonicalTableBoundary
      contract={financePayablesHistoryTableContract}
      locale={locale === "fr" ? "fr" : "en"}
      query={canonicalQuery}
      state={canonicalState}
    >
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
        retry: t(isStale ? "states.refreshHistory" : "states.retry"),
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
        errorTitle: t(isStale ? "states.staleTitle" : "states.errorTitle"),
        partialTitle: t("states.partialTitle"),
        partialMessage: t("states.partialMessage"),
        permissionTitle: t("states.permissionTitle"),
        permissionMessage: t("states.permissionMessage"),
        noOrgTitle: t("states.noOrgTitle"),
        noOrgMessage: t("states.noOrgMessage"),
        proofUnavailableTitle: t("proof.scopeTitle"),
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
        status: (row) => <><StateBadge state={row.controlState} t={t} />{row.retained ? <span className="ml-2 text-xs">{t("retained")}</span> : null}</>,
        value: (row) => <div className="space-y-2"><div>{movementLabel(row, t, locale)}</div><p className="break-words text-sm font-normal text-[var(--dash-text-soft)]">{t("table.evidence")}: {evidenceLabel(row, t)}</p></div>,
      }}
      drawerTitle={(row) => row.reference.invoiceNumber ?? row.reference.paymentNumber ?? row.sourceId}
      drawerDescription={(row) => `${row.supplier.name} / ${t(`sourceTypes.${row.sourceType}`)}`}
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
      onRetry={() => isStale ? restartHistory() : refetch()}
      onExport={canExport ? () => setExportOpen(true) : undefined}
      isLoading={isLoading}
      isError={isError}
      errorMessage={isStale ? t("states.staleMessage") : error instanceof Error ? error.message : undefined}
      hasMore={hasMore}
      isPartial={isPartial}
      wrapProofSummary
      partialSources={result?.completeness.sources.filter((source) => source.state === "partial").map((source) => source.source === "supplier_ap_history_accounting_claim" ? t("proof.accountingScope") : source.source === "supplier_invoices" ? t("sources.invoices") : source.source === "supplier_payments" ? t("sources.payments") : source.source) ?? []}
      headerActions={[
        ...(isStale ? [{ label: t("filters.reset"), icon: RotateCcw, onClick: resetFilters, variant: "secondary" as const }] : []),
        ...(filters.supplierId
          ? [
              {
                label: t("actions.backToSupplier"),
                href:
                  "/" +
                  locale +
                  "/dashboard/purchases/suppliers/" +
                  encodeURIComponent(filters.supplierId),
                icon: ArrowLeft,
                variant: "secondary" as const,
              },
            ]
          : [])
      ]}
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
    </CanonicalTableBoundary>
    </>
  )
}

function APHistoryDrawer({ row, locale, timezone, t }: { row: APHistoryRow; locale: string; timezone: string; t: APHistoryT }) {
  return (
    <>
      {row.sourceType === "SUPPLIER_PAYMENT" && ["RELEASED", "POSTED"].includes(row.businessState) && <Link href={`/${locale}/dashboard/purchases/payables/payments/reconcile?payment=${encodeURIComponent(row.sourceId)}`} className="button-gold-chestnut-link mb-4 inline-block break-words underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{paymentReconciliationCopy(locale).link}</Link>}
      <DetailSection title={t("drawer.businessIdentity")}>
        <dl>
          <DetailLine label={t("drawer.lane")} value={laneLabel(row.lane, t)} />
          <DetailLine label={t("drawer.source")} value={<span className="break-all">{row.sourceId}</span>} />
          <DetailLine label={t("drawer.amount")} value={formatMoney(row.amount, row.currency, locale)} />
          <DetailLine label={t("drawer.signedMovement")} value={movementLabel(row, t, locale)} />
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.accounting")}>
        <dl>
          <DetailLine label={t("drawer.businessState")} value={row.lane === "invoice" ? controlStateLabel(row.controlState, t) : paymentStateLabel(row.businessState, t)} />
          <DetailLine label={t("drawer.ledgerPostingBatch")} value={row.accounting.ledgerPostingBatchId} />
          <DetailLine label={t("drawer.businessEvent")} value={row.accounting.postedBusinessEventId} />
          <DetailLine label={t("drawer.documentHash")} value={<span className="break-all">{row.accounting.documentHash ?? "-"}</span>} />
          <DetailLine label={t("drawer.evidenceHash")} value={<span className="break-all">{row.accounting.evidenceHash ?? evidenceLabel(row, t)}</span>} />
          {row.movementState === "unverified" && <DetailLine label={t("table.evidence")} value={t("proof.needsReview")} />}
        </dl>
      </DetailSection>
      <DetailSection title={t("drawer.sourceAttribution")}>
        <dl>
          <DetailLine label={t("drawer.supplier")} value={row.supplier.name} />
          <DetailLine label={t("drawer.purchaseOrder")} value={row.reference.purchaseOrderId} />
          <DetailLine label={t("drawer.dueDate")} value={formatHistoryDate(row.reference.dueDate, locale, timezone)} />
          <DetailLine label={t("drawer.bankDestination")} value={row.payment.redactions.some((redaction) => redaction.category === "supplier_bank_detail") ? t("proof.bankDetailsProtected") : row.payment.bankDestination ?? t("proof.notRecorded")} />
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
    { id: "openPayable", label: t("kpis.openPayable"), value: formatAPHistoryTotal(summary, "openPayable", locale), tone: "gold" },
    { id: "releasedPayments", label: t("kpis.releasedPayments"), value: formatAPHistoryTotal(summary, "releasedPaymentTotal", locale), tone: summary?.unverifiedCount ? "gold" : "info" },
    { id: "ledgerBlockers", label: t("kpis.ledgerBlockers"), value: summary?.ledgerBlockerCount ?? 0, tone: summary?.ledgerBlockerCount ? "danger" : "info" },
  ]
}

function buildColumns(t: APHistoryT, locale: string, timezone: string): TransactionHistoryColumn<APHistoryRow>[] {
  return [
    { id: "documentNumber", header: t("table.reference"), cell: (row) => row.reference.invoiceNumber ?? row.reference.paymentNumber ?? row.sourceId },
    { id: "counterparty", header: t("table.supplier"), cell: (row) => row.supplier.name },
    { id: "dueDate", header: t("drawer.dueDate"), cell: (row) => formatHistoryDate(row.reference.dueDate, locale, timezone) },
    { id: "status", header: t("table.state"), cell: (row) => <><StateBadge state={row.controlState} t={t} />{row.retained ? <span className="ml-2 text-xs">{t("retained")}</span> : null}</> },
    { id: "currency", header: t("table.currency"), cell: (row) => row.currency },
    { id: "amount", header: t("table.amount"), cell: (row) => formatMoney(row.amount, row.currency, locale) },
    { id: "movement", header: t("table.movement"), cell: (row) => movementLabel(row, t, locale) },
    { id: "evidence", header: t("table.evidence"), cell: (row) => evidenceLabel(row, t) },
  ]
}

function evidenceLabel(row: APHistoryRow, t: APHistoryT) {
  if (row.movementState === "unverified") return t("proof.needsReview")
  if (row.accounting.evidenceHash) return row.accounting.evidenceHash
  if (
    row.controlState === "draft" &&
    row.movementState === "not_recognized" &&
    (row.lane === "invoice" || (row.lane === "payment" && row.businessState === "DRAFT"))
  ) return t("proof.draftNotPosted")
  return t("proof.unavailableTitle")
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
        "whitespace-normal break-words rounded-md",
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

function paymentStateLabel(state: string, t: APHistoryT) {
  switch (state) {
    case "DRAFT": return t("paymentStates.DRAFT")
    case "APPROVED": return t("paymentStates.APPROVED")
    case "RELEASED": return t("paymentStates.RELEASED")
    case "POSTED": return t("paymentStates.POSTED")
    case "CANCELLED": return t("paymentStates.CANCELLED")
    case "FAILED": return t("paymentStates.FAILED")
    default: return t("paymentStates.unknown")
  }
}

function formatMoney(value: string | number | null, currency: string, locale: string) {
  return formatAPHistoryMoney(value, currency, locale)
}

function movementLabel(row: APHistoryRow, t: APHistoryT, locale: string) {
  if (row.movementState === "not_recognized") return t("movement.notRecognized")
  if (row.movementState !== "recorded" || row.signedPayableMovement == null) return t("movement.unverified")
  return formatMoney(row.signedPayableMovement, row.currency, locale)
}

function formatHistoryDate(value: string | null | undefined, locale: string, timezone: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date)
}
