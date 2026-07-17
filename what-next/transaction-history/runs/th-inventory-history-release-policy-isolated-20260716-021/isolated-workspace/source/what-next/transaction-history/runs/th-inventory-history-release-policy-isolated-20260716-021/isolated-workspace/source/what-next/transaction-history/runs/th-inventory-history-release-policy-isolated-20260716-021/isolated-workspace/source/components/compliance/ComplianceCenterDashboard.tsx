"use client"

import { useLocale, useTranslations } from "next-intl"
import { type CSSProperties, type ReactNode, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  LockKeyhole,
  RefreshCw,
  Search,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { cn } from "@/lib/utils"
import {
  useComplianceCenter,
  type ComplianceCenterKernelSnapshot,
  type ComplianceCenterQueryError,
} from "@/hooks/compliance/useComplianceCenter"

type ComplianceCenterDashboardProps = {
  initialData?: ComplianceCenterKernelSnapshot | null
  initialError?: string | null
  initialStatus?: number | null
}

type FiscalDocumentRow = ComplianceCenterKernelSnapshot["recentDocuments"][number]
type SubmissionRow = ComplianceCenterKernelSnapshot["queuedSubmissions"][number]
type AdapterConfigRow = ComplianceCenterKernelSnapshot["adapterConfigs"][number]

const allValue = "all"
const defaultLimit = 50

const glassPanelClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
const glassHeaderClass = "border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6"
const filterChipClass = "dashboard-filter-chip rounded-lg"
const mutedTextClass = "text-[var(--dash-text-soft)]"
const faintTextClass = "text-[var(--dash-text-faint)]"
const rowSurfaceClass = "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3"
const dangerPanelClass = "rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
const warningPanelClass = "rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"

function sumCounts(counts: Record<string, number>, keys?: string[]) {
  const values = keys ? keys.map((key) => counts[key] ?? 0) : Object.values(counts)
  return values.reduce((sum, value) => sum + value, 0)
}

function compactHash(hash?: string | null) {
  if (!hash) return null
  return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-6)}` : hash
}

function statusClass(status: string) {
  if (["CERTIFIED", "ACTIVE"].includes(status)) {
    return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  }

  if (["REJECTED", "FAILED", "DEAD_LETTER", "DISABLED"].includes(status)) {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }

  if (["QUEUED", "PENDING", "LEASED", "RETRY_SCHEDULED", "REQUIRES_CONFIGURATION", "REQUIRES_EXPERT_REVIEW"].includes(status)) {
    return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  }

  if (["SUBMITTED"].includes(status)) {
    return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
  }

  return filterChipClass
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

function LoadingState() {
  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
        <Skeleton className="h-32 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
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

function StatePanel({
  icon: Icon,
  title,
  description,
  tone = "default",
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  tone?: "default" | "warning" | "danger"
  action?: ReactNode
}) {
  return (
    <Card className={cn(glassPanelClass, tone === "danger" && dangerPanelClass, tone === "warning" && warningPanelClass)}>
      <CardContent className="flex min-h-52 flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(12,20,24,0.24)]">
          <Icon className="h-6 w-6" />
        </span>
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-85">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-8 text-center text-sm text-[var(--dash-text-soft)]">
      <Icon className="mb-2 h-5 w-5" />
      <div className="font-medium text-[var(--dash-text)]">{title}</div>
      <div className="mt-1 max-w-lg leading-6">{description}</div>
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={mutedTextClass}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function ComplianceCenterDashboard({
  initialData = null,
  initialError = null,
  initialStatus = null,
}: ComplianceCenterDashboardProps) {
  const t = useTranslations("complianceCenter")
  const locale = useLocale()
  const notifications = useNotifications()
  const [countryCode, setCountryCode] = useState(allValue)
  const [documentStatus, setDocumentStatus] = useState(allValue)
  const [submissionStatus, setSubmissionStatus] = useState(allValue)
  const [adapterStatus, setAdapterStatus] = useState(allValue)
  const [documentSearch, setDocumentSearch] = useState("")
  const [submissionSearch, setSubmissionSearch] = useState("")

  const query = useComplianceCenter({
    input: {
      countryCode: countryCode === allValue ? undefined : countryCode,
      limit: defaultLimit,
    },
    initialData: countryCode === allValue ? initialData : null,
  })

  const dashboard = query.data ?? (countryCode === allValue ? initialData : null)
  const queryError = query.error as ComplianceCenterQueryError | null
  const errorStatus = queryError?.status ?? initialStatus ?? null
  const errorMessage = queryError?.message ?? initialError
  const isDenied = !dashboard && (errorStatus === 401 || errorStatus === 403)

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  )

  const formatNumber = (value: number | null | undefined) => numberFormatter.format(value ?? 0)
  const formatDateTime = (value: string | null | undefined) =>
    value ? dateTimeFormatter.format(new Date(value)) : t("common.notAvailable")
  const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
    }).format(value)

  const countries = useMemo(() => {
    const values = new Set<string>()
    const source = dashboard ?? initialData
    source?.recentDocuments.forEach((document) => values.add(document.countryCode))
    source?.adapterConfigs.forEach((adapter) => values.add(adapter.countryCode))
    if (source?.filters.countryCode) values.add(source.filters.countryCode)
    return Array.from(values).sort()
  }, [dashboard, initialData])

  const documentStatusOptions = useMemo(() => Object.keys(dashboard?.documentCounts ?? {}), [dashboard?.documentCounts])
  const submissionStatusOptions = useMemo(() => Object.keys(dashboard?.submissionCounts ?? {}), [dashboard?.submissionCounts])
  const adapterStatusOptions = useMemo(
    () => Array.from(new Set((dashboard?.adapterConfigs ?? []).map((adapter) => adapter.status))).sort(),
    [dashboard?.adapterConfigs],
  )

  const filteredDocuments = useMemo(() => {
    const queryText = documentSearch.trim().toLowerCase()
    return (dashboard?.recentDocuments ?? []).filter((document) => {
      const matchesStatus = documentStatus === allValue || document.status === documentStatus
      const haystack = [
        document.id,
        document.documentType,
        document.status,
        document.sourceType,
        document.sourceId,
        document.countryCode,
        document.countryPackVersion,
        document.countryPackResolutionHash,
        document.authorityReference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return matchesStatus && (!queryText || haystack.includes(queryText))
    })
  }, [dashboard?.recentDocuments, documentSearch, documentStatus])

  const filteredSubmissions = useMemo(() => {
    const queryText = submissionSearch.trim().toLowerCase()
    return (dashboard?.queuedSubmissions ?? []).filter((submission) => {
      const matchesStatus = submissionStatus === allValue || submission.status === submissionStatus
      const haystack = [
        submission.id,
        submission.fiscalDocumentId,
        submission.status,
        submission.operation,
        submission.authorityChannel,
        submission.environment,
        submission.payloadHash,
        submission.lastError,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return matchesStatus && (!queryText || haystack.includes(queryText))
    })
  }, [dashboard?.queuedSubmissions, submissionSearch, submissionStatus])

  const filteredAdapters = useMemo(
    () =>
      (dashboard?.adapterConfigs ?? []).filter((adapter) => adapterStatus === allValue || adapter.status === adapterStatus),
    [adapterStatus, dashboard?.adapterConfigs],
  )

  const metrics = useMemo(() => {
    const documentCounts = dashboard?.documentCounts ?? {}
    const submissionCounts = dashboard?.submissionCounts ?? {}
    const adapters = dashboard?.adapterConfigs ?? []
    const documentTotal = sumCounts(documentCounts)
    const pendingDocuments = sumCounts(documentCounts, ["DRAFT", "QUEUED", "SUBMITTED"])
    const certifiedDocuments = sumCounts(documentCounts, ["CERTIFIED"])
    const problemSubmissions = sumCounts(submissionCounts, ["REJECTED", "FAILED", "DEAD_LETTER"])
    const openSubmissions = sumCounts(submissionCounts, ["PENDING", "LEASED", "RETRY_SCHEDULED"])
    const activeAdapters = adapters.filter((adapter) => adapter.status === "ACTIVE").length
    const adapterRisks = adapters.filter((adapter) => adapter.status !== "ACTIVE").length

    return {
      documentTotal,
      pendingDocuments,
      certifiedDocuments,
      openSubmissions,
      problemSubmissions,
      activeAdapters,
      adapterRisks,
      blockerCount: problemSubmissions + sumCounts(documentCounts, ["REJECTED"]) + adapterRisks,
    }
  }, [dashboard])

  const asOfAgeMs = dashboard?.asOf ? Date.now() - new Date(dashboard.asOf).getTime() : 0
  const staleState = asOfAgeMs > 120_000 ? "stale" : "fresh"
  const isDegraded = Boolean(dashboard && (metrics.blockerCount > 0 || metrics.activeAdapters === 0))

  async function refreshComplianceCenter() {
    notifications.info(t("notifications.refreshTitle"), t("notifications.refreshMessage"), { category: "reporting" })

    try {
      const result = await query.refetch()
      if (result.error) throw result.error
      notifications.success(t("notifications.refreshedTitle"), t("notifications.refreshedMessage"), { category: "reporting" })
    } catch (error) {
      notifications.error(
        t("notifications.failedTitle"),
        error instanceof Error ? error.message : t("notifications.failedMessage"),
        { category: "reporting" },
      )
    }
  }

  if (query.isLoading && !dashboard && !initialError) return <LoadingState />

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
        <section className={cn(glassPanelClass, "p-4")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)]">{t("title")}</h1>
                  <p className={cn("text-sm", mutedTextClass)}>{t("subtitle")}</p>
                </div>
              </div>
              {dashboard ? (
                <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-xs", mutedTextClass)}>
                  <Badge variant="outline" className={cn(filterChipClass, "gap-1")}>
                    <Database className="h-3 w-3" />
                    {t("provenance.kernel")}
                  </Badge>
                  <Badge variant="outline" className={cn(filterChipClass, "gap-1")}>
                    <ShieldCheck className="h-3 w-3" />
                    {t("provenance.tenantScoped")}
                  </Badge>
                  <Badge variant="outline" className={cn(statusClass(staleState), "gap-1")}>
                    <CalendarClock className="h-3 w-3" />
                    {t(`provenance.${staleState}`, { time: formatDateTime(dashboard.asOf) })}
                  </Badge>
                  {dashboard.filters.countryCode ? (
                    <Badge variant="outline" className={cn(filterChipClass, "gap-1")}>
                      <Globe2 className="h-3 w-3" />
                      {dashboard.filters.countryCode}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[190px_190px_auto] xl:min-w-[620px]">
              <div>
                <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", mutedTextClass)}>
                  <Globe2 className="h-3.5 w-3.5" />
                  {t("filters.country")}
                </div>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value={allValue}>{t("filters.allCountries")}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", mutedTextClass)}>
                  <Filter className="h-3.5 w-3.5" />
                  {t("filters.documentStatus")}
                </div>
                <Select value={documentStatus} onValueChange={setDocumentStatus}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value={allValue}>{t("filters.allStatuses")}</SelectItem>
                    {documentStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`documentStatuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={refreshComplianceCenter}
                  disabled={query.isFetching}
                  className="dashboard-button-secondary h-10 rounded-lg"
                >
                  <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
                  {t("actions.refresh")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {isDenied ? (
          <StatePanel
            icon={LockKeyhole}
            title={t("states.deniedTitle")}
            description={t(errorStatus === 401 ? "states.unauthenticatedDescription" : "states.deniedDescription")}
            tone="danger"
          />
        ) : null}

        {!isDenied && errorMessage && !dashboard ? (
          <StatePanel
            icon={AlertTriangle}
            title={t("states.errorTitle")}
            description={errorMessage}
            tone="danger"
            action={
              <Button type="button" onClick={refreshComplianceCenter} className="dashboard-button-secondary rounded-lg">
                <RefreshCw className="h-4 w-4" />
                {t("actions.retry")}
              </Button>
            }
          />
        ) : null}

        {dashboard ? (
          <>
            {isDegraded ? (
              <div className={cn(warningPanelClass, "p-3 text-sm")}>
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <span>{t("states.degraded", { count: metrics.blockerCount })}</span>
                </div>
              </div>
            ) : null}

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title={t("metrics.documents")}
                value={formatNumber(metrics.documentTotal)}
                detail={t("details.pendingDocuments", { count: formatNumber(metrics.pendingDocuments) })}
                icon={FileText}
                accent="brand"
              />
              <MetricCard
                title={t("metrics.certified")}
                value={formatNumber(metrics.certifiedDocuments)}
                detail={t("details.certifiedDocuments")}
                icon={BadgeCheck}
                accent="success"
              />
              <MetricCard
                title={t("metrics.openSubmissions")}
                value={formatNumber(metrics.openSubmissions)}
                detail={t("details.openSubmissions")}
                icon={TimerReset}
                accent="warning"
              />
              <MetricCard
                title={t("metrics.exceptions")}
                value={formatNumber(metrics.problemSubmissions)}
                detail={t("details.exceptions")}
                icon={AlertTriangle}
                accent={metrics.problemSubmissions > 0 ? "danger" : "info"}
              />
              <MetricCard
                title={t("metrics.adapters")}
                value={formatNumber(metrics.activeAdapters)}
                detail={t("details.adapters", { count: formatNumber(metrics.adapterRisks) })}
                icon={ServerCog}
                accent={metrics.adapterRisks > 0 || metrics.activeAdapters === 0 ? "warning" : "success"}
              />
            </section>

            <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <DocumentQueue
                rows={filteredDocuments}
                search={documentSearch}
                onSearch={setDocumentSearch}
                formatMoney={formatMoney}
                formatDateTime={formatDateTime}
                t={t}
              />
              <AdapterHealthPanel
                adapters={filteredAdapters}
                status={adapterStatus}
                statuses={adapterStatusOptions}
                onStatus={setAdapterStatus}
                t={t}
              />
            </section>

            <SubmissionQueue
              rows={filteredSubmissions}
              status={submissionStatus}
              statuses={submissionStatusOptions}
              search={submissionSearch}
              onStatus={setSubmissionStatus}
              onSearch={setSubmissionSearch}
              formatDateTime={formatDateTime}
              t={t}
            />
          </>
        ) : null}
      </div>
    </main>
  )
}

function DocumentQueue({
  rows,
  search,
  onSearch,
  formatMoney,
  formatDateTime,
  t,
}: {
  rows: FiscalDocumentRow[]
  search: string
  onSearch: (value: string) => void
  formatMoney: (value: number, currency: string) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <Card className={glassPanelClass}>
      <CardHeader className={cn(glassHeaderClass, "pb-3")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              {t("sections.documents")}
            </CardTitle>
            <CardDescription className={mutedTextClass}>{t("sections.documentsDescription")}</CardDescription>
          </div>
          <label className="relative block min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t("filters.searchDocuments")}
              className="dashboard-control h-10 rounded-lg pl-9"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title={t("empty.documentsTitle")} description={t("empty.documentsDescription")} />
        ) : (
          <ScrollArea className="w-full">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className={cn("text-left text-xs", mutedTextClass)}>
                <tr className="border-b border-[var(--dash-border-subtle)]">
                  <th className="py-2 pr-3 font-medium">{t("table.document")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.status")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.source")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("table.amount")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.provenance")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.authority")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.issued")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((document) => (
                  <tr key={document.id} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.28)]">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{t(`documentTypes.${document.documentType}`)}</div>
                      <div className={cn("mt-1 font-mono text-xs", mutedTextClass)}>{document.id}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("shrink-0", statusClass(document.status))}>
                        {t(`documentStatuses.${document.status}`)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{document.sourceType}</div>
                      <div className={cn("mt-1 font-mono text-xs", mutedTextClass)}>{document.sourceId}</div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums">{formatMoney(document.totalAmount, document.currency)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={filterChipClass}>
                          {document.countryCode} / {document.countryPackVersion}
                        </Badge>
                        <Badge variant="outline" className={filterChipClass}>
                          {compactHash(document.countryPackResolutionHash)}
                        </Badge>
                      </div>
                      <div className={cn("mt-1 text-xs", mutedTextClass)}>
                        {t("table.linesAndSubmissions", {
                          lines: document.lineCount,
                          submissions: document.submissionCount,
                        })}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{document.authorityChannel ?? t("common.notAvailable")}</div>
                      <div className={cn("mt-1 max-w-[220px] truncate text-xs", mutedTextClass)}>
                        {document.authorityReference ?? t("common.notAvailable")}
                      </div>
                    </td>
                    <td className={cn("py-3 pr-3 text-xs", mutedTextClass)}>{formatDateTime(document.issueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function AdapterHealthPanel({
  adapters,
  status,
  statuses,
  onStatus,
  t,
}: {
  adapters: AdapterConfigRow[]
  status: string
  statuses: string[]
  onStatus: (value: string) => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <Card className={glassPanelClass}>
      <CardHeader className={cn(glassHeaderClass, "pb-3")}>
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              {t("sections.adapters")}
            </CardTitle>
            <CardDescription className={mutedTextClass}>{t("sections.adaptersDescription")}</CardDescription>
          </div>
          <Select value={status} onValueChange={onStatus}>
            <SelectTrigger className="dashboard-control h-10 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <SelectItem value={allValue}>{t("filters.allAdapterStatuses")}</SelectItem>
              {statuses.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`adapterStatuses.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adapters.length === 0 ? (
          <EmptyState icon={ServerCog} title={t("empty.adaptersTitle")} description={t("empty.adaptersDescription")} />
        ) : (
          adapters.map((adapter) => (
            <div key={adapter.id} className={rowSurfaceClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{adapter.countryCode}</span>
                    <Badge variant="outline" className={cn("shrink-0", statusClass(adapter.status))}>
                      {t(`adapterStatuses.${adapter.status}`)}
                    </Badge>
                  </div>
                  <div className={cn("mt-2 text-xs", mutedTextClass)}>
                    {adapter.authorityChannel} / {adapter.adapterKey} / {t(`environments.${adapter.environment}`)}
                  </div>
                </div>
                {adapter.status === "ACTIVE" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--dash-success)]" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--dash-warning)]" />
                )}
              </div>

              <div className="mt-3 space-y-2">
                <SummaryLine label={t("adapter.pack")} value={adapter.countryPackVersion} />
                <SummaryLine label={t("adapter.capability")} value={adapter.capabilityStatus} />
                <SummaryLine
                  label={t("adapter.credential")}
                  value={adapter.credentialReferencePresent ? t("adapter.credentialPresent") : t("adapter.credentialMissing")}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SubmissionQueue({
  rows,
  status,
  statuses,
  search,
  onStatus,
  onSearch,
  formatDateTime,
  t,
}: {
  rows: SubmissionRow[]
  status: string
  statuses: string[]
  search: string
  onStatus: (value: string) => void
  onSearch: (value: string) => void
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <Card className={glassPanelClass}>
      <CardHeader className={cn(glassHeaderClass, "pb-3")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TimerReset className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              {t("sections.submissions")}
            </CardTitle>
            <CardDescription className={mutedTextClass}>{t("sections.submissionsDescription")}</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[190px_260px]">
            <Select value={status} onValueChange={onStatus}>
              <SelectTrigger className="dashboard-control h-10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                <SelectItem value={allValue}>{t("filters.allStatuses")}</SelectItem>
                {statuses.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`submissionStatuses.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
              <Input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={t("filters.searchSubmissions")}
                className="dashboard-control h-10 rounded-lg pl-9"
              />
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("empty.submissionsTitle")} description={t("empty.submissionsDescription")} />
        ) : (
          <ScrollArea className="w-full">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className={cn("text-left text-xs", mutedTextClass)}>
                <tr className="border-b border-[var(--dash-border-subtle)]">
                  <th className="py-2 pr-3 font-medium">{t("table.submission")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.status")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.operation")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.authority")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("table.attempts")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.nextAttempt")}</th>
                  <th className="py-2 pr-3 font-medium">{t("table.evidenceHash")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((submission) => (
                  <tr key={submission.id} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.28)]">
                    <td className="py-3 pr-3">
                      <div className="font-mono text-xs">{submission.id}</div>
                      <div className={cn("mt-1 font-mono text-xs", mutedTextClass)}>{submission.fiscalDocumentId}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("shrink-0", statusClass(submission.status))}>
                        {t(`submissionStatuses.${submission.status}`)}
                      </Badge>
                      {submission.lastError ? (
                        <div className="mt-2 max-w-[280px] text-xs leading-5 text-[var(--dash-danger)]">{submission.lastError}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">{t(`operations.${submission.operation}`)}</td>
                    <td className="py-3 pr-3">
                      <div>{submission.authorityChannel}</div>
                      <div className={cn("mt-1 text-xs", mutedTextClass)}>{t(`environments.${submission.environment}`)}</div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums">{submission.attempts}</td>
                    <td className={cn("py-3 pr-3 text-xs", mutedTextClass)}>{formatDateTime(submission.nextAttemptAt)}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={filterChipClass}>
                        {compactHash(submission.payloadHash)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
