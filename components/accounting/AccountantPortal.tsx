"use client"

import { WorkspaceSectionNavigation } from "@/components/dashboard/WorkspaceSectionNavigation"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
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
import DataTable from "@/components/DataTableComponents/DataTable"
import { portalEvidenceText } from "./accountantPortalCopy"

type AccountantPortalProps = {
  initialData?: AccountantPortalData | null
  initialError?: string | null
  locale?: Locale
  clientOrganizationId?: string
  periodId?: string
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
    journal: "Journal",
    batch: "Batch",
    searchBlockers: "Search close blockers...",
    searchSourceLinks: "Search recent source links...",
    searchAuditEvents: "Search audit and control trail...",
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
    loadingBody: "Vérification de la provenance du grand livre, des liens sources, des audits et des blocages de certification.",
    errorTitle: "Portail comptable indisponible",
    retry: "Actualiser",
    export: "Exporter le dossier certifié",
    exporting: "Export en cours",
    trustLevel: "Niveau de confiance",
    postedEntries: "Écritures comptabilisées",
    sourceCoverage: "Couverture des liens sources",
    blockers: "Blocages",
    asOf: "Au",
    period: "Période",
    figures: "Montants comptabilisés",
    figuresDescription: "Les montants financiers s’affichent uniquement après résolution des blocages critiques de fiabilité des données.",
    debit: "Mouvements au débit",
    credit: "Mouvements au crédit",
    provenance: "Provenance",
    unavailable: "Indisponible",
    modules: "Modules de preuve",
    blockersTitle: "Blocages de clôture",
    noBlockers: "Aucun blocage de fiabilité détecté.",
    sourceLinks: "Liens sources récents",
    auditEvents: "Audit et contrôles",
    emptyRows: "Aucun enregistrement disponible.",
    gate: "Contrôle",
    detail: "Détail",
    source: "Source",
    journal: "Journal",
    batch: "Lot",
    searchBlockers: "Rechercher les blocages de clôture...",
    searchSourceLinks: "Rechercher les liens source récents...",
    searchAuditEvents: "Rechercher les audits et contrôles...",
    action: "Action",
    resource: "Ressource",
    actor: "Acteur",
    time: "Date",
    status: "Statut",
    certified: "Certifié",
    partial: "Partiel",
    nonCompliant: "Non conforme",
    disabledExport: "Export certifié bloqué",
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
          <p className="break-words text-[0.68rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{label}</p>
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
  clientOrganizationId,
  periodId,
}: AccountantPortalProps) {
  const query = useAccountantPortal({ initialData, limit: 12, clientOrganizationId, periodId })
  const data = query.isError ? undefined : query.data
  const t = copy[locale]
  const exportMutation = useExportAccountantTrustPack(locale, {
    clientOrganizationId,
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
      <Panel title={t.errorTitle} description={portalEvidenceText(initialError || (query.error as Error | null)?.message || t.errorTitle, locale)}>
        <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <ShieldAlert className="mx-auto h-9 w-9 text-[var(--dash-danger)]" />
            <p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">
              {portalEvidenceText(initialError || (query.error as Error | null)?.message || t.errorTitle, locale)}
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
    <div className="min-w-0 space-y-6" data-finance-result="accountant-portal" data-finance-result-state={query.isError ? "error" : query.isFetching ? "refreshing" : "ready"}>
      <WorkspaceSectionNavigation label={locale === "fr" ? "Sections de la page" : "Page sections"} items={[
        { id: "portal-blockers", label: t.blockersTitle },
        { id: "portal-figures", label: t.figures },
        { id: "portal-source-links", label: t.sourceLinks },
        { id: "portal-audit", label: t.auditEvents },
      ]} />
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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
          detail={locale === "fr" ? `${data.summary.journalLines} lignes du grand livre issues d’écritures comptabilisées ou extournées` : `${data.summary.journalLines} ledger lines from posted/reversed journals`}
          icon={BookOpenCheck}
          tone={data.summary.postedJournalEntries > 0 ? "brand" : "warning"}
        />
        <MetricTile
          label={t.sourceCoverage}
          value={data.summary.sourceLinkCoveragePct === null ? t.unavailable : portalEvidenceText(`${data.summary.sourceLinkCoveragePct}%`, locale)}
          detail={locale === "fr" ? `${data.summary.linkedPostedEntries}/${data.summary.postedJournalEntries} écritures liées` : `${data.summary.linkedPostedEntries}/${data.summary.postedJournalEntries} entries linked`}
          icon={Link2}
          tone={data.summary.sourceLinkCoveragePct === 100 ? "success" : "warning"}
        />
        <MetricTile
          label={t.blockers}
          value={data.summary.blockerCount.toString()}
          detail={locale === "fr" ? `${data.summary.criticalBlockers} critiques / ${data.summary.highBlockers} élevés` : `${data.summary.criticalBlockers} critical / ${data.summary.highBlockers} high`}
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
            {data.exportReadiness.disabledReason ? portalEvidenceText(data.exportReadiness.disabledReason, locale) :
              `${t.period}: ${data.scope.periodName || data.scope.periodId || portalEvidenceText("current", locale)} (${portalEvidenceText(data.scope.periodStatus, locale)})`}
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

      <section id="portal-blockers" className="min-w-0 scroll-mt-24">
        <BlockersTable data={data} locale={locale} />
      </section>

      <div id="portal-figures" className="grid min-w-0 scroll-mt-24 gap-4">
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
                    <p className="font-semibold text-[var(--dash-text)]">{portalEvidenceText(module.label, locale)}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{portalEvidenceText(module.detail, locale)}</p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-md", statusClass(module.status))}>
                    {portalEvidenceText(module.status, locale)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {module.facts.map((fact) => (
                    <div key={fact.label} className="flex min-w-0 items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 break-words text-[var(--dash-text-faint)]">{portalEvidenceText(fact.label, locale)}</span>
                      <span className="shrink-0 font-medium text-[var(--dash-text)]">{typeof fact.value === "string" ? portalEvidenceText(fact.value, locale) : fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid min-w-0 gap-5">
        <section id="portal-source-links" className="min-w-0 scroll-mt-24">
          <SourceLinksTable data={data} locale={locale} />
        </section>
        <section id="portal-audit" className="min-w-0 scroll-mt-24">
          <AuditEventsTable data={data} locale={locale} />
        </section>
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
          {t.provenance}: {portalEvidenceText(figure.provenance, locale)}
        </p>
        <p>{formatDate(figure.asOf, locale)}</p>
        {!figure.available ? <p className="text-[var(--dash-warning)]">{portalEvidenceText(figure.reason, locale)}</p> : null}
      </div>
    </div>
  )
}

function BlockersTable({ data, locale }: { data: AccountantPortalData; locale: Locale }) {
  const t = copy[locale]
  // The shared search bar searches row data, not rendered column accessors.
  const rows = useMemo(() => data.blockers.map((blocker) => ({
    ...blocker,
    localizedSearchText: [blocker.severity, blocker.title, blocker.detail]
      .map((value) => portalEvidenceText(value, locale)).join(" "),
  })), [data.blockers, locale])
  const columns = useMemo<ColumnDef<AccountantPortalData["blockers"][number]>[]>(() => [
    {
      id: t.status,
      accessorFn: (blocker) => `${portalEvidenceText(blocker.severity, locale)} ${blocker.severity}`,
      header: t.status,
      cell: ({ row: { original: blocker } }) => (
        <Badge variant="outline" className={cn("rounded-md", severityClass(blocker.severity))}>
          {portalEvidenceText(blocker.severity, locale)}
        </Badge>
      ),
    },
    {
      id: t.gate,
      accessorFn: (blocker) => `${portalEvidenceText(blocker.title, locale)} ${blocker.title} ${blocker.gate}`,
      header: t.gate,
      cell: ({ row: { original: blocker } }) => (
        <div className="min-w-48 whitespace-normal">
          <p className="font-medium text-[var(--dash-text)]">{portalEvidenceText(blocker.title, locale)}</p>
          <details className="mt-1 text-xs text-[var(--dash-text-faint)]"><summary className="cursor-pointer">{locale === "fr" ? "Référence du contrôle" : "Control reference"}</summary><span className="break-all">{blocker.gate}</span></details>
        </div>
      ),
    },
    {
      id: t.detail,
      accessorFn: (blocker) => `${portalEvidenceText(blocker.detail, locale)} ${blocker.detail}`,
      header: t.detail,
      cell: ({ row: { original: blocker } }) => (
        <p className="min-w-64 whitespace-normal text-[var(--dash-text-soft)]">{portalEvidenceText(blocker.detail, locale)}</p>
      ),
    },
    {
      id: t.source,
      accessorFn: (blocker) => blocker.sourceTables.join(", "),
      header: t.source,
      cell: ({ row: { original: blocker } }) => (
        <p className="min-w-40 whitespace-normal text-xs leading-5 text-[var(--dash-text-soft)]">
          {blocker.sourceTables.join(", ")}
        </p>
      ),
    },
  ], [locale, t])

  return (
    <Panel title={t.blockersTitle}>
      <div className="min-w-0 p-4">
        <DataTable
          columns={columns}
          data={rows}
          caption={t.blockersTitle}
          scrollRegionLabel={t.blockersTitle}
          locale={locale}
          variant="landing"
          searchPlaceholder={t.searchBlockers}
          showDateFilters={false}
          showSelectionSummary={false}
          emptyMessage={data.blockers.length ? t.emptyRows : t.noBlockers}
        />
      </div>
    </Panel>
  )
}

function SourceLinksTable({ data, locale }: { data: AccountantPortalData; locale: Locale }) {
  const t = copy[locale]
  const columns = useMemo<ColumnDef<AccountantPortalData["latestSourceLinks"][number]>[]>(() => [
    {
      id: t.source,
      accessorKey: "sourceType",
      header: t.source,
      cell: ({ row: { original: link } }) => (
        <div>
          <p className="font-medium text-[var(--dash-text)]">{link.sourceType}</p>
          <p className="mt-1 max-w-48 truncate text-xs text-[var(--dash-text-faint)]" title={link.sourceNumber || link.sourceId}>
            {link.sourceNumber || link.sourceId}
          </p>
        </div>
      ),
    },
    {
      id: t.journal,
      accessorKey: "journalEntryNumber",
      header: t.journal,
      cell: ({ row: { original: link } }) => link.journalEntryNumber || "-",
    },
    {
      id: t.batch,
      accessorKey: "postingBatchId",
      header: t.batch,
      cell: ({ row: { original: link } }) => (
        <span className="block max-w-48 truncate" title={link.postingBatchId}>{link.postingBatchId}</span>
      ),
    },
    {
      id: t.status,
      accessorKey: "postingStatus",
      header: t.status,
      cell: ({ row: { original: link } }) => (
        <Badge variant="outline" className={cn("rounded-md", statusClass(link.postingStatus === "POSTED" ? "ready" : "blocked"))}>
          {portalEvidenceText(link.postingStatus, locale)}
        </Badge>
      ),
    },
    {
      id: t.time,
      accessorKey: "createdAt",
      header: t.time,
      cell: ({ row: { original: link } }) => (
        <span className="whitespace-nowrap text-xs">{formatDate(link.createdAt, locale)}</span>
      ),
    },
  ], [locale, t])

  return (
    <Panel title={t.sourceLinks}>
      <div className="min-w-0 p-4">
        <DataTable
          columns={columns}
          data={data.latestSourceLinks}
          caption={t.sourceLinks}
          scrollRegionLabel={t.sourceLinks}
          locale={locale}
          variant="landing"
          searchPlaceholder={t.searchSourceLinks}
          showSelectionSummary={false}
          emptyMessage={t.emptyRows}
        />
      </div>
    </Panel>
  )
}

function AuditEventsTable({ data, locale }: { data: AccountantPortalData; locale: Locale }) {
  const t = copy[locale]
  const events = useMemo(() => data.latestAuditEvents.map((event) => ({
    ...event,
    id: `${event.source}-${event.id}`,
  })), [data.latestAuditEvents])
  const columns = useMemo<ColumnDef<AccountantPortalData["latestAuditEvents"][number]>[]>(() => [
    {
      id: t.source,
      accessorKey: "source",
      header: t.source,
      cell: ({ row: { original: event } }) => (
        <Badge
          variant="outline"
          className={cn(
            "rounded-md",
            event.source === "ledger"
              ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"
              : "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
          )}
        >
          {portalEvidenceText(event.source, locale)}
        </Badge>
      ),
    },
    {
      id: t.action,
      accessorKey: "action",
      header: t.action,
      cell: ({ row: { original: event } }) => (
        <span className="font-medium text-[var(--dash-text)]">{event.action}</span>
      ),
    },
    {
      id: t.resource,
      accessorKey: "resourceType",
      header: t.resource,
      cell: ({ row: { original: event } }) => (
        <div>
          {event.resourceType}
          <span className="block max-w-48 truncate text-xs text-[var(--dash-text-faint)]" title={event.resourceId || undefined}>
            {event.resourceId || "-"}
          </span>
        </div>
      ),
    },
    {
      id: t.actor,
      accessorKey: "actorId",
      header: t.actor,
      cell: ({ row: { original: event } }) => (
        <span className="block max-w-40 truncate" title={event.actorId || undefined}>{event.actorId || "-"}</span>
      ),
    },
    {
      id: t.status,
      accessorKey: "status",
      header: t.status,
      cell: ({ row: { original: event } }) => (
        <Badge variant="outline" className={cn("rounded-md", statusClass(event.status))}>
          {portalEvidenceText(event.status, locale)}
        </Badge>
      ),
    },
    {
      id: t.time,
      accessorKey: "createdAt",
      header: t.time,
      cell: ({ row: { original: event } }) => (
        <span className="whitespace-nowrap text-xs">{formatDate(event.createdAt, locale)}</span>
      ),
    },
  ], [locale, t])

  return (
    <Panel title={t.auditEvents}>
      <div className="min-w-0 p-4">
        <DataTable
          columns={columns}
          data={events}
          caption={t.auditEvents}
          scrollRegionLabel={t.auditEvents}
          locale={locale}
          variant="landing"
          searchPlaceholder={t.searchAuditEvents}
          showSelectionSummary={false}
          emptyMessage={t.emptyRows}
        />
      </div>
    </Panel>
  )
}
