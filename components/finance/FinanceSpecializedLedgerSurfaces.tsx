"use client"

import { WorkspaceSectionNavigation } from "@/components/dashboard/WorkspaceSectionNavigation"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  Filter,
  FilterX,
  HandCoins,
  History,
  Landmark,
  LineChart,
  MapPin,
  Percent,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { DataTablePagination } from "@/components/DataTableComponents/DataTablePagination"
import { CanonicalTableBoundary } from "@/components/DataTableComponents/CanonicalTableBoundary"
import { CanonicalTableDensityControl } from "@/components/DataTableComponents/CanonicalTableDensityControl"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { useCanonicalTablePreferences } from "@/components/DataTableComponents/useCanonicalTablePreferences"
import {
  financePaymentsLedgerTableContract,
  type FinanceStatementContext,
} from "@/components/DataTableComponents/finance-accounting-contracts"
import { createCanonicalTableQuery } from "@/components/DataTableComponents/table-system-contract"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const dashboard = !dashboardQuery.error && response?.success ? response.data : null
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
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden" data-finance-result-state={errorMessage ? "error" : context.dashboardQuery.isFetching ? "refreshing" : "ready"}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] min-w-0 space-y-6 px-4 py-4 text-[var(--dash-text)] sm:px-6 sm:py-6">
      <section className={cn(dashboardPanelClass, "p-4")}>
        <div className="flex min-w-0 flex-col gap-5">
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
                <span>{dashboard.organization.currency}</span>
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

      {dashboard ? <>
        {context.view !== "payments" ? <section aria-label={surfaceT("workQueue.title")} className={cn(dashboardPanelClass, "space-y-3 p-4")}>
          <h2 className="font-semibold">{surfaceT(`workQueue.${context.view}Title`)}</h2>
          <p className={cn(dashboardMutedTextClass, "text-sm")}>{surfaceT(`workQueue.${context.view}Help`)}</p>
          <p className={cn(dashboardMutedTextClass, "text-sm")}>{surfaceT("workQueue.summaryScope")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="dashboard-button-secondary"><Link href={context.localizedHref(context.view === "receivables" ? "/dashboard/finance/receivables/history" : "/dashboard/purchases/payables")}><FileText className="mr-2 h-4 w-4" aria-hidden="true" />{surfaceT(`workQueue.${context.view}Action`)}</Link></Button>
            {context.view === "payables" ? <Button asChild variant="outline" className="dashboard-button-secondary"><Link href={context.localizedHref("/dashboard/purchases/payables/history")}><History className="mr-2 h-4 w-4" aria-hidden="true" />{surfaceT("actions.apHistory")}</Link></Button> : null}
          </div>
          <p className={cn(dashboardMutedTextClass, "text-xs")}>{surfaceT("workQueue.scope")}</p>
        </section> : null}
        <WorkspaceSectionNavigation label={t("presentation.navigation")} items={[
          { id: "ledger-overview", label: t("cashFlow.navigationLabels.overview") },
          { id: "ledger-analysis", label: context.view === "payments" ? t("sections.methods") : surfaceT(`${context.view}.sections.aging`) },
          { id: "ledger-records", label: surfaceT(`${context.view}.sections.${context.view === "payments" ? "ledger" : context.view === "receivables" ? "receipts" : "disbursements"}`) },
          { id: "ledger-workflows", label: t("presentation.workflows") },
        ]} />
        {children}
      </> : null}
      </div>
    </main>
  )
}

function SurfaceFilters({ context }: { context: FinanceSurfaceContext }) {
  const { dashboard, t, period, setPeriod, locationId, setLocationId, customRange, setCustomRange, refreshDashboard, dashboardQuery } = context

  return (
    <div className="grid min-w-0 gap-3 border-t border-[var(--dash-border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]">
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
          <MapPin className="h-3.5 w-3.5 text-[var(--dash-info)]" />
          {t("filters.location")}
        </div>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger aria-label={t("filters.location")} className={dashboardControlClass}>
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
          <SelectTrigger aria-label={t("filters.period")} className={dashboardControlClass}>
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
            locale={context.locale}
            placeholder={t("filters.startDate") + " - " + t("filters.endDate")}
            ariaLabel={t("filters.startDate") + " - " + t("filters.endDate")}
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
          <h2>{surfaceT(`${context.view}.assuranceTitle`)}</h2>
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

export function FinanceWorkflowActionPanel({
  title,
  description,
  actions,
  localizedHref,
  layout = "stacked",
}: {
  title: string
  description: string
  actions: Array<{ href: string; icon: LucideIcon; label: string }>
  localizedHref: (href: string) => string
  layout?: "stacked" | "row"
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
      <CardContent
        data-finance-workflow-actions
        className={cn(
          "grid gap-2",
          layout === "row" && "sm:grid-cols-2 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none",
        )}
      >
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="dashboard-button-secondary h-auto min-h-10 justify-between rounded-lg px-3 py-2 text-left"
          >
            <Link href={localizedHref(action.href)}>
              <span className="flex min-w-0 items-center gap-2">
                <action.icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" />
                <span className="min-w-0 leading-tight">{action.label}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

type LedgerSortableColumn = {
  getIsSorted: () => false | "asc" | "desc"
  toggleSorting: (descending?: boolean) => void
}

function LedgerSortButton({
  column,
  label,
  sortLabel,
  align = "left",
}: {
  column: LedgerSortableColumn
  label: string
  sortLabel: string
  align?: "left" | "right"
}) {
  const sorted = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={sortLabel}
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-ml-3 h-8 gap-1.5 px-3 text-xs font-semibold text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]",
        align === "right" && "ml-auto",
      )}
    >
      {label}
      <ArrowUpDown className={cn("h-3.5 w-3.5", sorted && "text-[var(--dash-brand-strong)]")} />
    </Button>
  )
}

export function PaymentsTable({
  payments,
  money,
  formatDateTime,
  t,
  surfaceT,
  empty,
  financeContext,
}: {
  payments: FinanceRecentPayment[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  surfaceT: ReturnType<typeof useTranslations>
  empty: string
  financeContext?: FinanceStatementContext
}) {
  const locale: Locale = pickLocale(useLocale())
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const {
    columnVisibility,
    columnOrder,
    density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
  } = useCanonicalTablePreferences(financePaymentsLedgerTableContract)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const methodOptions = useMemo(
    () => Array.from(new Set(payments.map((payment) => payment.method))).sort(),
    [payments],
  )
  const statusOptions = useMemo(
    () => Array.from(new Set(payments.map((payment) => payment.status))).sort(),
    [payments],
  )

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase()
    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null

    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false
      if (methodFilter !== "all" && payment.method !== methodFilter) return false

      const paymentTime = new Date(payment.createdAt).getTime()
      if (startBoundary !== null && paymentTime < startBoundary) return false
      if (endBoundary !== null && paymentTime > endBoundary) return false

      if (!normalizedSearch) return true

      return [
        payment.paymentNumber,
        payment.counterparty,
        payment.processedBy,
        payment.method,
        payment.status,
        t(`methods.${payment.method}`),
        t(`statuses.${payment.status}`),
        payment.amount,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    })
  }, [endDate, methodFilter, payments, searchTerm, startDate, statusFilter, t])

  const columns = useMemo<ColumnDef<FinanceRecentPayment>[]>(
    () => [
      {
        accessorKey: "paymentNumber",
        enableHiding: false,
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.payment")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.payment") })}
          />
        ),
        cell: ({ row }) => {
          const payment = row.original
          return (
            <div>
              <div className="flex items-center gap-2 font-medium">
                {payment.direction === "out" ? (
                  <ArrowDownRight className="h-4 w-4 text-[var(--dash-danger)]" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-[var(--dash-success)]" />
                )}
                {payment.paymentNumber}
              </div>
              <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{payment.processedBy}</div>
            </div>
          )
        },
      },
      {
        accessorKey: "counterparty",
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.counterparty")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.counterparty") })}
          />
        ),
      },
      {
        accessorKey: "method",
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.method")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.method") })}
          />
        ),
        cell: ({ row }) => t(`methods.${row.original.method}`),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.status")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.status") })}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge
              variant="outline"
              className={cn(
                status === "PAID"
                  ? dashboardSeverityClass("success")
                  : status === "PENDING"
                    ? dashboardSeverityClass("warning")
                    : status === "CANCELLED"
                      ? dashboardSeverityClass("critical")
                      : dashboardSeverityClass("info"),
              )}
            >
              {t(`statuses.${status}`)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.amount")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.amount") })}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right font-semibold tabular-nums",
              row.original.direction === "out" ? "text-[var(--dash-danger)]" : "text-[var(--dash-success)]",
            )}
          >
            {money(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.createdAt).getTime() - new Date(rowB.original.createdAt).getTime(),
        header: ({ column }) => (
          <LedgerSortButton
            column={column}
            label={t("table.time")}
            sortLabel={surfaceT("payments.ledger.sortBy", { column: t("table.time") })}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-[var(--dash-text-soft)]">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [formatDateTime, money, surfaceT, t],
  )

  const table = useReactTable({
    data: filteredPayments,
    columns,
    getRowId: (row) => String(row.id),
    state: {
      sorting,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  })

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      statusFilter !== "all" ||
      methodFilter !== "all" ||
      startDate ||
      endDate,
  )
  const canonicalQuery = createCanonicalTableQuery(financePaymentsLedgerTableContract, {
    search: searchTerm,
    filters: {
      ...(statusFilter !== "all" ? { status: [statusFilter] } : {}),
      ...(methodFilter !== "all" ? { method: [methodFilter] } : {}),
      ...(startDate ? { startDate: [startDate] } : {}),
      ...(endDate ? { endDate: [endDate] } : {}),
    },
    sort: sorting,
    pageIndex: table.getState().pagination.pageIndex,
    pageSize: table.getState().pagination.pageSize,
  })
  const canonicalState = filteredPayments.length > 0 ? "ready" : hasActiveFilters ? "no-results" : "empty"
  const columnLabels: Record<string, string> = {
    paymentNumber: t("table.payment"),
    counterparty: t("table.counterparty"),
    method: t("table.method"),
    status: t("table.status"),
    amount: t("table.amount"),
    createdAt: t("table.time"),
  }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
    setStartDate("")
    setEndDate("")
    table.setPageIndex(0)
  }

  return (
    <CanonicalTableBoundary
      contract={financePaymentsLedgerTableContract}
      locale={locale}
      query={canonicalQuery}
      state={canonicalState}
      density={density}
    >
    <div
      className="w-full min-w-0 space-y-3"
      data-finance-context={financeContext ? "bound" : "unbound"}
      data-finance-entity-id={financeContext?.entityId}
      data-finance-period-start={financeContext?.periodStart}
      data-finance-period-end={financeContext?.periodEnd}
      data-finance-currency={financeContext?.currency}
    >
      <div className="dashboard-table-toolbar flex flex-nowrap items-center gap-3 overflow-x-auto rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3">
        <div className="min-w-48 flex-1">
          <DataTableSearch
            value={searchTerm}
            onChange={(value) => { setSearchTerm(value); table.setPageIndex(0) }}
            ariaLabel={surfaceT("payments.ledger.searchLabel")}
            placeholder={surfaceT("payments.ledger.searchPlaceholder")}
            clearButtonLabel={surfaceT("payments.ledger.clearSearch")}
          />
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-2 [&>*]:shrink-0">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              table.setPageIndex(0)
            }}
          >
            <SelectTrigger
              aria-label={surfaceT("payments.ledger.statusFilter")}
              className="dashboard-control h-9 w-32 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{surfaceT("payments.ledger.allStatuses")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={methodFilter}
            onValueChange={(value) => {
              setMethodFilter(value)
              table.setPageIndex(0)
            }}
          >
            <SelectTrigger
              aria-label={surfaceT("payments.ledger.methodFilter")}
              className="dashboard-control h-9 w-36 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{surfaceT("payments.ledger.allMethods")}</SelectItem>
              {methodOptions.map((method) => (
                <SelectItem key={method} value={method}>
                  {t(`methods.${method}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TableDateRangePicker
            value={{ from: startDate || undefined, to: endDate || undefined }}
            onChange={(range) => {
              setStartDate(range.from ?? "")
              setEndDate(range.to ?? "")
              table.setPageIndex(0)
            }}
            locale={locale}
            placeholder={surfaceT("payments.ledger.dateFrom") + " - " + surfaceT("payments.ledger.dateTo")}
            ariaLabel={surfaceT("payments.ledger.dateFrom") + " - " + surfaceT("payments.ledger.dateTo")}
            className="w-40"
            triggerClassName="min-w-0 sm:w-full [&>span]:truncate"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="dashboard-button-secondary h-9 rounded-lg">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {surfaceT("payments.ledger.columns")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]"
            >
              <DropdownMenuLabel>{surfaceT("payments.ledger.visibleColumns")}</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                  >
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <CanonicalTableDensityControl density={density} locale={locale} onDensityChange={setDensity} />

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
            >
              <FilterX className="mr-2 h-4 w-4" />
              {surfaceT("payments.ledger.reset")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-hidden rounded-lg">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[1160px]">
            <TableHeader className="sticky top-0 z-10 bg-[rgba(16,27,32,0.94)] backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
                      data-column-id={header.column.id}
                      data-frozen={header.column.id === "paymentNumber" || header.column.id === "counterparty" ? "start" : undefined}
                      className={cn(
                        "whitespace-nowrap px-3",
                        header.column.id === "paymentNumber" && "sticky left-0 z-20 min-w-[13rem] bg-[var(--dash-surface-raised)]",
                        header.column.id === "counterparty" && "sticky left-[13rem] z-20 min-w-[13rem] bg-[var(--dash-surface-raised)]",
                        header.column.id === "amount" && "text-right",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        data-column-id={cell.column.id}
                        data-frozen={cell.column.id === "paymentNumber" || cell.column.id === "counterparty" ? "start" : undefined}
                        className={cn(
                          "px-3 py-3 align-middle",
                          cell.column.id === "paymentNumber" && "sticky left-0 z-[1] min-w-[13rem] bg-[var(--dash-surface)]",
                          cell.column.id === "counterparty" && "sticky left-[13rem] z-[1] min-w-[13rem] bg-[var(--dash-surface)]",
                          cell.column.id === "amount" && "text-right tabular-nums",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-48 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                        <FilterX className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--dash-text)]">
                          {hasActiveFilters ? surfaceT("payments.ledger.noResultsTitle") : empty}
                        </div>
                        {hasActiveFilters ? (
                          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                            {surfaceT("payments.ledger.noResultsDescription")}
                          </p>
                        ) : null}
                      </div>
                      {hasActiveFilters ? (
                        <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="dashboard-button-secondary rounded-lg">
                          {surfaceT("payments.ledger.reset")}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--dash-text-soft)]">
          {surfaceT("payments.ledger.resultCount", { visible: filteredPayments.length, total: payments.length })}
        </p>
        <DataTablePagination
          table={table}
          variant="landing"
          locale={locale}
          showSelectionCount={false}
          pageSizeOptions={[5, 10, 20, 50]}
          copy={{
            rowsPerPage: surfaceT("payments.ledger.rowsPerPage"),
            firstPage: surfaceT("payments.ledger.firstPage"),
            previousPage: surfaceT("payments.ledger.previousPage"),
            nextPage: surfaceT("payments.ledger.nextPage"),
            lastPage: surfaceT("payments.ledger.lastPage"),
          }}
        />
      </div>
    </div>
    </CanonicalTableBoundary>
  )
}

function PaymentMixStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}) {
  return (
    <div className={cn(dashboardRowClass, "flex h-full min-h-[116px] min-w-0 flex-col justify-between gap-3 p-3.5")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)]">
          <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--dash-text-soft)]">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-xs leading-4 text-[var(--dash-text-faint)]">{detail}</p>
    </div>
  )
}

export function FinancePaymentMethodBreakdown({
  methods,
  money,
  locale,
  t,
  surfaceT,
}: {
  methods: FinancePaymentMethod[]
  money: (value: number | null | undefined) => string
  locale: Locale
  t: ReturnType<typeof useTranslations>
  surfaceT: ReturnType<typeof useTranslations>
}) {
  const max = Math.max(1, ...methods.map((method) => method.amount))
  if (methods.length === 0) return <div className={cn(dashboardEmptyClass, "p-6")}>{t("empty.methods")}</div>

  const totalAmount = methods.reduce((total, method) => total + method.amount, 0)
  const totalCount = methods.reduce((total, method) => total + method.count, 0)
  const averagePayment = totalCount > 0 ? totalAmount / totalCount : 0
  const leadingMethod = methods.reduce((leading, method) => method.amount > leading.amount ? method : leading)
  const leadingShare = totalAmount > 0 ? Math.round((leadingMethod.amount / totalAmount) * 100) : 0

  return (
    <div
      data-testid="payment-mix-grid"
      className="grid items-stretch gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))" }}
    >
      <PaymentMixStat
        icon={Wallet}
        label={surfaceT("payments.mix.capturedVolume")}
        value={money(totalAmount)}
        detail={surfaceT("payments.mix.capturedVolumeDetail")}
      />
      <PaymentMixStat
        icon={ReceiptText}
        label={surfaceT("payments.mix.transactions")}
        value={totalCount.toLocaleString(locale)}
        detail={surfaceT("payments.mix.transactionsDetail")}
      />
      <PaymentMixStat
        icon={TrendingUp}
        label={surfaceT("payments.mix.averagePayment")}
        value={money(averagePayment)}
        detail={surfaceT("payments.mix.averagePaymentDetail")}
      />
      <PaymentMixStat
        icon={CreditCard}
        label={surfaceT("payments.mix.leadingMethod")}
        value={t(`methods.${leadingMethod.method}`)}
        detail={surfaceT("payments.mix.share", { share: leadingShare })}
      />

      {methods.slice(0, 8).map((method) => {
        const share = totalAmount > 0 ? Math.round((method.amount / totalAmount) * 100) : 0

        return (
          <div key={method.method} className={cn(dashboardRowClass, "flex h-full min-h-[116px] min-w-0 flex-col justify-between gap-3 p-3.5")}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)]">
                <CreditCard className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--dash-text-soft)]">{t(`methods.${method.method}`)}</p>
                <p className="mt-1 truncate text-lg font-semibold tabular-nums">{money(method.amount)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-[var(--dash-text-faint)]">
                <span>{surfaceT("payments.mix.paymentCount", { count: method.count })}</span>
                <span className="shrink-0 tabular-nums">{surfaceT("payments.mix.share", { share })}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(37,57,67,0.64)]">
                <div className="h-full rounded-full bg-[var(--dash-brand)]" style={{ width: `${(method.amount / max) * 100}%` }} />
              </div>
            </div>
          </div>
        )
      })}
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
  scopeLabel,
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
  scopeLabel: string
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
        <CardTitle className="text-base"><h2>{title}</h2></CardTitle>
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
        <div className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
          {buckets.map(([key, label, color]) => (
            <div key={key} className={cn(dashboardRowClass, "p-2")}>
              <div className="flex items-center gap-1.5 text-[var(--dash-text-soft)]"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</div>
              <div className="mt-1 font-semibold tabular-nums">{money(aging[key])}</div>
            </div>
          ))}
        </div>
        <p className={cn(dashboardMutedTextClass, "text-xs")}>{scopeLabel}</p>
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
                <div className="text-xs text-[var(--dash-text-soft)]">{party.terms !== null ? t("aging.terms", { count: party.terms }) : t("common.notAvailable")}</div>
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
  const { dashboard, money, percent, locale, t, surfaceT, formatDateTime, localizedHref } = context
  if (!dashboard && context.dashboardQuery.isLoading) return <LoadingState />

  const inboundRecent = dashboard?.recentPayments.filter((payment) => payment.direction === "in") ?? []
  const outboundRecent = dashboard?.recentPayments.filter((payment) => payment.direction === "out") ?? []

  return (
    <SurfaceFrame context={context}>
      {dashboard ? (
        <>
          <section id="ledger-overview" className="grid min-w-0 scroll-mt-24 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard title={surfaceT("payments.kpis.collected")} value={money(dashboard.summary.paymentsCollected)} detail={surfaceT("payments.details.collected")} icon={ArrowUpRight} accent="success" />
            <MetricCard title={surfaceT("payments.kpis.pending")} value={money(dashboard.summary.paymentsPending)} detail={surfaceT("payments.details.pending")} icon={AlertTriangle} accent={dashboard.summary.paymentsPending > 0 ? "gold" : "muted"} />
            <MetricCard title={surfaceT("payments.kpis.netCash")} value={money(dashboard.summary.netCashFlow)} detail={surfaceT("payments.details.netCash")} icon={Wallet} accent={dashboard.summary.netCashFlow >= 0 ? "brand" : "danger"} />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section id="ledger-analysis" className="min-w-0 scroll-mt-24">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  <h2>{t("sections.methods")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payments.sections.methodsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancePaymentMethodBreakdown methods={dashboard.paymentMethods} money={money} locale={locale} t={t} surfaceT={surfaceT} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
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
          </section>

          <section id="ledger-records" className="min-w-0 scroll-mt-24" data-finance-final-section="operational">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  <h2>{surfaceT("payments.sections.ledger")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payments.sections.ledgerDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable
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
                    currency: dashboard.organization.currency,
                    sourceReadModel: "finance-dashboard.recent-payments",
                    evidenceRoute: "/dashboard/finance/payments",
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <section id="ledger-workflows" className="min-w-0 scroll-mt-24" data-finance-final-section="workflow">
            <FinanceWorkflowActionPanel
              title={surfaceT("payments.sections.workflows")}
              description={surfaceT("payments.sections.workflowsDescription")}
              localizedHref={localizedHref}
              layout="row"
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
          <section id="ledger-overview" className="grid min-w-0 scroll-mt-24 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard title={t("metrics.receivables")} value={money(dashboard.summary.receivables)} detail={t("details.receivables", { count: dashboard.summary.openReceivableCount })} icon={HandCoins} accent="gold" />
            <MetricCard title={surfaceT("receivables.kpis.overdue")} value={money(dashboard.summary.overdueReceivableAmount)} detail={surfaceT("receivables.details.overdue")} icon={AlertTriangle} accent={dashboard.summary.overdueReceivableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("receivables.kpis.collected")} value={money(dashboard.summary.paymentsCollected)} detail={surfaceT("receivables.details.collected")} icon={ArrowUpRight} accent="success" />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section id="ledger-analysis" className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-4">
            <AgingPanel
              title={surfaceT("receivables.sections.aging")}
              description={surfaceT("receivables.sections.agingDescription")}
              aging={dashboard.aging.receivables}
              counterparties={dashboard.topReceivables}
              scopeLabel={surfaceT("workQueue.balanceScope", { count: dashboard.topReceivables.length })}
              money={money}
              t={t}
              empty={surfaceT("empty.receivables")}
              localizedHref={localizedHref}
              counterpartyHref={(party) => `/dashboard/customers/${party.id}`}
            />
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
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

          <section id="ledger-records" className="min-w-0 scroll-mt-24" data-finance-final-section="operational">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-success)]" />
                  <h2>{surfaceT("receivables.sections.receipts")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("receivables.sections.receiptsDescription")}</CardDescription>
                <p className={cn("text-xs", dashboardMutedTextClass)}>{surfaceT("workQueue.recentScope")}</p>
              </CardHeader>
              <CardContent>
                <PaymentsTable
                  payments={inboundPayments}
                  money={money}
                  formatDateTime={formatDateTime}
                  t={t}
                  surfaceT={surfaceT}
                  empty={surfaceT("empty.receipts")}
                  financeContext={{
                    entityId: dashboard.organization.id,
                    entityName: dashboard.organization.name,
                    periodStart: dashboard.filters.startDate,
                    periodEnd: dashboard.filters.endDate,
                    currency: dashboard.organization.currency,
                    sourceReadModel: "finance-dashboard.recent-payments",
                    evidenceRoute: "/dashboard/finance/receivables",
                  }}
                />
              </CardContent>
            </Card>
          </section>
          <section id="ledger-workflows" className="min-w-0 scroll-mt-24" data-finance-final-section="workflow">
            <FinanceWorkflowActionPanel
              title={surfaceT("receivables.sections.workflows")}
              description={surfaceT("receivables.sections.workflowsDescription")}
              localizedHref={localizedHref}
              layout="row"
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
          <section id="ledger-overview" className="grid min-w-0 scroll-mt-24 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard title={t("metrics.payables")} value={money(dashboard.summary.payables)} detail={t("details.payables", { count: dashboard.summary.openPayableCount })} icon={FileText} accent={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("payables.kpis.overdue")} value={money(dashboard.summary.overduePayableAmount)} detail={surfaceT("payables.details.overdue")} icon={AlertTriangle} accent={dashboard.summary.overduePayableAmount > 0 ? "danger" : "muted"} />
            <MetricCard title={surfaceT("payables.kpis.purchases")} value={money(dashboard.summary.purchases)} detail={surfaceT("payables.details.purchases")} icon={ArrowDownRight} accent="gold" />
            <MetricCard title={t("metrics.confidence")} value={percent(dashboard.summary.financeConfidence)} detail={t("details.workingCapital", { amount: money(dashboard.summary.workingCapital) })} icon={ShieldCheck} accent={dashboard.summary.financeConfidence >= 85 ? "success" : "gold"} />
          </section>

          <section id="ledger-analysis" className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-4">
            <AgingPanel
              title={surfaceT("payables.sections.aging")}
              description={surfaceT("payables.sections.agingDescription")}
              aging={dashboard.aging.payables}
              counterparties={dashboard.topPayables}
              scopeLabel={surfaceT("workQueue.balanceScope", { count: dashboard.topPayables.length })}
              money={money}
              t={t}
              empty={surfaceT("empty.payables")}
              localizedHref={localizedHref}
              counterpartyHref={(party) => `/dashboard/purchases/suppliers/${party.id}`}
            />
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <AssurancePanel context={context} />
              <LedgerPanel
                title={surfaceT("payables.sections.posting")}
                description={surfaceT("payables.sections.postingDescription")}
                lines={[
                  { label: t("metrics.payables"), value: money(dashboard.summary.payables) },
                  { label: surfaceT("payables.summary.overdue"), value: money(dashboard.summary.overduePayableAmount), tone: dashboard.summary.overduePayableAmount > 0 ? "text-[var(--dash-danger)]" : undefined },
                  { label: surfaceT("payables.summary.recentDisbursements"), value: money(sumPayments(outboundPayments)), tone: "text-[var(--dash-success)]" },
                  { label: t("summary.tax"), value: money(dashboard.summary.taxCollected - dashboard.summary.taxOnPurchases) },
                ]}
              />
            </div>
          </section>

          <section id="ledger-records" className="min-w-0 scroll-mt-24" data-finance-final-section="operational">
            <Card className={dashboardPanelClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4 text-[var(--dash-success)]" />
                  <h2>{surfaceT("payables.sections.disbursements")}</h2>
                </CardTitle>
                <CardDescription className={dashboardMutedTextClass}>{surfaceT("payables.sections.disbursementsDescription")}</CardDescription>
                <p className={cn("text-xs", dashboardMutedTextClass)}>{surfaceT("workQueue.recentScope")}</p>
              </CardHeader>
              <CardContent>
                <PaymentsTable
                  payments={outboundPayments}
                  money={money}
                  formatDateTime={formatDateTime}
                  t={t}
                  surfaceT={surfaceT}
                  empty={surfaceT("empty.disbursements")}
                  financeContext={{
                    entityId: dashboard.organization.id,
                    entityName: dashboard.organization.name,
                    periodStart: dashboard.filters.startDate,
                    periodEnd: dashboard.filters.endDate,
                    currency: dashboard.organization.currency,
                    sourceReadModel: "finance-dashboard.recent-payments",
                    evidenceRoute: "/dashboard/finance/payables",
                  }}
                />
              </CardContent>
            </Card>
          </section>
          <section id="ledger-workflows" className="min-w-0 scroll-mt-24" data-finance-final-section="workflow">
            <FinanceWorkflowActionPanel
              title={surfaceT("payables.sections.workflows")}
              description={surfaceT("payables.sections.workflowsDescription")}
              localizedHref={localizedHref}
              layout="row"
              actions={[
                { href: "/dashboard/purchases/payables/history", icon: History, label: surfaceT("actions.apHistory") },
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
