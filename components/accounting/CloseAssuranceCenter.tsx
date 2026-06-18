"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  GitBranch,
  Layers3,
  Link2,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import type { CloseAssuranceDashboardData, CloseAssuranceFindingDto } from "@/actions/accounting/close-assurance.actions"
import type { ClosePackExportResult } from "@/services/accounting/close-assurance-pack.service"
import {
  useAssignCloseFinding,
  useCloseAssurance,
  useCloseEvidenceGraph,
  useCloseWaiver,
  useCommentOnCloseFinding,
  useExportClosePack,
  useRunCloseAssurance,
} from "@/hooks/accounting/useCloseAssurance"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type CloseAssuranceCenterProps = {
  initialData?: CloseAssuranceDashboardData | null
  initialError?: string | null
  locale?: Locale
  initialPeriodId?: string | null
}

const copy = {
  en: {
    loadingTitle: "Loading close assurance",
    loadingBody: "Checking period close, ledger reconciliation, payment suspense, and data-trust evidence.",
    errorTitle: "Close assurance unavailable",
    retry: "Refresh",
    run: "Run assessment",
    running: "Running",
    refresh: "Refresh",
    period: "Period",
    noPeriod: "No accounting period",
    status: "Status",
    readiness: "Readiness",
    evidenceCoverage: "Evidence coverage",
    criticalBlockers: "Critical blockers",
    openFindings: "Open findings",
    trustLevel: "Trust level",
    asOf: "As of",
    closeBlocked: "Close blocked",
    closeReady: "Ready for close review",
    persisted: "Persisted run",
    livePreview: "Live preview",
    checklist: "Close readiness checklist",
    checklistDescription: "Service-backed gates from period close, ledger, payment reconciliation, suspense, inventory, AP, payroll, tax, and data-trust sources.",
    blockers: "Blockers and findings",
    blockersDescription: "Open issues must be resolved, assigned, or waived through segregation-of-duties controls before certification.",
    evidence: "Evidence coverage",
    evidenceDescription: "Source-linked proof gathered by the close engine. Missing domains stay visible as unavailable evidence.",
    provenance: "Provenance",
    provenanceDescription: "Which service produced each part of the close picture, and whether it is posted, operational, or unavailable.",
    graph: "Evidence graph",
    graphDescription: "Nodes and edges generated from the current close run evidence.",
    comments: "Accountant comments",
    controls: "Certification controls",
    packExport: "Close pack export",
    packExportDescription: "Generate deterministic JSON snapshots with a watermark, SHA-256 content hash, and close-run audit trail.",
    noBlockers: "No close blockers detected for this assessment.",
    noEvidence: "No evidence items available.",
    noComments: "No comments yet.",
    emptyGraph: "Evidence graph is not available for this assessment.",
    unavailable: "Unavailable",
    available: "Available",
    source: "Source",
    detail: "Detail",
    owner: "Owner",
    action: "Action",
    assignToMe: "Assign to me",
    requestWaiver: "Request waiver",
    addComment: "Add comment",
    commentPlaceholder: "Add source-linked review notes for this finding.",
    waivePlaceholder: "Document the compensating control or management-approved reason for this waiver request.",
    certificationDisabled: "Certified export gate",
    exportDisabled: "Draft export gate",
    exportDraft: "Export draft JSON",
    exportCertified: "Export certified JSON",
    exporting: "Exporting",
    lastExport: "Last export",
    hash: "Hash",
    watermark: "Watermark",
    certifiedBlocked: "Certified export blocked",
    runRequired: "Run close readiness before exporting.",
    systemCertifiedNotice: "System evidence pack only. Statutory filings still require qualified expert validation.",
    requiresFreshAuth: "Waiver approval requires fresh authentication.",
    notSet: "Not set",
    evidenceItems: "Evidence items",
    sourceTables: "Source tables",
    nodes: "Nodes",
    edges: "Edges",
  },
  fr: {
    loadingTitle: "Chargement de l'assurance de cloture",
    loadingBody: "Verification de la periode, du ledger, du suspense paiement et des preuves de confiance.",
    errorTitle: "Assurance de cloture indisponible",
    retry: "Actualiser",
    run: "Lancer l'evaluation",
    running: "Evaluation",
    refresh: "Actualiser",
    period: "Periode",
    noPeriod: "Aucune periode comptable",
    status: "Statut",
    readiness: "Preparation",
    evidenceCoverage: "Couverture preuve",
    criticalBlockers: "Blocages critiques",
    openFindings: "Constats ouverts",
    trustLevel: "Niveau confiance",
    asOf: "A la date",
    closeBlocked: "Cloture bloquee",
    closeReady: "Prete pour revue",
    persisted: "Evaluation enregistree",
    livePreview: "Apercu direct",
    checklist: "Checklist de cloture",
    checklistDescription: "Portes de controle issues de la periode, du ledger, des paiements, du suspense, de l'inventaire, AP, paie, taxe et confiance.",
    blockers: "Blocages et constats",
    blockersDescription: "Les constats ouverts doivent etre resolus, assignes ou deroges avec separation des roles avant certification.",
    evidence: "Couverture des preuves",
    evidenceDescription: "Preuves liees aux sources collectees par le moteur de cloture. Les domaines manquants restent visibles.",
    provenance: "Provenance",
    provenanceDescription: "Service source de chaque partie de l'image de cloture et niveau de disponibilite.",
    graph: "Graphe de preuve",
    graphDescription: "Noeuds et liens generes depuis les preuves de l'evaluation courante.",
    comments: "Commentaires comptables",
    controls: "Controles de certification",
    packExport: "Export du pack de cloture",
    packExportDescription: "Generer des instantanes JSON deterministes avec filigrane, hash SHA-256 et audit de l'evaluation.",
    noBlockers: "Aucun blocage de cloture detecte pour cette evaluation.",
    noEvidence: "Aucune preuve disponible.",
    noComments: "Aucun commentaire.",
    emptyGraph: "Le graphe de preuve n'est pas disponible pour cette evaluation.",
    unavailable: "Indisponible",
    available: "Disponible",
    source: "Source",
    detail: "Detail",
    owner: "Responsable",
    action: "Action",
    assignToMe: "M'assigner",
    requestWaiver: "Demander derogation",
    addComment: "Ajouter commentaire",
    commentPlaceholder: "Ajouter des notes de revue liees a la source de ce constat.",
    waivePlaceholder: "Documenter le controle compensatoire ou la raison approuvee pour cette derogation.",
    certificationDisabled: "Porte export certifie",
    exportDisabled: "Porte export brouillon",
    exportDraft: "Exporter JSON brouillon",
    exportCertified: "Exporter JSON certifie",
    exporting: "Export",
    lastExport: "Dernier export",
    hash: "Hash",
    watermark: "Filigrane",
    certifiedBlocked: "Export certifie bloque",
    runRequired: "Lancez l'evaluation avant export.",
    systemCertifiedNotice: "Pack de preuve systeme uniquement. Les declarations legales exigent toujours une validation experte.",
    requiresFreshAuth: "L'approbation de derogation exige une authentification recente.",
    notSet: "Non defini",
    evidenceItems: "Preuves",
    sourceTables: "Tables source",
    nodes: "Noeuds",
    edges: "Liens",
  },
} as const

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].notSet
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDateOnly(value: string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].notSet
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function statusClass(status: string) {
  if (["READY", "PASSED", "RESOLVED", "APPROVED_FOR_CLOSE", "READY_TO_CLOSE"].includes(status)) {
    return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  }
  if (["BLOCKED", "FAILED", "CRITICAL", "REJECTED", "REOPENED"].includes(status)) {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }
  if (["WARNING", "HIGH", "IN_REVIEW", "ASSIGNED", "WAIVED_WITH_APPROVAL", "UNAVAILABLE"].includes(status)) {
    return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  }
  return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
}

function evidenceClass(available: boolean) {
  return available
    ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
    : "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
}

function provenanceClass(provenance: string) {
  if (provenance === "POSTED") return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  if (provenance === "UNAVAILABLE") return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
}

function toneClass(tone: "brand" | "success" | "warning" | "danger" | "gold" | "info") {
  const tones = {
    brand: "bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    success: "bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    warning: "bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    danger: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    gold: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    info: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  } as const

  return tones[tone]
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
  return (
    <div className="min-h-[7.5rem] rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass(tone))}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</p>
    </div>
  )
}

function selectedOpenFinding(findings: CloseAssuranceFindingDto[]) {
  return findings.find((finding) => finding.id && !["RESOLVED", "WAIVED_WITH_APPROVAL"].includes(finding.status)) ?? null
}

function downloadClosePack(result: ClosePackExportResult) {
  const blob = new Blob([result.content], { type: result.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = result.fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function CloseAssuranceCenter({
  initialData = null,
  initialError = null,
  locale = "en",
  initialPeriodId = null,
}: CloseAssuranceCenterProps) {
  const initialSelectedPeriodId = initialPeriodId ?? initialData?.period?.id ?? initialData?.periods.currentOpenPeriod?.id ?? ""
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialSelectedPeriodId)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(() => selectedOpenFinding(initialData?.findings ?? [])?.id ?? null)
  const [commentBody, setCommentBody] = useState("")
  const [waiverReason, setWaiverReason] = useState("")
  const [lastExport, setLastExport] = useState<ClosePackExportResult | null>(null)
  const t = copy[locale]
  const initialQueryData = selectedPeriodId === initialSelectedPeriodId ? initialData : null

  const query = useCloseAssurance({
    periodId: selectedPeriodId || undefined,
    initialData: initialQueryData,
    locale,
  })
  const data = query.data
  const runMutation = useRunCloseAssurance(locale)
  const assignMutation = useAssignCloseFinding(locale)
  const commentMutation = useCommentOnCloseFinding(locale)
  const waiverMutation = useCloseWaiver(locale)
  const exportMutation = useExportClosePack(locale)
  const graphQuery = useCloseEvidenceGraph({
    periodId: selectedPeriodId || data?.period?.id,
    closeRunId: data?.run.id ?? undefined,
    enabled: Boolean(data?.period?.id),
  })

  const selectedFinding = useMemo(
    () => data?.findings.find((finding) => finding.id === selectedFindingId) ?? selectedOpenFinding(data?.findings ?? []),
    [data?.findings, selectedFindingId],
  )
  const canRun = Boolean(data?.period?.id || selectedPeriodId)
  const canComment = Boolean(selectedFinding?.id && data?.run.id && commentBody.trim().length >= 3 && !commentMutation.isPending)
  const canRequestWaiver = Boolean(selectedFinding?.id && waiverReason.trim().length >= 10 && !waiverMutation.request.isPending)
  const canExportDraft = Boolean(data?.controls.packExportAvailable && data.run.id && !exportMutation.draft.isPending)
  const canExportCertified = Boolean(data?.controls.certificationAvailable && data.run.id && !exportMutation.certified.isPending)

  async function handleRun() {
    const periodId = selectedPeriodId || data?.period?.id
    if (!periodId) return
    const result = await runMutation.mutateAsync({ periodId })
    setSelectedPeriodId(result.period?.id ?? periodId)
    setSelectedFindingId(selectedOpenFinding(result.findings)?.id ?? null)
  }

  async function handleAssign(findingId: string) {
    await assignMutation.mutateAsync({ findingId })
  }

  async function handleComment() {
    if (!selectedFinding?.id) return
    await commentMutation.mutateAsync({
      findingId: selectedFinding.id,
      closeRunId: data?.run.id ?? undefined,
      body: commentBody,
    })
    setCommentBody("")
  }

  async function handleWaiverRequest() {
    if (!selectedFinding?.id) return
    await waiverMutation.request.mutateAsync({
      findingId: selectedFinding.id,
      reason: waiverReason,
    })
    setWaiverReason("")
  }

  async function handleDraftExport() {
    if (!data?.run.id) return
    const result = await exportMutation.draft.mutateAsync({ closeRunId: data.run.id })
    setLastExport(result)
    downloadClosePack(result)
  }

  async function handleCertifiedExport() {
    if (!data?.run.id) return
    const result = await exportMutation.certified.mutateAsync({ closeRunId: data.run.id })
    setLastExport(result)
    downloadClosePack(result)
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

  const isBlocked = data.run.status === "BLOCKED"
  const periodOptions = data.periods.recentPeriods
  const graph = graphQuery.data

  return (
    <div className="space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile
          label={t.status}
          value={data.run.status}
          detail={data.source.persisted ? t.persisted : t.livePreview}
          icon={isBlocked ? ShieldAlert : ShieldCheck}
          tone={isBlocked ? "danger" : "success"}
        />
        <MetricTile
          label={t.readiness}
          value={`${data.run.readinessScore}%`}
          detail={`${data.summary.passedCount}/${data.summary.checklistCount} gates passed`}
          icon={ClipboardCheck}
          tone={data.run.readinessScore >= 90 ? "success" : data.run.readinessScore >= 60 ? "warning" : "danger"}
        />
        <MetricTile
          label={t.evidenceCoverage}
          value={data.run.evidenceCoveragePct === null ? "n/a" : `${data.run.evidenceCoveragePct}%`}
          detail={`${data.summary.evidenceCount} ${t.evidenceItems.toLowerCase()}`}
          icon={Link2}
          tone={data.run.evidenceCoveragePct === null ? "warning" : data.run.evidenceCoveragePct >= 90 ? "success" : "warning"}
        />
        <MetricTile
          label={t.criticalBlockers}
          value={data.run.criticalBlockerCount.toString()}
          detail={`${data.run.highBlockerCount} high severity`}
          icon={data.run.criticalBlockerCount ? XCircle : CheckCircle2}
          tone={data.run.criticalBlockerCount ? "danger" : data.run.highBlockerCount ? "warning" : "success"}
        />
        <MetricTile
          label={t.openFindings}
          value={data.summary.openFindingCount.toString()}
          detail={`${data.summary.findingCount} total findings`}
          icon={AlertTriangle}
          tone={data.summary.openFindingCount ? "warning" : "success"}
        />
        <MetricTile
          label={t.trustLevel}
          value={data.source.trustLevel}
          detail={`${t.asOf}: ${formatDate(data.source.asOf, locale)}`}
          icon={BookOpenCheck}
          tone={data.source.trustLevel === "T4" ? "success" : data.source.trustLevel === "T0" ? "danger" : "warning"}
        />
      </div>

      <section
        className={cn(
          "flex min-w-0 flex-col gap-3 rounded-lg border px-4 py-3 lg:flex-row lg:items-center lg:justify-between",
          isBlocked ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]" : "border-[var(--dash-success)] bg-[var(--dash-success-soft)]",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isBlocked ? "bg-[rgba(239,106,106,0.18)] text-[var(--dash-danger)]" : "bg-[rgba(46,201,138,0.18)] text-[var(--dash-success)]",
            )}
          >
            {isBlocked ? <ShieldAlert className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold", isBlocked ? "text-[var(--dash-danger)]" : "text-[var(--dash-success)]")}>
              {isBlocked ? t.closeBlocked : t.closeReady}
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">
              {data.period
                ? `${data.period.name} - ${formatDateOnly(data.period.startDate, locale)} to ${formatDateOnly(data.period.endDate, locale)}`
                : t.noPeriod}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedPeriodId || data.period?.id || ""} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="h-10 min-w-[16rem] rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] text-[var(--dash-text)]">
              <SelectValue placeholder={t.period} />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.length ? (
                periodOptions.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name} - {period.status}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  {t.noPeriod}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleRun}
            disabled={!canRun || runMutation.isPending}
            className="dashboard-button-primary h-10 rounded-lg"
          >
            {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {runMutation.isPending ? t.running : t.run}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="dashboard-button-secondary h-10 rounded-lg"
          >
            {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t.refresh}
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChecklistPanel data={data} locale={locale} />
        <div className="space-y-5">
          <ControlsPanel data={data} locale={locale} />
          <ClosePackExportPanel
            data={data}
            locale={locale}
            lastExport={lastExport}
            canExportDraft={canExportDraft}
            canExportCertified={canExportCertified}
            isExportingDraft={exportMutation.draft.isPending}
            isExportingCertified={exportMutation.certified.isPending}
            onDraftExport={handleDraftExport}
            onCertifiedExport={handleCertifiedExport}
          />
        </div>
      </div>

      <FindingsPanel
        data={data}
        locale={locale}
        selectedFindingId={selectedFinding?.id ?? null}
        commentBody={commentBody}
        waiverReason={waiverReason}
        isAssigning={assignMutation.isPending}
        isCommenting={commentMutation.isPending}
        isRequestingWaiver={waiverMutation.request.isPending}
        canComment={canComment}
        canRequestWaiver={canRequestWaiver}
        onSelectFinding={setSelectedFindingId}
        onAssign={handleAssign}
        onCommentBodyChange={setCommentBody}
        onWaiverReasonChange={setWaiverReason}
        onComment={handleComment}
        onRequestWaiver={handleWaiverRequest}
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <EvidencePanel data={data} locale={locale} />
        <ProvenancePanel data={data} locale={locale} graph={graph} graphLoading={graphQuery.isFetching} />
      </div>
    </div>
  )
}

function ChecklistPanel({ data, locale }: { data: CloseAssuranceDashboardData; locale: Locale }) {
  const t = copy[locale]

  return (
    <Panel title={t.checklist} description={t.checklistDescription}>
      <div className="divide-y divide-[var(--dash-border-subtle)]">
        {data.checklist.map((item) => (
          <div key={item.key} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.1fr)] lg:items-center">
            <div className="min-w-0">
              <p className="font-medium text-[var(--dash-text)]">{item.label}</p>
              <p className="mt-1 text-xs text-[var(--dash-text-faint)]">{item.domain}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn("w-fit rounded-md", statusClass(item.status))}>
                {item.status}
              </Badge>
              <Badge variant="outline" className={cn("w-fit rounded-md", statusClass(item.severity))}>
                {item.severity}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-5 text-[var(--dash-text-soft)]">{item.detail}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--dash-text-faint)]">
                {item.evidenceCount} {t.evidenceItems.toLowerCase()} - {item.sourceService}
              </p>
              {item.blockerReason ? <p className="mt-1 text-xs leading-5 text-[var(--dash-warning)]">{item.blockerReason}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function FindingsPanel({
  data,
  locale,
  selectedFindingId,
  commentBody,
  waiverReason,
  isAssigning,
  isCommenting,
  isRequestingWaiver,
  canComment,
  canRequestWaiver,
  onSelectFinding,
  onAssign,
  onCommentBodyChange,
  onWaiverReasonChange,
  onComment,
  onRequestWaiver,
}: {
  data: CloseAssuranceDashboardData
  locale: Locale
  selectedFindingId: string | null
  commentBody: string
  waiverReason: string
  isAssigning: boolean
  isCommenting: boolean
  isRequestingWaiver: boolean
  canComment: boolean
  canRequestWaiver: boolean
  onSelectFinding: (findingId: string | null) => void
  onAssign: (findingId: string) => Promise<void>
  onCommentBodyChange: (value: string) => void
  onWaiverReasonChange: (value: string) => void
  onComment: () => Promise<void>
  onRequestWaiver: () => Promise<void>
}) {
  const t = copy[locale]
  const selectedFinding = data.findings.find((finding) => finding.id === selectedFindingId) ?? null

  return (
    <Panel title={t.blockers} description={t.blockersDescription}>
      {data.findings.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
              <tr>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.detail}</th>
                <th className="px-4 py-3">{t.source}</th>
                <th className="px-4 py-3">{t.owner}</th>
                <th className="px-4 py-3">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.findings.map((finding) => (
                <tr key={finding.id ?? `${finding.sourceType}-${finding.title}`} className="border-b border-[var(--dash-border-subtle)] align-top">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={cn("rounded-md", statusClass(finding.status))}>
                        {finding.status}
                      </Badge>
                      <Badge variant="outline" className={cn("rounded-md", statusClass(finding.severity))}>
                        {finding.severity}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--dash-text)]">{finding.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{finding.detail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">
                    {finding.domain}
                    <span className="block max-w-[16rem] truncate text-[var(--dash-text-faint)]">{finding.sourceService}</span>
                    <span className="block max-w-[16rem] truncate text-[var(--dash-text-faint)]">{finding.sourceType || "-"}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[12rem] truncate text-[var(--dash-text-soft)]">
                    {finding.ownerId || t.notSet}
                    {finding.assignedAt ? <span className="block text-xs text-[var(--dash-text-faint)]">{formatDate(finding.assignedAt, locale)}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!finding.id || isAssigning || ["RESOLVED", "WAIVED_WITH_APPROVAL"].includes(finding.status)}
                        onClick={() => finding.id && onAssign(finding.id)}
                        className="dashboard-button-secondary rounded-lg"
                      >
                        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        {t.assignToMe}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!finding.id}
                        onClick={() => onSelectFinding(finding.id)}
                        className="dashboard-button-secondary rounded-lg"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                        {t.addComment}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.noBlockers}</div>
      )}

      <div className="grid gap-4 border-t border-[var(--dash-border-subtle)] p-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--dash-text)]">{t.comments}</p>
              <p className="mt-1 truncate text-xs text-[var(--dash-text-faint)]">{selectedFinding?.title || t.noBlockers}</p>
            </div>
            <Badge variant="outline" className={cn("rounded-md", data.run.id ? statusClass("OPEN") : statusClass("UNAVAILABLE"))}>
              {data.run.id ? t.persisted : t.livePreview}
            </Badge>
          </div>
          <Textarea
            value={commentBody}
            onChange={(event) => onCommentBodyChange(event.target.value)}
            placeholder={t.commentPlaceholder}
            disabled={!selectedFinding?.id || !data.run.id}
            className="min-h-28 border-[var(--dash-border-subtle)] bg-[rgba(3,7,10,0.42)] text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
          />
          <Button
            type="button"
            onClick={onComment}
            disabled={!canComment}
            className="dashboard-button-primary mt-3 h-10 rounded-lg"
          >
            {isCommenting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
            {t.addComment}
          </Button>
        </div>

        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--dash-text)]">{t.requestWaiver}</p>
              <p className="mt-1 truncate text-xs text-[var(--dash-text-faint)]">{selectedFinding?.title || t.noBlockers}</p>
            </div>
            <Badge variant="outline" className={cn("rounded-md", statusClass("IN_REVIEW"))}>
              SoD
            </Badge>
          </div>
          <Textarea
            value={waiverReason}
            onChange={(event) => onWaiverReasonChange(event.target.value)}
            placeholder={t.waivePlaceholder}
            disabled={!selectedFinding?.id || ["RESOLVED", "WAIVED_WITH_APPROVAL"].includes(selectedFinding.status)}
            className="min-h-28 border-[var(--dash-border-subtle)] bg-[rgba(3,7,10,0.42)] text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
          />
          <Button
            type="button"
            onClick={onRequestWaiver}
            disabled={!canRequestWaiver}
            className="dashboard-button-primary mt-3 h-10 rounded-lg"
          >
            {isRequestingWaiver ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {t.requestWaiver}
          </Button>
        </div>
      </div>

      <div className="border-t border-[var(--dash-border-subtle)] p-4">
        {data.comments.length ? (
          <div className="grid gap-2">
            {data.comments.slice(0, 6).map((comment) => (
              <div key={comment.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{comment.authorId || t.notSet}</p>
                  <span className="text-xs text-[var(--dash-text-faint)]">{formatDate(comment.createdAt, locale)}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-[var(--dash-text-soft)]">{comment.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--dash-text-soft)]">{t.noComments}</p>
        )}
      </div>
    </Panel>
  )
}

function EvidencePanel({ data, locale }: { data: CloseAssuranceDashboardData; locale: Locale }) {
  const t = copy[locale]

  return (
    <Panel title={t.evidence} description={t.evidenceDescription}>
      {data.evidenceItems.length ? (
        <div className="max-h-[34rem] overflow-y-auto">
          <div className="divide-y divide-[var(--dash-border-subtle)]">
            {data.evidenceItems.map((item, index) => (
              <div key={item.id ?? `${item.evidenceType}-${index}`} className="grid gap-3 px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
                <Badge variant="outline" className={cn("w-fit rounded-md", evidenceClass(item.available))}>
                  {item.available ? t.available : t.unavailable}
                </Badge>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--dash-text)]">{item.sourceLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">
                    {item.evidenceType} - {item.sourceTable || t.notSet}
                  </p>
                  {item.unavailableReason ? <p className="mt-1 text-xs leading-5 text-[var(--dash-warning)]">{item.unavailableReason}</p> : null}
                  {item.sourceHash ? <p className="mt-1 max-w-full truncate text-xs text-[var(--dash-text-faint)]">Hash: {item.sourceHash}</p> : null}
                </div>
                <div className="text-left lg:text-right">
                  <Badge variant="outline" className={cn("rounded-md", provenanceClass(item.provenance))}>
                    {item.provenance}
                  </Badge>
                  <p className="mt-2 text-xs text-[var(--dash-text-faint)]">{formatDate(item.sourceDate, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.noEvidence}</div>
      )}
    </Panel>
  )
}

function ProvenancePanel({
  data,
  locale,
  graph,
  graphLoading,
}: {
  data: CloseAssuranceDashboardData
  locale: Locale
  graph: ReturnType<typeof useCloseEvidenceGraph>["data"]
  graphLoading: boolean
}) {
  const t = copy[locale]

  return (
    <div className="space-y-5">
      <Panel title={t.provenance} description={t.provenanceDescription}>
        <div className="divide-y divide-[var(--dash-border-subtle)]">
          {data.provenance.map((item) => (
            <div key={item.label} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1fr)] lg:items-center">
              <div className="min-w-0">
                <p className="font-medium text-[var(--dash-text)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--dash-text-faint)]">{item.periodStatus}</p>
              </div>
              <Badge variant="outline" className={cn("w-fit rounded-md", provenanceClass(item.provenance))}>
                {item.provenance}
              </Badge>
              <div className="min-w-0 text-xs leading-5 text-[var(--dash-text-soft)]">
                <p>{formatDate(item.asOf, locale)}</p>
                <p className="mt-1">{item.sourceTables.join(", ")}</p>
                {item.reason ? <p className="mt-1 text-[var(--dash-warning)]">{item.reason}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={t.graph} description={t.graphDescription}>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <MetricTile
            label={t.nodes}
            value={graphLoading && !graph ? "..." : (graph?.nodes.length ?? 0).toString()}
            detail={graph?.source.closeRunId || t.livePreview}
            icon={Layers3}
            tone={graph?.nodes.length ? "brand" : "warning"}
          />
          <MetricTile
            label={t.edges}
            value={graphLoading && !graph ? "..." : (graph?.edges.length ?? 0).toString()}
            detail={graph ? formatDate(graph.source.asOf, locale) : t.emptyGraph}
            icon={GitBranch}
            tone={graph?.edges.length ? "info" : "warning"}
          />
        </div>
      </Panel>
    </div>
  )
}

function ClosePackExportPanel({
  data,
  locale,
  lastExport,
  canExportDraft,
  canExportCertified,
  isExportingDraft,
  isExportingCertified,
  onDraftExport,
  onCertifiedExport,
}: {
  data: CloseAssuranceDashboardData
  locale: Locale
  lastExport: ClosePackExportResult | null
  canExportDraft: boolean
  canExportCertified: boolean
  isExportingDraft: boolean
  isExportingCertified: boolean
  onDraftExport: () => Promise<void>
  onCertifiedExport: () => Promise<void>
}) {
  const t = copy[locale]
  const disabledReason = data.run.id
    ? data.controls.certificationDisabledReason ?? data.controls.packExportDisabledReason
    : t.runRequired

  return (
    <Panel title={t.packExport} description={t.packExportDescription}>
      <div className="grid gap-3 p-4">
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--dash-text)]">{t.systemCertifiedNotice}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{disabledReason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn("rounded-md", statusClass(data.controls.packExportAvailable ? "READY" : "UNAVAILABLE"))}>
                {data.controls.packExportAvailable ? t.available : t.unavailable}
              </Badge>
              <Badge variant="outline" className={cn("rounded-md", statusClass(data.controls.certificationAvailable ? "READY" : "UNAVAILABLE"))}>
                {data.controls.certificationAvailable ? "CERTIFIED" : t.certifiedBlocked}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={onDraftExport}
            disabled={!canExportDraft}
            className="dashboard-button-primary h-10 rounded-lg"
          >
            {isExportingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExportingDraft ? t.exporting : t.exportDraft}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCertifiedExport}
            disabled={!canExportCertified}
            className="dashboard-button-secondary h-10 rounded-lg"
          >
            {isExportingCertified ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {isExportingCertified ? t.exporting : t.exportCertified}
          </Button>
        </div>

        {lastExport ? (
          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{t.lastExport}</p>
              <Badge variant="outline" className={cn("rounded-md", statusClass(lastExport.isCertified ? "READY" : "WARNING"))}>
                {lastExport.mode}
              </Badge>
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{t.hash}</dt>
                <dd className="mt-1 break-all text-[var(--dash-text-soft)]">{lastExport.contentHash}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{t.watermark}</dt>
                <dd className="mt-1 break-all text-[var(--dash-text-soft)]">{lastExport.watermarkId}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

function ControlsPanel({ data, locale }: { data: CloseAssuranceDashboardData; locale: Locale }) {
  const t = copy[locale]

  return (
    <Panel title={t.controls}>
      <div className="grid gap-3 p-4">
        <ControlFact
          icon={UserCheck}
          label={t.assignToMe}
          value={data.controls.assignmentRequiresPermission}
          ok
        />
        <ControlFact
          icon={ShieldCheck}
          label={t.requiresFreshAuth}
          value="accounting.close.waiver.approve"
          ok={data.controls.waiverApprovalRequiresFreshAuth}
        />
        <ControlFact
          icon={FileCheck2}
          label={t.certificationDisabled}
          value={data.controls.certificationAvailable ? "enabled" : "disabled"}
          ok={data.controls.certificationAvailable}
        />
        <ControlFact
          icon={Link2}
          label={t.exportDisabled}
          value={data.controls.packExportDisabledReason}
          ok={data.controls.packExportAvailable}
        />
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{t.sourceTables}</p>
          <p className="mt-2 text-sm leading-5 text-[var(--dash-text-soft)]">{data.source.sourceTables.join(", ")}</p>
        </div>
      </div>
    </Panel>
  )
}

function ControlFact({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: LucideIcon
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" />
          <span className="min-w-0 text-xs font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{label}</span>
        </div>
        <Badge variant="outline" className={cn("rounded-md", ok ? statusClass("READY") : statusClass("UNAVAILABLE"))}>
          {ok ? "on" : "off"}
        </Badge>
      </div>
      <p className="mt-2 break-words text-sm leading-5 text-[var(--dash-text-soft)]">{value}</p>
    </div>
  )
}
