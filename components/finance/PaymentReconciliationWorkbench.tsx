"use client"
import { ReconciliationAlertProcessing } from "./ReconciliationAlertProcessing"
import { AlertScanRecovery } from "./AlertScanRecovery"

import { WorkspaceSectionNavigation } from "@/components/dashboard/WorkspaceSectionNavigation"

import { RenderedDataTable } from "@/components/DataTableComponents/RenderedDataTable"

import {
  CanonicalTableBoundary,
  createCanonicalTableQuery,
  paymentReconciliationTableContract,
} from "@/components/DataTableComponents"

import { useLocale, useTranslations } from "next-intl"
import { formatReconciliationAmount } from "./reconciliation-amount"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
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
  FileUp,
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

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import { BIProofDrawerHost } from "@/components/bi"
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PaymentSuspenseQueue } from "./PaymentSuspenseQueue"
import { ReconciliationCertificateExportPanel } from "./ReconciliationCertificateExportPanel"
import { ReconciliationCertificateHistory } from "./ReconciliationCertificateHistory"
import { ReconciliationPreparationWorkbench } from "./ReconciliationPreparationWorkbench"
import type { CertificateHistoryRun } from "@/services/reconciliation/reconciliation-certificate-history.contracts"
import { ReconciliationSignReview, type SignedRunForExport } from "./ReconciliationSignReview"
import type { ReconciliationCertificateExportCommand } from "@/services/reconciliation/reconciliation-certificate-export.contracts"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath } from "@/i18n/routing"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { usePermissions } from "@/hooks/usePermissions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { cn } from "@/lib/utils"
import { usePaymentReconciliationWorkbench } from "@/hooks/payments/usePaymentReconciliationWorkbench"
import {
  useExportReconciliationCertificate,
  useImportProviderStatement,
  useManualMatchWorkflow,
  usePaymentReconciliationDashboard,
  useReconciliationRunDetail,
  useRunPaymentReconciliation,
} from "@/hooks/payments/usePaymentReconciliationDashboard"
import type { PaymentReconciliationDashboardData, ReconciliationRunDetail } from "@/actions/payments/reconciliation.actions"
import type {
  PaymentDuplicateProviderAlert,
  PaymentReconciliationFailureGroup,
  PaymentReconciliationRunSummary,
  PaymentSuspenseReadyFailure,
} from "@/services/payments/payment-reconciliation-workbench.service"
import type { BIProofDrawerSubject } from "@/services/bi/bi-contracts"
import { SUBJECT_PERMISSION_MAP, type ProofTrailResult } from "@/services/evidence/evidence-contracts"
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
type AvailableProofSubject = Extract<BIProofDrawerSubject, { available: true }>
type RunDetailEvidenceSubject = ReconciliationRunDetail["matchRecords"][number]["evidenceSubjects"][number]

const supportedRunDetailProofTypes: Partial<Record<RunDetailEvidenceSubject["type"], AvailableProofSubject["subjectType"]>> = {
  PAYMENT_TRANSACTION: "payment.transaction",
  PROVIDER_EVENT: "provider.event",
  RECONCILIATION_RUN: "reconciliation.run",
}

const runDetailProofPriority: RunDetailEvidenceSubject["type"][] = ["PAYMENT_TRANSACTION", "PROVIDER_EVENT", "RECONCILIATION_RUN"]

const proofSubjectKey = (subject: AvailableProofSubject) => `${subject.subjectType}:${subject.subjectId}`

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

function compactId(value: string | null | undefined) {
  if (!value) return null
  if (value.length <= 14) return value
  return `${value.slice(0, 7)}...${value.slice(-4)}`
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

function runDetailProofSubject(input: {
  organizationId: string
  evidenceSubjects: RunDetailEvidenceSubject[]
  label: string
  unavailableReason: string
}): BIProofDrawerSubject {
  const supportedSubject = runDetailProofPriority
    .flatMap((type) => input.evidenceSubjects.filter((subject) => subject.type === type))
    .find((subject) => supportedRunDetailProofTypes[subject.type])

  const base = {
    organizationId: input.organizationId,
    moduleSlug: "payment_reconciliation" as const,
    label: input.label,
    requiredPermission: SUBJECT_PERMISSION_MAP["payment.transaction"],
    sourceModules: ["payments", "finance"] as BIProofDrawerSubject["sourceModules"],
  }

  if (!supportedSubject) {
    return {
      ...base,
      available: false,
      unavailableReason: input.unavailableReason,
    }
  }

  const subjectType = supportedRunDetailProofTypes[supportedSubject.type]
  if (!subjectType) {
    return {
      ...base,
      available: false,
      unavailableReason: input.unavailableReason,
    }
  }

  return {
    ...base,
    available: true,
    subjectType,
    subjectId: supportedSubject.id,
    requiredPermission: SUBJECT_PERMISSION_MAP[subjectType],
  }
}

function paymentTransactionProofSubject(input: {
  organizationId: string
  paymentTransactionId: string | null
  label: string
  unavailableReason: string
}): BIProofDrawerSubject {
  const base = {
    organizationId: input.organizationId,
    moduleSlug: "payment_reconciliation" as const,
    label: input.label,
    requiredPermission: SUBJECT_PERMISSION_MAP["payment.transaction"],
    sourceModules: ["payments", "finance"] as BIProofDrawerSubject["sourceModules"],
  }

  if (!input.paymentTransactionId) {
    return {
      ...base,
      available: false,
      unavailableReason: input.unavailableReason,
    }
  }

  return {
    ...base,
    available: true,
    subjectType: "payment.transaction",
    subjectId: input.paymentTransactionId,
  }
}

function LoadingState({ locale }: { locale: string }) {
  const isFrench = locale === "fr"
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4">
        <div role="status" aria-live="polite" className="space-y-2 text-[var(--dash-text)]">
          <h1 className="text-xl font-semibold">{isFrench ? "Chargement du rapprochement" : "Loading reconciliation"}</h1>
          <p className="text-sm text-[var(--dash-text-soft)]">{isFrench
            ? "Vérification de vos accès et chargement des justificatifs de paiement. Aucun résultat n’est encore disponible."
            : "Checking your access and loading payment evidence. Results are not available yet."}</p>
        </div>
        <a href={localizePath("/dashboard", isFrench ? "fr" : "en")}
          className="inline-flex min-h-10 items-center rounded-lg border border-[var(--dash-border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]">
          {isFrench ? "Retour au tableau de bord" : "Back to dashboard"}
        </a>
        <Skeleton aria-hidden="true" className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <div aria-hidden="true" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
        <div aria-hidden="true" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[480px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </div>
  )
}

function trustSignalClass(tone: "success" | "warning" | "danger" | "info") {
  if (tone === "success") return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  if (tone === "warning") return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  if (tone === "danger") return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
}

export function PaymentTrustBanner({
  dashboard,
  number,
  formatDateTime,
}: {
  dashboard: PaymentReconciliationDashboardData
  number: (value: number | null | undefined) => string
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
}) {
  const t = useTranslations("paymentReconciliationWorkbench")
  const locale = useLocale()
  const signals: Array<{
    key: string
    label: string
    value: string
    detail?: string
    icon: LucideIcon
    tone: "success" | "warning" | "danger" | "info"
  }> = [
    {
      key: "providerEvidence",
      label: t("trustBanner.providerEvidence"),
      value: dashboard.source.providerEvidenceAvailable ? t("trustBanner.available") : t("trustBanner.missing"),
      icon: Database,
      tone: dashboard.source.providerEvidenceAvailable ? "success" : "warning",
    },
    {
      key: "statementEvidence",
      label: t("trustBanner.statementEvidence"),
      value: dashboard.source.statementEvidenceAvailable ? t("trustBanner.available") : t("trustBanner.missing"),
      icon: Landmark,
      tone: dashboard.source.statementEvidenceAvailable ? "success" : "warning",
    },
    {
      key: "signedRuns",
      label: t("trustBanner.signedRuns"),
      value: number(dashboard.summary.signedRunCount),
      icon: ShieldCheck,
      tone: dashboard.summary.signedRunCount > 0 ? "success" : "info",
    },
    {
      key: "openSuspense",
      label: t("trustBanner.openSuspense"),
      value: number(dashboard.summary.openSuspenseCount),
      detail: dashboard.summary.openSuspenseByCurrency.map(value => `${formatReconciliationAmount(value.amount, locale)} ${value.currencyCode}`).join("; ") || undefined,
      icon: FileWarning,
      tone: dashboard.summary.openSuspenseCount > 0 ? "warning" : "success",
    },
    {
      key: "criticalExceptions",
      label: t("trustBanner.criticalExceptions"),
      value: number(dashboard.summary.criticalExceptionCount),
      icon: ShieldAlert,
      tone: dashboard.summary.criticalExceptionCount > 0 ? "danger" : "success",
    },
    {
      key: "closeBlockers",
      label: t("trustBanner.closeBlockers"),
      value: number(dashboard.summary.closeBlockerCount),
      icon: AlertTriangle,
      tone: dashboard.summary.closeBlockerCount > 0 ? "danger" : "success",
    },
    {
      key: "freshness",
      label: t("trustBanner.freshness"),
      value: formatDateTime(dashboard.source.asOf),
      icon: RefreshCw,
      tone: "info",
    },
  ]

  return (
    <section aria-label={t("trustBanner.title")} className={cn(glassPanelClass, "p-4")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold uppercase leading-5 tracking-normal text-[var(--dash-text)]">{t("trustBanner.title")}</h2>
              <p className={cn("text-xs leading-5", mutedTextClass)}>{t("trustBanner.description")}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn(filterChipClass, "shrink-0")}>{t(`certification.statuses.${dashboard.source.certificationStatus}`)}</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {signals.map((signal) => {
          const Icon = signal.icon
          return (
            <div key={signal.key} className={cn("min-w-0 rounded-lg border p-3", trustSignalClass(signal.tone))}>
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase leading-4">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{signal.label}</span>
              </div>
              <div className="mt-2 break-words text-lg font-semibold leading-tight tabular-nums">{signal.value}</div>
              {signal.detail ? <div className="mt-1 text-xs leading-4 opacity-85">{signal.detail}</div> : null}
            </div>
          )
        })}
      </div>
    </section>
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

export default function PaymentReconciliationWorkbench({ initialSignRunId }: { initialSignRunId?: string } = {}) {
  const t = useTranslations("paymentReconciliationWorkbench")
  const locale = useLocale()
  // Subscribe before data loads; nested panels share this live permission result.
  const authority = usePermissions()
  const notifications = useNotifications()
  const [period, setPeriod] = useState<PaymentReconciliationWorkbenchPeriod>("mtd")
  const [locationId, setLocationId] = useState(allLocationsValue)
  const [customRange, setCustomRange] = useState(defaultCustomRange)
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [activeProofSubjectId, setActiveProofSubjectId] = useState<string | null>(null)
  const [proofLoadingSubjectId, setProofLoadingSubjectId] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

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
  const canonicalFilters: Record<string, string[]> = {
    ...(queryInput.locationId ? { locationId: [queryInput.locationId] } : {}),
    period: [queryInput.period],
    ...(queryInput.startDate && Number.isFinite(queryInput.startDate.getTime())
      ? { startDate: [queryInput.startDate.toISOString()] } : {}),
    ...(queryInput.endDate && Number.isFinite(queryInput.endDate.getTime())
      ? { endDate: [queryInput.endDate.toISOString()] } : {}),
  }
  const durableDashboardQuery = usePaymentReconciliationDashboard()
  const durableDashboard = durableDashboardQuery.data
  const selectedRunDetailId = selectedRunId ?? durableDashboard?.recentRuns[0]?.id ?? null
  const runDetailQuery = useReconciliationRunDetail(selectedRunDetailId)
  const runReconciliation = useRunPaymentReconciliation()
  const exportCertificate = useExportReconciliationCertificate()
  const workbench = workbenchQuery.data
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

  function handleProofOpenChange(open: boolean) {
    setProofOpen(open)
    if (!open) {
      setActiveProofSubjectId(null)
      setProofLoadingSubjectId(null)
      setProofError(null)
      setProofTrail(null)
    }
  }

  async function openProofSubject(subject: AvailableProofSubject, activeKey = proofSubjectKey(subject)) {
    setActiveProofSubjectId(activeKey)
    setProofOpen(true)
    setProofTrail(null)
    setProofError(null)
    setProofLoadingSubjectId(activeKey)

    try {
      const response = await getProofTrailAction({
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
      })

      if (response.success) {
        setProofTrail(response.data)
        return
      }

      setProofError(response.error || t("proof.error"))
    } catch (error) {
      setProofError(error instanceof Error ? error.message : t("proof.error"))
    } finally {
      setProofLoadingSubjectId(null)
    }
  }

  async function refreshWorkbench() {
    notifications.info(t("notifications.refreshTitle"), t("notifications.refreshMessage"), { category: "reconciliation" })
    try {
      await Promise.all([workbenchQuery.refetch({ throwOnError: true }), durableDashboardQuery.refetch({ throwOnError: true })])
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

  function exportDurableCertificate(command: ReconciliationCertificateExportCommand) {
    return exportCertificate.mutateAsync(command)
  }

  if (workbenchQuery.isLoading && !workbench) return <LoadingState locale={locale} />

  if (errorMessage && !workbench) {
    if ((workbenchQuery.error as { code?: string })?.code === "FORBIDDEN") {
      const isFrench = locale === "fr"
      return <DashboardRouteState embedded kind="permission_denied" locale={isFrench ? "fr" : "en"}
        title={isFrench ? "L’accès au rapprochement doit être vérifié" : "Reconciliation access needs review"}
        message={isFrench
          ? "Votre accès actuel n’a pas pu être confirmé. Consultez vos autorisations ou relancez leur vérification."
          : "Your current access could not be confirmed. Review your permissions or refresh the access check."}
        primaryHref={localizePath("/dashboard/access-requests", isFrench ? "fr" : "en")}
        primaryLabel={isFrench ? "Vérifier mes autorisations" : "Review my access"}
        actions={<Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal"
          onClick={() => { void authority.refreshPermissions() }}>
          {isFrench ? "Actualiser les autorisations" : "Refresh access check"}
        </Button>} />
    }
    return <DashboardErrorState embedded locale={locale === "fr" ? "fr" : "en"} error="Payment reconciliation workbench unavailable"
      reset={() => { void workbenchQuery.refetch() }} />
  }

  const canonicalTableQuery = createCanonicalTableQuery(paymentReconciliationTableContract, {
    filters: canonicalFilters,
  })

  return (
    <CanonicalTableBoundary
      contract={paymentReconciliationTableContract}
      locale={locale === "fr" ? "fr" : "en"}
      query={canonicalTableQuery}
      state={workbenchQuery.isFetching ? "refreshing" : workbench ? "ready" : "empty"}
    >
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] min-w-0 space-y-6 px-4 py-4 text-[var(--dash-text)] sm:px-6 sm:py-6">
      <section className={cn(glassPanelClass, "p-4")}>
        <div className="flex min-w-0 flex-col gap-5">
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

          <div className="grid min-w-0 gap-3 border-t border-[var(--dash-border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-[220px_220px_auto]">
            <div>
              <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", mutedTextClass)}>
                <MapPin className="h-3.5 w-3.5" />
                {t("filters.location")}
              </div>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger aria-label={t("filters.location")} className="dashboard-control h-10 rounded-lg">
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
                <SelectTrigger aria-label={t("filters.period")} className="dashboard-control h-10 rounded-lg">
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
                <TableDateRangePicker
                  value={{ from: customRange.start, to: customRange.end }}
                  onChange={(range) => setCustomRange({ start: range.from ?? "", end: range.to ?? "" })}
                  locale={locale === "fr" ? "fr" : "en"}
                  triggerClassName="h-10"
                />
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
            <span className="text-sm font-medium">One payment reconciliation source failed or timed out. Retry the read-only dashboard without exposing internal details.</span>
          </CardContent>
        </Card>
      ) : null}

      <WorkspaceSectionNavigation label={locale === "fr" ? "Sections de la page" : "Page sections"} items={[
        { id: "reconciliation-evidence", label: t("certification.title") },
        ...(workbench ? [
          { id: "reconciliation-runs", label: t("sections.runs") },
          { id: "reconciliation-alerts", label: t("sections.failureGroups") },
          { id: "reconciliation-suspense", label: t("sections.suspense") },
        ] : []),
      ]} />
      {durableDashboard ? (
        <PaymentTrustBanner
          dashboard={durableDashboard}
          number={number}
          money={money}
          formatDateTime={formatDateTime}
        />
      ) : null}

      <section id="reconciliation-evidence" className="min-w-0 scroll-mt-24">
        <DurableEvidencePanel
          authority={authority}
          initialSignRunId={initialSignRunId}
          dashboard={durableDashboard}
        runDetail={runDetailQuery.data}
        organizationId={workbench?.organization.id ?? "session"}
        selectedRunId={selectedRunDetailId}
        isRunDetailLoading={runDetailQuery.isLoading || runDetailQuery.isFetching}
        runDetailError={runDetailQuery.error instanceof Error ? runDetailQuery.error.message : null}
        onSelectRun={setSelectedRunId}
        proofTrail={proofTrail}
        proofOpen={proofOpen}
        proofError={proofError}
        activeProofSubjectId={activeProofSubjectId}
        proofLoadingSubjectId={proofLoadingSubjectId}
        onProofOpenChange={handleProofOpenChange}
        onOpenProofSubject={openProofSubject}
          isLoading={durableDashboardQuery.isLoading}
          error={durableDashboardQuery.error ? t("notifications.failedMessage") : null}
          isRunning={runReconciliation.isPending}
          isExporting={exportCertificate.isPending}
          onRun={runDurableReconciliation}
          onExport={exportDurableCertificate}
          onOpenPaymentProof={workbench ? (paymentTransactionId) => {
            const subject = paymentTransactionProofSubject({ organizationId: workbench.organization.id, paymentTransactionId, label: t("proof.open"), unavailableReason: t("proof.unavailable") })
            if (subject.available) void openProofSubject(subject)
          } : undefined}
          money={money}
          number={number}
          formatDateTime={formatDateTime}
          t={t}
        />

      </section>

      {workbench ? (
        <>
          <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <MetricCard title={t("metrics.activeRails")} value={number(workbench.summary.activeRailCount)} detail={t("details.activeRails", { count: workbench.summary.railCount })} icon={CreditCard} accent="brand" />
            <MetricCard title={t("metrics.cleanRuns")} value={number(workbench.summary.cleanRunCount)} detail={t("details.attentionRuns", { count: workbench.summary.attentionRunCount })} icon={ShieldCheck} accent={workbench.summary.criticalRunCount > 0 ? "warning" : "success"} />
            <MetricCard title={t("metrics.criticalFailures")} value={number(workbench.summary.criticalFailureCount)} detail={t("details.failures", { count: workbench.summary.failureCount })} icon={ShieldAlert} accent={workbench.summary.criticalFailureCount > 0 ? "danger" : "info"} />
            <MetricCard title={t("metrics.duplicates")} value={number(workbench.summary.duplicateProviderReferenceCount)} detail={t("details.coverage", { value: percent(workbench.summary.providerReferenceCoverage) })} icon={Copy} accent={workbench.summary.duplicateProviderReferenceCount > 0 ? "danger" : "success"} />
            <MetricCard title={t("metrics.suspenseExposure")} value={money(workbench.summary.suspenseExposure)} detail={t("details.suspense", { count: workbench.summary.suspenseItemCount })} icon={FileWarning} accent={workbench.summary.suspenseExposure > 0 ? "warning" : "info"} />
          </section>

          <section id="reconciliation-runs" className="grid min-w-0 scroll-mt-24 grid-cols-1 gap-4">
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

          <section id="reconciliation-alerts" className="grid min-w-0 scroll-mt-24 gap-4 2xl:grid-cols-2">
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

          <Card id="reconciliation-suspense" className={cn(glassPanelClass, "min-w-0 scroll-mt-24")}>
            <CardHeader className={cn(glassHeaderClass, "pb-3")}>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileWarning className="h-4 w-4 text-[var(--dash-warning)]" />
                {t("sections.suspense")}
              </CardTitle>
              <CardDescription className={mutedTextClass}>{t("sections.suspenseDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SuspenseFailures
                organizationId={workbench.organization.id}
                failures={workbench.suspenseReadyFailures}
                money={money}
                formatDateTime={formatDateTime}
                t={t}
                proofTrail={proofTrail}
                proofOpen={proofOpen}
                proofError={proofError}
                activeProofSubjectId={activeProofSubjectId}
                proofLoadingSubjectId={proofLoadingSubjectId}
                onProofOpenChange={handleProofOpenChange}
                onOpenProofSubject={openProofSubject}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
      </div>
    </div>
    </CanonicalTableBoundary>
  )
}

function DurableEvidencePanel({
  authority,
  initialSignRunId,
  dashboard,
  runDetail,
  organizationId,
  selectedRunId,
  isLoading,
  error,
  isRunDetailLoading,
  runDetailError,
  isRunning,
  isExporting,
  onRun,
  onExport,
  onOpenPaymentProof,
  onSelectRun,
  proofTrail,
  proofOpen,
  proofError,
  activeProofSubjectId,
  proofLoadingSubjectId,
  onProofOpenChange,
  onOpenProofSubject,
  money,
  number,
  formatDateTime,
  t,
}: {
  authority: ReturnType<typeof usePermissions>
  initialSignRunId?: string
  dashboard: PaymentReconciliationDashboardData | undefined
  runDetail: ReconciliationRunDetail | undefined
  organizationId: string
  selectedRunId: string | null
  isLoading: boolean
  error: string | null
  isRunDetailLoading: boolean
  runDetailError: string | null
  isRunning: boolean
  isExporting: boolean
  onRun: (providerAccountId: string) => void
  onExport: (command: ReconciliationCertificateExportCommand) => ReturnType<ReturnType<typeof useExportReconciliationCertificate>["mutateAsync"]>
  onOpenPaymentProof?: (paymentTransactionId: string) => void
  onSelectRun: (runId: string) => void
  proofTrail: ProofTrailResult | null
  proofOpen: boolean
  proofError: string | null
  activeProofSubjectId: string | null
  proofLoadingSubjectId: string | null
  onProofOpenChange: (open: boolean) => void
  onOpenProofSubject: (subject: AvailableProofSubject, activeKey?: string) => void
  money: (value: number | null | undefined) => string
  number: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  const locale = useLocale()
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({})
  const manualWorkflow = useManualMatchWorkflow()
  const [exportRunId, setExportRunId] = useState<string | null>(null)
  const [historicalExport, setHistoricalExport] = useState<{ organizationId: string; actorId: string; run: CertificateHistoryRun; request?: ReconciliationCertificateExportCommand } | null>(null)
  const exportOpener = useRef<HTMLButtonElement | null>(null)
  const [signRunId, setSignRunId] = useState<string | null>(null)
  const [signedForExport, setSignedForExport] = useState<(SignedRunForExport & { organizationId: string; actorId: string }) | null>(null)
  const signOpener = useRef<HTMLButtonElement | null>(null)
  const signSelectionKey = dashboard ? `stoquify:sign-review-selection:v1:${dashboard.scope.organizationId}:${dashboard.scope.actorId}` : null
  useEffect(() => {
    setSignRunId(null)
    if (!signSelectionKey) return
    if (initialSignRunId) { setSignRunId(initialSignRunId); return }
    try { const id = sessionStorage.getItem(signSelectionKey); if (id && id.length <= 191) setSignRunId(id) } catch { /* Pending request recovery remains scoped in the review. */ }
  }, [signSelectionKey, initialSignRunId])
  function openSign(id: string | null) {
    if (id) signOpener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    setSignRunId(id)
    if (signSelectionKey) try { if (id) sessionStorage.setItem(signSelectionKey, id); else sessionStorage.removeItem(signSelectionKey) } catch { /* Optional selection only. */ }
    if (!id) requestAnimationFrame(() => signOpener.current?.focus())
  }
  const exportScopeReady = authority.permissionState === "ready" && authority.user?.id === dashboard?.scope.actorId && authority.organizationId === dashboard?.scope.organizationId
  const selectedHistory = historicalExport?.organizationId === dashboard?.scope.organizationId && historicalExport?.actorId === dashboard?.scope.actorId ? historicalExport : null
  if (isLoading && !dashboard) {
    return <Skeleton className="h-52 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
  }

  if (error) {
    return (
      <Card className={warningPanelClass}>
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5" />
          <span role="alert" className="text-sm font-medium">{error}</span>
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
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <SummaryLine label={t("certification.summary.providerAccounts")} value={number(dashboard.summary.activeProviderAccountCount)} />
          <SummaryLine label={t("certification.summary.recentRuns")} value={number(dashboard.summary.recentRunCount)} />
          <SummaryLine label={t("certification.summary.readyForSignoff")} value={number(dashboard.summary.readyForSignoffCount)} />
          <SummaryLine label={t("certification.summary.openExceptions")} value={number(dashboard.summary.openExceptionCount)} />
          <SummaryLine label={t("certification.summary.openSuspense")} value={dashboard.summary.openSuspenseByCurrency.map(value => `${formatReconciliationAmount(value.amount, locale)} ${value.currencyCode}`).join("; ") || t("overviewScope.empty")} />
        </div>

        {dashboard.summary.closeBlockerCount > 0 ? (
          <div className={cn(dangerPanelClass, "p-3 text-sm")}>
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              <span>{t("certification.closeBlocked", { count: dashboard.summary.closeBlockerCount })}</span>
            </div>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <StatementImportLane
            accounts={dashboard.providerAccounts}
            files={dashboard.statementFiles}
            formatDateTime={formatDateTime}
            t={t}
          />
          <ManualMatchLane
            authority={authority}
            candidates={dashboard.manualMatchCandidates}
            proposals={dashboard.manualMatchProposals}
            preparation={dashboard.manualMatchPreparation}
            amounts={manualAmounts}
            onAmountChange={(id, value) => setManualAmounts(current => ({ ...current, [id]: value }))}
            workflow={manualWorkflow}
            formatDateTime={formatDateTime}
            t={t}
            onOpenPaymentProof={onOpenPaymentProof}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
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
                        {["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "WALLET", "QR", "CHEQUE", "INTERNAL_TRANSFER", "OTHER"].includes(account.railType) ? t(`rails.${account.railType}`) : account.railType}
                      </Badge>
                      <Badge variant="outline" className={filterChipClass}>
                        {["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED", "UNMAPPED"].includes(account.status) ? t(`certification.providerStatuses.${account.status}`) : account.status}
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
                  <div
                    key={run.id}
                    className={cn(
                      rowSurfaceClass,
                      "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
                      selectedRunId === run.id && "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatDateTime(run.businessDate)}</span>
                        <Badge variant="outline" className={filterChipClass}>
                          {["DRAFT", "RUNNING", "NEEDS_REVIEW", "BLOCKED", "READY_FOR_SIGNOFF", "SIGNED", "FAILED", "VOIDED"].includes(run.status) ? t(`certification.runStatuses.${run.status}`) : run.status}
                        </Badge>
                      </div>
                      <div className={cn("mt-1 text-xs", mutedTextClass)}>
                        {t("certification.runFacts", {
                          matches: number(run.matchCount),
                          exceptions: number(run.exceptionCount),
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={selectedRunId === run.id}
                        onClick={() => onSelectRun(run.id)}
                        className="dashboard-button-secondary rounded-lg"
                      >
                        <Database className="h-4 w-4" />
                        {t("certification.actions.inspect")}
                      </Button>
                      {run.status === "READY_FOR_SIGNOFF" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!exportScopeReady || !authority.hasPermission("payments.reconciliation.sign") || !authority.hasPermission("payments.reconciliation.read")}
                          onClick={() => openSign(run.id)}
                          className="dashboard-button-secondary rounded-lg"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {t("signReview.open")}
                        </Button>
                      ) : null}
                      {run.status === "SIGNED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isExporting}
                          onClick={event => { exportOpener.current = event.currentTarget; setSignedForExport(null); setHistoricalExport(null); setExportRunId(run.id) }}
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
              <RunDetailProofSummary
                detail={runDetail}
                organizationId={organizationId}
                selectedRunId={selectedRunId}
                isLoading={isRunDetailLoading}
                error={runDetailError}
                proofTrail={proofTrail}
                proofOpen={proofOpen}
                proofError={proofError}
                activeProofSubjectId={activeProofSubjectId}
                proofLoadingSubjectId={proofLoadingSubjectId}
                onProofOpenChange={onProofOpenChange}
                onOpenProofSubject={onOpenProofSubject}
                number={number}
                t={t}
              />
            </div>
          </div>

          <div className={cn(rowSurfaceClass, "space-y-2 text-sm")}>
            <SummaryLine label={t("certification.controls.evidence")} value={dashboard.source.providerEvidenceAvailable || dashboard.source.statementEvidenceAvailable ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.freshAuth")} value={dashboard.controls.signoffRequiresFreshAuth ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.makerChecker")} value={dashboard.controls.manualMatchMakerChecker ? t("common.yes") : t("common.no")} />
            <SummaryLine label={t("certification.controls.gatewayOnly")} value={dashboard.controls.suspensePostingGatewayOnly ? t("common.yes") : t("common.no")} />
          </div>
        </div>

        <ReconciliationPreparationWorkbench
          key={`preparation:${dashboard.scope.organizationId}:${dashboard.scope.actorId}`}
          scope={dashboard.scope}
          canRead={exportScopeReady && authority.hasPermission("payments.reconciliation.read")}
          canReadPreparation={exportScopeReady && authority.hasPermission("payments.reconciliation.read") && authority.hasPermission("accounting.journal.read")}
          canPrepare={exportScopeReady && authority.hasPermission("payments.reconciliation.read") && authority.hasPermission("accounting.journal.read") && authority.hasPermission("payments.reconciliation.run")}
          onSign={openSign}
          canSign={exportScopeReady && authority.hasPermission("payments.reconciliation.sign")}
        />
        {signRunId && exportScopeReady && <ReconciliationSignReview key={`${dashboard.scope.organizationId}:${dashboard.scope.actorId}:${signRunId}`} scope={dashboard.scope} runId={signRunId}
          canSign={authority.hasPermission("payments.reconciliation.sign") && authority.hasPermission("payments.reconciliation.read")}
          onClose={() => openSign(null)} onExport={run => { exportOpener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; setHistoricalExport(null); setExportRunId(null); setSignedForExport({ ...run, ...dashboard.scope }) }} />}
        <ReconciliationCertificateHistory
          key={`history:${dashboard.scope.organizationId}:${dashboard.scope.actorId}`}
          scope={dashboard.scope}
          canRead={exportScopeReady && authority.hasPermission("payments.reconciliation.read")}
          canExport={exportScopeReady && authority.hasPermission("payments.reconciliation.certificate.export")}
          onReview={(run, request) => { exportOpener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; setSignedForExport(null); setHistoricalExport({ ...dashboard.scope, run, request: request ? { ...request } : undefined }); setExportRunId(null) }}
        />
        <ReconciliationCertificateExportPanel
          key={`${dashboard.scope.organizationId}:${dashboard.scope.actorId}`}
          scope={dashboard.scope}
          run={(signedForExport?.organizationId === dashboard.scope.organizationId && signedForExport?.actorId === dashboard.scope.actorId ? signedForExport : null) ?? selectedHistory?.run ?? dashboard.recentRuns.find(run => run.id === exportRunId) ?? null}
          recoveryRequest={selectedHistory?.request}
          canRead={exportScopeReady && authority.hasPermission("payments.reconciliation.read")}
          canExport={exportScopeReady && authority.hasPermission("payments.reconciliation.certificate.export")}
          onExport={onExport}
          onClose={() => { setSignedForExport(null); setHistoricalExport(null); setExportRunId(null); requestAnimationFrame(() => exportOpener.current?.focus()) }}
        />

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <DurableSuspensePostingQueue
            authority={authority}
            scope={dashboard.scope}
            items={dashboard.suspenseQueue}
            money={money}
            formatDateTime={formatDateTime}
            t={t}
          />
          <DurableNotificationInbox
            notifications={dashboard.notificationQueue}
            scan={dashboard.alertScan}
            formatDateTime={formatDateTime}
            t={t}
          />
          {dashboard.alertScan && exportScopeReady && authority.hasPermission("payments.reconciliation.read") && authority.hasPermission("payments.reconciliation.run") && <AlertScanRecovery
            key={`${dashboard.scope.organizationId}:${dashboard.scope.actorId}:${dashboard.alertScan.scanId}`}
            scanId={dashboard.alertScan.scanId} locale={locale} />}
        </div>
      </CardContent>
    </Card>
  )
}

function RunDetailProofSummary({
  detail,
  organizationId,
  selectedRunId,
  isLoading,
  error,
  proofTrail,
  proofOpen,
  proofError,
  activeProofSubjectId,
  proofLoadingSubjectId,
  onProofOpenChange,
  onOpenProofSubject,
  number,
  t,
}: {
  detail: ReconciliationRunDetail | undefined
  organizationId: string
  selectedRunId: string | null
  isLoading: boolean
  error: string | null
  proofTrail: ProofTrailResult | null
  proofOpen: boolean
  proofError: string | null
  activeProofSubjectId: string | null
  proofLoadingSubjectId: string | null
  onProofOpenChange: (open: boolean) => void
  onOpenProofSubject: (subject: AvailableProofSubject, activeKey?: string) => void
  number: (value: number | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  if (!selectedRunId) return null

  if (isLoading && !detail) {
    return <Skeleton className="h-36 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
  }

  if (error) {
    return (
      <div className={cn(warningPanelClass, "p-3 text-sm")}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{t("certification.detail.error")}</span>
        </div>
      </div>
    )
  }

  if (!detail) {
    return <EmptyState icon={Database} label={t("certification.detail.unavailable")} />
  }

  const unresolvedExceptionCount = detail.exceptions.filter((item) => item.unresolved).length
  const unresolvedSuspenseCount = detail.suspenseItems.filter((item) => item.unresolved).length
  const proofSubjectCount = [...detail.matchRecords, ...detail.exceptions, ...detail.suspenseItems].reduce(
    (sum, item) => sum + item.evidenceSubjects.length,
    0,
  )
  const blockers = detail.certification.blockers.slice(0, 3)
  const proofProps = {
    proofTrail,
    proofOpen,
    proofError,
    activeProofSubjectId,
    proofLoadingSubjectId,
    onProofOpenChange,
    onOpenProofSubject,
    loadingLabel: t("proof.loading"),
  }
  const matchRows = detail.matchRecords.slice(0, 2)
  const exceptionRows = detail.exceptions.filter((item) => item.unresolved).slice(0, 2)
  const suspenseRows = detail.suspenseItems.filter((item) => item.unresolved).slice(0, 2)

  return (
    <div className={cn(rowSurfaceClass, "space-y-3")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
            {t("certification.detail.title")}
          </div>
          <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>
            {t("certification.detail.description", {
              matches: number(detail.matchRecords.length),
              exceptions: number(unresolvedExceptionCount),
              suspense: number(unresolvedSuspenseCount),
              subjects: number(proofSubjectCount),
            })}
          </p>
        </div>
        <Badge variant="outline" className={detail.certification.signoffEligible ? "rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]" : filterChipClass}>
          {detail.certification.signoffEligible ? t("certification.detail.eligible") : t("certification.detail.blocked")}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <SummaryLine label={t("certification.detail.matches")} value={number(detail.matchRecords.length)} />
        <SummaryLine label={t("certification.detail.exceptions")} value={number(unresolvedExceptionCount)} />
        <SummaryLine label={t("certification.detail.suspense")} value={number(unresolvedSuspenseCount)} />
        <SummaryLine label={t("certification.detail.proofSubjects")} value={number(proofSubjectCount)} />
      </div>

      <div className="space-y-1">
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          {t("certification.detail.blockers")}
        </div>
        {blockers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {blockers.map((blocker) => (
              <Badge key={blocker.code} variant="outline" className={blocker.severity === "CRITICAL" ? "rounded-lg border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]" : filterChipClass}>
                {blocker.code} / {number(blocker.count)}
              </Badge>
            ))}
          </div>
        ) : (
          <Badge variant="outline" className="rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]">
            {t("certification.detail.noBlockers")}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <RunDetailMiniList
          title={t("certification.detail.matchedEvidence")}
          empty={t("certification.detail.emptyRows")}
          rows={matchRows.map((record) => ({
            id: record.id,
            label: record.rule,
            badge: record.status,
            detail: t("certification.detail.subjectCount", { count: number(record.evidenceSubjects.length) }),
            proofSubject: runDetailProofSubject({
              organizationId,
              evidenceSubjects: record.evidenceSubjects,
              label: t("proof.open"),
              unavailableReason: t("proof.unavailable"),
            }),
          }))}
          {...proofProps}
        />
        <RunDetailMiniList
          title={t("certification.detail.unresolvedExceptions")}
          empty={t("certification.detail.emptyRows")}
          rows={exceptionRows.map((exception) => ({
            id: exception.id,
            label: exception.type,
            badge: exception.severity,
            detail: t("certification.detail.subjectCount", { count: number(exception.evidenceSubjects.length) }),
            proofSubject: runDetailProofSubject({
              organizationId,
              evidenceSubjects: exception.evidenceSubjects,
              label: t("proof.open"),
              unavailableReason: t("proof.unavailable"),
            }),
          }))}
          {...proofProps}
        />
        <RunDetailMiniList
          title={t("certification.detail.suspenseLinks")}
          empty={t("certification.detail.emptyRows")}
          rows={suspenseRows.map((item) => ({
            id: item.id,
            label: item.type,
            badge: item.status,
            detail: t("certification.detail.subjectCount", { count: number(item.evidenceSubjects.length) }),
            proofSubject: runDetailProofSubject({
              organizationId,
              evidenceSubjects: item.evidenceSubjects,
              label: t("proof.open"),
              unavailableReason: t("proof.unavailable"),
            }),
          }))}
          {...proofProps}
        />
      </div>
    </div>
  )
}

function RunDetailMiniList({
  title,
  empty,
  rows,
  proofTrail,
  proofOpen,
  proofError,
  activeProofSubjectId,
  proofLoadingSubjectId,
  onProofOpenChange,
  onOpenProofSubject,
  loadingLabel,
}: {
  title: string
  empty: string
  rows: Array<{ id: string; label: string; badge: string; detail: string; proofSubject: BIProofDrawerSubject }>
  proofTrail: ProofTrailResult | null
  proofOpen: boolean
  proofError: string | null
  activeProofSubjectId: string | null
  proofLoadingSubjectId: string | null
  onProofOpenChange: (open: boolean) => void
  onOpenProofSubject: (subject: AvailableProofSubject, activeKey?: string) => void
  loadingLabel: string
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] p-2">
      <div className={cn("mb-2 text-xs font-semibold uppercase tracking-normal", faintTextClass)}>{title}</div>
      {rows.length === 0 ? (
        <div className={cn("text-xs", mutedTextClass)}>{empty}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const proofKey = row.proofSubject.available ? `${row.id}:${proofSubjectKey(row.proofSubject)}` : null
            const isActiveProof = proofKey !== null && activeProofSubjectId === proofKey

            return (
              <div key={row.id} className="min-w-0 space-y-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{row.label}</span>
                  <Badge variant="outline" className={filterChipClass}>{row.badge}</Badge>
                </div>
                <div className={cn("text-xs", mutedTextClass)}>{row.detail}</div>
                <BIProofDrawerHost
                  subject={row.proofSubject}
                  proofTrail={isActiveProof ? proofTrail : null}
                  open={isActiveProof && proofOpen}
                  onOpenChange={onProofOpenChange}
                  onOpenSubject={(subject) => onOpenProofSubject(subject, proofKey ?? proofSubjectKey(subject))}
                  loadingLabel={loadingLabel}
                  isLoading={proofKey !== null && proofLoadingSubjectId === proofKey}
                  error={isActiveProof ? proofError : null}
                  className="h-8 w-full justify-center"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function StatementImportLane({
  accounts,
  files,
  formatDateTime,
  t,
}: {
  accounts: PaymentReconciliationDashboardData["providerAccounts"]
  files: PaymentReconciliationDashboardData["statementFiles"]
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  const notifications = useNotifications()
  const importStatement = useImportProviderStatement()
  const activeAccounts = accounts.filter((account) => account.status === "ACTIVE")
  const [providerAccountId, setProviderAccountId] = useState("")
  const [fileName, setFileName] = useState("")
  const [rawContent, setRawContent] = useState("")
  const selectedProviderAccountId = providerAccountId || activeAccounts[0]?.id || ""
  const selectedAccount = activeAccounts.find((account) => account.id === selectedProviderAccountId)

  async function loadFile(file: File | undefined) {
    if (!file) return
    try {
      setFileName(file.name)
      setRawContent(await file.text())
    } catch {
      notifications.error(t("statementImport.notifications.readFailedTitle"), t("statementImport.notifications.readFailedMessage"), {
        category: "reconciliation",
      })
    }
  }

  async function submitImport() {
    if (!selectedAccount || !rawContent.trim()) return
    try {
      const result = await importStatement.mutateAsync({
        providerAccountId: selectedAccount.id,
        providerCode: selectedAccount.providerCode,
        rawContent,
        fileName: fileName.trim() || undefined,
      })
      notifications.success(
        t("statementImport.notifications.completedTitle"),
        t("statementImport.notifications.completedMessage", {
          status: t(`statementImport.statuses.${result.status}`),
          count: result.importedLineCount,
        }),
        { category: "reconciliation" },
      )
      setFileName("")
      setRawContent("")
    } catch (error) {
      notifications.error(
        t("statementImport.notifications.failedTitle"),
        error instanceof Error ? error.message : t("statementImport.notifications.failedMessage"),
        { category: "reconciliation" },
      )
    }
  }

  return (
    <div className={cn(rowSurfaceClass, "space-y-3")}>
      <div>
        <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          <FileUp className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {t("statementImport.title")}
        </div>
        <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>{t("statementImport.description")}</p>
      </div>

      {activeAccounts.length === 0 ? (
        <EmptyState icon={Database} label={t("statementImport.noActiveAccount")} />
      ) : (
        <div className="space-y-2">
          <Select value={selectedProviderAccountId} onValueChange={setProviderAccountId}>
            <SelectTrigger aria-label={t("statementImport.accountLabel")} className="dashboard-control h-10 rounded-lg">
              <SelectValue placeholder={t("statementImport.accountPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              {activeAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>{account.displayName} / {account.currencyCode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            aria-label={t("statementImport.fileLabel")}
            onChange={(event) => { void loadFile(event.target.files?.[0]) }}
            className="dashboard-control h-10 rounded-lg file:text-[var(--dash-text)]"
          />
          <Input
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder={t("statementImport.fileNamePlaceholder")}
            aria-label={t("statementImport.fileNameLabel")}
            className="dashboard-control h-10 rounded-lg"
          />
          <Textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            placeholder={t("statementImport.contentPlaceholder")}
            aria-label={t("statementImport.contentLabel")}
            className="dashboard-control min-h-28 rounded-lg font-mono text-xs"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("text-xs", mutedTextClass)}>{t("statementImport.formatHint")}</span>
            <Button
              type="button"
              disabled={importStatement.isPending || !selectedAccount || !rawContent.trim()}
              onClick={() => { void submitImport() }}
              className="dashboard-button-primary rounded-lg"
            >
              <FileUp className="h-4 w-4" />
              {t("statementImport.action")}
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--dash-border-subtle)] pt-3">
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>{t("statementImport.historyTitle")}</div>
        {files.length === 0 ? (
          <p className={cn("mt-2 text-xs", mutedTextClass)}>{t("statementImport.emptyHistory")}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {files.slice(0, 4).map((file) => (
              <div key={file.id} className="flex flex-col gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{file.fileName ?? t("statementImport.unnamedFile")}</div>
                  <div className={cn("mt-1 text-xs", mutedTextClass)}>{file.providerAccountName} / {formatDateTime(file.importedAt)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={filterChipClass}>{["IMPORTED", "PROCESSING", "PROCESSED", "REJECTED", "ARCHIVED"].includes(file.status) ? t(`statementImport.statuses.${file.status}`) : file.status}</Badge>
                  <Badge variant="outline" className={filterChipClass}>{t("statementImport.lineCount", { count: file.lineCount })}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ManualMatchLane({
  authority,
  candidates,
  proposals,
  preparation,
  amounts,
  onAmountChange,
  workflow,
  formatDateTime,
  t,
  onOpenPaymentProof,
}: {
  authority: ReturnType<typeof usePermissions>
  candidates: PaymentReconciliationDashboardData["manualMatchCandidates"]
  proposals: PaymentReconciliationDashboardData["manualMatchProposals"]
  preparation: PaymentReconciliationDashboardData["manualMatchPreparation"]
  amounts: Record<string, string>
  onAmountChange: (id: string, value: string) => void
  workflow: ReturnType<typeof useManualMatchWorkflow>
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  onOpenPaymentProof?: (paymentTransactionId: string) => void
}) {
  const locale = useLocale()
  const manualAmountFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale])
  const decimalSeparator = useMemo(() => new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === "decimal")?.value ?? ".", [locale])
  const manualMoney = (value: string | null, currencyCode: string | null) => {
    const parts = typeof value === "string" ? /^(-?)(\d+)\.(\d{2})$/.exec(value) : null
    if (!parts || !currencyCode) return t("common.notAvailable")
    const integer = BigInt(parts[2]), signed = parts[1] ? integer === BigInt(0) ? -0 : -integer : integer
    return `${manualAmountFormatter.format(signed)}${decimalSeparator}${parts[3]} ${currencyCode}`
  }
  const minorUnits = (value: string | null) => {
    const parts = typeof value === "string" ? /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value) : null
    return parts ? BigInt(parts[1]) * BigInt(100) + BigInt((parts[2] ?? "").padEnd(2, "0")) : null
  }
  const { hasPermission, user, permissionState, refreshPermissions } = authority
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const [authProposalId, setAuthProposalId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const writeAllowed = preparation?.writeAllowed === true
  const hasProposalPermission = hasPermission("payments.reconciliation.match")
  const hasApprovalPermission = hasPermission("payments.reconciliation.override")
  const canPropose = permissionState === "ready" && hasProposalPermission && writeAllowed

  const candidateAmount = (candidate: PaymentReconciliationDashboardData["manualMatchCandidates"][number]) =>
    amounts[candidate.exceptionId] ?? (candidate.availableAmount?.replace(".", decimalSeparator) ?? "")

  async function propose(candidate: PaymentReconciliationDashboardData["manualMatchCandidates"][number]) {
    setFeedback(null)
    try {
      const result = await workflow.propose.mutateAsync({
        providerAccountId: candidate.providerAccountId,
        paymentTransactionId: candidate.paymentTransactionId,
        providerEventId: candidate.providerEventId ?? undefined,
        statementLineId: candidate.providerEventId ? undefined : candidate.statementLineId ?? undefined,
        amountMatched: candidateAmount(candidate).replace(",", "."),
        currencyCode: candidate.currencyCode,
      })
      const text = t(result.alreadyApplied ? "manualMatch.notifications.alreadyRecorded" : "manualMatch.notifications.proposedMessage")
      setFeedback({ error: false, text })
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : t("manualMatch.recovery.unknown") })
    }
  }

  async function approve(proposal: PaymentReconciliationDashboardData["manualMatchProposals"][number]) {
    if (!proposal.evidenceRevision) return
    setFeedback(null)
    try {
      const result = await workflow.approve.mutateAsync({ proposedMatchId: proposal.id, expectedEvidenceRevision: proposal.evidenceRevision })
      setAuthProposalId(null)
      const text = t(result.alreadyApplied ? "manualMatch.notifications.alreadyRecorded" : "manualMatch.notifications.approvedMessage")
      setFeedback({ error: false, text })
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "FRESH_AUTH_REQUIRED") setAuthProposalId(proposal.id)
      setFeedback({ error: true, text: error instanceof Error ? error.message : t("manualMatch.recovery.unknown") })
    }
  }

  async function verifyAndApprove(form: HTMLFormElement, proposal: PaymentReconciliationDashboardData["manualMatchProposals"][number]) {
    const password = String(new FormData(form).get("password") ?? "")
    form.reset()
    setVerifying(true)
    try {
      const result = await stepUpWithPasswordAction({ password })
      if (!result.success) { setFeedback({ error: true, text: t("manualMatch.recovery.verifyFailed") }); return }
      await approve(proposal)
    } catch { setFeedback({ error: true, text: t("manualMatch.recovery.verifyFailed") }) }
    finally { setVerifying(false) }
  }

  async function renew(proposal: PaymentReconciliationDashboardData["manualMatchProposals"][number]) {
    if (!proposal.providerAccountId || !proposal.paymentTransactionId || !proposal.amountMatched) return
    setFeedback(null)
    try {
      await workflow.propose.mutateAsync({ providerAccountId: proposal.providerAccountId, paymentTransactionId: proposal.paymentTransactionId,
        providerEventId: proposal.providerEventId ?? undefined, statementLineId: proposal.statementLineId ?? undefined,
        amountMatched: String(proposal.amountMatched), currencyCode: proposal.currencyCode, supersedesProposalId: proposal.id })
      setFeedback({ error: false, text: t("manualMatch.notifications.renewed") })
    } catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : t("manualMatch.recovery.unknown") }) }
  }

  return (
    <div className={cn(rowSurfaceClass, "space-y-3")} data-testid="manual-match-lane">
      <div>
        <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          <UserCheck className="h-4 w-4 text-[var(--dash-warning)]" />
          {t("manualMatch.title")}
        </div>
        <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>{t("manualMatch.description")}</p>
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={cn("text-sm", feedback.error ? "text-[var(--dash-warning)]" : mutedTextClass)}>{feedback.text}</p>}
      {permissionState === "loading" && <p role="status" className={cn("text-xs", mutedTextClass)}>{t("manualMatch.recovery.accessLoading")}</p>}
      {(permissionState === "error" || permissionState === "signed_out") && <div role="alert" className="space-y-2 text-sm text-[var(--dash-warning)]"><p>{t(permissionState === "signed_out" ? "manualMatch.recovery.sessionUnavailable" : "manualMatch.recovery.accessFailed")}</p>{permissionState === "error" ? <Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal" onClick={() => { void refreshPermissions() }}>{t("manualMatch.recovery.retryAccess")}</Button> : <Button asChild variant="outline" className="dashboard-button-secondary h-auto whitespace-normal"><a href={locale === "fr" ? "/fr/login-v2" : "/en/login-v2"} target="_blank" rel="noopener noreferrer">{t("manualMatch.recovery.signIn")}</a></Button>}</div>}
      {permissionState === "ready" && !hasProposalPermission && <p className={cn("text-xs", mutedTextClass)}>{t("manualMatch.recovery.proposeDenied")}</p>}
      {!writeAllowed && <p className={cn("text-xs", mutedTextClass)}>{t("manualMatch.moduleUnavailable")}</p>}
      {preparation?.checkedAt && <p className={cn("text-xs", mutedTextClass)}>{t("manualMatch.checkedAt", { time: formatDateTime(preparation.checkedAt) })}</p>}
      {preparation?.hasMore && <p className={cn("text-xs", mutedTextClass)}>{t("manualMatch.moreCandidates", { limit: preparation.limit })}</p>}

      {candidates.length === 0 ? (
        <EmptyState icon={CheckCircle2} label={t("manualMatch.emptyCandidates")} />
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => {
            const amount = candidateAmount(candidate)
            const entered = minorUnits(amount), available = minorUnits(candidate.availableAmount)
            const invalidAmount = entered === null || available === null || entered <= BigInt(0) || entered > available
            const ready = candidate.eligibility === "READY"
            const amountHelpId = `manual-amount-${candidate.exceptionId}`
            return (
              <div key={candidate.exceptionId} data-manual-candidate={candidate.exceptionId} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{candidate.providerAccountName || t("common.notAvailable")}</span>
                      <Badge variant="outline" className={cn("shrink-0", severityClass(candidate.severity))}>{t(`manualMatch.severity.${candidate.severity}`)}</Badge>
                      <Badge variant="outline" className={filterChipClass}>{t(`manualMatch.exceptionTypes.${candidate.exceptionType}`)}</Badge>
                    </div>
                    <div className={cn("mt-2 grid gap-1 text-xs sm:grid-cols-2", mutedTextClass)}>
                      <span>{t("manualMatch.internalEvidence", { reference: candidate.internalReference ?? t("common.notAvailable"), amount: manualMoney(candidate.internalAmount, candidate.currencyCode) })}</span>
                      <span>{t("manualMatch.externalEvidence", { reference: candidate.externalReference ?? t("common.notAvailable"), amount: manualMoney(candidate.externalAmount, candidate.externalCurrencyCode) })}</span>
                      <span>{t("manualMatch.internalRemaining", { amount: manualMoney(candidate.internalRemaining, candidate.currencyCode) })}</span>
                      <span>{t("manualMatch.externalRemaining", { amount: manualMoney(candidate.externalRemaining, candidate.externalCurrencyCode) })}</span>
                    </div>
                    <p id={amountHelpId} className={cn("mt-2 text-xs", !ready || invalidAmount ? "text-[var(--dash-warning)]" : mutedTextClass)}>
                      {!ready ? t(`manualMatch.eligibility.${candidate.eligibility}`) : invalidAmount ? t("manualMatch.amountLimit", { amount: manualMoney(candidate.availableAmount, candidate.currencyCode) }) : t("manualMatch.availableAmount", { amount: manualMoney(candidate.availableAmount, candidate.currencyCode) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Input
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => onAmountChange(candidate.exceptionId, event.target.value)}
                      aria-label={t("manualMatch.amountLabel")}
                      aria-describedby={amountHelpId}
                      aria-invalid={ready && invalidAmount}
                      disabled={!canPropose || !ready}
                      className="dashboard-control h-9 w-28 rounded-lg text-right tabular-nums"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canPropose || !ready || workflow.propose.isPending || invalidAmount}
                      onClick={() => { void propose(candidate) }}
                      className="dashboard-button-primary rounded-lg"
                    >
                      <Send className="h-4 w-4" />
                      {t("manualMatch.actions.propose")}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-[var(--dash-border-subtle)] pt-3">
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>{t("manualMatch.approvalTitle")}</div>
        {proposals.length === 0 ? (
          <p className={cn("mt-2 text-xs", mutedTextClass)}>{t("manualMatch.emptyApprovals")}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {proposals.map((proposal) => {
              const proposedAmount = minorUnits(proposal.amountMatched)
              const unavailable = permissionState !== "ready" ? t(permissionState === "loading" ? "manualMatch.recovery.accessLoading" : "manualMatch.recovery.accessFailed")
                : !hasApprovalPermission ? t("manualMatch.recovery.approveDenied")
                : !writeAllowed ? t("manualMatch.moduleUnavailable")
                : !user?.id || user.id === proposal.matchedById ? t("manualMatch.recovery.independent")
                  : !proposal.evidenceRevision || !proposal.evidenceSummary || proposedAmount === null || proposedAmount <= BigInt(0) ? t("manualMatch.recovery.legacy") : null
              return (
              <div key={proposal.id} data-manual-proposal={proposal.id} className="flex flex-col gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{proposal.providerAccountName ?? t("common.notAvailable")}</div>
                  <div className={cn("mt-1 text-xs", mutedTextClass)}>
                    {t("manualMatch.proposalFacts", { id: compactId(proposal.id) ?? t("common.notAvailable"), amount: manualMoney(proposal.amountMatched, proposal.currencyCode), time: formatDateTime(proposal.createdAt) })}
                  </div>
                  {proposal.evidenceSummary && <p className={cn("mt-1 text-xs", mutedTextClass)}>{t("manualMatch.reviewEvidence", {
                    internal: proposal.evidenceSummary.internalAmount, external: proposal.evidenceSummary.externalAmount,
                    currency: proposal.currencyCode, direction: t(`manualMatch.directions.${proposal.evidenceSummary.direction}`),
                    source: t(`manualMatch.sources.${proposal.evidenceSummary.externalSource}`),
                  })}</p>}
                  {unavailable && <p className={cn("mt-1 text-xs", mutedTextClass)}>{unavailable}</p>}
                  {proposal.paymentTransactionId && onOpenPaymentProof && <Button type="button" variant="ghost" size="sm" className="dashboard-button-secondary mt-2" onClick={() => onOpenPaymentProof(proposal.paymentTransactionId!)}>{t("proof.open")}</Button>}
                  {canPropose && user?.id === proposal.matchedById && proposal.providerAccountId && proposal.paymentTransactionId && <div className="mt-2 space-y-1">
                    <p className={cn("text-xs", mutedTextClass)}>{t("manualMatch.renewHint")}</p>
                    <Button type="button" variant="outline" size="sm" disabled={workflow.propose.isPending || proposedAmount === null || proposedAmount <= BigInt(0)} onClick={() => { void renew(proposal) }} className="dashboard-button-secondary">{t("manualMatch.actions.renew")}</Button>
                  </div>}
                </div>
                {authProposalId === proposal.id && !unavailable ? (
                  <form className="flex flex-col gap-2 sm:max-w-xs" onSubmit={event => { event.preventDefault(); void verifyAndApprove(event.currentTarget, proposal) }}>
                    <label className="text-xs">{t("manualMatch.passwordLabel")}
                      <Input name="password" type="password" autoComplete="current-password" required autoFocus className="dashboard-control mt-1" />
                    </label>
                    <Button type="submit" disabled={verifying || workflow.approve.isPending} className="dashboard-button-primary">{t("manualMatch.actions.verifyAndApprove")}</Button>
                  </form>
                ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(unavailable) || workflow.approve.isPending || verifying}
                  onClick={() => { void approve(proposal) }}
                  className="dashboard-button-secondary shrink-0 rounded-lg"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {t("manualMatch.actions.approve")}
                </Button>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}

function DurableSuspensePostingQueue(props: {
  authority: ReturnType<typeof usePermissions>
  scope: PaymentReconciliationDashboardData["scope"]
  items: PaymentReconciliationDashboardData["suspenseQueue"]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  return <PaymentSuspenseQueue {...props} typeOptions={suspenseTypeOptions} />
}

function DurableNotificationInbox({
  notifications,
  scan,
  formatDateTime,
  t,
}: {
  notifications: PaymentReconciliationDashboardData["notificationQueue"]
  scan: PaymentReconciliationDashboardData["alertScan"]
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
}) {
  const locale = useLocale()
  return (
    <section aria-label={t("inbox.title")} className={cn(rowSurfaceClass, "space-y-3")}>
      <div>
        <div className={cn("text-xs font-semibold uppercase tracking-normal", faintTextClass)}>
          {t("inbox.title")}
        </div>
        <p className={cn("mt-1 text-xs leading-5", mutedTextClass)}>{t("inbox.description")}</p>
      </div>
      <div role="status" className={cn("rounded-lg border border-[var(--dash-border-subtle)] p-3 text-xs", scan?.state === "FAILED" ? "text-[var(--dash-warning)]" : mutedTextClass)}>
        <p>{t(`inbox.scan.states.${scan?.state ?? "NONE"}`)}</p>
        <p className="mt-1">{t("inbox.scan.description")}</p>
        {scan && <p className="mt-1">{t("inbox.scan.detail", { started: formatDateTime(scan.startedAt), updated: formatDateTime(scan.updatedAt), examined: scan.examined, created: scan.created })}</p>}
      </div>
      {notifications.length === 0 ? (
        <EmptyState icon={CheckCircle2} label={t("inbox.empty")} />
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.32)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("shrink-0", ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(item.severity ?? "") ? severityClass(item.severity!) : filterChipClass)}>
                  {t(`inbox.severities.${["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(item.severity ?? "") ? item.severity : "INFO"}`)}
                </Badge>
                <Badge variant="outline" className={filterChipClass}>
                  {t("inbox.recorded")}
                </Badge>
              </div>
              <div className="mt-2 text-sm font-medium">{t(`inbox.types.${notificationTypeKey(item.type)}`)}</div>
              <div className={cn("mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", mutedTextClass)}>
                <span>{formatDateTime(item.createdAt)}</span>
                {item.dueAt ? <span>{t("inbox.due", { time: formatDateTime(item.dueAt) })}</span> : null}
                {item.amount !== null ? <span>{/^-?\d+\.\d{2}$/.test(item.amount) && item.currency ? `${formatReconciliationAmount(item.amount, locale)} ${item.currency}` : t("inbox.amountUnavailable")}</span> : null}
              </div>
              {item.processing && <ReconciliationAlertProcessing processing={item.processing} locale={locale} formatDateTime={formatDateTime} />}
            </div>
          ))}
        </div>
      )}
    </section>
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
  const locale = useLocale() === "fr" ? "fr" : "en"
  return (
    <RenderedDataTable
      className="p-0"
      tableClassName="min-w-[920px]"
      locale={locale}
      caption={t("sections.runs")}
      columns={[
        { label: t("table.rail") },
        { label: t("table.status") },
        { label: t("table.payments"), className: "text-right" },
        { label: t("table.matched"), className: "text-right" },
        { label: t("table.failures"), className: "text-right" },
        { label: t("table.suspense"), className: "text-right" },
        { label: t("table.lastSeen") },
      ]}
      rows={runs.map((run) => {
        return {
          id: run.rail,
          searchText: [
            t("rails." + run.rail),
            t("statuses." + run.status),
            run.settlementReference,
            number(run.paymentCount),
            money(run.totalAmount),
            number(run.matchedCount),
            money(run.matchedGrossAmount),
            number(run.failureCount),
            money(run.suspenseAmount),
            formatDateTime(run.lastPaymentAt),
          ].join(" "),
          cells: [
            <div key="0">
              <div className="font-medium">{t(`rails.${run.rail}`)}</div>
              <div className={cn("mt-1 max-w-[260px] truncate text-xs", mutedTextClass)}>{run.settlementReference}</div>
            </div>,
            <div key="1">
              <Badge variant="outline" className={cn("shrink-0", statusClass(run.status))}>
                {run.status === "clean" ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : run.status === "critical" ? (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                ) : null}
                {t(`statuses.${run.status}`)}
              </Badge>
            </div>,
            <div key="2" className="text-right tabular-nums">
              <div className="font-semibold">{number(run.paymentCount)}</div>
              <div className={cn("text-xs", mutedTextClass)}>{money(run.totalAmount)}</div>
            </div>,
            <div key="3" className="text-right tabular-nums">
              <div className="font-semibold">{number(run.matchedCount)}</div>
              <div className={cn("text-xs", mutedTextClass)}>{money(run.matchedGrossAmount)}</div>
            </div>,
            <div key="4" className="text-right tabular-nums">
              <div className={cn("font-semibold", run.criticalFailureCount > 0 && "text-[var(--dash-danger)]")}>
                {number(run.failureCount)}
              </div>
              <div className={cn("text-xs", mutedTextClass)}>{t("table.criticalCount", { count: run.criticalFailureCount })}</div>
            </div>,
            <div key="5" className="text-right tabular-nums">
              <div className="font-semibold">{money(run.suspenseAmount)}</div>
              <div className={cn("text-xs", mutedTextClass)}>{number(run.suspenseCount)}</div>
            </div>,
            <div key="6" className={cn("text-xs", mutedTextClass)}>
              {formatDateTime(run.lastPaymentAt)}
            </div>,
          ],
        }
      })}
    />
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
  organizationId,
  failures,
  money,
  formatDateTime,
  t,
  proofTrail,
  proofOpen,
  proofError,
  activeProofSubjectId,
  proofLoadingSubjectId,
  onProofOpenChange,
  onOpenProofSubject,
}: {
  organizationId: string
  failures: PaymentSuspenseReadyFailure[]
  money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>
  proofTrail: ProofTrailResult | null
  proofOpen: boolean
  proofError: string | null
  activeProofSubjectId: string | null
  proofLoadingSubjectId: string | null
  onProofOpenChange: (open: boolean) => void
  onOpenProofSubject: (subject: AvailableProofSubject, activeKey?: string) => void
}) {
  const locale = useLocale() === "fr" ? "fr" : "en"

  return (
    <RenderedDataTable
      className="p-0"
      tableClassName="min-w-[1120px]"
      locale={locale}
      caption={t("sections.suspense")}
      emptyMessage={t("empty.suspense")}
      columns={[
        { label: t("table.failure") },
        { label: t("table.rail") },
        { label: t("table.reference") },
        { label: t("table.counterparty") },
        { label: t("table.amount"), className: "text-right" },
        { label: t("table.suspenseType") },
        { label: t("table.time") },
        { label: t("table.proof") },
      ]}
      rows={failures.map((failure) => {
        const proofSubject = paymentTransactionProofSubject({
          organizationId,
          paymentTransactionId: failure.paymentTransactionId,
          label: t("proof.open"),
          unavailableReason: t("proof.unavailable"),
        })
        const proofKey = proofSubject.available ? proofSubjectKey(proofSubject) : null
        const isActiveProof = proofKey !== null && activeProofSubjectId === proofKey
        return {
          id: failure.id,
          searchText: [
            t("failureTypes." + failure.type),
            t("severity." + failure.severity),
            failure.message,
            t("rails." + failure.rail),
            failure.providerReference,
            failure.paymentNumber ?? failure.paymentId,
            failure.counterparty,
            money(failure.amount),
            failure.suspenseAccountHint,
            t("suspenseTypes." + failure.suspenseType),
            formatDateTime(failure.occurredAt),
          ].join(" "),
          cells: [
            <div key="0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("shrink-0", severityClass(failure.severity))}>
                  {t(`severity.${failure.severity}`)}
                </Badge>
                <span className="font-medium">{t(`failureTypes.${failure.type}`)}</span>
              </div>
              <div className={cn("mt-1 line-clamp-2 text-xs", mutedTextClass)}>{failure.message}</div>
            </div>,
            <div key="1">
              {t(`rails.${failure.rail}`)}
            </div>,
            <div key="2">
              <div className="font-mono text-xs">{failure.providerReference ?? t("common.notAvailable")}</div>
              <div className={cn("mt-1 text-xs", mutedTextClass)}>
                {failure.paymentNumber ?? failure.paymentId ?? t("common.notAvailable")}
              </div>
            </div>,
            <div key="3">
              {failure.counterparty}
            </div>,
            <div key="4" className="text-right font-semibold tabular-nums">
              {money(failure.amount)}
            </div>,
            <div key="5">
              <Badge
                variant="outline"
                className="rounded-lg border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
              >
                {failure.suspenseAccountHint} / {t(`suspenseTypes.${failure.suspenseType}`)}
              </Badge>
            </div>,
            <div key="6" className={cn("text-xs", mutedTextClass)}>
              {formatDateTime(failure.occurredAt)}
            </div>,
            <div key="7">
              <BIProofDrawerHost
                subject={proofSubject}
                proofTrail={isActiveProof ? proofTrail : null}
                open={isActiveProof && proofOpen}
                onOpenChange={onProofOpenChange}
                onOpenSubject={onOpenProofSubject}
                loadingLabel={t("proof.loading")}
                isLoading={proofKey !== null && proofLoadingSubjectId === proofKey}
                error={isActiveProof ? proofError : null}
                className="h-9"
              />
            </div>,
          ],
        }
      })}
    />
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
