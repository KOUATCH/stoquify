"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  DatabaseZap,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import type { AccountantPortalData } from "@/actions/accounting/data-trust.actions"
import { useAccountantPortal, useExportAccountantTrustPack } from "@/hooks/useAccountantPortal"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AccountantPortalProps = {
  initialData?: AccountantPortalData | null
  initialError?: string | null
  locale?: Locale
}

const copy = {
  en: {
    loadingTitle: "Loading accountant evidence",
    loadingBody: "Checking ledger provenance, source links, audit events, and certification blockers.",
    errorTitle: "Accountant portal unavailable",
    retry: "Refresh",
    export: "Export trust pack",
    exporting: "Exporting",
    trustLevel: "Trust level",
    postedEntries: "Posted entries",
    sourceCoverage: "Source coverage",
    blockers: "Blockers",
    asOf: "As of",
    period: "Period",
    figures: "Posted figures",
    figuresDescription: "Financial figures render only when critical data-trust blockers are clear.",
    debit: "Activity debit",
    credit: "Activity credit",
    provenance: "Provenance",
    unavailable: "Unavailable",
    modules: "Evidence modules",
    blockersTitle: "Close blockers",
    noBlockers: "No data-trust blockers detected.",
    sourceLinks: "Recent source links",
    auditEvents: "Audit and control trail",
    emptyRows: "No records available.",
    gate: "Gate",
    detail: "Detail",
    source: "Source",
    action: "Action",
    resource: "Resource",
    actor: "Actor",
    time: "Time",
    status: "Status",
    certified: "Certified",
    partial: "Partial",
    nonCompliant: "Non-compliant",
    disabledExport: "Certified export is blocked",
  },
  fr: {
    loadingTitle: "Chargement des preuves comptables",
    loadingBody: "Verification de la provenance ledger, des liens source, des audits et blocages de certification.",
    errorTitle: "Portail comptable indisponible",
    retry: "Actualiser",
    export: "Exporter le pack",
    exporting: "Export",
    trustLevel: "Niveau confiance",
    postedEntries: "Ecritures postees",
    sourceCoverage: "Couverture source",
    blockers: "Blocages",
    asOf: "A la date",
    period: "Periode",
    figures: "Figures postees",
    figuresDescription: "Les montants financiers s'affichent seulement apres resolution des blocages critiques.",
    debit: "Debit activite",
    credit: "Credit activite",
    provenance: "Provenance",
    unavailable: "Indisponible",
    modules: "Modules de preuve",
    blockersTitle: "Blocages de cloture",
    noBlockers: "Aucun blocage de confiance detecte.",
    sourceLinks: "Liens source recents",
    auditEvents: "Audit et controles",
    emptyRows: "Aucun enregistrement disponible.",
    gate: "Porte",
    detail: "Detail",
    source: "Source",
    action: "Action",
    resource: "Ressource",
    actor: "Acteur",
    time: "Date",
    status: "Statut",
    certified: "Certifie",
    partial: "Partiel",
    nonCompliant: "Non conforme",
    disabledExport: "Export certifie bloque",
  },
} as const

function formatMoney(value: string | null, currency = "XAF") {
  if (value === null) return null
  const amount = Number(value)

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "-"
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  if (severity === "high") return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  if (severity === "medium") return "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]"
  return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
}

function statusClass(status: string) {
  if (status === "ready" || status === "CERTIFIED" || status === "allowed") {
    return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  }
  if (status === "blocked" || status === "NON_COMPLIANT" || status === "denied") {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }
  return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
}

function trustLabel(data: AccountantPortalData, locale: Locale) {
  const t = copy[locale]
  if (data.certificate.verdict === "CERTIFIED") return t.certified
  if (data.certificate.verdict === "NON_COMPLIANT") return t.nonCompliant
  return t.partial
}

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: "brand" | "success" | "warning" | "danger" | "gold" | "info"
}) {
  const tones = {
    brand: "bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    success: "bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    warning: "bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    danger: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    gold: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    info: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  } as const

  return (
    <div className="min-h-[7.5rem] rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</p>
    </div>
  )
}

function downloadJson(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AccountantPortal({
  initialData = null,
  initialError = null,
  locale = "en",
}: AccountantPortalProps) {
  const query = useAccountantPortal({ initialData, limit: 12 })
  const data = query.data
  const t = copy[locale]
  const exportMutation = useExportAccountantTrustPack(locale, {
    periodId: data?.scope.periodId,
    startDate: data?.scope.startDate,
    endDate: data?.scope.endDate,
  })

  const trustTone = useMemo(() => {
    if (!data) return "danger" as const
    if (data.certificate.verdict === "CERTIFIED") return "success" as const
    if (data.certificate.verdict === "NON_COMPLIANT") return "danger" as const
    return "warning" as const
  }, [data])

  async function handleExport() {
    const result = await exportMutation.mutateAsync({ includeLedgerRows: true })
    downloadJson(result.fileName, result.content)
  }

  if (query.isLoading && !data) {
    return (
      <Panel title={t.loadingTitle} description={t.loadingBody}>
        <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
            <p className="mt-4 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
          </div>
        </div>
      </Panel>
    )
  }

  if (!data) {
    return (
      <Panel title={t.errorTitle} description={initialError || (query.error as Error | null)?.message || t.errorTitle}>
        <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <ShieldAlert className="mx-auto h-9 w-9 text-[var(--dash-danger)]" />
            <p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">
              {initialError || (query.error as Error | null)?.message || t.errorTitle}
            </p>
            <Button type="button" onClick={() => query.refetch()} className="dashboard-button-primary mt-5 h-10 rounded-lg">
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t.trustLevel}
          value={`${data.certificate.level} ${trustLabel(data, locale)}`}
          detail={`${t.asOf}: ${formatDate(data.source.asOf, locale)}`}
          icon={data.certificate.verdict === "CERTIFIED" ? ShieldCheck : ShieldAlert}
          tone={trustTone}
        />
        <MetricTile
          label={t.postedEntries}
          value={data.summary.postedJournalEntries.toString()}
          detail={`${data.summary.journalLines} ledger lines from posted/reversed journals`}
          icon={BookOpenCheck}
          tone={data.summary.postedJournalEntries > 0 ? "brand" : "warning"}
        />
        <MetricTile
          label={t.sourceCoverage}
          value={data.summary.sourceLinkCoveragePct === null ? "n/a" : `${data.summary.sourceLinkCoveragePct}%`}
          detail={`${data.summary.linkedPostedEntries}/${data.summary.postedJournalEntries} entries linked`}
          icon={Link2}
          tone={data.summary.sourceLinkCoveragePct === 100 ? "success" : "warning"}
        />
        <MetricTile
          label={t.blockers}
          value={data.summary.blockerCount.toString()}
          detail={`${data.summary.criticalBlockers} critical / ${data.summary.highBlockers} high`}
          icon={data.summary.blockerCount ? AlertTriangle : BadgeCheck}
          tone={data.summary.criticalBlockers ? "danger" : data.summary.highBlockers ? "warning" : "success"}
        />
      </div>

      <section
        className={cn(
          "flex min-w-0 flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          data.exportReadiness.canExportCertifiedPack
            ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]"
            : "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)]",
        )}
      >
        <div className="min-w-0">
          <p className="font-semibold text-[var(--dash-text)]">
            {data.exportReadiness.canExportCertifiedPack ? t.certified : t.disabledExport}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">
            {data.exportReadiness.disabledReason ||
              `${t.period}: ${data.scope.periodName || data.scope.periodId || "current"} (${data.scope.periodStatus})`}
          </p>
        </div>
        <Button
          type="button"
          disabled={!data.exportReadiness.canExportCertifiedPack || exportMutation.isPending}
          onClick={handleExport}
          className="dashboard-button-primary h-10 rounded-lg"
        >
          {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportMutation.isPending ? t.exporting : t.export}
        </Button>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title={t.figures} description={t.figuresDescription}>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <FigureTile label={t.debit} figure={data.figures.activityDebit} locale={locale} />
            <FigureTile label={t.credit} figure={data.figures.activityCredit} locale={locale} />
          </div>
        </Panel>

        <Panel title={t.modules}>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {data.moduleEvidence.map((module) => (
              <div key={module.module} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--dash-text)]">{module.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{module.detail}</p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-md", statusClass(module.status))}>
                    {module.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {module.facts.map((fact) => (
                    <div key={fact.label} className="flex min-w-0 items-center justify-between gap-3 text-xs">
                      <span className="truncate text-[var(--dash-text-faint)]">{fact.label}</span>
                      <span className="font-medium text-[var(--dash-text)]">{fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title={t.blockersTitle}>
        {data.blockers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                <tr>
                  <th className="px-4 py-3">{t.status}</th>
                  <th className="px-4 py-3">{t.gate}</th>
                  <th className="px-4 py-3">{t.detail}</th>
                  <th className="px-4 py-3">{t.source}</th>
                </tr>
              </thead>
              <tbody>
                {data.blockers.map((blocker) => (
                  <tr key={blocker.id} className="border-b border-[var(--dash-border-subtle)] align-top">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("rounded-md", severityClass(blocker.severity))}>
                        {blocker.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--dash-text)]">{blocker.title}</p>
                      <p className="mt-1 text-xs text-[var(--dash-text-faint)]">{blocker.gate}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--dash-text-soft)]">{blocker.detail}</td>
                    <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">{blocker.sourceTables.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.noBlockers}</div>
        )}
      </Panel>

      <div className="grid min-w-0 gap-5">
        <SourceLinksTable data={data} locale={locale} />
        <AuditEventsTable data={data} locale={locale} />
      </div>
    </div>
  )
}

function FigureTile({
  label,
  figure,
  locale,
}: {
  label: string
  figure: AccountantPortalData["figures"]["activityDebit"]
  locale: Locale
}) {
  const t = copy[locale]
  const value = figure.available ? formatMoney(figure.amount, figure.currency) : t.unavailable

  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-[var(--dash-text)]">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
          <DatabaseZap className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 space-y-1 text-xs leading-5 text-[var(--dash-text-soft)]">
        <p>
          {t.provenance}: {figure.provenance}
        </p>
        <p>{formatDate(figure.asOf, locale)}</p>
        {!figure.available ? <p className="text-[var(--dash-warning)]">{figure.reason}</p> : null}
      </div>
    </div>
  )
}

function SourceLinksTable({ data, locale }: { data: AccountantPortalData; locale: Locale }) {
  const t = copy[locale]

  return (
    <Panel title={t.sourceLinks}>
      {data.latestSourceLinks.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
              <tr>
                <th className="px-4 py-3">{t.source}</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.time}</th>
              </tr>
            </thead>
            <tbody>
              {data.latestSourceLinks.map((link) => (
                <tr key={link.id} className="border-b border-[var(--dash-border-subtle)] align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--dash-text)]">{link.sourceType}</p>
                    <p className="mt-1 max-w-[12rem] truncate text-xs text-[var(--dash-text-faint)]">
                      {link.sourceNumber || link.sourceId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--dash-text-soft)]">{link.journalEntryNumber || "-"}</td>
                  <td className="px-4 py-3 max-w-[12rem] truncate text-[var(--dash-text-soft)]">{link.postingBatchId}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("rounded-md", statusClass(link.postingStatus === "POSTED" ? "ready" : "blocked"))}>
                      {link.postingStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--dash-text-soft)]">{formatDate(link.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.emptyRows}</div>
      )}
    </Panel>
  )
}

function AuditEventsTable({ data, locale }: { data: AccountantPortalData; locale: Locale }) {
  const t = copy[locale]

  return (
    <Panel title={t.auditEvents}>
      {data.latestAuditEvents.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
              <tr>
                <th className="px-4 py-3">{t.source}</th>
                <th className="px-4 py-3">{t.action}</th>
                <th className="px-4 py-3">{t.resource}</th>
                <th className="px-4 py-3">{t.actor}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.time}</th>
              </tr>
            </thead>
            <tbody>
              {data.latestAuditEvents.map((event) => (
                <tr key={`${event.source}-${event.id}`} className="border-b border-[var(--dash-border-subtle)] align-top">
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md",
                        event.source === "ledger"
                          ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"
                          : "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
                      )}
                    >
                      {event.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--dash-text)]">{event.action}</td>
                  <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                    {event.resourceType}
                    <span className="block max-w-[12rem] truncate text-xs text-[var(--dash-text-faint)]">{event.resourceId || "-"}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[10rem] truncate text-[var(--dash-text-soft)]">{event.actorId || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("rounded-md", statusClass(event.status))}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--dash-text-soft)]">{formatDate(event.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.emptyRows}</div>
      )}
    </Panel>
  )
}
