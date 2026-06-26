"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  ExternalLink,
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
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard"
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
  FinancePaymentMethod,
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


function LoadingState() {
  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
        <Skeleton className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </main>
  )
}

export default function FinanceCommandCenterDashboard({ initialView = "overview" }: { initialView?: FinanceDashboardView }) {
  const t = useTranslations("financeDashboard")
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
    return t("alerts.ready")
  }

  const localizedHref = (href: string) => localizePath(href, locale)
  const commandActions = [
    { label: t("actions.reconciliation"), href: localizedHref("/dashboard/finance/reconciliation"), icon: ShieldCheck, variant: "primary" },
    { label: t("actions.orderPayments"), href: localizedHref("/dashboard/orders/payments"), icon: CreditCard, variant: "secondary" },
    { label: t("actions.cashFlow"), href: localizedHref("/dashboard/finance/cash-flow"), icon: LineChart, variant: "secondary" },
  ] satisfies CommandCenterAction[]
  const actionLabels = {
    OVERDUE_AR: t("views.receivables"),
    OVERDUE_AP: t("views.payables"),
    NEGATIVE_MARGIN: t("actions.cashFlow"),
    PENDING_PAYMENTS: t("views.payments"),
    CASH_GAP: t("actions.cashFlow"),
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

  if (dashboardQuery.isLoading && !dashboard) return <LoadingState />

  if (errorMessage && !dashboard) {
    return <DashboardErrorState error="Finance dashboard data unavailable" reset={() => { void dashboardQuery.refetch() }} />
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
      <CommandBriefHeader
        title={t("title")}
        summary={t("subtitle")}
        eyebrow={t("command.eyebrow")}
        state={dashboard ? { label: `${t("metrics.confidence")} ${percent(dashboard.summary.financeConfidence)}`, tone: financeConfidenceTone(dashboard.summary.financeConfidence), icon: ShieldCheck } : { label: t("common.notAvailable"), tone: "muted" }}
        metadata={dashboard ? [
          { label: t("command.organization"), value: dashboard.organization.name, icon: Building2 },
          { label: t("command.period"), value: `${dateFormatter.format(new Date(dashboard.filters.startDate))} - ${dateFormatter.format(new Date(dashboard.filters.endDate))}`, icon: CalendarDays },
          { label: t("command.generated"), value: formatDateTime(dashboard.generatedAt), icon: RefreshCw },
        ] : []}
        actions={commandActions}
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
              <SelectTrigger className={dashboardControlClass}>
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
              <SelectTrigger className={dashboardControlClass}>
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
              <SelectTrigger className={dashboardControlClass}>
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
              <>
                <Input
                  type="date"
                  value={customRange.start}
                  onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))}
                  className={cn(dashboardControlClass, "w-36")}
                />
                <Input
                  type="date"
                  value={customRange.end}
                  onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                  className={cn(dashboardControlClass, "w-36")}
                />
              </>
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
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiTile label={t("metrics.cash")} value={money(dashboard.summary.cashPosition)} detail={t("details.cash", { amount: money(dashboard.summary.netCashFlow) })} icon={Wallet} tone={dashboard.summary.netCashFlow >= 0 ? "success" : "danger"} proof={{ state: "verified", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.revenue")} value={money(dashboard.summary.revenue)} detail={t("details.margin", { value: percent(dashboard.summary.grossMargin) })} icon={TrendingUp} tone="brand" proof={{ state: "posted", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.receivables")} value={money(dashboard.summary.receivables)} detail={t("details.receivables", { count: dashboard.summary.openReceivableCount })} icon={HandCoins} tone="gold" proof={{ state: dashboard.summary.overdueReceivableAmount > 0 ? "pending" : "verified", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.payables")} value={money(dashboard.summary.payables)} detail={t("details.payables", { count: dashboard.summary.openPayableCount })} icon={FileText} tone={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} proof={{ state: dashboard.summary.overduePayableAmount > 0 ? "pending" : "verified", source: t("command.proofSource") }} />
            <KpiTile label={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} tone={financeConfidenceTone(dashboard.summary.financeConfidence)} proof={{ state: dashboard.summary.financeConfidence >= 85 ? "certified" : "pending", source: t("command.proofSource") }} />
          </section>

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

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {t("sections.movement")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.movementDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendPanel trend={dashboard.trend} money={money} shortMoney={shortMoney} dateFormatter={dateFormatter} t={t} />
              </CardContent>
            </Card>

            <EvidenceTimeline
              title={t("command.evidenceTitle")}
              detail={t("command.evidenceDetail")}
              emptyMessage={t("empty.payments")}
              events={evidenceEvents}
            />
          </section>
          <section className="grid gap-3 xl:grid-cols-2">
            <AgingCard title={t("sections.receivables")} description={t("sections.receivablesDescription")} aging={dashboard.aging.receivables} counterparties={dashboard.topReceivables} money={money} t={t} />
            <AgingCard title={t("sections.payables")} description={t("sections.payablesDescription")} aging={dashboard.aging.payables} counterparties={dashboard.topPayables} money={money} t={t} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {t("sections.payments")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.paymentsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable payments={dashboard.recentPayments} money={money} formatDateTime={formatDateTime} t={t} />
              </CardContent>
            </Card>

            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-success)]" />
                  {t("sections.methods")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.methodsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <MethodBreakdown methods={dashboard.paymentMethods} money={money} t={t} />
                <div className="grid gap-2 pt-2">
                  <ActionLink href={localizedHref("/dashboard/orders/payments")} icon={CreditCard} label={t("actions.orderPayments")} />
                  <ActionLink href={localizedHref("/dashboard/finance/reconciliation")} icon={ShieldCheck} label={t("actions.reconciliation")} />
                  <ActionLink href={localizedHref("/dashboard/finance/cash-drawer")} icon={Wallet} label={t("actions.cashDrawers")} />
                  <ActionLink href={localizedHref("/dashboard/finance/cash-flow")} icon={LineChart} label={t("actions.cashFlow")} />
                  <ActionLink href={localizedHref("/dashboard/settings/tax-rates")} icon={Percent} label={t("actions.taxRates")} />
                </div>
              </CardContent>
            </Card>
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

function AgingCard({
  title,
  description,
  aging,
  counterparties,
  money,
  t,
}: {
  title: string
  description: string
  aging: FinanceAgingSummary
  counterparties: FinanceCounterparty[]
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  const total = Math.max(1, aging.current + aging.d31 + aging.d61 + aging.d90)
  const buckets: Array<[keyof FinanceAgingSummary, string, string]> = [
    ["current", t("aging.current"), dashboardToneBg("success")],
    ["d31", t("aging.d31"), dashboardToneBg("brand")],
    ["d61", t("aging.d61"), dashboardToneBg("gold")],
    ["d90", t("aging.d90"), dashboardToneBg("danger")],
  ]

  return (
    <Card className={dashboardPanelClass}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
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
        <div className="grid grid-cols-2 gap-2 text-xs">
          {buckets.map(([key, label, color]) => (
            <div key={key} className={cn(dashboardRowClass, "p-2")}>
              <div className="flex items-center gap-1.5 text-[var(--dash-text-soft)]"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</div>
              <div className="mt-1 font-semibold tabular-nums">{money(aging[key])}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {counterparties.length === 0 ? (
            <div className={cn(dashboardEmptyClass, "p-6")}>{t("empty.counterparties")}</div>
          ) : counterparties.map((party) => (
            <div key={party.id} className={cn(dashboardRowClass, "flex items-center justify-between gap-3 p-2 text-sm")}>
              <div className="min-w-0">
                <div className="truncate font-medium">{party.name}</div>
                <div className="text-xs text-[var(--dash-text-soft)]">{party.terms ? t("aging.terms", { count: party.terms }) : t("common.notAvailable")}</div>
              </div>
              <Badge variant="outline" className={cn("shrink-0", dashboardSeverityClass(party.severity))}>{money(party.balance)}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentsTable({
  payments,
  money,
  formatDateTime,
  t,
}: {
  payments: FinanceRecentPayment[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (payments.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.payments")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="text-left text-xs text-[var(--dash-text-soft)]">
          <tr className="border-b border-[var(--dash-border-subtle)]">
            <th className="py-2 pr-3 font-medium">{t("table.payment")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.counterparty")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.method")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.status")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.amount")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.time")}</th>
          </tr>
        </thead>
        <tbody>
          {payments.slice(0, 14).map((payment) => (
            <tr key={payment.id} className="border-b border-[var(--dash-border-subtle)] last:border-0">
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2 font-medium">
                  {payment.direction === "out" ? <ArrowDownRight className="h-4 w-4 text-[var(--dash-danger)]" /> : <ArrowUpRight className="h-4 w-4 text-[var(--dash-success)]" />}
                  {payment.paymentNumber}
                </div>
                <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{payment.processedBy}</div>
              </td>
              <td className="py-3 pr-3">{payment.counterparty}</td>
              <td className="py-3 pr-3">{t(`methods.${payment.method}`)}</td>
              <td className="py-3 pr-3">
                <Badge variant="outline" className={cn(payment.status === "PAID" ? dashboardSeverityClass("success") : payment.status === "PENDING" ? dashboardSeverityClass("warning") : dashboardSeverityClass("info"))}>
                  {t(`statuses.${payment.status}`)}
                </Badge>
              </td>
              <td className={cn("py-3 pr-3 text-right font-semibold tabular-nums", payment.direction === "out" ? "text-[var(--dash-danger)]" : "text-[var(--dash-success)]")}>{money(payment.amount)}</td>
              <td className="py-3 pr-3 text-xs text-[var(--dash-text-soft)]">{formatDateTime(payment.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function MethodBreakdown({ methods, money, t }: { methods: FinancePaymentMethod[]; money: (value: number | null | undefined) => string; t: ReturnType<typeof useTranslations> }) {
  const max = Math.max(1, ...methods.map((method) => method.amount))
  if (methods.length === 0) return <div className={cn(dashboardEmptyClass, "p-6")}>{t("empty.methods")}</div>

  return (
    <div className="space-y-3">
      {methods.slice(0, 8).map((method) => (
        <div key={method.method}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{t(`methods.${method.method}`)}</span>
            <span className="text-xs text-[var(--dash-text-soft)]">{money(method.amount)} / {method.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(37,57,67,0.64)]">
            <div className="h-full rounded-full bg-[var(--dash-brand)]" style={{ width: `${(method.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
      <Link href={href}>
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {label}
        </span>
        <ExternalLink className="h-4 w-4" />
      </Link>
    </Button>
  )
}
