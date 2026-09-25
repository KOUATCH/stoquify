"use client"

import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Filter,
  HandCoins,
  LineChart,
  MapPin,
  Percent,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { DataTableViewOptions } from "@/components/DataTableComponents/DataTableViewOptions"
import { RenderedDataTable } from "@/components/DataTableComponents/RenderedDataTable"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { CanonicalTableDensityControl } from "@/components/DataTableComponents/CanonicalTableDensityControl"
import { useCanonicalTablePreferences } from "@/components/DataTableComponents/useCanonicalTablePreferences"
import { financeCashFlowTableContract } from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import {
  ActionQueue,
  CommandBriefHeader,
  EvidenceTimeline,
  KpiTile,
  StatusStrip,
  type CommandCenterAction,
} from "@/components/dashboard/primitives"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  FinancePaymentMethodBreakdown,
  FinanceWorkflowActionPanel,
  PaymentsTable as FinanceLedgerPaymentsTable,
} from "@/components/finance/FinanceSpecializedLedgerSurfaces"
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard"
import { WorkspaceSectionNavigation } from "@/components/dashboard/WorkspaceSectionNavigation"
import { CashFlowMovementSummary, CashFlowNavigation, CashFlowSectionHeading } from "@/components/finance/CashFlowPresentation"
import {
  dashboardControlClass,
  dashboardEmptyClass,
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardSeverityClass,
  dashboardToneBg,
  dashboardValueTone,
} from "@/components/finance/finance-dashboard-theme"
import {
  buildFinanceActionQueueItems,
  buildFinanceEvidenceEvents,
  buildFinanceStatusItems,
  financeConfidenceTone,
  type FinanceAlertActionLabels,
  type FinanceRiskLabels,
} from "@/components/finance/finance-command-center-normalization"
import { localizePath, pickLocale } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type { FinanceDashboardPeriod, FinanceDashboardView } from "@/services/finance/finance-dashboard.schemas"
import type {
  FinanceAgingSummary,
  FinanceAlert,
  FinanceCounterparty,
  FinanceRecentPayment,
  FinanceTrendPoint,
} from "@/services/finance/finance-dashboard.service"

const allLocationsValue = "all"
const views: FinanceDashboardView[] = [
  "overview",
  "payments",
  "receivables",
  "payables",
  "cash-flow",
  "sales",
  "costs",
  "profitability",
  "analytics",
  "retail",
]
const periods: FinanceDashboardPeriod[] = ["today", "yesterday", "7d", "30d", "mtd", "qtd", "ytd", "custom"]

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 29)
  return { start: inputDate(start), end: inputDate(now) }
}


function LoadingState({ cashFlow = false }: { cashFlow?: boolean }) {
  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
        <Skeleton className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
        <div className={cn("grid min-w-0 grid-cols-1 gap-3", !cashFlow && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </main>
  )
}

export default function FinanceCommandCenterDashboard({
  initialView = "overview",
  layout = "default",
}: {
  initialView?: FinanceDashboardView
  layout?: "default" | "profit-loss" | "costs"
}) {
  const t = useTranslations("financeDashboard")
  const surfaceT = useTranslations("financeSurfaces")
  const locale: Locale = pickLocale(useLocale())
  const notifications = useNotifications()
  const [view, setView] = useState<FinanceDashboardView>(initialView)
  const [period, setPeriod] = useState<FinanceDashboardPeriod>("mtd")
  const [locationId, setLocationId] = useState(allLocationsValue)
  const [customRange, setCustomRange] = useState(defaultCustomRange)

  const queryInput = useMemo(
    () => ({
      view,
      locationId: locationId === allLocationsValue ? undefined : locationId,
      period,
      startDate: period === "custom" ? new Date(`${customRange.start}T00:00:00`) : undefined,
      endDate: period === "custom" ? new Date(`${customRange.end}T23:59:59`) : undefined,
    }),
    [customRange.end, customRange.start, locationId, period, view],
  )
  const dashboardQuery = useFinanceDashboard(queryInput)
  const response = dashboardQuery.data
  const dashboard = response?.success ? response.data : null
  const errorMessage = response && !response.success ? response.error : dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null
  const currency = dashboard?.organization.currency ?? "USD"
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
      }),
    [currency, locale],
  )
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }), [locale])
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), [locale])
  const compact = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale])

  const money = (value: number | null | undefined) => moneyFormatter.format(value ?? 0)
  const shortMoney = (value: number | null | undefined) => compact.format(value ?? 0)
  const percent = (value: number | null | undefined) => `${Math.round(value ?? 0)}%`
  const formatDateTime = (value: string | null | undefined) => value ? timeFormatter.format(new Date(value)) : t("common.notAvailable")

  async function refreshDashboard() {
    notifications.info(t("notifications.refreshTitle"), t("notifications.refreshMessage"), { category: "financial" })
    const result = await dashboardQuery.refetch()
    if (result.data?.success) {
      notifications.success(t("notifications.refreshedTitle"), t("notifications.refreshedMessage"), { category: "financial" })
    } else {
      notifications.error(t("notifications.failedTitle"), result.data?.error || t("notifications.failedMessage"), { category: "financial" })
    }
  }

  function alertText(alert: FinanceAlert) {
    if (alert.code === "OVERDUE_AR") return t("alerts.overdueAr", { count: alert.count, amount: money(alert.amount) })
    if (alert.code === "OVERDUE_AP") return t("alerts.overdueAp", { count: alert.count, amount: money(alert.amount) })
    if (alert.code === "NEGATIVE_MARGIN") return t("alerts.negativeMargin", { amount: money(alert.amount) })
    if (alert.code === "PENDING_PAYMENTS") return t("alerts.pendingPayments", { count: alert.count, amount: money(alert.amount) })
    if (alert.code === "CASH_GAP") return t("alerts.cashGap", { amount: money(alert.amount) })
    if (alert.code === "PAYROLL_FORECAST_PROOF") return alert.message || t("alerts.payrollForecastProof", { count: alert.count, amount: money(alert.amount) })
    return t("alerts.ready")
  }

  const localizedHref = (href: string) => localizePath(href, locale)
  const commandActions = [
    { label: t("actions.reconciliation"), href: localizedHref("/dashboard/finance/reconciliation"), icon: ShieldCheck, variant: "primary" },
    { label: t("actions.orderPayments"), href: localizedHref("/dashboard/orders/payments"), icon: CreditCard, variant: "secondary" },
    view === "cash-flow"
      ? { label: t("actions.cashDrawers"), href: localizedHref("/dashboard/finance/cash-drawer"), icon: Wallet, variant: "secondary" }
      : { label: t("actions.cashFlow"), href: localizedHref("/dashboard/finance/cash-flow"), icon: LineChart, variant: "secondary" },
  ] satisfies CommandCenterAction[]
  const actionLabels = {
    OVERDUE_AR: t("views.receivables"),
    OVERDUE_AP: t("views.payables"),
    NEGATIVE_MARGIN: t("actions.cashFlow"),
    PENDING_PAYMENTS: t("views.payments"),
    CASH_GAP: t("actions.cashFlow"),
    PAYROLL_FORECAST_PROOF: t("actions.payroll"),
    READY: t("sections.assurance"),
  } satisfies FinanceAlertActionLabels
  const riskLabels = {
    critical: t("command.riskCritical"),
    warning: t("command.riskWarning"),
    watch: t("command.riskWatch"),
    ready: t("command.riskReady"),
  } satisfies FinanceRiskLabels
  const actionQueueItems = dashboard
    ? buildFinanceActionQueueItems(dashboard.alerts, {
        alertText,
        localizeHref: localizedHref,
        actionLabels,
        riskLabels,
        ownerLabel: t("command.owner"),
        proofSource: t("command.proofSource"),
      })
    : []
  const statusItems = dashboard
    ? buildFinanceStatusItems(dashboard.summary, {
        money,
        labels: {
          paymentsCollected: t("summary.paymentsCollected"),
          pendingPayments: t("summary.pendingPayments"),
          netTax: t("summary.tax"),
          drawerVariance: t("summary.drawerVariance"),
          proofSource: t("command.proofSource"),
        },
      })
    : []
  const evidenceEvents = dashboard
    ? buildFinanceEvidenceEvents(dashboard.recentPayments, {
        money,
        formatDateTime,
        localizeHref: localizedHref,
        labels: {
          proofSource: t("command.proofSource"),
          methodLabel: (method) => t(`methods.${method}`),
          statusLabel: (status) => t(`statuses.${status}`),
        },
      })
    : []

  const isProfitLossLayout = layout === "profit-loss"
  const isCostsLayout = layout === "costs"
  const isCashFlowLayout = view === "cash-flow"
  const sectionPrefix = isCashFlowLayout ? "cash-flow" : "finance"
  if (dashboardQuery.isLoading && !dashboard) return <LoadingState cashFlow={isCashFlowLayout} />

  if (errorMessage && !dashboard) {
    return <DashboardErrorState error="Finance dashboard data unavailable" reset={() => { void dashboardQuery.refetch() }} />
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden" data-finance-result-state={errorMessage ? "error" : dashboardQuery.isFetching ? "refreshing" : "ready"}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] min-w-0 space-y-6 px-4 py-4 text-[var(--dash-text)] sm:px-6 sm:py-6">
      <CommandBriefHeader
        title={isCashFlowLayout ? t("cashFlow.title") : isProfitLossLayout ? t("presentation.profitLossTitle") : view === "overview" ? t("title") : t(`views.${view}`)}
        summary={isCashFlowLayout ? t("cashFlow.subtitle") : t(`presentation.descriptions.${view}`)}
        eyebrow={t(isCashFlowLayout ? "cashFlow.eyebrow" : "command.eyebrow")}
        state={dashboard ? { label: `${t("metrics.confidence")} ${percent(dashboard.summary.financeConfidence)}`, tone: financeConfidenceTone(dashboard.summary.financeConfidence), icon: ShieldCheck } : { label: t("common.notAvailable"), tone: "muted" }}
        metadata={dashboard ? [
          { label: t("command.organization"), value: dashboard.organization.name, icon: Building2 },
          { label: t("command.period"), value: `${dateFormatter.format(new Date(dashboard.filters.startDate))} - ${dateFormatter.format(new Date(dashboard.filters.endDate))}`, icon: CalendarDays },
          { label: t("command.generated"), value: formatDateTime(dashboard.generatedAt), icon: RefreshCw },
        ] : []}
        actions={commandActions}
        actionsPlacement="below-content"
        proof={dashboard ? {
          state: dashboard.alerts.some((alert) => alert.code !== "READY" && alert.severity === "critical") ? "pending" : "verified",
          label: t("command.proofLabel"),
          source: t("command.proofSource"),
          sourceCount: dashboard.recentPayments.length + dashboard.paymentMethods.length,
        } : undefined}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[190px_190px_190px_auto]">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
              <BarChart3 className="h-3.5 w-3.5 text-[var(--dash-brand-strong)]" />
              {t("filters.view")}
            </div>
            <Select value={view} onValueChange={(value) => setView(value as FinanceDashboardView)}>
              <SelectTrigger className={dashboardControlClass} aria-label={t("filters.view")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {views.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`views.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--dash-info)]" />
              {t("filters.location")}
            </div>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className={dashboardControlClass} aria-label={t("filters.location")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allLocationsValue}>{t("filters.allLocations")}</SelectItem>
                {dashboard?.locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
              <Filter className="h-3.5 w-3.5 text-[var(--dash-gold)]" />
              {t("filters.period")}
            </div>
            <Select value={period} onValueChange={(value) => setPeriod(value as FinanceDashboardPeriod)}>
              <SelectTrigger className={dashboardControlClass} aria-label={t("filters.period")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`periods.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            {period === "custom" ? (
              <TableDateRangePicker
                value={{ from: customRange.start, to: customRange.end }}
                onChange={(range) => setCustomRange({ start: range.from ?? "", end: range.to ?? "" })}
                locale={locale}
                triggerClassName="h-10"
              />
            ) : null}
            <Button
              type="button"
              onClick={refreshDashboard}
              disabled={dashboardQuery.isFetching}
              className="dashboard-button-primary h-10 rounded-lg"
            >
              <RefreshCw className={cn("h-4 w-4", dashboardQuery.isFetching && "animate-spin")} />
              {t("actions.refresh")}
            </Button>
          </div>
        </div>
      </CommandBriefHeader>
      {errorMessage ? (
        <Card className={cn(dashboardPanelClass, "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]")}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--dash-danger)]" />
            <span className="text-sm font-medium">One finance source failed or timed out. Retry the read-only dashboard without exposing internal details.</span>
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          {isCashFlowLayout ? <CashFlowNavigation /> : <WorkspaceSectionNavigation label={t("presentation.navigation")} items={[
            { id: "finance-overview", label: t("cashFlow.navigationLabels.overview") },
            { id: "finance-movement", label: t("sections.movement") },
            { id: "finance-aging", label: t("cashFlow.agingTitle") },
            { id: "finance-payments", label: t("cashFlow.paymentsTitle") },
            { id: "finance-workflows", label: t("presentation.workflows") },
          ]} />}
          <section id={`${sectionPrefix}-overview`} aria-label={isCashFlowLayout ? t("cashFlow.navigationLabels.overview") : undefined} className={cn("grid min-w-0 scroll-mt-24 gap-3", isCashFlowLayout ? "sm:grid-cols-2 2xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5")}>
            <KpiTile label={t("metrics.cash")} value={money(dashboard.summary.cashPosition)} detail={isCashFlowLayout ? t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) }) : t("details.cash", { amount: money(dashboard.summary.netCashFlow) })} icon={Wallet} tone={dashboard.summary.netCashFlow >= 0 ? "success" : "danger"} proof={{ state: "verified", source: t("command.proofSource") }} />
            <KpiTile label={t(isCashFlowLayout ? "cashFlow.net" : "metrics.revenue")} value={money(isCashFlowLayout ? dashboard.summary.netCashFlow : dashboard.summary.revenue)} detail={isCashFlowLayout ? t("cashFlow.netDetail") : t("details.margin", { value: percent(dashboard.summary.grossMargin) })} icon={TrendingUp} tone={isCashFlowLayout && dashboard.summary.netCashFlow < 0 ? "danger" : "brand"} proof={{ state: "posted", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.receivables")} value={money(dashboard.summary.receivables)} detail={t("details.receivables", { count: dashboard.summary.openReceivableCount })} icon={HandCoins} tone="gold" proof={{ state: dashboard.summary.overdueReceivableAmount > 0 ? "pending" : "verified", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.payables")} value={money(dashboard.summary.payables)} detail={t("details.payables", { count: dashboard.summary.openPayableCount })} icon={FileText} tone={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} proof={{ state: dashboard.summary.overduePayableAmount > 0 ? "pending" : "verified", source: t("command.proofSource") }} />
            {!isCashFlowLayout ? <KpiTile label={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} tone={financeConfidenceTone(dashboard.summary.financeConfidence)} proof={{ state: dashboard.summary.financeConfidence >= 85 ? "certified" : "pending", source: t("command.proofSource") }} /> : null}
          </section>

          {!isProfitLossLayout ? (
          <section
            data-testid={isCostsLayout ? "costs-operating-status" : undefined}
            className="grid min-w-0 grid-cols-1 gap-4"
          >
            <StatusStrip
              title={t("command.statusTitle")}
              detail={t("command.statusDetail")}
              items={statusItems}
            />
            {!isCostsLayout ? (
              <ActionQueue
                title={t("command.actionTitle")}
                detail={t(isCashFlowLayout ? "cashFlow.actionDescription" : "command.actionDetail")}
                emptyTitle={t("command.actionEmptyTitle")}
                emptyMessage={t("command.actionEmptyMessage")}
                items={actionQueueItems}
                className="[&>div.mt-4]:grid [&>div.mt-4]:gap-3 [&>div.mt-4]:space-y-0 lg:[&>div.mt-4]:grid-cols-2"
              />
            ) : null}
          </section>
          ) : null}

          <section
            id={`${sectionPrefix}-movement`}
            data-testid={isCostsLayout ? "costs-financial-movements" : undefined}
            className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-4"
          >
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  <h2>{t("sections.movement")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t(isCashFlowLayout ? "cashFlow.movementDescription" : "sections.movementDescription")}</CardDescription>
              </CardHeader>
              <CardContent className={isCashFlowLayout ? "min-w-0 space-y-5" : undefined}>
                {isCashFlowLayout ? <CashFlowMovementSummary trend={dashboard.trend} locale={locale} money={money} /> : null}
                {view === "cash-flow" ? (
                  <CashFlowStatementTable
                    trend={dashboard.trend}
                    currency={currency}
                    locale={locale}
                    entityId={dashboard.organization.id}
                    entityName={dashboard.organization.name}
                    period={dashboard.filters.period}
                    periodStart={dashboard.filters.startDate}
                    periodEnd={dashboard.filters.endDate}
                    money={money}
                  />
                ) : (
                  <TrendPanel trend={dashboard.trend} money={money} shortMoney={shortMoney} dateFormatter={dateFormatter} t={t} />
                )}
              </CardContent>
            </Card>

          </section>

          {isCostsLayout ? (
            <section data-testid="costs-action-evidence-row" className="grid min-w-0 gap-4">
              <ActionQueue
                title={t("command.actionTitle")}
                detail={t("command.actionDetail")}
                emptyTitle={t("command.actionEmptyTitle")}
                emptyMessage={t("command.actionEmptyMessage")}
                items={actionQueueItems}
              />
            </section>
          ) : null}

          {isProfitLossLayout ? (
            <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <StatusStrip
                title={t("command.statusTitle")}
                detail={t("command.statusDetail")}
                items={statusItems}
              />
              <ActionQueue
                title={t("command.actionTitle")}
                detail={t("command.actionDetail")}
                emptyTitle={t("command.actionEmptyTitle")}
                emptyMessage={t("command.actionEmptyMessage")}
                items={actionQueueItems}
              />
            </section>
          ) : null}

          <section id={`${sectionPrefix}-aging`} aria-labelledby="cash-flow-aging-title" className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-4">
            <CashFlowSectionHeading section="aging" />
            <AgingCard title={t("sections.receivables")} description={t("sections.receivablesDescription")} aging={dashboard.aging.receivables} counterparties={dashboard.topReceivables} money={money} t={t} fullWidth />
            <AgingCard title={t("sections.payables")} description={t("sections.payablesDescription")} aging={dashboard.aging.payables} counterparties={dashboard.topPayables} money={money} t={t} fullWidth />
          </section>

          <section id={`${sectionPrefix}-payments`} aria-labelledby="cash-flow-payments-title" className="min-w-0 scroll-mt-24 space-y-4" data-testid={isCostsLayout ? "costs-payments-stack" : undefined}>
            <CashFlowSectionHeading section="payments" />
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  <h3>{t("sections.payments")}</h3>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.paymentsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <FinanceLedgerPaymentsTable
                    payments={dashboard.recentPayments}
                    money={money}
                    formatDateTime={formatDateTime}
                    t={t}
                    surfaceT={surfaceT}
                    empty={t("empty.payments")}
                    financeContext={{
                      entityId: dashboard.organization.id,
                      entityName: dashboard.organization.name,
                      periodStart: dashboard.filters.startDate,
                      periodEnd: dashboard.filters.endDate,
                      currency,
                      sourceReadModel: "finance-dashboard.recent-payments",
                      evidenceRoute: "/dashboard/finance/payments",
                    }}
                  />
              </CardContent>
            </Card>
            <EvidenceTimeline
                title={t("command.evidenceTitle")}
                detail={t("cashFlow.evidenceDescription")}
                emptyMessage={t("empty.payments")}
                events={evidenceEvents}
                className="min-w-0 [&>ol]:grid [&>ol]:grid-cols-1 [&>ol]:gap-3 [&>ol]:space-y-0 md:[&>ol]:grid-cols-2 2xl:[&>ol]:grid-cols-3"
              />
          </section>

          <section data-finance-final-section="operational">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-success)]" />
                  <h2>{t("sections.methods")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payments.sections.methodsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancePaymentMethodBreakdown
                  methods={dashboard.paymentMethods}
                  money={money}
                  locale={locale}
                  t={t}
                  surfaceT={surfaceT}
                />
              </CardContent>
            </Card>
          </section>

          <section id="finance-workflows" className="scroll-mt-24" data-finance-final-section="workflow">
            <FinanceWorkflowActionPanel
              title={t("sections.workflows", { view: t(`views.${view}`) })}
              description={t("sections.workflowsDescription", { view: t(`views.${view}`) })}
              localizedHref={localizedHref}
              layout="row"
              actions={[
                { href: "/dashboard/orders/payments", icon: CreditCard, label: t("actions.orderPayments") },
                { href: "/dashboard/finance/reconciliation", icon: ShieldCheck, label: t("actions.reconciliation") },
                { href: "/dashboard/finance/cash-drawer", icon: Wallet, label: t("actions.cashDrawers") },
                { href: "/dashboard/finance/cash-flow", icon: LineChart, label: t("actions.cashFlow") },
                { href: "/dashboard/settings/tax-rates", icon: Percent, label: t("actions.taxRates") },
              ]}
            />
          </section>
        </>
      ) : null}
      </div>
    </main>
  )
}


function TrendPanel({
  trend,
  money,
  shortMoney,
  dateFormatter,
  t,
}: {
  trend: FinanceTrendPoint[]
  money: (value: number | null | undefined) => string
  shortMoney: (value: number | null | undefined) => string
  dateFormatter: Intl.DateTimeFormat
  t: ReturnType<typeof useTranslations>
}) {
  const maxValue = Math.max(1, ...trend.map((point) => Math.max(point.inflow, point.outflow, point.revenue, point.expenses, point.purchases)))

  if (trend.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.trend")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex min-w-[700px] gap-2 pb-3">
        {trend.map((point) => (
          <div key={point.key} className={cn(dashboardRowClass, "flex min-w-20 flex-1 flex-col p-2")}>
            <div className="mb-2 text-xs font-medium text-[var(--dash-text-soft)]">{dateFormatter.format(new Date(point.key))}</div>
            <div className="flex h-28 items-end gap-1">
              <div className={cn("w-full rounded-t", dashboardToneBg("success"))} style={{ height: `${Math.max(4, (point.inflow / maxValue) * 100)}%` }} title={money(point.inflow)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("brand"))} style={{ height: `${Math.max(4, (point.revenue / maxValue) * 100)}%` }} title={money(point.revenue)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("gold"))} style={{ height: `${Math.max(4, (point.outflow / maxValue) * 100)}%` }} title={money(point.outflow)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("danger"))} style={{ height: `${Math.max(4, (point.expenses / maxValue) * 100)}%` }} title={money(point.expenses)} />
            </div>
            <div className={cn("mt-2 truncate text-xs font-semibold tabular-nums", dashboardValueTone(point.net))}>{shortMoney(point.net)}</div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--dash-text-soft)]">
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("success"))} />{t("legend.inflow")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("brand"))} />{t("legend.revenue")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("gold"))} />{t("legend.outflow")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("danger"))} />{t("legend.expenses")}</span>
      </div>
    </ScrollArea>
  )
}

type CashFlowStatementRow = FinanceTrendPoint & {
  lineCode: string
  lineName: string
  currency: string
  evidence: string
}

export function CashFlowStatementTable({
  trend,
  currency,
  locale,
  entityId,
  entityName,
  period,
  periodStart,
  periodEnd,
  money,
}: {
  trend: FinanceTrendPoint[]
  currency: string
  locale: Locale
  entityId: string
  entityName: string
  period: FinanceDashboardPeriod
  periodStart: string
  periodEnd: string
  money: (value: number | null | undefined) => string
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "lineCode", desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: financeCashFlowTableContract.query.defaultPageSize })
  const [search, setSearch] = useState("")
  const {
    columnVisibility,
    columnOrder,
    density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
  } = useCanonicalTablePreferences(financeCashFlowTableContract)
  const labels = locale === "fr"
    ? { line: "Ligne", description: "Description", currency: "Devise", inflow: "Entrees", outflow: "Sorties", net: "Net", evidence: "Preuve", rows: "lignes", previous: "Page precedente", next: "Page suivante", empty: "Aucun flux de tresorerie pour cette periode." }
    : { line: "Line", description: "Description", currency: "Currency", inflow: "Inflow", outflow: "Outflow", net: "Net", evidence: "Evidence", rows: "rows", previous: "Previous page", next: "Next page", empty: "No cash-flow rows for this period." }
  const data = useMemo<CashFlowStatementRow[]>(
    () => trend.map((point) => ({
      ...point,
      lineCode: point.key,
      lineName: point.label,
      currency: currency.toUpperCase(),
      evidence: locale === "fr" ? "Lecture finance" : "Finance read model",
    })),
    [currency, locale, trend],
  )
  const header = (label: string) => function CashFlowColumnHeader({ column }: { column: { getIsSorted: () => false | "asc" | "desc"; getToggleSortingHandler: () => ((event: unknown) => void) | undefined } }) {
    return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-left font-semibold"
      onClick={column.getToggleSortingHandler()}
      aria-label={`${label}: ${column.getIsSorted() === "desc" ? "ascending" : "descending"}`}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    )
  }
  const columns = useMemo<ColumnDef<CashFlowStatementRow>[]>(
    () => [
      { accessorKey: "lineCode", header: header(labels.line), enableHiding: false },
      { accessorKey: "lineName", header: header(labels.description), enableHiding: false },
      { accessorKey: "currency", header: header(labels.currency) },
      { accessorKey: "inflow", header: header(labels.inflow), cell: ({ row }) => <span className="tabular-nums">{money(row.original.inflow)}</span> },
      { accessorKey: "outflow", header: header(labels.outflow), cell: ({ row }) => <span className="tabular-nums">{money(row.original.outflow)}</span> },
      { accessorKey: "net", header: header(labels.net), cell: ({ row }) => <span className="font-semibold tabular-nums">{money(row.original.net)}</span> },
      { accessorKey: "evidence", header: labels.evidence, enableSorting: false },
    ],
    [labels.currency, labels.description, labels.evidence, labels.inflow, labels.line, labels.net, labels.outflow, money],
  )
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.lineCode,
    state: { sorting, columnVisibility, columnOrder, pagination, globalFilter: search },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const canonicalQuery = createCanonicalTableQuery(financeCashFlowTableContract, {
    search,
    filters: {
      period: [period],
      locationId: [entityId],
      startDate: [periodStart],
      endDate: [periodEnd],
    },
    sort: sorting,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })

  return (
    <CanonicalTableBoundary
      contract={financeCashFlowTableContract}
      locale={locale}
      query={canonicalQuery}
      state={table.getFilteredRowModel().rows.length ? "ready" : search.trim() ? "no-results" : "empty"}
      density={density}
    >
      <div
        className="dashboard-table-shell dashboard-data-table min-w-0 overflow-hidden rounded-lg"
        data-finance-entity-id={entityId}
        data-finance-entity-name={entityName}
        data-finance-period={period}
        data-finance-period-start={periodStart}
        data-finance-period-end={periodEnd}
        data-finance-currency={currency}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dash-border-subtle)] px-3 py-3">
          <div>
            <h3 className="text-sm font-semibold">{locale === "fr" ? "Etat des flux de tresorerie" : "Cash-flow statement"}</h3>
            <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{entityName} / {currency.toUpperCase()} / {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(periodStart))} – {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(periodEnd))}</p>
          </div>
        </div>
        <div className="dashboard-table-toolbar flex flex-nowrap items-center gap-3 overflow-x-auto border-b border-[var(--dash-border-subtle)] p-3">
          <div className="min-w-48 flex-1">
            <DataTableSearch value={search} onChange={(value) => { setSearch(value); table.setPageIndex(0) }} ariaLabel={locale === "fr" ? "Rechercher des flux de trésorerie" : "Search cash-flow rows"} placeholder={locale === "fr" ? "Rechercher dans le tableau..." : "Search table data..."} clearButtonLabel={locale === "fr" ? "Effacer la recherche" : "Clear table search"} />
          </div>
          <DataTableViewOptions
            table={table}
            label={locale === "fr" ? "Colonnes" : "View columns"}
            columnLabels={{ lineCode: labels.line, lineName: labels.description, currency: labels.currency, inflow: labels.inflow, outflow: labels.outflow, net: labels.net, evidence: labels.evidence }}
            className="dashboard-button-secondary h-9 shrink-0 rounded-lg"
          />
          <div className="shrink-0">
            <CanonicalTableDensityControl density={density} locale={locale} onDensityChange={setDensity} />
          </div>
        </div>
        {table.getFilteredRowModel().rows.length ? (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-10 bg-[var(--dash-surface-raised)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((headerCell) => (
                      <TableHead
                        key={headerCell.id}
                        aria-sort={headerCell.column.getIsSorted() === "asc" ? "ascending" : headerCell.column.getIsSorted() === "desc" ? "descending" : "none"}
                        data-column-id={headerCell.column.id}
                        data-frozen={headerCell.column.id === "lineCode" || headerCell.column.id === "lineName" ? "start" : undefined}
                        className={cn(
                          "whitespace-nowrap px-3",
                          headerCell.column.id === "lineCode" && "sticky left-0 z-20 min-w-[8rem] bg-[var(--dash-surface-raised)]",
                          headerCell.column.id === "lineName" && "sticky left-[8rem] z-20 min-w-[14rem] bg-[var(--dash-surface-raised)]",
                          ["inflow", "outflow", "net"].includes(headerCell.column.id) && "text-right",
                        )}
                      >
                        {headerCell.isPlaceholder ? null : flexRender(headerCell.column.columnDef.header, headerCell.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-[var(--dash-border-subtle)]">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        data-column-id={cell.column.id}
                        data-frozen={cell.column.id === "lineCode" || cell.column.id === "lineName" ? "start" : undefined}
                        className={cn(
                          "px-3",
                          cell.column.id === "lineCode" && "sticky left-0 z-10 bg-[var(--dash-surface)] font-medium",
                          cell.column.id === "lineName" && "sticky left-[8rem] z-10 bg-[var(--dash-surface)]",
                          ["inflow", "outflow", "net"].includes(cell.column.id) && "text-right",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="p-6 text-sm text-[var(--dash-text-soft)]">{search.trim() ? (locale === "fr" ? "Aucun résultat." : "No results.") : labels.empty}</p>
        )}
        <nav aria-label={locale === "fr" ? "Pagination des flux de trésorerie" : "Cash-flow pagination"} className="border-t border-[var(--dash-border-subtle)] p-3">
          <DataTablePagination table={table} variant="landing" locale={locale} showSelectionCount={false} pageSizeOptions={financeCashFlowTableContract.query.allowedPageSizes} />
        </nav>
      </div>
    </CanonicalTableBoundary>
  )
}

function AgingCard({
  title,
  description,
  aging,
  counterparties,
  money,
  t,
  fullWidth = false,
}: {
  title: string
  description: string
  aging: FinanceAgingSummary
  counterparties: FinanceCounterparty[]
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  fullWidth?: boolean
}) {
  const locale = pickLocale(useLocale())
  const total = Math.max(1, aging.current + aging.d31 + aging.d61 + aging.d90)
  const buckets: Array<[keyof FinanceAgingSummary, string, string]> = [
    ["current", t("aging.current"), dashboardToneBg("success")],
    ["d31", t("aging.d31"), dashboardToneBg("brand")],
    ["d61", t("aging.d61"), dashboardToneBg("gold")],
    ["d90", t("aging.d90"), dashboardToneBg("danger")],
  ]

  return (
    <Card className={cn(dashboardPanelClass, "min-w-0")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{fullWidth ? <h3>{title}</h3> : title}</CardTitle>
        <CardDescription className={dashboardMutedTextClass}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-full bg-[rgba(37,57,67,0.64)]">
          <div className="flex h-3">
            {buckets.map(([key, _label, color]) => (
              <div key={key} className={color} style={{ width: `${(aging[key] / total) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className={cn("grid grid-cols-2 gap-2 text-xs", fullWidth && "md:grid-cols-4")}>
          {buckets.map(([key, label, color]) => (
            <div key={key} className={cn(dashboardRowClass, "p-2")}>
              <div className="flex items-center gap-1.5 text-[var(--dash-text-soft)]"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</div>
              <div className="mt-1 font-semibold tabular-nums">{money(aging[key])}</div>
            </div>
          ))}
        </div>
        <RenderedDataTable
          className="p-0"
          tableClassName="!min-w-[28rem]"
          locale={locale}
          caption={title}
          emptyMessage={t("empty.counterparties")}
          columns={[
            { label: t("table.counterparty") },
            { label: locale === "fr" ? "Conditions de paiement" : "Payment terms" },
            { label: locale === "fr" ? "Solde" : "Balance", className: "text-right" },
          ]}
          rows={counterparties.map((party) => {
            const terms = party.terms ? t("aging.terms", { count: party.terms }) : t("common.notAvailable")
            return {
              id: party.id,
              searchText: [party.name, terms, money(party.balance)].join(" "),
              cells: [
                <span key="name" className="font-medium text-[var(--dash-text)]">{party.name}</span>,
                <span key="terms">{terms}</span>,
                <div key="balance" className="text-right"><Badge variant="outline" className={cn("shrink-0 tabular-nums", dashboardSeverityClass(party.severity))}>{money(party.balance)}</Badge></div>,
              ],
            }
          })}
        />
      </CardContent>
    </Card>
  )
}
