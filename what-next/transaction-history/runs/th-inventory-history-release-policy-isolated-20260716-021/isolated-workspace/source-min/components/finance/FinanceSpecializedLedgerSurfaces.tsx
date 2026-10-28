"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
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
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard"
import {
  dashboardControlClass,
  dashboardEmptyClass,
  dashboardFilterClass,
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardSeverityClass,
  dashboardStatStyle,
  dashboardToneBg,
  dashboardToneText,
  dashboardValueTone,
  type DashboardTone,
} from "@/components/finance/finance-dashboard-theme"
import { localizePath, pickLocale } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type { FinanceDashboardInput, FinanceDashboardPeriod, FinanceDashboardView } from "@/services/finance/finance-dashboard.schemas"
import type {
  FinanceAgingSummary,
  FinanceAlert,
  FinanceCounterparty,
  FinancePaymentMethod,
  FinanceRecentPayment,
} from "@/services/finance/finance-dashboard.service"

type FinanceSpecializedView = Extract<FinanceDashboardView, "payments" | "receivables" | "payables">
type Accent = DashboardTone

const allLocationsValue = "all"
const periods: FinanceDashboardPeriod[] = ["today", "yesterday", "7d", "30d", "mtd", "qtd", "ytd", "custom"]

const surfaceMeta: Record<
  FinanceSpecializedView,
  {
    Icon: LucideIcon
    accent: Accent
    alertCodes: FinanceAlert["code"][]
  }
> = {
  payments: {
    Icon: CreditCard,
    accent: "brand",
    alertCodes: ["PENDING_PAYMENTS", "CASH_GAP", "PAYROLL_FORECAST_PROOF", "READY"],
  },
  receivables: {
    Icon: HandCoins,
    accent: "gold",
    alertCodes: ["OVERDUE_AR", "CASH_GAP", "READY"],
  },
  payables: {
    Icon: FileText,
    accent: "danger",
    alertCodes: ["OVERDUE_AP", "CASH_GAP", "PAYROLL_FORECAST_PROOF", "READY"],
  },
}

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 29)
  return { start: inputDate(start), end: inputDate(now) }
}

function sumPayments(payments: FinanceRecentPayment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0)
}

function useSpecializedFinanceDashboard(view: FinanceSpecializedView) {
  const t = useTranslations("financeDashboard")
  const surfaceT = useTranslations("financeSurfaces")
  const locale: Locale = pickLocale(useLocale())
  const notifications = useNotifications()
  const [period, setPeriod] = useState<FinanceDashboardPeriod>("mtd")
  const [locationId, setLocationId] = useState(allLocationsValue)
  const [customRange, setCustomRange] = useState(defaultCustomRange)

  const queryInput = useMemo<FinanceDashboardInput>(
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
  const compactFormatter = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale])

  const money = (value: number | null | undefined) => moneyFormatter.format(value ?? 0)
  const shortMoney = (value: number | null | undefined) => compactFormatter.format(value ?? 0)
  const percent = (value: number | null | undefined) => `${Math.round(value ?? 0)}%`
  const formatDateTime = (value: string | null | undefined) => value ? timeFormatter.format(new Date(value)) : t("common.notAvailable")
  const localizedHref = (href: string) => localizePath(href, locale)

  async function refreshDashboard() {
    notifications.info(t("notifications.refreshTitle"), surfaceT(`${view}.refreshing`), { category: "financial" })
    const result = await dashboardQuery.refetch()
    if (result.data?.success) {
      notifications.success(t("notifications.refreshedTitle"), surfaceT(`${view}.refreshed`), { category: "financial" })
    } else {
      notifications.error(t("notifications.failedTitle"), result.data?.error || t("notifications.failedMessage"), { category: "financial" })
    }
  }

  return {
    t,
    surfaceT,
    locale,
    view,
    period,
    setPeriod,
    locationId,
    setLocationId,
    customRange,
    setCustomRange,
    dashboardQuery,
    dashboard,
    errorMessage,
    dateFormatter,
    money,
    shortMoney,
    percent,
    formatDateTime,
    localizedHref,
    refreshDashboard,
  }
}

type FinanceSurfaceContext = ReturnType<typeof useSpecializedFinanceDashboard>

function LoadingState() {
  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
        <Skeleton className="h-32 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[460px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[460px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </main>
  )
}

function SurfaceFrame({
  context,
  children,
}: {
  context: FinanceSurfaceContext
  children: ReactNode
}) {
  const meta = surfaceMeta[context.view]
  const Icon = meta.Icon
  const { dashboard, errorMessage, dateFormatter, formatDateTime, t, surfaceT } = context

  if (context.dashboardQuery.isLoading && !dashboard) {
    return <LoadingState />
  }

  if (errorMessage && !dashboard) {
    return <DashboardErrorState error={`Finance ${context.view} data unavailable`} reset={() => { void context.dashboardQuery.refetch() }} />
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
      <section className={cn(dashboardPanelClass, "p-4")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Icon className={cn("h-5 w-5", dashboardToneText(meta.accent))} />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">{surfaceT(`${context.view}.title`)}</h1>
                <p className="max-w-3xl text-sm text-[var(--dash-text-soft)]">{surfaceT(`${context.view}.subtitle`)}</p>
              </div>
            </div>
            {dashboard ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-soft)]">
                <Badge variant="outline" className={cn(dashboardFilterClass, "gap-1")}>
                  <Building2 className="h-3 w-3 text-[var(--dash-info)]" />
                  {dashboard.organization.name}
                </Badge>
                <Badge variant="outline" className={cn(dashboardFilterClass, "gap-1")}>
                  <CalendarDays className="h-3 w-3 text-[var(--dash-gold)]" />
                  {dateFormatter.format(new Date(dashboard.filters.startDate))} - {dateFormatter.format(new Date(dashboard.filters.endDate))}
                </Badge>
                <span>{t("updated", { time: formatDateTime(dashboard.generatedAt) })}</span>
              </div>
            ) : null}
          </div>

          <SurfaceFilters context={context} />
        </div>
      </section>

      {errorMessage ? (
        <Card className={cn(dashboardPanelClass, "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]")}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--dash-danger)]" />
            <span className="text-sm font-medium">One finance source failed or timed out. Retry the read-only dashboard without exposing internal details.</span>
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? children : null}
      </div>
    </main>
  )
}

function SurfaceFilters({ context }: { context: FinanceSurfaceContext }) {
  const { dashboard, t, period, setPeriod, locationId, setLocationId, customRange, setCustomRange, refreshDashboard, dashboardQuery } = context

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[190px_190px_auto] xl:min-w-[620px]">
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
  )
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
  accent: Accent
}) {
  return (
    <Card className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden" style={dashboardStatStyle(accent)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--stat-soft)]">
          <Icon className="h-4 w-4 text-[var(--stat-accent)]" />
        </span>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{detail}</div>
      </CardContent>
    </Card>
  )
}

function SummaryLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={dashboardMutedTextClass}>{label}</span>
      <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  )
}

function alertText(alert: FinanceAlert, t: ReturnType<typeof useTranslations>, money: (value: number | null | undefined) => string) {
  if (alert.code === "OVERDUE_AR") return t("alerts.overdueAr", { count: alert.count, amount: money(alert.amount) })
  if (alert.code === "OVERDUE_AP") return t("alerts.overdueAp", { count: alert.count, amount: money(alert.amount) })
  if (alert.code === "NEGATIVE_MARGIN") return t("alerts.negativeMargin", { amount: money(alert.amount) })
  if (alert.code === "PENDING_PAYMENTS") return t("alerts.pendingPayments", { count: alert.count, amount: money(alert.amount) })
  if (alert.code === "CASH_GAP") return t("alerts.cashGap", { amount: money(alert.amount) })
  if (alert.code === "PAYROLL_FORECAST_PROOF") return alert.message || t("alerts.payrollForecastProof", { count: alert.count, amount: money(alert.amount) })
  return t("alerts.ready")
}

function AssurancePanel({ context }: { context: FinanceSurfaceContext }) {
  const { dashboard, t, surfaceT, money, percent } = context
  if (!dashboard) return null

  const alerts = dashboard.alerts.filter((alert) => surfaceMeta[context.view].alertCodes.includes(alert.code))

  return (
    <Card className={dashboardPanelClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" />
          {surfaceT(`${context.view}.assuranceTitle`)}
        </CardTitle>
        <CardDescription className={dashboardMutedTextClass}>{surfaceT(`${context.view}.assuranceDescription`)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("metrics.confidence")}</span>
            <span className="font-semibold tabular-nums">{percent(dashboard.summary.financeConfidence)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(37,57,67,0.64)]">
            <div
              className={cn("h-full rounded-full", dashboard.summary.financeConfidence >= 85 ? dashboardToneBg("success") : dashboard.summary.financeConfidence >= 65 ? dashboardToneBg("gold") : dashboardToneBg("danger"))}
              style={{ width: `${dashboard.summary.financeConfidence}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2">
          {alerts.length === 0 ? (
            <div className={cn(dashboardEmptyClass, "p-4 text-left")}>
              {surfaceT("empty.alerts")}
            </div>
          ) : alerts.map((alert) => (
            <div key={alert.id} className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", dashboardSeverityClass(alert.severity))}>
              {alert.severity === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
              <span>{alertText(alert, t, money)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LedgerPanel({
  title,
  description,
  lines,
}: {
  title: string
  description: string
  lines: Array<{ label: string; value: string; tone?: string }>
}) {
  return (
    <Card className={dashboardPanelClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {title}
        </CardTitle>
        <CardDescription className={dashboardMutedTextClass}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {lines.map((line) => (
          <SummaryLine key={line.label} label={line.label} value={line.value} tone={line.tone} />
        ))}
      </CardContent>
    </Card>
  )
}

function ActionPanel({
  title,
  description,
  actions,
  localizedHref,
}: {
  title: string
  description: string
  actions: Array<{ href: string; icon: LucideIcon; label: string }>
  localizedHref: (href: string) => string
}) {
  return (
    <Card className={dashboardPanelClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ExternalLink className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {title}
        </CardTitle>
        <CardDescription className={dashboardMutedTextClass}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <Button key={action.href} asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
            <Link href={localizedHref(action.href)}>
              <span className="flex items-center gap-2">
                <action.icon className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                {action.label}
              </span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

function PaymentsTable({
  payments,
  money,
  formatDateTime,
  t,
  empty,
}: {
  payments: FinanceRecentPayment[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  empty: string
}) {
  if (payments.length === 0) {
    return <div className={dashboardEmptyClass}>{empty}</div>
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

function AgingPanel({
  title,
  description,
  aging,
  counterparties,
  money,
  t,
  empty,
  localizedHref,
  counterpartyHref,
}: {
  title: string
  description: string
  aging: FinanceAgingSummary
  counterparties: FinanceCounterparty[]
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  empty: string
  localizedHref: (href: string) => string
  counterpartyHref: (party: FinanceCounterparty) => string
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
            <div className={cn(dashboardEmptyClass, "p-6")}>{empty}</div>
          ) : counterparties.map((party) => (
            <Link
              key={party.id}
              href={localizedHref(counterpartyHref(party))}
              className={cn(dashboardRowClass, "flex items-center justify-between gap-3 p-2 text-sm transition hover:border-[var(--dash-brand)] hover:bg-[var(--dash-brand-soft)]")}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{party.name}</div>
                <div className="text-xs text-[var(--dash-text-soft)]">{party.terms ? t("aging.terms", { count: party.terms }) : t("common.notAvailable")}</div>
              </div>
              <Badge variant="outline" className={cn("shrink-0", dashboardSeverityClass(party.severity))}>{money(party.balance)}</Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function FinancePaymentsSurface() {
  const context = useSpecializedFinanceDashboard("payments")
  const { dashboard, money, percent, t, surfaceT, formatDateTime, localizedHref } = context
  if (!dashboard && context.dashboardQuery.isLoading) return <LoadingState />

  const inboundRecent = dashboard?.recentPayments.filter((payment) => payment.direction === "in") ?? []
  const outboundRecent = dashboard?.recentPayments.filter((payment) => payment.direction === "out") ?? []

  return (
    <SurfaceFrame context={context}>
      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={surfaceT("payments.kpis.collected")} value={money(dashboard.summary.paymentsCollected)} detail={surfaceT("payments.details.collected")} icon={ArrowUpRight} accent="success" />
            <MetricCard title={surfaceT("payments.kpis.pending")} value={money(dashboard.summary.paymentsPending)} detail={surfaceT("payments.details.pending")} icon={AlertTriangle} accent={dashboard.summary.paymentsPending > 0 ? "gold" : "muted"} />
            <MetricCard title={surfaceT("payments.kpis.netCash")} value={money(dashboard.summary.netCashFlow)} detail={surfaceT("payments.details.netCash")} icon={Wallet} accent={dashboard.summary.netCashFlow >= 0 ? "brand" : "danger"} />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {surfaceT("payments.sections.ledger")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payments.sections.ledgerDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable payments={dashboard.recentPayments} money={money} formatDateTime={formatDateTime} t={t} empty={t("empty.payments")} />
              </CardContent>
            </Card>

            <div className="space-y-3">
              <AssurancePanel context={context} />
              <LedgerPanel
                title={surfaceT("payments.sections.posting")}
                description={surfaceT("payments.sections.postingDescription")}
                lines={[
                  { label: surfaceT("payments.summary.inboundRecent"), value: money(sumPayments(inboundRecent)), tone: "text-[var(--dash-success)]" },
                  { label: surfaceT("payments.summary.outboundRecent"), value: money(sumPayments(outboundRecent)), tone: "text-[var(--dash-danger)]" },
                  { label: t("summary.refunds"), value: money(dashboard.summary.refunds) },
                  { label: t("summary.drawerVariance"), value: money(dashboard.summary.drawerVariance), tone: dashboardValueTone(dashboard.summary.drawerVariance) },
                ]}
              />
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {t("sections.methods")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payments.sections.methodsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <MethodBreakdown methods={dashboard.paymentMethods} money={money} t={t} />
              </CardContent>
            </Card>
            <ActionPanel
              title={surfaceT("payments.sections.workflows")}
              description={surfaceT("payments.sections.workflowsDescription")}
              localizedHref={localizedHref}
              actions={[
                { href: "/dashboard/pos", icon: CreditCard, label: surfaceT("actions.pos") },
                { href: "/dashboard/finance/reconciliation", icon: ShieldCheck, label: t("actions.reconciliation") },
                { href: "/dashboard/finance/cash-drawer", icon: Wallet, label: t("actions.cashDrawers") },
                { href: "/dashboard/finance/cash-flow", icon: LineChart, label: t("actions.cashFlow") },
                { href: "/dashboard/settings/tax-rates", icon: Percent, label: t("actions.taxRates") },
              ]}
            />
          </section>
        </>
      ) : null}
    </SurfaceFrame>
  )
}

export function FinanceReceivablesSurface() {
  const context = useSpecializedFinanceDashboard("receivables")
  const { dashboard, money, percent, t, surfaceT, formatDateTime, localizedHref } = context
  if (!dashboard && context.dashboardQuery.isLoading) return <LoadingState />

  const inboundPayments = dashboard?.recentPayments.filter((payment) => payment.direction === "in") ?? []

  return (
    <SurfaceFrame context={context}>
      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t("metrics.receivables")} value={money(dashboard.summary.receivables)} detail={t("details.receivables", { count: dashboard.summary.openReceivableCount })} icon={HandCoins} accent="gold" />
            <MetricCard title={surfaceT("receivables.kpis.overdue")} value={money(dashboard.summary.overdueReceivableAmount)} detail={surfaceT("receivables.details.overdue")} icon={AlertTriangle} accent={dashboard.summary.overdueReceivableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("receivables.kpis.collected")} value={money(dashboard.summary.paymentsCollected)} detail={surfaceT("receivables.details.collected")} icon={ArrowUpRight} accent="success" />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AgingPanel
              title={surfaceT("receivables.sections.aging")}
              description={surfaceT("receivables.sections.agingDescription")}
              aging={dashboard.aging.receivables}
              counterparties={dashboard.topReceivables}
              money={money}
              t={t}
              empty={surfaceT("empty.receivables")}
              localizedHref={localizedHref}
              counterpartyHref={(party) => `/dashboard/customers/${party.id}`}
            />
            <div className="space-y-3">
              <AssurancePanel context={context} />
              <LedgerPanel
                title={surfaceT("receivables.sections.posting")}
                description={surfaceT("receivables.sections.postingDescription")}
                lines={[
                  { label: t("metrics.receivables"), value: money(dashboard.summary.receivables) },
                  { label: surfaceT("receivables.summary.overdue"), value: money(dashboard.summary.overdueReceivableAmount), tone: dashboard.summary.overdueReceivableAmount > 0 ? "text-[var(--dash-danger)]" : undefined },
                  { label: surfaceT("receivables.summary.recentReceipts"), value: money(sumPayments(inboundPayments)), tone: "text-[var(--dash-success)]" },
                  { label: t("summary.tax"), value: money(dashboard.summary.taxCollected - dashboard.summary.taxOnPurchases) },
                ]}
              />
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-success)]" />
                  {surfaceT("receivables.sections.receipts")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("receivables.sections.receiptsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable payments={inboundPayments} money={money} formatDateTime={formatDateTime} t={t} empty={surfaceT("empty.receipts")} />
              </CardContent>
            </Card>
            <ActionPanel
              title={surfaceT("receivables.sections.workflows")}
              description={surfaceT("receivables.sections.workflowsDescription")}
              localizedHref={localizedHref}
              actions={[
                { href: "/dashboard/customers", icon: HandCoins, label: surfaceT("actions.customers") },
                { href: "/dashboard/sales", icon: TrendingUp, label: surfaceT("actions.sales") },
                { href: "/dashboard/finance/sales", icon: ReceiptText, label: surfaceT("actions.salesFinance") },
                { href: "/dashboard/finance/reconciliation", icon: ShieldCheck, label: t("actions.reconciliation") },
                { href: "/dashboard/finance/cash-flow", icon: LineChart, label: t("actions.cashFlow") },
              ]}
            />
          </section>
        </>
      ) : null}
    </SurfaceFrame>
  )
}

export function FinancePayablesSurface() {
  const context = useSpecializedFinanceDashboard("payables")
  const { dashboard, money, percent, t, surfaceT, formatDateTime, localizedHref } = context
  if (!dashboard && context.dashboardQuery.isLoading) return <LoadingState />

  const outboundPayments = dashboard?.recentPayments.filter((payment) => payment.direction === "out") ?? []

  return (
    <SurfaceFrame context={context}>
      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t("metrics.payables")} value={money(dashboard.summary.payables)} detail={t("details.payables", { count: dashboard.summary.openPayableCount })} icon={FileText} accent={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("payables.kpis.overdue")} value={money(dashboard.summary.overduePayableAmount)} detail={surfaceT("payables.details.overdue")} icon={AlertTriangle} accent={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("payables.kpis.purchases")} value={money(dashboard.summary.purchases)} detail={surfaceT("payables.details.purchases")} icon={ArrowDownRight} accent="gold" />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AgingPanel
              title={surfaceT("payables.sections.aging")}
              description={surfaceT("payables.sections.agingDescription")}
              aging={dashboard.aging.payables}
              counterparties={dashboard.topPayables}
              money={money}
              t={t}
              empty={surfaceT("empty.payables")}
              localizedHref={localizedHref}
              counterpartyHref={(party) => `/dashboard/purchases/suppliers/${party.id}`}
            />
            <div className="space-y-3">
              <AssurancePanel context={context} />
              <LedgerPanel
                title={surfaceT("payables.sections.posting")}
                description={surfaceT("payables.sections.postingDescription")}
                lines={[
                  { label: t("metrics.payables"), value: money(dashboard.summary.payables) },
                  { label: surfaceT("payables.summary.overdue"), value: money(dashboard.summary.overduePayableAmount), tone: dashboard.summary.overduePayableAmount > 0 ? "text-[var(--dash-danger)]" : undefined },
                  { label: surfaceT("payables.summary.recentDisbursements"), value: money(sumPayments(outboundPayments)), tone: "text-[var(--dash-danger)]" },
                  { label: t("summary.tax"), value: money(dashboard.summary.taxCollected - dashboard.summary.taxOnPurchases) },
                ]}
              />
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-danger)]" />
                  {surfaceT("payables.sections.disbursements")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payables.sections.disbursementsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable payments={outboundPayments} money={money} formatDateTime={formatDateTime} t={t} empty={surfaceT("empty.disbursements")} />
              </CardContent>
            </Card>
            <ActionPanel
              title={surfaceT("payables.sections.workflows")}
              description={surfaceT("payables.sections.workflowsDescription")}
              localizedHref={localizedHref}
              actions={[
                { href: "/dashboard/purchases/payables", icon: FileText, label: surfaceT("actions.apWorkbench") },
                { href: "/dashboard/purchase-orders", icon: ReceiptText, label: surfaceT("actions.purchaseOrders") },
                { href: "/dashboard/purchases/suppliers", icon: Building2, label: surfaceT("actions.suppliers") },
                { href: "/dashboard/finance/reconciliation", icon: ShieldCheck, label: t("actions.reconciliation") },
                { href: "/dashboard/finance/cash-flow", icon: LineChart, label: t("actions.cashFlow") },
              ]}
            />
          </section>
        </>
      ) : null}
    </SurfaceFrame>
  )
}
