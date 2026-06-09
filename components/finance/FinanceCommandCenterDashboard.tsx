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
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Filter,
  HandCoins,
  Landmark,
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
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard"
import { cn } from "@/lib/utils"
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

function severityClass(severity: "success" | "info" | "warning" | "critical") {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200",
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-200",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200",
    critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200",
  }
  return classes[severity]
}

function valueTone(value: number) {
  if (value < 0) return "text-rose-700 dark:text-rose-300"
  if (value > 0) return "text-emerald-700 dark:text-emerald-300"
  return "text-slate-700 dark:text-slate-300"
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  accent: "blue" | "emerald" | "amber" | "rose" | "slate"
}) {
  const accents = {
    blue: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-200 dark:bg-blue-950/35 dark:border-blue-900/60",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-950/35 dark:border-emerald-900/60",
    amber: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/35 dark:border-amber-900/60",
    rose: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-200 dark:bg-rose-950/35 dark:border-rose-900/60",
    slate: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-950/35 dark:border-slate-800",
  }

  return (
    <Card className={cn("rounded-md border shadow-sm", accents[accent])}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-current/15 bg-white/45 dark:bg-white/[0.06]">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs opacity-80">{detail}</div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <main className="mx-auto w-full max-w-[1920px] space-y-4 p-4">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="h-[520px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </main>
  )
}

export default function FinanceCommandCenterDashboard({ initialView = "overview" }: { initialView?: FinanceDashboardView }) {
  const t = useTranslations("financeDashboard")
  const locale = useLocale()
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

  if (dashboardQuery.isLoading && !dashboard) return <LoadingState />

  return (
    <main className="mx-auto w-full max-w-[1920px] space-y-4 p-4 text-slate-950 dark:text-slate-100">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-200">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">{t("title")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
              </div>
            </div>
            {dashboard ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <Building2 className="h-3 w-3" />
                  {dashboard.organization.name}
                </Badge>
                <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <CalendarDays className="h-3 w-3" />
                  {dateFormatter.format(new Date(dashboard.filters.startDate))} - {dateFormatter.format(new Date(dashboard.filters.endDate))}
                </Badge>
                <span>{t("updated", { time: formatDateTime(dashboard.generatedAt) })}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[190px_190px_190px_auto] xl:min-w-[780px]">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <BarChart3 className="h-3.5 w-3.5" />
                {t("filters.view")}
              </div>
              <Select value={view} onValueChange={(value) => setView(value as FinanceDashboardView)}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
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
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                {t("filters.location")}
              </div>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
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
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                {t("filters.period")}
              </div>
              <Select value={period} onValueChange={(value) => setPeriod(value as FinanceDashboardPeriod)}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
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
                    className="h-10 w-36 bg-white dark:bg-slate-950"
                  />
                  <Input
                    type="date"
                    value={customRange.end}
                    onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                    className="h-10 w-36 bg-white dark:bg-slate-950"
                  />
                </>
              ) : null}
              <Button
                type="button"
                onClick={refreshDashboard}
                disabled={dashboardQuery.isFetching}
                className="h-10 border border-slate-300 bg-slate-950 text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                <RefreshCw className={cn("h-4 w-4", dashboardQuery.isFetching && "animate-spin")} />
                {t("actions.refresh")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <Card className="rounded-md border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title={t("metrics.cash")} value={money(dashboard.summary.cashPosition)} detail={t("details.cash", { amount: money(dashboard.summary.netCashFlow) })} icon={Wallet} accent={dashboard.summary.netCashFlow >= 0 ? "emerald" : "rose"} />
            <MetricCard title={t("metrics.revenue")} value={money(dashboard.summary.revenue)} detail={t("details.margin", { value: percent(dashboard.summary.grossMargin) })} icon={TrendingUp} accent="blue" />
            <MetricCard title={t("metrics.receivables")} value={money(dashboard.summary.receivables)} detail={t("details.receivables", { count: dashboard.summary.openReceivableCount })} icon={HandCoins} accent="amber" />
            <MetricCard title={t("metrics.payables")} value={money(dashboard.summary.payables)} detail={t("details.payables", { count: dashboard.summary.openPayableCount })} icon={FileText} accent={dashboard.summary.overduePayableAmount > 0 ? "rose" : "slate"} />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "emerald" : dashboard.summary.financeConfidence >= 65 ? "amber" : "rose"} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="rounded-md border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-4 w-4 text-blue-600" />
                  {t("sections.movement")}
                </CardTitle>
                <CardDescription>{t("sections.movementDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendPanel trend={dashboard.trend} money={money} shortMoney={shortMoney} dateFormatter={dateFormatter} t={t} />
              </CardContent>
            </Card>

            <Card className="rounded-md border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {t("sections.assurance")}
                </CardTitle>
                <CardDescription>{t("sections.assuranceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t("metrics.confidence")}</span>
                    <span className="font-semibold tabular-nums">{percent(dashboard.summary.financeConfidence)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full", dashboard.summary.financeConfidence >= 85 ? "bg-emerald-500" : dashboard.summary.financeConfidence >= 65 ? "bg-amber-500" : "bg-rose-500")}
                      style={{ width: `${dashboard.summary.financeConfidence}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  {dashboard.alerts.map((alert) => (
                    <div key={alert.id} className={cn("flex items-start gap-2 rounded-md border p-3 text-sm", severityClass(alert.severity))}>
                      {alert.severity === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                      <span>{alertText(alert)}</span>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                  <SummaryLine label={t("summary.paymentsCollected")} value={money(dashboard.summary.paymentsCollected)} />
                  <SummaryLine label={t("summary.pendingPayments")} value={money(dashboard.summary.paymentsPending)} />
                  <SummaryLine label={t("summary.refunds")} value={money(dashboard.summary.refunds)} />
                  <SummaryLine label={t("summary.tax")} value={money(dashboard.summary.taxCollected - dashboard.summary.taxOnPurchases)} />
                  <SummaryLine label={t("summary.drawerVariance")} value={money(dashboard.summary.drawerVariance)} tone={valueTone(dashboard.summary.drawerVariance)} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <AgingCard title={t("sections.receivables")} description={t("sections.receivablesDescription")} aging={dashboard.aging.receivables} counterparties={dashboard.topReceivables} money={money} t={t} />
            <AgingCard title={t("sections.payables")} description={t("sections.payablesDescription")} aging={dashboard.aging.payables} counterparties={dashboard.topPayables} money={money} t={t} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="rounded-md border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  {t("sections.payments")}
                </CardTitle>
                <CardDescription>{t("sections.paymentsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable payments={dashboard.recentPayments} money={money} formatDateTime={formatDateTime} t={t} />
              </CardContent>
            </Card>

            <Card className="rounded-md border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-emerald-600" />
                  {t("sections.methods")}
                </CardTitle>
                <CardDescription>{t("sections.methodsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <MethodBreakdown methods={dashboard.paymentMethods} money={money} t={t} />
                <div className="grid gap-2 pt-2">
                  <ActionLink href="/dashboard/orders/payments" icon={CreditCard} label={t("actions.orderPayments")} />
                  <ActionLink href="/dashboard/finance/cash-drawer" icon={Wallet} label={t("actions.cashDrawers")} />
                  <ActionLink href="/dashboard/finance/cash-flow" icon={LineChart} label={t("actions.cashFlow")} />
                  <ActionLink href="/dashboard/settings/tax-rates" icon={Percent} label={t("actions.taxRates")} />
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  )
}

function SummaryLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
    </div>
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
    return <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">{t("empty.trend")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex min-w-[700px] gap-2 pb-3">
        {trend.map((point) => (
          <div key={point.key} className="flex min-w-20 flex-1 flex-col rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">{dateFormatter.format(new Date(point.key))}</div>
            <div className="flex h-28 items-end gap-1">
              <div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(4, (point.inflow / maxValue) * 100)}%` }} title={money(point.inflow)} />
              <div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(4, (point.revenue / maxValue) * 100)}%` }} title={money(point.revenue)} />
              <div className="w-full rounded-t bg-amber-500" style={{ height: `${Math.max(4, (point.outflow / maxValue) * 100)}%` }} title={money(point.outflow)} />
              <div className="w-full rounded-t bg-rose-500" style={{ height: `${Math.max(4, (point.expenses / maxValue) * 100)}%` }} title={money(point.expenses)} />
            </div>
            <div className={cn("mt-2 truncate text-xs font-semibold tabular-nums", valueTone(point.net))}>{shortMoney(point.net)}</div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t("legend.inflow")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{t("legend.revenue")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{t("legend.outflow")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{t("legend.expenses")}</span>
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
    ["current", t("aging.current"), "bg-emerald-500"],
    ["d31", t("aging.d31"), "bg-blue-500"],
    ["d61", t("aging.d61"), "bg-amber-500"],
    ["d90", t("aging.d90"), "bg-rose-500"],
  ]

  return (
    <Card className="rounded-md border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="flex h-3">
            {buckets.map(([key, _label, color]) => (
              <div key={key} className={color} style={{ width: `${(aging[key] / total) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {buckets.map(([key, label, color]) => (
            <div key={key} className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</div>
              <div className="mt-1 font-semibold tabular-nums">{money(aging[key])}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {counterparties.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">{t("empty.counterparties")}</div>
          ) : counterparties.map((party) => (
            <div key={party.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
              <div className="min-w-0">
                <div className="truncate font-medium">{party.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{party.terms ? t("aging.terms", { count: party.terms }) : t("common.notAvailable")}</div>
              </div>
              <Badge variant="outline" className={cn("shrink-0", severityClass(party.severity))}>{money(party.balance)}</Badge>
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
    return <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">{t("empty.payments")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="text-left text-xs text-slate-600 dark:text-slate-400">
          <tr className="border-b border-slate-200 dark:border-slate-800">
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
            <tr key={payment.id} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2 font-medium">
                  {payment.direction === "out" ? <ArrowDownRight className="h-4 w-4 text-rose-600" /> : <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                  {payment.paymentNumber}
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{payment.processedBy}</div>
              </td>
              <td className="py-3 pr-3">{payment.counterparty}</td>
              <td className="py-3 pr-3">{t(`methods.${payment.method}`)}</td>
              <td className="py-3 pr-3">
                <Badge variant="outline" className={cn(payment.status === "PAID" ? severityClass("success") : payment.status === "PENDING" ? severityClass("warning") : severityClass("info"))}>
                  {t(`statuses.${payment.status}`)}
                </Badge>
              </td>
              <td className={cn("py-3 pr-3 text-right font-semibold tabular-nums", payment.direction === "out" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300")}>{money(payment.amount)}</td>
              <td className="py-3 pr-3 text-xs text-slate-600 dark:text-slate-400">{formatDateTime(payment.createdAt)}</td>
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
  if (methods.length === 0) return <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">{t("empty.methods")}</div>

  return (
    <div className="space-y-3">
      {methods.slice(0, 8).map((method) => (
        <div key={method.method}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{t(`methods.${method.method}`)}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">{money(method.amount)} / {method.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(method.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Button asChild variant="outline" className="justify-between bg-white dark:bg-slate-950">
      <Link href={href}>
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <ExternalLink className="h-4 w-4" />
      </Link>
    </Button>
  )
}
