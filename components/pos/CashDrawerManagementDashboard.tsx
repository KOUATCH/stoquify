"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
}: {
  title: string
  value: string
  detail: string
  icon: typeof Wallet
  tone: DashboardTone
}) {
  return (
    <Card className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden" style={dashboardStatStyle(tone)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--stat-soft)]">
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

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
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

  if (dashboardQuery.isLoading && !dashboard) {
    return (
      <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
          <LoadingState />
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
      <section className={cn(dashboardPanelClass, "p-4")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
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
              <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                <Input
                  type="date"
                  value={customRange.start}
                  onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))}
                  className={dashboardControlClass}
                />
                <Input
                  type="date"
                  value={customRange.end}
                  onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                  className={dashboardControlClass}
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

      {errorMessage ? (
        <Card className={cn(dashboardPanelClass, "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]")}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--dash-danger)]" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title={t("metrics.currentBalance")}
              value={money(dashboard.summary.currentBalance)}
              detail={t("metricDetails.currentBalance", { count: dashboard.summary.drawerCount })}
              icon={Wallet}
              tone="success"
            />
            <KpiCard
              title={t("metrics.cashSales")}
              value={money(dashboard.summary.cashSales)}
              detail={t("metricDetails.cashSales", { count: dashboard.summary.transactionCount })}
              icon={Banknote}
              tone="brand"
            />
            <KpiCard
              title={t("metrics.liveVariance")}
              value={money(dashboard.summary.liveVariance)}
              detail={t("metricDetails.liveVariance", { expected: money(dashboard.summary.expectedBalance) })}
              icon={AlertTriangle}
              tone={Math.abs(dashboard.summary.liveVariance) >= dashboard.thresholds.highVariance ? "danger" : "gold"}
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

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={dashboardPanelClass}>
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
                    {dashboard.drawers.map((drawer) => (
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
              <CardContent className="space-y-4">
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

                <div className={cn(dashboardRowClass, "grid gap-2 p-3 text-sm")}>
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

          <section className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className={dashboardPanelClass}>
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

            <Card className={dashboardPanelClass}>
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

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className={dashboardPanelClass}>
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
              <CardContent className="grid gap-2">
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
                <div className={cn(dashboardRowClass, "mt-2 p-3 text-xs text-[var(--dash-text-soft)]")}>
                  {t("summary.thresholds", {
                    medium: money(dashboard.thresholds.mediumVariance),
                    high: money(dashboard.thresholds.highVariance),
                  })}
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
    <div className={cn(dashboardRowClass, "p-3")}>
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
  const maxValue = Math.max(1, ...trend.map((point) => Math.max(point.sales, point.cashIn, point.cashOut, point.refunds, point.opening)))

  if (trend.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.trend")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex min-w-[620px] gap-2 pb-3">
        {trend.map((point) => (
          <div key={point.key} className={cn(dashboardRowClass, "flex min-w-20 flex-1 flex-col p-2")}>
            <div className="mb-2 text-xs font-medium text-[var(--dash-text-soft)]">{dateFormatter.format(new Date(point.key))}</div>
            <div className="flex h-28 items-end gap-1">
              <div className={cn("w-full rounded-t", dashboardToneBg("brand"))} style={{ height: `${Math.max(4, (point.sales / maxValue) * 100)}%` }} title={money(point.sales)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("success"))} style={{ height: `${Math.max(4, (point.cashIn / maxValue) * 100)}%` }} title={money(point.cashIn)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("gold"))} style={{ height: `${Math.max(4, (point.cashOut / maxValue) * 100)}%` }} title={money(point.cashOut)} />
              <div className={cn("w-full rounded-t", dashboardToneBg("danger"))} style={{ height: `${Math.max(4, (point.refunds / maxValue) * 100)}%` }} title={money(point.refunds)} />
            </div>
            <div className={cn("mt-2 truncate text-xs font-semibold tabular-nums", dashboardValueTone(point.net))}>{shortMoney(point.net)}</div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--dash-text-soft)]">
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("brand"))} />{t("legend.sales")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("success"))} />{t("legend.cashIn")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("gold"))} />{t("legend.cashOut")}</span>
        <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dashboardToneBg("danger"))} />{t("legend.refunds")}</span>
      </div>
    </ScrollArea>
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
  if (sessions.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.sessions")}</div>
  }

  return (
    <ScrollArea className="w-full">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="text-left text-xs text-[var(--dash-text-soft)]">
          <tr className="border-b border-[var(--dash-border-subtle)]">
            <th className="py-2 pr-3 font-medium">{t("table.session")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.cashier")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.time")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.sales")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.cash")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.variance")}</th>
          </tr>
        </thead>
        <tbody>
          {sessions.slice(0, 12).map((session) => (
            <tr key={session.id} className="border-b border-[var(--dash-border-subtle)] last:border-0">
              <td className="py-3 pr-3">
                <div className="font-medium">{session.sessionNumber}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--dash-text-soft)]">
                  <Monitor className="h-3 w-3" />
                  {session.terminalName}
                </div>
              </td>
              <td className="py-3 pr-3">
                <div>{session.cashierName}</div>
                <Badge variant="outline" className={cn("mt-1", session.status === "ACTIVE" ? dashboardSeverityClass("success") : dashboardSeverityClass("info"))}>
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
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
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
  if (journal.length === 0) {
    return <div className={dashboardEmptyClass}>{t("empty.journal")}</div>
  }

  return (
    <ScrollArea className="max-h-[520px] w-full">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="sticky top-0 bg-[var(--dash-surface)] text-left text-xs text-[var(--dash-text-soft)]">
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
          {journal.map((entry) => (
            <tr key={entry.id} className="border-b border-[var(--dash-border-subtle)] last:border-0">
              <td className="py-3 pr-3">
                <div className="font-medium">{eventLabel(entry.type)}</div>
                <div className="mt-1 truncate text-xs text-[var(--dash-text-soft)]">{entry.reason || t("common.notAvailable")}</div>
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
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
