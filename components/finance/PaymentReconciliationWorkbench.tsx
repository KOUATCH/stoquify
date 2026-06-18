"use client"

import { useLocale, useTranslations } from "next-intl"
import { type CSSProperties, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  Download,
  FileWarning,
  Filter,
  Landmark,
  MapPin,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Workflow,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { cn } from "@/lib/utils"
import { usePaymentReconciliationWorkbench } from "@/hooks/payments/usePaymentReconciliationWorkbench"
import {
  useExportReconciliationCertificate,
  usePaymentReconciliationDashboard,
  useRunPaymentReconciliation,
  useResolveSuspenseItem,
  useSignReconciliationRun,
} from "@/hooks/payments/usePaymentReconciliationDashboard"
import type { PaymentReconciliationDashboardData } from "@/actions/payments/reconciliation.actions"
import type {
  PaymentDuplicateProviderAlert,
  PaymentReconciliationFailureGroup,
  PaymentReconciliationRunSummary,
  PaymentSuspenseReadyFailure,
} from "@/services/payments/payment-reconciliation-workbench.service"
import type { PaymentReconciliationWorkbenchPeriod } from "@/services/payments/payment-reconciliation-workbench.schemas"

const allLocationsValue = "all"
const periods: PaymentReconciliationWorkbenchPeriod[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "mtd",
  "qtd",
  "ytd",
  "custom",
]
const suspenseTypeOptions = [
  "UNKNOWN_CREDIT",
  "MISSING_CALLBACK",
  "MISSING_STATEMENT_LINE",
  "AMOUNT_MISMATCH",
  "DUPLICATE_PROVIDER_ID",
  "ORPHAN_REFUND",
  "FEE_DEVIATION",
  "SETTLEMENT_SHORTFALL",
  "SIGNATURE_FAILURE",
  "REPLAY_SPIKE",
  "FAILED_BUT_DEBITED",
  "SUCCEEDED_BUT_NOT_CREDITED",
  "CASH_DEPOSIT_DELAY",
  "OTHER",
] as const

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 29)
  return { start: inputDate(start), end: inputDate(now) }
}

function statusClass(status: PaymentReconciliationRunSummary["status"]) {
  if (status === "clean") {
    return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  }
  if (status === "attention") {
    return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  }
  if (status === "critical") {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }
  return "dashboard-filter-chip"
}

function severityClass(severity: string) {
  if (severity.toLowerCase() === "critical") {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }
  return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
}

function notificationTypeKey(type: string) {
  return type.replaceAll(".", "_").replaceAll("-", "_")
}

function metricAccent(accent: "success" | "brand" | "warning" | "danger" | "info") {
  const accents = {
    success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
    brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
    warning: { accent: "var(--dash-warning)", soft: "var(--dash-warning-soft)" },
    danger: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
    info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
  }
  return accents[accent]
}

const glassPanelClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
const glassHeaderClass = "border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6"
const filterChipClass = "dashboard-filter-chip rounded-lg"
const mutedTextClass = "text-[var(--dash-text-soft)]"
const faintTextClass = "text-[var(--dash-text-faint)]"
const rowSurfaceClass = "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3"
const dangerPanelClass = "rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
const warningPanelClass = "rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"

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
          <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </main>
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
  accent: "success" | "brand" | "warning" | "danger" | "info"
}) {
  const tokens = metricAccent(accent)

  return (
    <Card
      className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden"
      style={{
        "--stat-accent": tokens.accent,
        "--stat-soft": tokens.soft,
      } as CSSProperties}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2 pe-14">
        <CardTitle className="text-[0.7rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{title}</CardTitle>
        <span className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-semibold tabular-nums leading-tight text-[var(--dash-text)]">{value}</div>
        <div className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</div>
      </CardContent>
    </Card>
  )
}

export default function PaymentReconciliationWorkbench() {
  const t = useTranslations("paymentReconciliationWorkbench")
  const locale = useLocale()
  const notifications = useNotifications()
  const [period, setPeriod] = useState<PaymentReconciliationWorkbenchPeriod>("mtd")
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
  const workbenchQuery = usePaymentReconciliationWorkbench(queryInput)
  const durableDashboardQuery = usePaymentReconciliationDashboard()
  const runReconciliation = useRunPaymentReconciliation()
  const signReconciliation = useSignReconciliationRun()
  const exportCertificate = useExportReconciliationCertificate()
  const workbench = workbenchQuery.data
  const durableDashboard = durableDashboardQuery.data
  const errorMessage = workbenchQuery.error instanceof Error ? workbenchQuery.error.message : null
  const currency = workbench?.organization.currency ?? "XAF"
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
      }),
    [currency, locale],
  )
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const percentFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale])
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }), [locale])
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  )

  const money = (value: number | null | undefined) => moneyFormatter.format(value ?? 0)
  const number = (value: number | null | undefined) => numberFormatter.format(value ?? 0)
  const percent = (value: number | null | undefined) => `${percentFormatter.format(value ?? 0)}%`
  const formatDateTime = (value: string | null | undefined) =>
    value ? timeFormatter.format(new Date(value)) : t("common.notAvailable")

  async function refreshWorkbench() {
    notifications.info(t("notifications.refreshTitle"), t("notifications.refreshMessage"), { category: "reconciliation" })
    try {
      await workbenchQuery.refetch()
      notifications.success(t("notifications.refreshedTitle"), t("notifications.refreshedMessage"), { category: "reconciliation" })
    } catch (error) {
      notifications.error(
        t("notifications.failedTitle"),
        error instanceof Error ? error.message : t("notifications.failedMessage"),
        { category: "reconciliation" },
      )
    }
  }

  async function runDurableReconciliation(providerAccountId: string) {
    notifications.info(t("certification.notifications.runStartedTitle"), t("certification.notifications.runStartedMessage"), {
      category: "reconciliation",
    })
    try {
      await runReconciliation.mutateAsync({
        providerAccountId,
        businessDate: new Date(),
      })
      notifications.success(t("certification.notifications.runCompleteTitle"), t("certification.notifications.runCompleteMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(
        t("notifications.failedTitle"),
        error instanceof Error ? error.message : t("notifications.failedMessage"),
        { category: "reconciliation" },
      )
    }
  }

  async function signDurableRun(runId: string) {
    notifications.info(t("certification.notifications.signStartedTitle"), t("certification.notifications.signStartedMessage"), {
      category: "reconciliation",
    })
    try {
      await signReconciliation.mutateAsync({ runId })
      notifications.success(t("certification.notifications.signCompleteTitle"), t("certification.notifications.signCompleteMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(
        t("notifications.failedTitle"),
        error instanceof Error ? error.message : t("notifications.failedMessage"),
        { category: "reconciliation" },
      )
    }
  }

  async function exportDurableCertificate(runId: string) {
    notifications.info(t("certification.notifications.exportStartedTitle"), t("certification.notifications.exportStartedMessage"), {
      category: "reconciliation",
    })
    try {
      const certificate = await exportCertificate.mutateAsync({ runId, fileType: "json" })
      const blob = new Blob([certificate.content], { type: certificate.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = certificate.fileName
      link.click()
      URL.revokeObjectURL(url)
      notifications.success(t("certification.notifications.exportCompleteTitle"), t("certification.notifications.exportCompleteMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(
        t("notifications.failedTitle"),
        error instanceof Error ? error.message : t("notifications.failedMessage"),
        { category: "reconciliation" },
      )
    }
  }

  if (workbenchQuery.isLoading && !workbench) return <LoadingState />

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
      <section className={cn(glassPanelClass, "p-4")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                <Workflow className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)]">{t("title")}</h1>
                <p className={cn("text-sm", mutedTextClass)}>{t("subtitle")}</p>
              </div>
            </div>
            {workbench ? (
              <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-xs", mutedTextClass)}>
                <Badge variant="outline" className={cn(filterChipClass, "gap-1")}>
                  <Building2 className="h-3 w-3" />
                  {workbench.organization.name}
                </Badge>
                <Badge variant="outline" className={cn(filterChipClass, "gap-1")}>
                  <CalendarDays className="h-3 w-3" />
                  {dateFormatter.format(new Date(workbench.filters.startDate))} - {dateFormatter.format(new Date(workbench.filters.endDate))}
                </Badge>
                <Badge variant="outline" className="gap-1 rounded-lg border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]">
                  <Landmark className="h-3 w-3" />
                  {t("source.captureReadModel")}
                </Badge>
                <span>{t("updated", { time: formatDateTime(workbench.generatedAt) })}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[190px_190px_auto] xl:min-w-[620px]">
            <div>
              <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", mutedTextClass)}>
                <MapPin className="h-3.5 w-3.5" />
                {t("filters.location")}
              </div>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="dashboard-control h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value={allLocationsValue}>{t("filters.allLocations")}</SelectItem>
                  {workbench?.locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", mutedTextClass)}>
                <Filter className="h-3.5 w-3.5" />
                {t("filters.period")}
              </div>
              <Select value={period} onValueChange={(value) => setPeriod(value as PaymentReconciliationWorkbenchPeriod)}>
                <SelectTrigger className="dashboard-control h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
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
                    className="dashboard-control h-10 w-36 rounded-lg"
                  />
                  <Input
                    type="date"
                    value={customRange.end}
                    onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                    className="dashboard-control h-10 w-36 rounded-lg"
                  />
                </>
              ) : null}
              <Button
                type="button"
                onClick={refreshWorkbench}
                disabled={workbenchQuery.isFetching}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                <RefreshCw className={cn("h-4 w-4", workbenchQuery.isFetching && "animate-spin")} />
                {t("actions.refresh")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <Card className={dangerPanelClass}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      <DurableEvidencePanel
        dashboard={durableDashboard}
        isLoading={durableDashboardQuery.isLoading}
        error={durableDashboardQuery.error instanceof Error ? durableDashboardQuery.error.message : null}
        isRunning={runReconciliation.isPending}
        isSigning={signReconciliation.isPending}
        isExporting={exportCertificate.isPending}
        onRun={runDurableReconciliation}
        onSign={signDurableRun}
        onExport={exportDurableCertificate}
        money={money}
        number={number}
        formatDateTime={formatDateTime}
        t={t}
      />

      {workbench ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title={t("metrics.activeRails")} value={number(workbench.summary.activeRailCount)} detail={t("details.activeRails", { count: workbench.summary.railCount })} icon={CreditCard} accent="brand" />
            <MetricCard title={t("metrics.cleanRuns")} value={number(workbench.summary.cleanRunCount)} detail={t("details.attentionRuns", { count: workbench.summary.attentionRunCount })} icon={ShieldCheck} accent={workbench.summary.criticalRunCount > 0 ? "warning" : "success"} />
            <MetricCard title={t("metrics.criticalFailures")} value={number(workbench.summary.criticalFailureCount)} detail={t("details.failures", { count: workbench.summary.failureCount })} icon={ShieldAlert} accent={workbench.summary.criticalFailureCount > 0 ? "danger" : "info"} />
            <MetricCard title={t("metrics.duplicates")} value={number(workbench.summary.duplicateProviderReferenceCount)} detail={t("details.coverage", { value: percent(workbench.summary.providerReferenceCoverage) })} icon={Copy} accent={workbench.summary.duplicateProviderReferenceCount > 0 ? "danger" : "success"} />
            <MetricCard title={t("metrics.suspenseExposure")} value={money(workbench.summary.suspenseExposure)} detail={t("details.suspense", { count: workbench.summary.suspenseItemCount })} icon={FileWarning} accent={workbench.summary.suspenseExposure > 0 ? "warning" : "info"} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className={glassPanelClass}>
              <CardHeader className={cn(glassHeaderClass, "pb-3")}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Workflow className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {t("sections.runs")}
                </CardTitle>
                <CardDescription className={mutedTextClass}>{t("sections.runsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <RunSummaryTable runs={workbench.runSummaries} money={money} number={number} formatDateTime={formatDateTime} t={t} />
              </CardContent>
            </Card>

            <Card className={glassPanelClass}>
              <CardHeader className={cn(glassHeaderClass, "pb-3")}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" />
                  {t("sections.assurance")}
                </CardTitle>
                <CardDescription className={mutedTextClass}>{t("sections.assuranceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <SummaryLine label={t("summary.totalPayments")} value={number(workbench.summary.totalPayments)} />
                  <SummaryLine label={t("summary.totalAmount")} value={money(workbench.summary.totalAmount)} />
                  <SummaryLine label={t("summary.matchedAmount")} value={money(workbench.summary.matchedAmount)} />
                  <SummaryLine label={t("summary.providerReferenceCoverage")} value={percent(workbench.summary.providerReferenceCoverage)} />
                </div>
                <div className={cn(warningPanelClass, "p-3 text-sm")}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <span>{t("source.providerPersistencePending")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <Card className={glassPanelClass}>
              <CardHeader className={cn(glassHeaderClass, "pb-3")}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-[var(--dash-warning)]" />
                  {t("sections.failureGroups")}
                </CardTitle>
                <CardDescription className={mutedTextClass}>{t("sections.failureGroupsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <FailureGroups groups={workbench.failureGroupsByRail} money={money} number={number} t={t} />
              </CardContent>
            </Card>

            <Card className={glassPanelClass}>
              <CardHeader className={cn(glassHeaderClass, "pb-3")}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Copy className="h-4 w-4 text-[var(--dash-danger)]" />
                  {t("sections.duplicates")}
                </CardTitle>
                <CardDescription className={mutedTextClass}>{t("sections.duplicatesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DuplicateAlerts alerts={workbench.duplicateProviderReferenceAlerts} money={money} formatDateTime={formatDateTime} t={t} />
              </CardContent>
            </Card>
          </section>

          <Card className={glassPanelClass}>
            <CardHeader className={cn(glassHeaderClass, "pb-3")}>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileWarning className="h-4 w-4 text-[var(--dash-warning)]" />
                {t("sections.suspense")}
              </CardTitle>
              <CardDescription className={mutedTextClass}>{t("sections.suspenseDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SuspenseFailures failures={workbench.suspenseReadyFailures} money={money} formatDateTime={formatDateTime} t={t} />
            </CardContent>
          </Card>
        </>
      ) : null}
      </div>
    </main>
  )
}

function DurableEvidencePanel({
  dashboard,
  isLoading,
  error,
  isRunning,
  isSigning,
  isExporting,
  onRun,
  onSign,
  onExport,
  money,
  number,
  formatDateTime,
  t,
}: {
  dashboard: PaymentReconciliationDashboardData | undefined
  isLoading: boolean
  error: string | null
  isRunning: boolean
  isSigning: boolean
  isExporting: boolean
  onRun: (providerAccountId: string) => void
  onSign: (runId: string) => void
  onExport: (runId: string) => void
  money: (value: number | null | undefined) => string
  number: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (isLoading && !dashboard) {
    return <Skeleton className="h-52 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
  }

  if (error) {
    return (
      <Card className={warningPanelClass}>
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!dashboard) return null

  return (
    <Card className={glassPanelClass}>
      <CardHeader className={cn(glassHeaderClass, "pb-3")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              {t("certification.title")}
            </CardTitle>
            <CardDescription className={mutedTextClass}>{t("certification.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-lg border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
              {t(`certification.statuses.${dashboard.source.certificationStatus}`)}
            </Badge>
            <Badge variant="outline" className={filterChipClass}>
              {t("certification.asOf", { time: formatDateTime(dashboard.source.asOf) })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryLine label={t("certification.summary.providerAccounts")} value={number(dashboard.summary.activeProviderAccountCount)} />
          <SummaryLine label={t("certification.summary.recentRuns")} value={number(dashboard.summary.recentRunCount)} />
          <SummaryLine label={t("certification.summary.readyForSignoff")} value={number(dashboard.summary.readyForSignoffCount)} />
          <SummaryLine label={t("certification.summary.openExceptions")} value={number(dashboard.summary.openExceptionCount)} />
          <SummaryLine label={t("certification.summary.openSuspense")} value={money(dashboard.summary.openSuspenseAmount)} />
        </div>

        {dashboard.summary.closeBlockerCount > 0 ? (
          <div className={cn(dangerPanelClass, "p-3 text-sm")}>
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              <span>{t("certification.closeBlocked", { count: dashboard.summary.closeBlockerCount })}</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
                {t("certification.providerAccounts")}
              </div>
            {dashboard.providerAccounts.length === 0 ? (
              <EmptyState icon={Database} label={t("certification.emptyProviderAccounts")} />
            ) : (
              dashboard.providerAccounts.slice(0, 5).map((account) => (
                <div key={account.id} className={cn(rowSurfaceClass, "flex flex-col gap-3 md:flex-row md:items-center md:justify-between")}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{account.displayName}</span>
                      <Badge variant="outline" className={filterChipClass}>
                        {account.railType}
                      </Badge>
                      <Badge variant="outline" className={filterChipClass}>
                        {account.status}
                      </Badge>
                    </div>
                    <div className={cn("mt-1 text-xs", mutedTextClass)}>
                      {account.providerCode} / {account.currencyCode}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRunning || account.status !== "ACTIVE"}
                    onClick={() => onRun(account.id)}
                    className="dashboard-button-secondary shrink-0 rounded-lg"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {t("certification.actions.run")}
                  </Button>
                </div>
              ))
            )}
            </div>

            <div className="space-y-2">
              <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
                {t("certification.signoffQueue")}
              </div>
              {dashboard.recentRuns.length === 0 ? (
                <EmptyState icon={ShieldCheck} label={t("certification.emptyRuns")} />
              ) : (
                dashboard.recentRuns.slice(0, 5).map((run) => (
                  <div key={run.id} className={cn(rowSurfaceClass, "flex flex-col gap-3 md:flex-row md:items-center md:justify-between")}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatDateTime(run.businessDate)}</span>
                        <Badge variant="outline" className={filterChipClass}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className={cn("mt-1 text-xs", mutedTextClass)}>
                        {t("certification.runFacts", {
                          matches: number(run.matchCount),
                          exceptions: number(run.exceptionCount),
                          suspense: money(run.suspenseAmount),
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {run.status === "READY_FOR_SIGNOFF" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSigning}
                          onClick={() => onSign(run.id)}
                          className="dashboard-button-secondary rounded-lg"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {t("certification.actions.sign")}
                        </Button>
                      ) : null}
                      {run.status === "SIGNED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isExporting}
                          onClick={() => onExport(run.id)}
                          className="dashboard-button-secondary rounded-lg"
                        >
                          <Download className="h-4 w-4" />
                          {t("certification.actions.export")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={cn(rowSurfaceClass, "space-y-2 text-sm")}>
            <SummaryLine label={t("certification.controls.evidence")} value={dashboard.source.providerEvidenceAvailable || dashboard.source.statementEvidenceAvailable ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.freshAuth")} value={dashboard.controls.signoffRequiresFreshAuth ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.makerChecker")} value={dashboard.controls.manualMatchMakerChecker ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.gatewayOnly")} value={dashboard.controls.suspensePostingGatewayOnly ? t("common.yes") : t("common.no")} />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <DurableSuspensePostingQueue
            items={dashboard.suspenseQueue}
            money={money}
            formatDateTime={formatDateTime}
            t={t}
          />
          <DurableNotificationInbox
            notifications={dashboard.notificationQueue}
            money={money}
            formatDateTime={formatDateTime}
            t={t}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function DurableSuspensePostingQueue({
  items,
  money,
  formatDateTime,
  t,
}: {
  items: PaymentReconciliationDashboardData["suspenseQueue"]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  const notifications = useNotifications()
  const workflow = useResolveSuspenseItem()
  const [drafts, setDrafts] = useState<Record<string, { targetType: string; reason: string }>>({})

  const draftFor = (item: PaymentReconciliationDashboardData["suspenseQueue"][number]) =>
    drafts[item.id] ?? { targetType: item.type || "OTHER", reason: item.resolutionNotes ?? "" }

  const setDraft = (itemId: string, patch: Partial<{ targetType: string; reason: string }>) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: {
        targetType: patch.targetType ?? current[itemId]?.targetType ?? "OTHER",
        reason: patch.reason ?? current[itemId]?.reason ?? "",
      },
    }))
  }

  async function assign(itemId: string) {
    try {
      await workflow.assign.mutateAsync({ suspenseItemId: itemId })
      notifications.success(t("suspenseWorkflow.notifications.assignedTitle"), t("suspenseWorkflow.notifications.assignedMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(t("notifications.failedTitle"), error instanceof Error ? error.message : t("notifications.failedMessage"), {
        category: "reconciliation",
      })
    }
  }

  async function propose(item: PaymentReconciliationDashboardData["suspenseQueue"][number]) {
    const draft = draftFor(item)
    try {
      await workflow.propose.mutateAsync({
        suspenseItemId: item.id,
        targetType: draft.targetType,
        reason: draft.reason,
        suspenseLedgerAccountId: item.suspenseLedgerAccountId,
      })
      notifications.success(t("suspenseWorkflow.notifications.proposedTitle"), t("suspenseWorkflow.notifications.proposedMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(t("notifications.failedTitle"), error instanceof Error ? error.message : t("notifications.failedMessage"), {
        category: "reconciliation",
      })
    }
  }

  async function approve(itemId: string) {
    try {
      await workflow.approve.mutateAsync({ suspenseItemId: itemId })
      notifications.success(t("suspenseWorkflow.notifications.approvedTitle"), t("suspenseWorkflow.notifications.approvedMessage"), {
        category: "reconciliation",
      })
    } catch (error) {
      notifications.error(t("notifications.failedTitle"), error instanceof Error ? error.message : t("notifications.failedMessage"), {
        category: "reconciliation",
      })
    }
  }

  return (
    <div className={cn(rowSurfaceClass, "space-y-3")}>
      <div>
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          {t("suspenseWorkflow.title")}
        </div>
        <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>{t("suspenseWorkflow.description")}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ShieldCheck} label={t("suspenseWorkflow.empty")} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((item) => {
            const draft = draftFor(item)
            const canApprove = item.status === "RESOLUTION_PROPOSED"
            const isBusy = workflow.assign.isPending || workflow.propose.isPending || workflow.approve.isPending

            return (
              <div key={item.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={filterChipClass}>{item.status}</Badge>
                      <Badge variant="outline" className={cn("shrink-0", severityClass(item.severity))}>{item.severity}</Badge>
                      {item.ownerId ? <Badge variant="outline" className={filterChipClass}>{t("suspenseWorkflow.assigned")}</Badge> : null}
                    </div>
                    <div className="mt-2 font-semibold tabular-nums">{money(item.amount)}</div>
                    <div className={cn("mt-1 text-xs", mutedTextClass)}>
                      {item.type} / {formatDateTime(item.slaDeadline)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => assign(item.id)}
                      className="dashboard-button-secondary rounded-lg"
                    >
                      <UserCheck className="h-4 w-4" />
                      {t("suspenseWorkflow.actions.assign")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !canApprove}
                      onClick={() => approve(item.id)}
                      className="dashboard-button-secondary rounded-lg"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {t("suspenseWorkflow.actions.approve")}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <Select value={draft.targetType} onValueChange={(value) => setDraft(item.id, { targetType: value })}>
                    <SelectTrigger className="dashboard-control h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {suspenseTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`durableSuspenseTypes.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={draft.reason}
                    onChange={(event) => setDraft(item.id, { reason: event.target.value })}
                    placeholder={t("suspenseWorkflow.reasonPlaceholder")}
                    className="dashboard-control min-h-10 rounded-lg text-sm"
                  />
                  <Button
                    type="button"
                    disabled={isBusy || draft.reason.trim().length < 3}
                    onClick={() => propose(item)}
                    className="dashboard-button-primary h-10 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                    {t("suspenseWorkflow.actions.propose")}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DurableNotificationInbox({
  notifications,
  money,
  formatDateTime,
  t,
}: {
  notifications: PaymentReconciliationDashboardData["notificationQueue"]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className={cn(rowSurfaceClass, "space-y-3")}>
      <div>
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          {t("inbox.title")}
        </div>
        <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>{t("inbox.description")}</p>
      </div>
      {notifications.length === 0 ? (
        <EmptyState icon={CheckCircle2} label={t("inbox.empty")} />
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("shrink-0", severityClass(item.severity ?? "MEDIUM"))}>
                  {item.severity ?? "INFO"}
                </Badge>
                <Badge variant="outline" className={filterChipClass}>
                  {item.status}
                </Badge>
              </div>
              <div className="mt-2 text-sm font-medium">{t(`inbox.types.${notificationTypeKey(item.type)}`)}</div>
              <div className={cn("mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", mutedTextClass)}>
                <span>{formatDateTime(item.createdAt)}</span>
                {item.dueAt ? <span>{t("inbox.due", { time: formatDateTime(item.dueAt) })}</span> : null}
                {item.amount ? <span>{money(Number(item.amount))}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={mutedTextClass}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function RunSummaryTable({
  runs,
  money,
  number,
  formatDateTime,
  t,
}: {
  runs: PaymentReconciliationRunSummary[]
  money: (value: number | null | undefined) => string
  number: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <ScrollArea className="w-full">
      <table className="w-full min-w-[920px] text-sm">
        <thead className={cn("text-left text-xs", mutedTextClass)}>
          <tr className="border-b border-[var(--dash-border-subtle)]">
            <th className="py-2 pr-3 font-medium">{t("table.rail")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.status")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.payments")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.matched")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.failures")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.suspense")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.lastSeen")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.rail} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.28)]">
              <td className="py-3 pr-3">
                <div className="font-medium">{t(`rails.${run.rail}`)}</div>
                <div className={cn("mt-1 max-w-[260px] truncate text-xs", mutedTextClass)}>{run.settlementReference}</div>
              </td>
              <td className="py-3 pr-3">
                <Badge variant="outline" className={cn("shrink-0", statusClass(run.status))}>
                  {run.status === "clean" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : run.status === "critical" ? <AlertTriangle className="mr-1 h-3 w-3" /> : null}
                  {t(`statuses.${run.status}`)}
                </Badge>
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                <div className="font-semibold">{number(run.paymentCount)}</div>
                <div className={cn("text-xs", mutedTextClass)}>{money(run.totalAmount)}</div>
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                <div className="font-semibold">{number(run.matchedCount)}</div>
                <div className={cn("text-xs", mutedTextClass)}>{money(run.matchedGrossAmount)}</div>
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                <div className={cn("font-semibold", run.criticalFailureCount > 0 && "text-[var(--dash-danger)]")}>{number(run.failureCount)}</div>
                <div className={cn("text-xs", mutedTextClass)}>{t("table.criticalCount", { count: run.criticalFailureCount })}</div>
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                <div className="font-semibold">{money(run.suspenseAmount)}</div>
                <div className={cn("text-xs", mutedTextClass)}>{number(run.suspenseCount)}</div>
              </td>
              <td className={cn("py-3 pr-3 text-xs", mutedTextClass)}>{formatDateTime(run.lastPaymentAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function FailureGroups({
  groups,
  money,
  number,
  t,
}: {
  groups: PaymentReconciliationFailureGroup[]
  money: (value: number | null | undefined) => string
  number: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (groups.length === 0) {
    return <EmptyState icon={ShieldCheck} label={t("empty.failureGroups")} />
  }

  return (
    <div className="space-y-2">
      {groups.slice(0, 8).map((group) => (
        <div key={group.id} className={rowSurfaceClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={filterChipClass}>
                  {t(`rails.${group.rail}`)}
                </Badge>
                <Badge variant="outline" className={cn("shrink-0", severityClass(group.severity))}>
                  {t(`severity.${group.severity}`)}
                </Badge>
              </div>
              <div className="mt-2 font-medium">{t(`failureTypes.${group.type}`)}</div>
              <div className={cn("mt-1 line-clamp-2 text-xs", mutedTextClass)}>{group.latestMessage}</div>
            </div>
            <div className="text-right tabular-nums">
              <div className="font-semibold">{money(group.amount)}</div>
              <div className={cn("text-xs", mutedTextClass)}>{t("table.itemCount", { count: number(group.count) })}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DuplicateAlerts({
  alerts,
  money,
  formatDateTime,
  t,
}: {
  alerts: PaymentDuplicateProviderAlert[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (alerts.length === 0) {
    return <EmptyState icon={CheckCircle2} label={t("empty.duplicates")} />
  }

  return (
    <div className="space-y-2">
      {alerts.slice(0, 8).map((alert) => (
        <div key={alert.id} className={cn(rowSurfaceClass, "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-lg border-[var(--dash-danger)] bg-[rgba(12,20,24,0.25)] text-[var(--dash-danger)]">
                  {t(`rails.${alert.rail}`)}
                </Badge>
                <span className="text-xs font-medium">{alert.providerName}</span>
              </div>
              <div className="mt-2 truncate font-semibold">{alert.providerReference}</div>
              <div className="mt-1 text-xs opacity-80">{alert.paymentNumbers.slice(0, 4).join(", ")}</div>
            </div>
            <div className="text-right tabular-nums">
              <div className="font-semibold">{money(alert.amount)}</div>
              <div className="text-xs opacity-80">{t("table.duplicateCount", { count: alert.count })}</div>
              <div className="mt-1 text-xs opacity-80">{formatDateTime(alert.lastSeenAt)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SuspenseFailures({
  failures,
  money,
  formatDateTime,
  t,
}: {
  failures: PaymentSuspenseReadyFailure[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (failures.length === 0) {
    return <EmptyState icon={CheckCircle2} label={t("empty.suspense")} />
  }

  return (
    <ScrollArea className="w-full">
      <table className="w-full min-w-[980px] text-sm">
        <thead className={cn("text-left text-xs", mutedTextClass)}>
          <tr className="border-b border-[var(--dash-border-subtle)]">
            <th className="py-2 pr-3 font-medium">{t("table.failure")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.rail")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.reference")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.counterparty")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("table.amount")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.suspenseType")}</th>
            <th className="py-2 pr-3 font-medium">{t("table.time")}</th>
          </tr>
        </thead>
        <tbody>
          {failures.slice(0, 25).map((failure) => (
            <tr key={failure.id} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.28)]">
              <td className="py-3 pr-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("shrink-0", severityClass(failure.severity))}>
                    {t(`severity.${failure.severity}`)}
                  </Badge>
                  <span className="font-medium">{t(`failureTypes.${failure.type}`)}</span>
                </div>
                <div className={cn("mt-1 line-clamp-2 text-xs", mutedTextClass)}>{failure.message}</div>
              </td>
              <td className="py-3 pr-3">{t(`rails.${failure.rail}`)}</td>
              <td className="py-3 pr-3">
                <div className="font-mono text-xs">{failure.providerReference ?? t("common.notAvailable")}</div>
                <div className={cn("mt-1 text-xs", mutedTextClass)}>{failure.paymentNumber ?? failure.paymentId ?? t("common.notAvailable")}</div>
              </td>
              <td className="py-3 pr-3">{failure.counterparty}</td>
              <td className="py-3 pr-3 text-right font-semibold tabular-nums">{money(failure.amount)}</td>
              <td className="py-3 pr-3">
                <Badge variant="outline" className="rounded-lg border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]">
                  {failure.suspenseAccountHint} / {t(`suspenseTypes.${failure.suspenseType}`)}
                </Badge>
              </td>
              <td className={cn("py-3 pr-3 text-xs", mutedTextClass)}>{formatDateTime(failure.occurredAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-8 text-center text-sm text-[var(--dash-text-soft)]">
      <Icon className="mb-2 h-5 w-5" />
      <span>{label}</span>
    </div>
  )
}
