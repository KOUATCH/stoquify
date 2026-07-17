import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileSearch, GitBranch, ShieldCheck } from "lucide-react"

import type { CloseAssuranceDashboardData } from "@/actions/accounting/close-assurance.actions"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"

type CloseReadinessJourneyPanelProps = {
  data: CloseAssuranceDashboardData | null
  locale: Locale
}

type JourneyTone = "success" | "warning" | "danger" | "info"

type JourneyCheckpoint = {
  id: string
  label: string
  detail: string
  value: string
  tone: JourneyTone
  source: string
  icon: typeof ShieldCheck
}

type JourneyBlocker = {
  id: string
  title: string
  detail: string
  source: string
}

const copy = {
  en: {
    title: "Close readiness journey",
    detail: "A read-only path from operating sources to reconciliation, posted ledger, findings, certification, and export readiness.",
    noData: "Run or load close readiness before the journey can be summarized.",
    systemOnly: "System evidence only. Statutory filings still require qualified expert validation.",
    blockers: "Journey blockers",
    noBlockers: "No high-risk journey blockers are visible.",
  },
  fr: {
    title: "Parcours de readiness cloture",
    detail: "Chemin en lecture seule des sources operationnelles vers rapprochement, ledger, constats, certification et export.",
    noData: "Chargez ou lancez la readiness cloture avant de resumer le parcours.",
    systemOnly: "Preuve systeme uniquement. Les declarations legales exigent une validation experte qualifiee.",
    blockers: "Blocages du parcours",
    noBlockers: "Aucun blocage critique visible dans le parcours.",
  },
} as const

export function CloseReadinessJourneyPanel({ data, locale }: CloseReadinessJourneyPanelProps) {
  const t = copy[locale]

  if (!data) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-4 text-[var(--dash-text)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-[var(--dash-warning)]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">{t.title}</h2>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.noData}</p>
          </div>
        </div>
      </section>
    )
  }

  const checkpoints = buildJourney(data, locale)
  const blockers = buildBlockers(data)

  return (
    <section className="dashboard-glass-panel rounded-lg p-4 text-[var(--dash-text)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border", toneClass(data.run.criticalBlockerCount ? "danger" : "success"))}>
              {data.run.status}
            </Badge>
            <Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              {data.source.persisted ? "Persisted" : "Live preview"}
            </Badge>
            <Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              {data.source.trustLevel}
            </Badge>
          </div>
          <h2 className="mt-3 text-base font-semibold">{t.title}</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--dash-text-soft)]">{t.detail}</p>
        </div>
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3 text-sm">
          <p className="text-xs text-[var(--dash-text-soft)]">Readiness</p>
          <p className="mt-1 text-2xl font-semibold">{data.run.readinessScore}%</p>
          <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
            {data.run.evidenceCoveragePct === null ? "No coverage" : `${data.run.evidenceCoveragePct}% evidence coverage`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {checkpoints.map((checkpoint) => {
          const Icon = checkpoint.icon
          return (
            <article key={checkpoint.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
              <div className="flex items-start justify-between gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneClass(checkpoint.tone))}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <Badge variant="outline" className={cn("border", toneClass(checkpoint.tone))}>{checkpoint.value}</Badge>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{checkpoint.label}</h3>
              <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--dash-text-soft)]">{checkpoint.detail}</p>
              <p className="mt-3 text-[0.7rem] uppercase tracking-normal text-[var(--dash-text-faint)]">{checkpoint.source}</p>
            </article>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
          <h3 className="text-sm font-semibold">{t.blockers}</h3>
          <div className="mt-3 grid gap-2">
            {blockers.length ? blockers.map((item) => (
              <div key={item.id} className="rounded-md border border-[var(--dash-border-subtle)] p-2 text-xs">
                <p className="font-medium text-[var(--dash-text)]">{item.title}</p>
                <p className="mt-1 text-[var(--dash-text-soft)]">{item.detail}</p>
              </div>
            )) : (
              <p className="text-sm text-[var(--dash-text-soft)]">{t.noBlockers}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3 text-sm text-[var(--dash-text)]">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
            <p>{t.systemOnly}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function buildBlockers(data: CloseAssuranceDashboardData): JourneyBlocker[] {
  return [
    ...data.findings
      .filter((finding) => ["CRITICAL", "HIGH"].includes(String(finding.severity)))
      .slice(0, 3)
      .map((finding) => ({
        id: `finding:${finding.id ?? finding.title}:${finding.sourceService}`,
        title: finding.title,
        detail: finding.detail,
        source: finding.sourceService,
      })),
    ...data.checklist
      .filter((item) => ["FAILED", "UNAVAILABLE"].includes(String(item.status)))
      .slice(0, 3)
      .map((item) => ({
        id: `checklist:${item.id ?? item.key}:${item.sourceService}`,
        title: item.label,
        detail: item.blockerReason ?? item.detail,
        source: item.sourceService,
      })),
  ].slice(0, 4)
}
function buildJourney(data: CloseAssuranceDashboardData, locale: Locale): JourneyCheckpoint[] {
  const periodLabel = data.period?.name ?? (locale === "fr" ? "Periode non definie" : "Period not set")
  const payment = data.checklist.find((item) => item.key === "payment-reconciliation")
  const ledger = data.checklist.find((item) => item.key === "ledger-reconciliation")
  const findings = data.summary.openFindingCount

  return [
    {
      id: "operational-readiness",
      label: locale === "fr" ? "Sources operationnelles" : "Operational sources",
      detail: `${periodLabel}: ${data.summary.checklistCount} checklist gate(s), ${data.summary.evidenceCount} evidence item(s).`,
      value: data.period?.status ?? "UNKNOWN",
      tone: data.period ? "info" : "warning",
      source: "accounting_periods",
      icon: ClipboardCheck,
    },
    {
      id: "reconciliation-proof",
      label: locale === "fr" ? "Rapprochement" : "Reconciliation proof",
      detail: payment?.detail ?? "Payment reconciliation evidence is not available in this close snapshot.",
      value: payment?.status ?? "UNAVAILABLE",
      tone: statusTone(payment?.status),
      source: "reconciliation_runs",
      icon: FileSearch,
    },
    {
      id: "ledger-posting",
      label: locale === "fr" ? "Ledger poste" : "Posted ledger",
      detail: ledger?.detail ?? "Ledger posting evidence is not available in this close snapshot.",
      value: ledger?.status ?? "UNAVAILABLE",
      tone: statusTone(ledger?.status),
      source: "journal_entries",
      icon: GitBranch,
    },
    {
      id: "close-findings",
      label: locale === "fr" ? "Constats" : "Close findings",
      detail: `${data.summary.openFindingCount} open finding(s), ${data.run.criticalBlockerCount} critical blocker(s).`,
      value: findings > 0 ? String(findings) : "0",
      tone: data.run.criticalBlockerCount > 0 ? "danger" : findings > 0 ? "warning" : "success",
      source: "close_assurance_findings",
      icon: AlertTriangle,
    },
    {
      id: "certification",
      label: locale === "fr" ? "Certification" : "Certification",
      detail: data.controls.certificationDisabledReason ?? "Certification controls are available for this close run.",
      value: data.controls.certificationAvailable ? "READY" : "BLOCKED",
      tone: data.controls.certificationAvailable ? "success" : "danger",
      source: "close_runs",
      icon: CheckCircle2,
    },
    {
      id: "export-readiness",
      label: locale === "fr" ? "Export" : "Export readiness",
      detail: data.controls.packExportDisabledReason,
      value: data.controls.packExportAvailable ? "READY" : "BLOCKED",
      tone: data.controls.packExportAvailable ? "success" : "warning",
      source: "close_pack_exports",
      icon: Download,
    },
  ]
}

function statusTone(status: unknown): JourneyTone {
  const value = String(status ?? "UNAVAILABLE")
  if (["PASSED", "READY", "READY_TO_CLOSE"].includes(value)) return "success"
  if (["FAILED", "BLOCKED", "CRITICAL"].includes(value)) return "danger"
  if (["WARNING", "UNAVAILABLE", "IN_REVIEW"].includes(value)) return "warning"
  return "info"
}

function toneClass(tone: JourneyTone) {
  if (tone === "success") return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  if (tone === "danger") return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  if (tone === "warning") return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
}

