"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Fragment, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDown,
      ArrowDownRight,
      ArrowUpDown,
  ArrowUp,
      ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
      ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
      Search,
  ExternalLink,
  Filter,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Monitor,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UnlockKeyhole,
  Wallet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { useCashDrawerDashboard } from "@/hooks/posHooks/useDrawerDashboard"
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
  dashboardValueTone,
  type DashboardTone,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { DrawerDashboardPeriod } from "@/services/pos/drawer-dashboard.schemas"
import type {
  CashDrawerDashboardAlert,
  CashDrawerDashboardDrawer,
  CashDrawerDashboardJournalEntry,
  CashDrawerDashboardSession,
  CashDrawerDashboardTrendPoint,
} from "@/services/pos/drawer-dashboard.service"

const periodOptions: DrawerDashboardPeriod[] = ["today", "yesterday", "7d", "30d", "mtd", "custom"]
const allLocationsValue = "all"
const severityPriority: Record<CashDrawerDashboardDrawer["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
}
const severityRailClasses: Record<CashDrawerDashboardDrawer["severity"], string> = {
  critical: "bg-[var(--dash-danger)]",
  warning: "bg-[var(--dash-gold)]",
  info: "bg-[var(--dash-info)]",
  success: "bg-[var(--dash-success)]",
}

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 6)
  return { start: inputDate(start), end: inputDate(now) }
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  className,
  prominent = false,
}: {
  title: string
  value: string
  detail: string
  icon: typeof Wallet
  tone: DashboardTone
  className?: string
  prominent?: boolean
}) {
  return (
    <Card className={cn("dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden", className)} style={dashboardStatStyle(tone)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--stat-soft)]">
          <Icon className="h-4 w-4 text-[var(--stat-accent)]" />
        </span>
      </CardHeader>
      <CardContent className="relative">
        <div className={cn("font-semibold tabular-nums", prominent ? "text-3xl" : "text-2xl")}>{value}</div>
        <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{detail}</div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
      <Skeleton className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
      <Skeleton className="h-12 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
        ))}
      </div>
      <div className="flex flex-col-reverse gap-3">
        <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
        <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
      </div>
    </div>
  )
}

export default function CashDrawerManagementDashboard() {
  const t = useTranslations("cashDrawerDashboard")
  const locale = useLocale()
  const notifications = useNotifications()
  const [period, setPeriod] = useState<DrawerDashboardPeriod>("today")
  const [locationId, setLocationId] = useState(allLocationsValue)
  const [customRange, setCustomRange] = useState(defaultCustomRange)

  const queryInput = useMemo(
    () => ({
      locationId: locationId === allLocationsValue ? undefined : locationId,
      period,
      startDate: period === "custom" ? new Date(`${customRange.start}T00:00:00`) : undefined,
      endDate: period === "custom" ? new Date(`${customRange.end}T23:59:59`) : undefined,
    }),
    [customRange.end, customRange.start, locationId, period],
  )
  const dashboardQuery = useCashDrawerDashboard(queryInput)
  const response = dashboardQuery.data
  const dashboard = response?.success ? response.data : null
  const errorMessage = response && !response.success ? response.error : dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null
  const currency = dashboard?.organization.currency ?? "USD"
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
      }),
    [currency, locale],
  )
  const compactNumber = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale])
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }), [locale])
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), [locale])

  const money = (value: number | null | undefined) => currencyFormatter.format(value ?? 0)
  const shortMoney = (value: number | null | undefined) => compactNumber.format(value ?? 0)
  const percent = (value: number) => `${Math.round(value)}%`
  const formatDateTime = (value: string | null) => value ? timeFormatter.format(new Date(value)) : t("common.notAvailable")

  async function refreshDashboard() {
    notifications.info(t("notifications.refreshTitle"), t("notifications.refreshMessage"), { category: "cash" })
    const result = await dashboardQuery.refetch()
    if (result.data?.success) {
      notifications.success(t("notifications.refreshedTitle"), t("notifications.refreshedMessage"), { category: "cash" })
    } else {
      notifications.error(t("notifications.refreshFailedTitle"), result.data?.error || t("notifications.refreshFailedMessage"), {
        category: "cash",
      })
    }
  }

  function eventLabel(type: CashDrawerDashboardJournalEntry["type"]) {
    return t(`events.${type}`)
  }

  function statusLabel(status: CashDrawerDashboardSession["status"]) {
    return t(`statuses.${status}`)
  }

  function alertText(alert: CashDrawerDashboardAlert) {
    if (alert.code === "HIGH_VARIANCE") {
      return t("alerts.highVariance", { count: alert.count, amount: money(alert.amount) })
    }
    if (alert.code === "MEDIUM_VARIANCE") {
      return t("alerts.mediumVariance", { count: alert.count, amount: money(alert.amount) })
    }
    if (alert.code === "STALE_SESSION") {
      return t("alerts.staleSession", { count: alert.count })
    }
    if (alert.code === "OPEN_DRAWER_WITHOUT_SESSION") {
      return t("alerts.openDrawerWithoutSession", { count: alert.count })
    }
    return t("alerts.ready")
  }
  const orderedDrawers = dashboard
    ? [...dashboard.drawers].sort(
        (left, right) =>
          severityPriority[left.severity] - severityPriority[right.severity] ||
          Math.abs(right.variance) - Math.abs(left.variance) ||
          Number(right.isOpen) - Number(left.isOpen),
      )
    : []
  const actionableAlertCount = dashboard?.alerts.reduce((total, alert) => total + (alert.severity === "success" ? 0 : alert.count), 0) ?? 0
  const hasCriticalRisk =
    dashboard?.alerts.some((alert) => alert.severity === "critical") ||
    (dashboard ? Math.abs(dashboard.summary.liveVariance) >= dashboard.thresholds.highVariance : false)
  const needsReview =
    actionableAlertCount > 0 ||
    (dashboard ? Math.abs(dashboard.summary.liveVariance) >= dashboard.thresholds.mediumVariance : false)
  const operatingTone: DashboardTone = hasCriticalRisk ? "danger" : needsReview ? "gold" : "success"
  const operatingStateLabel = hasCriticalRisk
    ? t("operatingStatus.states.critical")
    : needsReview
      ? t("operatingStatus.states.review")
      : t("operatingStatus.states.controlled")

  if (dashboardQuery.isLoading && !dashboard) {
    return (
      <main className="cash-drawer-dashboard dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
          <LoadingState />
        </div>
      </main>
    )
  }

  if (errorMessage && !dashboard) {
    return <DashboardErrorState error="Cash drawer dashboard unavailable" reset={() => { void dashboardQuery.refetch() }} />
  }

  return (
    <main className="cash-drawer-dashboard dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
      <section className={cn(dashboardPanelClass, "p-4")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)]">
                <LayoutDashboard className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">{t("title")}</h1>
                <p className="text-sm text-[var(--dash-text-soft)]">{t("subtitle")}</p>
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

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[220px_180px_160px_auto] xl:min-w-[740px]">
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
              <Select value={period} onValueChange={(value) => setPeriod(value as DrawerDashboardPeriod)}>
                <SelectTrigger className={dashboardControlClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`periods.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === "custom" ? (
              <div className="sm:col-span-2 lg:col-span-1">
                <TableDateRangePicker
                  value={{ from: customRange.start, to: customRange.end }}
                  onChange={(range) => setCustomRange({ start: range.from ?? "", end: range.to ?? "" })}
                  locale={locale === "fr" ? "fr" : "en"}
                  triggerClassName="h-10"
                />
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}

            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={refreshDashboard}
                disabled={dashboardQuery.isFetching}
                className="dashboard-button-primary h-10 rounded-lg"
              >
                <RefreshCw className={cn("h-4 w-4", dashboardQuery.isFetching && "animate-spin")} />
                {t("actions.refresh")}
              </Button>
              <Button asChild variant="outline" className="dashboard-button-secondary h-10 rounded-lg">
                <Link href="/dashboard/pos">
                  <Monitor className="h-4 w-4" />
                  {t("actions.pos")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      {dashboard ? (
        <section aria-labelledby="cash-operating-status-title" className={cn(dashboardPanelClass, "px-4 py-3")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p id="cash-operating-status-title" className="text-sm font-semibold">{t("operatingStatus.title")}</p>
              <p className="mt-0.5 text-xs text-[var(--dash-text-soft)]">{t("operatingStatus.prompt")}</p>
            </div>
            <Badge variant="outline" className={cn("gap-1.5 rounded-lg px-3 py-1", dashboardSeverityClass(operatingTone === "danger" ? "critical" : operatingTone === "gold" ? "warning" : "success"))}>
              {operatingTone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {operatingStateLabel}
            </Badge>
          </div>
          <div className="mt-3 grid divide-y divide-[var(--dash-border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            <div className="flex min-w-0 items-center gap-3 px-2 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--dash-success)]" />
              <div className="min-w-0">
                <div className="text-xs text-[var(--dash-text-soft)]">{t("operatingStatus.confidence")}</div>
                <div className="font-semibold tabular-nums">{percent(dashboard.summary.confidenceScore)}</div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 px-4 py-3">
              <AlertTriangle className={cn("h-4 w-4 shrink-0", actionableAlertCount > 0 ? "text-[var(--dash-gold)]" : "text-[var(--dash-success)]")} />
              <div className="min-w-0">
                <div className="text-xs text-[var(--dash-text-soft)]">{t("operatingStatus.alerts")}</div>
                <div className="font-semibold tabular-nums">{actionableAlertCount}</div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 px-4 py-3">
              <UnlockKeyhole className="h-4 w-4 shrink-0 text-[var(--dash-info)]" />
              <div className="min-w-0">
                <div className="text-xs text-[var(--dash-text-soft)]">{t("operatingStatus.openDrawers")}</div>
                <div className="font-semibold tabular-nums">{dashboard.summary.openDrawerCount}/{dashboard.summary.drawerCount}</div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 px-4 py-3">
              <Clock className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" />
              <div className="min-w-0">
                <div className="text-xs text-[var(--dash-text-soft)]">{t("operatingStatus.lastUpdated")}</div>
                <div className="truncate text-sm font-semibold">{formatDateTime(dashboard.generatedAt)}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <Card className={cn(dashboardPanelClass, "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]")}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--dash-danger)]" />
            <span className="text-sm font-medium">One cash drawer source failed or timed out. Retry the read-only dashboard without exposing internal details.</span>
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <nav aria-label={t("navigation.label")} className={cn(dashboardPanelClass, "sticky top-2 z-20 overflow-x-auto p-2 backdrop-blur-xl")}>
            <div className="flex min-w-max items-center gap-1">
              <a href="#overview" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("navigation.overview")}</a>
              <a href="#drawers" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("navigation.drawers")}</a>
              <a href="#movement" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("navigation.movement")}</a>
              <a href="#sessions" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("navigation.sessions")}</a>
              <a href="#journal" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{t("navigation.journal")}</a>
            </div>
          </nav>
          <section id="overview" className="grid scroll-mt-24 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
            <KpiCard
              title={t("metrics.currentBalance")}
              value={money(dashboard.summary.currentBalance)}
              detail={t("metricDetails.currentBalance", { count: dashboard.summary.drawerCount })}
              icon={Wallet}
              tone="success"
              prominent
            />
            <KpiCard
              title={t("metrics.liveVariance")}
              value={money(dashboard.summary.liveVariance)}
              detail={t("metricDetails.liveVariance", { expected: money(dashboard.summary.expectedBalance) })}
              icon={AlertTriangle}
              tone={
                Math.abs(dashboard.summary.liveVariance) >= dashboard.thresholds.highVariance
                  ? "danger"
                  : Math.abs(dashboard.summary.liveVariance) >= dashboard.thresholds.mediumVariance
                    ? "gold"
                    : "success"
              }
              prominent
            />
            <KpiCard
              title={t("metrics.cashSales")}
              value={money(dashboard.summary.cashSales)}
              detail={t("metricDetails.cashSales", { count: dashboard.summary.transactionCount })}
              icon={Banknote}
              tone="brand"
            />
            <KpiCard
              title={t("metrics.activeDrawers")}
              value={`${dashboard.summary.openDrawerCount}/${dashboard.summary.drawerCount}`}
              detail={t("metricDetails.activeDrawers", { count: dashboard.summary.activeSessionCount })}
              icon={UnlockKeyhole}
              tone="muted"
            />
            <KpiCard
              title={t("metrics.confidence")}
              value={percent(dashboard.summary.confidenceScore)}
              detail={t("metricDetails.confidence", { accuracy: percent(dashboard.summary.accuracyRate) })}
              icon={ShieldCheck}
              tone={dashboard.summary.confidenceScore >= 85 ? "success" : dashboard.summary.confidenceScore >= 65 ? "gold" : "danger"}
            />
          </section>

          <section className="flex flex-col-reverse gap-3">
            <Card id="drawers" className={cn(dashboardPanelClass, "scroll-mt-24")}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gauge className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      {t("sections.drawerHealth")}
                    </CardTitle>
                    <CardDescription className={dashboardMutedTextClass}>{t("sections.drawerHealthDescription")}</CardDescription>
                  </div>
                  <Badge variant="outline" className={dashboardFilterClass}>
                    {t("summary.netMovement", { amount: money(dashboard.summary.netMovement) })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard.drawers.length === 0 ? (
                  <div className={dashboardEmptyClass}>
                    {t("empty.drawers")}
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {orderedDrawers.map((drawer) => (
                      <DrawerCard key={drawer.id} drawer={drawer} money={money} t={t} formatDateTime={formatDateTime} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" />
                  {t("sections.confidence")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.confidenceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t("metrics.confidence")}</span>
                    <span className="font-semibold tabular-nums">{percent(dashboard.summary.confidenceScore)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(37,57,67,0.64)]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        dashboard.summary.confidenceScore >= 85
                          ? dashboardToneBg("success")
                          : dashboard.summary.confidenceScore >= 65
                            ? dashboardToneBg("gold")
                            : dashboardToneBg("danger"),
                      )}
                      style={{ width: `${dashboard.summary.confidenceScore}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  {dashboard.alerts.map((alert) => (
                    <div key={alert.id} className={cn("flex items-start gap-2 rounded-lg border p-3", dashboardSeverityClass(alert.severity))}>
                      {alert.severity === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                      <span>{alertText(alert)}</span>
                    </div>
                  ))}
                </div>

                <div className={cn(dashboardRowClass, "grid gap-2 p-3 text-sm lg:col-start-2 lg:row-span-2 lg:row-start-1")}>
                  <div className="flex justify-between gap-3">
                    <span className={dashboardMutedTextClass}>{t("summary.openingFloat")}</span>
                    <span className="font-semibold tabular-nums">{money(dashboard.summary.openingFloat)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={dashboardMutedTextClass}>{t("summary.cashIn")}</span>
                    <span className="font-semibold tabular-nums">{money(dashboard.summary.cashIn)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={dashboardMutedTextClass}>{t("summary.cashOut")}</span>
                    <span className="font-semibold tabular-nums">{money(dashboard.summary.cashOut)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={dashboardMutedTextClass}>{t("summary.refunds")}</span>
                    <span className="font-semibold tabular-nums">{money(dashboard.summary.refunds)}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[var(--dash-border-subtle)] pt-2">
                    <span className="font-medium">{t("summary.closingCounts")}</span>
                    <span className="font-semibold tabular-nums">{money(dashboard.summary.closingCounts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <Card id="movement" className={cn(dashboardPanelClass, "scroll-mt-24")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-[var(--dash-success)]" />
                  {t("sections.cashFlow")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.cashFlowDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart trend={dashboard.trend} money={money} shortMoney={shortMoney} dateFormatter={dateFormatter} t={t} />
              </CardContent>
            </Card>

            <Card id="sessions" className={cn(dashboardPanelClass, "scroll-mt-24")}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptText className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      {t("sections.sessions")}
                    </CardTitle>
                    <CardDescription className={dashboardMutedTextClass}>{t("sections.sessionsDescription")}</CardDescription>
                  </div>
                  <Badge variant="outline" className={dashboardFilterClass}>
                    {t("summary.accuracy", { value: percent(dashboard.summary.accuracyRate) })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SessionTable sessions={dashboard.sessions} money={money} t={t} formatDateTime={formatDateTime} statusLabel={statusLabel} />
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <Card id="journal" className={cn(dashboardPanelClass, "scroll-mt-24")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-[var(--dash-info)]" />
                  {t("sections.journal")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.journalDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <JournalTable journal={dashboard.journal} money={money} t={t} formatDateTime={formatDateTime} eventLabel={eventLabel} />
              </CardContent>
            </Card>

            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {t("sections.actions")}
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{t("sections.actionsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
                  <Link href="/dashboard/pos">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      {t("actions.openPos")}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
                  <Link href="/dashboard/finance/reconciliation">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {t("actions.reconciliation")}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
                  <Link href="/dashboard/settings/terminals">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      {t("actions.terminals")}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
                  <Link href="/dashboard/finance/cash-flow">
                    <span className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4" />
                      {t("actions.cashFlow")}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="dashboard-button-secondary justify-between rounded-lg">
                  <Link href="/dashboard/finance/cash-payment-history">
                    <span className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4" />
                      {t("actions.history")}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("gap-1.5 rounded-lg px-3 py-2", dashboardSeverityClass("warning"))}>
                    <Gauge className="h-3.5 w-3.5" />
                    {t("summary.reviewThreshold", { amount: money(dashboard.thresholds.mediumVariance) })}
                  </Badge>
                  <Badge variant="outline" className={cn("gap-1.5 rounded-lg px-3 py-2", dashboardSeverityClass("critical"))}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("summary.managerThreshold", { amount: money(dashboard.thresholds.highVariance) })}
                  </Badge>
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

function DrawerCard({
  drawer,
  money,
  t,
  formatDateTime,
}: {
  drawer: CashDrawerDashboardDrawer
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  formatDateTime: (value: string | null) => string
}) {
  return (
    <div className={cn(dashboardRowClass, "relative overflow-hidden p-3 pl-4")}>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", severityRailClasses[drawer.severity])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {drawer.isOpen ? <UnlockKeyhole className="h-4 w-4 text-[var(--dash-success)]" /> : <LockKeyhole className="h-4 w-4 text-[var(--dash-text-soft)]" />}
            <div className="truncate text-sm font-semibold">{drawer.name}</div>
          </div>
          <div className="mt-1 truncate text-xs text-[var(--dash-text-soft)]">
            {drawer.locationName} / {drawer.terminalName}
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", drawer.isOpen ? dashboardSeverityClass("success") : dashboardSeverityClass("info"))}>
          {drawer.isOpen ? t("drawer.open") : t("drawer.closed")}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.44)] p-2">
          <div className="text-[11px] text-[var(--dash-text-soft)]">{t("drawer.expected")}</div>
          <div className="mt-1 truncate text-sm font-semibold tabular-nums">{money(drawer.expectedBalance)}</div>
        </div>
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.44)] p-2">
          <div className="text-[11px] text-[var(--dash-text-soft)]">{t("drawer.current")}</div>
          <div className="mt-1 truncate text-sm font-semibold tabular-nums">{money(drawer.currentBalance)}</div>
        </div>
        <div className={cn("rounded-lg border p-2", dashboardSeverityClass(drawer.severity))}>
          <div className="text-[11px] opacity-80">{t("drawer.variance")}</div>
          <div className={cn("mt-1 truncate text-sm font-semibold tabular-nums", dashboardValueTone(drawer.variance))}>{money(drawer.variance)}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 text-xs text-[var(--dash-text-soft)]">
        <div className="flex justify-between gap-2">
          <span>{t("drawer.session")}</span>
          <span className="truncate font-medium text-[var(--dash-text)]">
            {drawer.activeSessionNumber || t("common.notAvailable")}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>{t("drawer.cashier")}</span>
          <span className="truncate font-medium text-[var(--dash-text)]">
            {drawer.activeCashierName || t("common.notAvailable")}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>{t("drawer.lastEvent")}</span>
          <span className="truncate font-medium text-[var(--dash-text)]">{formatDateTime(drawer.lastEventAt)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px]">
        <span className="rounded-lg bg-[var(--dash-brand-soft)] px-2 py-1 text-[var(--dash-brand-strong)]">{money(drawer.periodCashSales)}</span>
        <span className="rounded-lg bg-[var(--dash-success-soft)] px-2 py-1 text-[var(--dash-success)]">
          {money(drawer.periodCashIn)}
        </span>
        <span className="rounded-lg bg-[var(--dash-gold-soft)] px-2 py-1 text-[var(--dash-gold)]">{money(drawer.periodCashOut)}</span>
        <span className="rounded-lg bg-[var(--dash-danger-soft)] px-2 py-1 text-[var(--dash-danger)]">{money(drawer.periodRefunds)}</span>
      </div>
    </div>
  )
}

function TrendChart({
  trend,
  money,
  shortMoney,
  dateFormatter,
  t,
}: {
  trend: CashDrawerDashboardTrendPoint[]
  money: (value: number | null | undefined) => string
  shortMoney: (value: number | null | undefined) => string
  dateFormatter: Intl.DateTimeFormat
  t: ReturnType<typeof useTranslations>
}) {
  const maxValue = Math.max(1, ...trend.map((point) => Math.max(point.sales, point.cashIn, point.cashOut, point.refunds)))
  const totalNet = trend.reduce((total, point) => total + point.net, 0)
  const totalInflow = trend.reduce((total, point) => total + point.sales + point.cashIn, 0)
  const totalOutflow = trend.reduce((total, point) => total + point.cashOut + point.refunds, 0)
  const latestPoint = trend[trend.length - 1]
  const previousPoint = trend[trend.length - 2]
  const latestDelta = latestPoint && previousPoint ? latestPoint.net - previousPoint.net : null

  if (trend.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.trend")}</div>
  }

  return (
    <div>
      <div className="mb-4 grid border-y border-[var(--dash-border-subtle)] sm:grid-cols-2 xl:grid-cols-4">
        <div className="px-3 py-3">
          <div className="text-xs text-[var(--dash-text-soft)]">{t("chart.netMovement")}</div>
          <div className={cn("mt-1 font-semibold tabular-nums", dashboardValueTone(totalNet))}>{money(totalNet)}</div>
        </div>
        <div className="border-t border-[var(--dash-border-subtle)] px-3 py-3 sm:border-l sm:border-t-0">
          <div className="text-xs text-[var(--dash-text-soft)]">{t("chart.totalInflow")}</div>
          <div className="mt-1 font-semibold tabular-nums text-[var(--dash-success)]">{money(totalInflow)}</div>
        </div>
        <div className="border-t border-[var(--dash-border-subtle)] px-3 py-3 xl:border-l xl:border-t-0">
          <div className="text-xs text-[var(--dash-text-soft)]">{t("chart.totalOutflow")}</div>
          <div className="mt-1 font-semibold tabular-nums text-[var(--dash-gold)]">{money(totalOutflow)}</div>
        </div>
        <div className="border-t border-[var(--dash-border-subtle)] px-3 py-3 sm:border-l xl:border-t-0">
          <div className="text-xs text-[var(--dash-text-soft)]">{t("chart.latestComparison")}</div>
          <div className={cn("mt-1 font-semibold tabular-nums", latestDelta === null ? dashboardMutedTextClass : dashboardValueTone(latestDelta))}>
            {latestDelta === null ? t("chart.comparisonUnavailable") : money(latestDelta)}
          </div>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[720px] pb-4">
          <div className="flex gap-3">
            <div className="flex h-44 w-16 shrink-0 flex-col justify-between pb-8 text-right text-[11px] tabular-nums text-[var(--dash-text-faint)]">
              <span>{shortMoney(maxValue)}</span>
              <span>{shortMoney(maxValue / 2)}</span>
              <span>0</span>
            </div>
            <div className="relative flex h-44 flex-1 items-end gap-2 border-b border-l border-[var(--dash-border-subtle)] px-2">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-[var(--dash-border-subtle)]" />
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--dash-border-subtle)]" />
              {trend.map((point) => {
                const dateLabel = dateFormatter.format(new Date(point.key))
                return (
                  <div
                    key={point.key}
                    tabIndex={0}
                    aria-label={t("chart.daySummary", { date: dateLabel, net: money(point.net) })}
                    className="group relative z-10 flex h-full min-w-[68px] flex-1 items-end justify-center gap-1 pb-8 outline-none"
                  >
                    <div className="pointer-events-none absolute inset-x-1 top-2 z-20 rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-[10px] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                      <div className="font-semibold">{dateLabel}</div>
                      <div className="mt-1 grid gap-0.5 text-[var(--dash-text-soft)]">
                        <span>{t("legend.sales")}: {money(point.sales)}</span>
                        <span>{t("legend.cashIn")}: {money(point.cashIn)}</span>
                        <span>{t("legend.cashOut")}: {money(point.cashOut)}</span>
                        <span>{t("legend.refunds")}: {money(point.refunds)}</span>
                        <span className={cn("font-semibold", dashboardValueTone(point.net))}>{t("chart.net")}: {money(point.net)}</span>
                      </div>
                    </div>
                    <div className={cn("w-full max-w-4 rounded-t-sm", dashboardToneBg("brand"))} style={{ height: `${Math.max(3, (point.sales / maxValue) * 100)}%` }} title={money(point.sales)} />
                    <div className={cn("w-full max-w-4 rounded-t-sm", dashboardToneBg("success"))} style={{ height: `${Math.max(3, (point.cashIn / maxValue) * 100)}%` }} title={money(point.cashIn)} />
                    <div className={cn("w-full max-w-4 rounded-t-sm", dashboardToneBg("gold"))} style={{ height: `${Math.max(3, (point.cashOut / maxValue) * 100)}%` }} title={money(point.cashOut)} />
                    <div className={cn("w-full max-w-4 rounded-t-sm", dashboardToneBg("danger"))} style={{ height: `${Math.max(3, (point.refunds / maxValue) * 100)}%` }} title={money(point.refunds)} />
                    <span className="absolute inset-x-0 bottom-2 truncate text-center text-[11px] font-medium text-[var(--dash-text-soft)]">{dateLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--dash-text-soft)]">
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("brand"))} />{t("legend.sales")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("success"))} />{t("legend.cashIn")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("gold"))} />{t("legend.cashOut")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("danger"))} />{t("legend.refunds")}</span>
      </div>
    </div>
  )
}

function TableDetailValue({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--dash-text-faint)]">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-semibold text-[var(--dash-text)]", numeric && "tabular-nums")}>{value}</div>
    </div>
  )
}

function SessionTable({
  sessions,
  money,
  t,
  formatDateTime,
  statusLabel,
}: {
  sessions: CashDrawerDashboardSession[]
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  formatDateTime: (value: string | null) => string
  statusLabel: (status: CashDrawerDashboardSession["status"]) => string
}) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [sessionSearch, setSessionSearch] = useState("")
  const deferredSessionSearch = useDeferredValue(sessionSearch)
  const [statusFilter, setStatusFilter] = useState<"all" | CashDrawerDashboardSession["status"]>("all")
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d" | "30d">("all")
  const [sortField, setSortField] = useState<"time" | "sales" | "variance">("time")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionPageSize, setSessionPageSize] = useState(12)

  const statusFilterOptions: Array<{ value: "all" | CashDrawerDashboardSession["status"]; label: string }> = [
    { value: "all", label: t("tableControls.statusAll") },
    { value: "ACTIVE", label: t("statuses.ACTIVE") },
    { value: "RECONCILED", label: t("statuses.RECONCILED") },
    { value: "SUSPENDED", label: t("statuses.SUSPENDED") },
  ]

  const timeFilterOptions: Array<{ value: "all" | "24h" | "7d" | "30d"; label: string; hours?: number }> = [
    { value: "all", label: t("tableControls.timeAll") },
    { value: "24h", label: t("tableControls.time24h"), hours: 24 },
    { value: "7d", label: t("tableControls.time7d"), hours: 168 },
    { value: "30d", label: t("tableControls.time30d"), hours: 720 },
  ]

  const pageSizeOptions = [8, 12, 20, 40]

  function handleSort(field: "time" | "sales" | "variance") {
    if (sortField === field) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection("desc")
  }

  function sortIndicator(field: "time" | "sales" | "variance") {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-[var(--dash-text-faint)]" />
    }

    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-[var(--dash-text)]" /> : <ArrowDown className="h-3.5 w-3.5 text-[var(--dash-text)]" />
  }

  const filteredAndSortedSessions = useMemo(() => {
    const normalizedSearch = deferredSessionSearch.trim().toLowerCase()
    const maxAgeHours = timeFilter === "all" ? null : timeFilter === "24h" ? 24 : timeFilter === "7d" ? 168 : 720
    const cutoff = maxAgeHours ? Date.now() - maxAgeHours * 60 * 60 * 1000 : null

    const results = sessions.filter((session) => {
      if (statusFilter !== "all" && session.status !== statusFilter) {
        return false
      }

      if (cutoff) {
        const startedAt = Date.parse(session.startTime)
        if (Number.isNaN(startedAt) || startedAt < cutoff) {
          return false
        }
      }

      if (!normalizedSearch) {
        return true
      }

      const searchScope = `${session.sessionNumber} ${session.cashierName} ${session.terminalName}`.toLowerCase()
      return searchScope.includes(normalizedSearch)
    })

    results.sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1

      if (sortField === "time") {
        const leftValue = Date.parse(left.startTime)
        const rightValue = Date.parse(right.startTime)
        if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
          return 0
        }
        if (Number.isNaN(leftValue)) {
          return direction
        }
        if (Number.isNaN(rightValue)) {
          return -direction
        }
        return (leftValue - rightValue) * direction
      }

      if (sortField === "sales") {
        return (left.totalSales - right.totalSales) * direction
      }

      return (Number(left.variance ?? 0) - Number(right.variance ?? 0)) * direction
    })

    return results
  }, [deferredSessionSearch, sessions, sortDirection, sortField, statusFilter, timeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSessions.length / sessionPageSize))
  const boundedPage = Math.min(Math.max(1, sessionPage), totalPages)
  const sessionPageOffset = (boundedPage - 1) * sessionPageSize
  const visibleSessions = filteredAndSortedSessions.slice(sessionPageOffset, sessionPageOffset + sessionPageSize)
  const visibleStart = filteredAndSortedSessions.length === 0 ? 0 : sessionPageOffset + 1
  const visibleEnd = Math.min(sessionPageOffset + visibleSessions.length, filteredAndSortedSessions.length)

  useEffect(() => {
    setSessionPage(1)
    setExpandedSessionId(null)
  }, [sessionSearch, statusFilter, timeFilter, sortField, sortDirection])

  useEffect(() => {
    setSessionPage((current) => Math.min(Math.max(1, current), totalPages))
  }, [sessionPageSize, totalPages])

  if (sessions.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.sessions")}</div>
  }

  return (
    <div className="space-y-3">
      <div className="dashboard-table-toolbar flex flex-wrap gap-2 xl:flex-nowrap">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-input-icon pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--dash-text-soft)]" />
          <Input
            type="search"
            value={sessionSearch}
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder={t("tableControls.searchPlaceholder")}
            aria-label={t("tableControls.searchPlaceholder")}
            className={cn("pl-9", dashboardControlClass)}
          />
        </div>
        <div className="w-44">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">{t("tableControls.status")}</div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as "all" | CashDrawerDashboardSession["status"])
            }}
          >
            <SelectTrigger className={dashboardControlClass} aria-label={t("tableControls.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">{t("tableControls.time")}</div>
          <Select
            value={timeFilter}
            onValueChange={(value) => {
              setTimeFilter(value as "all" | "24h" | "7d" | "30d")
            }}
          >
            <SelectTrigger className={dashboardControlClass} aria-label={t("tableControls.time")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="max-h-[560px] w-full">
        <table className="dashboard-table-base w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--dash-surface)] text-left text-xs text-[var(--dash-text-soft)]">
            <tr className="border-b border-[var(--dash-border-subtle)]">
              <th className="py-2 pr-3 font-medium" scope="col">
                <div className="flex items-center gap-2">{t("table.session")}</div>
              </th>
              <th className="py-2 pr-3 font-medium" scope="col">{t("table.cashier")}</th>
              <th className="py-2 pr-3 font-medium" scope="col" aria-sort={sortField === "time" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex items-center gap-1 rounded-md p-1 text-left" onClick={() => handleSort("time")}>
                  {t("table.time")}
                  {sortIndicator("time")}
                </button>
              </th>
              <th className="py-2 pr-3 text-right font-medium" scope="col" aria-sort={sortField === "sales" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex items-center gap-1 rounded-md p-1" onClick={() => handleSort("sales")}>
                  {t("table.sales")}
                  {sortIndicator("sales")}
                </button>
              </th>
              <th className="py-2 pr-3 text-right font-medium" scope="col">{t("table.cash")}</th>
              <th className="py-2 pr-3 text-right font-medium" scope="col" aria-sort={sortField === "variance" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex items-center gap-1 rounded-md p-1" onClick={() => handleSort("variance")}>
                  {t("table.variance")}
                  {sortIndicator("variance")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--dash-text-soft)]">
                  {t("empty.sessionsFiltered")}
                </td>
              </tr>
            ) : null}
            {visibleSessions.map((session, index) => {
              const isExpanded = expandedSessionId === session.id
              return (
                <Fragment key={session.id}>
                  <tr className={cn("border-b border-[var(--dash-border-subtle)] transition-colors hover:bg-[rgba(73,198,229,0.1)]", index % 2 === 1 && "bg-[rgba(24,38,45,0.24)]")}>

                    <td className="py-3 pr-3">
                      <div className="flex items-start gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-md text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
                          aria-expanded={isExpanded}
                          aria-controls={"session-details-" + session.id}
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="sr-only">{isExpanded ? t("details.hideSession") : t("details.showSession")}</span>
                        </Button>
                        <div>
                          <div className="font-medium">{session.sessionNumber}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--dash-text-soft)]">
                            <Monitor className="h-3 w-3" />
                            {session.terminalName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{session.cashierName}</div>
                      <Badge variant="outline" className={cn("mt-1", dashboardSeverityClass(session.severity))}>
                        {statusLabel(session.status)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--dash-text-soft)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(session.startTime)}
                      </div>
                      <div className="mt-1">{formatDateTime(session.endTime)}</div>
                    </td>
                    <td className="py-3 pr-3 text-right font-medium tabular-nums">{money(session.totalSales)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{money(session.cashTotal)}</td>
                    <td className={cn("py-3 pr-3 text-right font-semibold tabular-nums", dashboardValueTone(session.variance ?? 0))}>{money(session.variance)}</td>
                  </tr>
                  {isExpanded ? (
                    <tr id={"session-details-" + session.id} className="border-b border-[var(--dash-border-subtle)] bg-[rgba(47,125,246,0.06)]">
                      <td colSpan={6} className="px-10 py-4">
                        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
                          <TableDetailValue label={t("details.location")} value={session.locationName} />
                          <TableDetailValue label={t("details.openingBalance")} value={money(session.openingBalance)} numeric />
                          <TableDetailValue label={t("details.expectedBalance")} value={money(session.expectedBalance)} numeric />
                          <TableDetailValue label={t("details.closingBalance")} value={money(session.closingBalance)} numeric />
                          <TableDetailValue label={t("details.card")} value={money(session.cardTotal)} numeric />
                          <TableDetailValue label={t("details.mobileMoney")} value={money(session.mobileMoneyTotal)} numeric />
                          <TableDetailValue label={t("details.bankTransfer")} value={money(session.bankTransferTotal)} numeric />
                          <TableDetailValue label={t("details.credit")} value={money(session.creditTotal)} numeric />
                          <TableDetailValue label={t("details.transactions")} value={String(session.transactionCount)} numeric />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="dashboard-table-pagination flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--dash-text-soft)]">
          {t("tableControls.showing", { start: visibleStart, end: visibleEnd, total: filteredAndSortedSessions.length })}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">{t("tableControls.rowsPerPage")}</div>
            <Select
              value={String(sessionPageSize)}
              onValueChange={(value) => {
                setSessionPageSize(Number(value))
              }}
            >
              <SelectTrigger className={cn("h-9 w-[106px]", dashboardControlClass)} aria-label={t("tableControls.rowsPerPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-5 sm:pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="dashboard-button-secondary rounded-lg"
              onClick={() => setSessionPage((current) => Math.max(1, current - 1))}
              disabled={boundedPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("tableControls.previous")}
            </Button>
            <span className="inline-flex h-9 min-w-11 items-center justify-center rounded-md border border-[var(--dash-border-subtle)] px-2 text-xs text-[var(--dash-text)]">
              {boundedPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="dashboard-button-secondary rounded-lg"
              onClick={() => setSessionPage((current) => Math.min(totalPages, current + 1))}
              disabled={boundedPage >= totalPages}
            >
              {t("tableControls.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
function JournalTable({
  journal,
  money,
  t,
  formatDateTime,
  eventLabel,
}: {
  journal: CashDrawerDashboardJournalEntry[]
  money: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  formatDateTime: (value: string | null) => string
  eventLabel: (type: CashDrawerDashboardJournalEntry["type"]) => string
}) {
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null)

  if (journal.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.journal")}</div>
  }

  return (
    <ScrollArea className="max-h-[560px] w-full">
      <table className="dashboard-table-base w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--dash-surface)] text-left text-xs text-[var(--dash-text-soft)]">
          <tr className="border-b border-[var(--dash-border-subtle)]">
            <th className="py-2 pr-3 font-medium">{t("table.event")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.drawer")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.cashier")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.amount")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.after")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.time")}</th>
          </tr>
        </thead>
        <tbody>
          {journal.map((entry, index) => {
            const isExpanded = expandedJournalId === entry.id
            return (
              <Fragment key={entry.id}>
                <tr className={cn("border-b border-[var(--dash-border-subtle)] transition-colors hover:bg-[rgba(73,198,229,0.1)]", index % 2 === 1 && "bg-[rgba(24,38,45,0.24)]")}>
                  <td className="py-3 pr-3">
                    <div className="flex items-start gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded-md text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
                        aria-expanded={isExpanded}
                        aria-controls={"journal-details-" + entry.id}
                        onClick={() => setExpandedJournalId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="sr-only">{isExpanded ? t("details.hideJournal") : t("details.showJournal")}</span>
                      </Button>
                      <div className="min-w-0">
                        <div className="font-medium">{eventLabel(entry.type)}</div>
                        <div className="mt-1 max-w-[280px] truncate text-xs text-[var(--dash-text-soft)]">{entry.reason || t("common.notAvailable")}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div>{entry.drawerName}</div>
                    <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{entry.terminalName}</div>
                  </td>
                  <td className="py-3 pr-3">{entry.cashierName}</td>
                  <td className="py-3 pr-3 text-right font-medium tabular-nums">{money(entry.amount)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{money(entry.balanceAfter)}</td>
                  <td className="py-3 pr-3 text-xs text-[var(--dash-text-soft)]">{formatDateTime(entry.createdAt)}</td>
                </tr>
                {isExpanded ? (
                  <tr id={"journal-details-" + entry.id} className="border-b border-[var(--dash-border-subtle)] bg-[rgba(47,125,246,0.06)]">
                    <td colSpan={6} className="px-10 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <TableDetailValue label={t("details.location")} value={entry.locationName} />
                        <TableDetailValue label={t("details.session")} value={entry.sessionNumber || t("common.notAvailable")} />
                        <TableDetailValue label={t("details.balanceBefore")} value={money(entry.balanceBefore)} numeric />
                        <TableDetailValue label={t("details.balanceAfter")} value={money(entry.balanceAfter)} numeric />
                        <TableDetailValue label={t("details.reason")} value={entry.reason || t("common.notAvailable")} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
