"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { BIActionButton } from "@/components/bi/BIActionButton"
import { BISeverityBadge } from "@/components/bi/BIStateBadge"
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  CreditCard,
  EyeOff,
  FileCheck2,
  Landmark,
  ListChecks,
  LockKeyhole,
  Network,
  PackageSearch,
  ShieldCheck,
  Truck,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react"

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import {
  BIActionPriorityBoard,
  BIBusinessTruthZone,
  BICommandBriefHeader,
  BIProofDrawerHost,
  BIRiskOpportunityRadar,
  BITrustLegend,
  BIWhatChangedStrip,
} from "@/components/bi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  dashboardEmptyClass,
  dashboardFaintTextClass,
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardSeverityClass,
  dashboardStatStyle,
  dashboardToneClass,
  dashboardToneText,
  type DashboardSeverity,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandMode, BIProofDrawerSubject } from "@/services/bi/bi-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import type {
  OwnerWarRoomCardId,
  OwnerWarRoomCardState,
  OwnerWarRoomData,
  OwnerWarRoomTone,
} from "@/services/owner-war-room/owner-war-room-contracts"

type OwnerWarRoomDashboardProps = {
  data: OwnerWarRoomData
  locale: "en" | "fr"
  title: string
  subtitle: string
}

type AvailableBIProofSubject = Extract<BIProofDrawerSubject, { available: true }>

const cardIcons: Record<OwnerWarRoomCardId, typeof Wallet> = {
  cash_at_risk: Wallet,
  reconciliation_exceptions: CreditCard,
  stock_cash_exposure: Boxes,
  supplier_commitments: Truck,
  payroll_exposure: UserCheck,
  close_readiness: FileCheck2,
  action_queue: ListChecks,
  module_observe: Network,
}

const copy = {
  en: {
    briefView: "Daily priorities",
    summary: "Attention summary",
    acknowledgementHelp: "Mark this brief as read for this visit. This does not resolve any action.",
    criticalActions: "Critical actions",
    highPriorityActions: "High-priority actions",
    staleIndicators: "Stale indicators",
    blockedIndicators: "Blocked indicators",
    commandView: "Operational detail",
    investigateView: "Evidence and controls",
    open: "Open",
    controlDetail: "Cash, close, and module controls that need attention.",
    catalog: "Catalog",
    entitled: "Entitled",
    wouldBlock: "Would block",
    trials: "Trials",
    dependencyGaps: "Dependency gaps",
    readOnly: "Read-only",
    evidenceBacked: "Evidence-backed",
    observeMode: "Observe mode",
    sinceYesterday: "Since yesterday",
    sinceYesterdayDetail: "Important cash, close, evidence, and proof-linked movements opened in the last day.",
    ownerRisks: "Owner risks",
    ownerRisksDetail: "Cash at risk, blocked close items, stale evidence, and stock-to-cash exposure ranked for today.",
    proofLinkedActions: "Top proof-linked actions",
    proofLinkedActionsDetail: "Visible actions opened since yesterday with proof context already authorized for this user.",
    truthZones: "Business truth zones",
    briefProof: "Brief proof",
    acknowledgeBrief: "Acknowledge brief",
    acknowledged: "Acknowledged",
    acknowledgedDetail: "Marked for this session.",
    generated: "Generated",
    period: "Period",
    critical: "Critical",
    high: "High",
    redacted: "Redacted",
    stale: "Stale",
    blocked: "Blocked",
    upgrades: "Upgrade prompts",
    sourceModules: "Source modules",
    requiredPermission: "Required permission",
    blockers: "Blockers",
    redactions: "Redactions",
    freshness: "Freshness",
    actionQueue: "Owner action queue",
    actionQueueDetail: "Open an action to review its evidence and next step.",
    noActions: "No open actions are visible to you in this organization.",
    filtered: "Some actions are hidden because the current user does not have their required permission.",
    proofTrail: "Proof trail",
    proofTrailDetail: "Open evidence chains from supported records without leaving the command center.",
    openProof: "Open proof",
    unavailable: "Unavailable",
    loadingProof: "Loading proof",
    proofError: "Proof trail could not be loaded safely.",
    riskStrips: "Control strips",
    moduleState: "Module state",
    moduleStateDetail: "Observe mode keeps existing workflows visible while showing what enforcement would affect.",
    unknownModules: "Unknown requested modules",
    noUnknownModules: "No unknown requested modules.",
    state: {
      loading: "Loading",
      empty: "Empty",
      ready: "Ready",
      partial: "Partial",
      stale: "Stale",
      blocked: "Blocked",
      redacted: "Redacted",
      permission_denied: "Permission limited",
      module_unavailable: "Module unavailable",
      upgrade_request: "Upgrade request",
      safe_error: "Safe error",
    } satisfies Record<OwnerWarRoomCardState, string>,
    unit: {
      value: "value",
      items: "items",
      orders: "orders",
      runs: "runs",
      score: "score",
      actions: "actions",
      modules: "modules",
    },
  },
  fr: {
    briefView: "Priorités du jour",
    summary: "Points d’attention",
    acknowledgementHelp: "Marquez cette synthèse comme lue pour cette visite. Cela ne résout aucune action.",
    criticalActions: "Actions critiques",
    highPriorityActions: "Actions prioritaires",
    staleIndicators: "Indicateurs périmés",
    blockedIndicators: "Indicateurs bloqués",
    commandView: "Détail opérationnel",
    investigateView: "Preuves et contrôles",
    open: "Ouvrir",
    controlDetail: "Contrôles de trésorerie, de clôture et de modules à examiner.",
    catalog: "Catalogue",
    entitled: "Autorisés",
    wouldBlock: "Blocages potentiels",
    trials: "Essais",
    dependencyGaps: "Dépendances manquantes",
    readOnly: "Lecture seule",
    evidenceBacked: "Appuyé sur des preuves",
    observeMode: "Mode observation",
    sinceYesterday: "Depuis hier",
    sinceYesterdayDetail: "Évolutions de trésorerie, de clôture et de preuves au cours de la dernière journée.",
    ownerRisks: "Risques à examiner",
    ownerRisksDetail: "Trésorerie à risque, blocages de clôture, preuves périmées et exposition des stocks, classés pour aujourd’hui.",
    proofLinkedActions: "Actions prioritaires et preuves",
    proofLinkedActionsDetail: "Actions ouvertes depuis hier et preuves accessibles selon vos droits.",
    truthZones: "Données métier et preuves",
    briefProof: "Preuve de la synthèse",
    acknowledgeBrief: "Marquer comme lu",
    acknowledged: "Lu",
    acknowledgedDetail: "Marqué comme lu pour cette visite uniquement.",
    generated: "Généré",
    period: "Période",
    critical: "Critique",
    high: "Élevé",
    redacted: "Masqué",
    stale: "Périmé",
    blocked: "Bloqué",
    upgrades: "Demandes de module",
    sourceModules: "Modules sources",
    requiredPermission: "Permission requise",
    blockers: "Blocages",
    redactions: "Masquages",
    freshness: "Fraîcheur",
    actionQueue: "Actions du propriétaire",
    actionQueueDetail: "Ouvrez une action pour examiner ses preuves et la prochaine étape.",
    noActions: "Aucune action ouverte n’est visible pour vous dans cette organisation.",
    filtered: "Certaines actions sont masquées selon vos droits d’accès.",
    proofTrail: "Piste de preuve",
    proofTrailDetail: "Consultez les preuves des opérations disponibles sans quitter cette page.",
    openProof: "Consulter les preuves",
    unavailable: "Indisponible",
    loadingProof: "Chargement des preuves",
    proofError: "Les preuves n’ont pas pu être chargées. Réessayez depuis cette page.",
    riskStrips: "Contrôles à examiner",
    moduleState: "État des modules",
    moduleStateDetail: "Le mode observation conserve les parcours actuels et indique les restrictions qui s’appliqueraient.",
    unknownModules: "Modules demandés inconnus",
    noUnknownModules: "Aucun module demandé inconnu.",
    state: {
      loading: "Chargement",
      empty: "Vide",
      ready: "Prêt",
      partial: "Partiel",
      stale: "Périmé",
      blocked: "Bloqué",
      redacted: "Masqué",
      permission_denied: "Accès limité",
      module_unavailable: "Module indisponible",
      upgrade_request: "Demande de module",
      safe_error: "Indisponible",
    } satisfies Record<OwnerWarRoomCardState, string>,
    unit: {
      value: "valeur",
      items: "éléments",
      orders: "commandes",
      runs: "paies",
      score: "score",
      actions: "actions",
      modules: "modules",
    },
  },
} as const

const stateTone: Record<OwnerWarRoomCardState, OwnerWarRoomTone> = {
  loading: "muted",
  empty: "muted",
  ready: "success",
  partial: "gold",
  stale: "gold",
  blocked: "danger",
  redacted: "gold",
  permission_denied: "danger",
  module_unavailable: "danger",
  upgrade_request: "gold",
  safe_error: "danger",
}

export function OwnerWarRoomDashboard({ data, locale, title, subtitle }: OwnerWarRoomDashboardProps) {
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [commandMode, setCommandMode] = useState<BICommandMode>(data.morningBrief.commandBrief.mode)
  const [briefAcknowledged, setBriefAcknowledged] = useState(
    data.morningBrief.acknowledgement.state === "acknowledged",
  )
  const [isPending, startTransition] = useTransition()
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const periodLabel = `${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`
  const topCards = useMemo(() => data.cards.slice(0, 8), [data.cards])
  const briefProofSubject = useMemo<BIProofDrawerSubject | null>(
    () =>
      data.morningBrief.proofSubjects.find(
        (subject): subject is AvailableBIProofSubject => subject.available,
      ) ??
      data.morningBrief.proofSubjects[0] ??
      null,
    [data.morningBrief.proofSubjects],
  )

  function loadProofTrail(subject: { subjectType: OwnerWarRoomData["proofSubjects"][number]["subjectType"]; subjectId: string }) {
    if (!subject.subjectId) return
    setProofError(null)
    setProofOpen(true)
    startTransition(async () => {
      const response = await getProofTrailAction({
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
      })
      if (response.success) {
        setProofTrail(response.data)
        return
      }
      setProofTrail(null)
      setProofError(response.error || t.proofError)
    })
  }

  function openProofTrail(subject: OwnerWarRoomData["proofSubjects"][number]) {
    if (!subject.enabled || !subject.subjectId) return
    loadProofTrail(subject)
  }

  function openBIProofTrail(subject: AvailableBIProofSubject) {
    loadProofTrail(subject)
  }

  return (
    <main aria-label={title} className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <p className="sr-only">{subtitle}</p>
        <BICommandBriefHeader
          compact
          locale={locale}
          brief={data.morningBrief.commandBrief}
          mode={commandMode}
          onModeChange={setCommandMode}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--dash-text-soft)]">
          <div className="min-w-0 space-y-1">
            <p className="break-words font-semibold text-[var(--dash-text)]">{data.organizationName ?? data.organizationId}</p>
            <p>{t.period}: {periodLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
            <BIProofDrawerHost
              locale={locale}
              isLoading={isPending}
              error={proofError}
              subject={briefProofSubject}
              proofTrail={proofTrail}
              open={proofOpen}
              onOpenChange={setProofOpen}
              onOpenSubject={openBIProofTrail}
              triggerLabel={t.openProof}
            />
          </div>
        </div>

        <dl aria-label={t.summary} className={cn(dashboardPanelClass, "grid grid-cols-2 gap-x-4 gap-y-3 p-3 xl:grid-cols-4")}>
          <SummaryTile label={t.criticalActions} value={data.summary.criticalCount} tone="danger" />
          <SummaryTile label={t.highPriorityActions} value={data.summary.highCount} tone="gold" />
          <SummaryTile label={t.staleIndicators} value={data.summary.staleCount} tone="gold" />
          <SummaryTile label={t.blockedIndicators} value={data.summary.blockedCount} tone="danger" />
        </dl>

        {commandMode === "brief" ? (
          <div className="space-y-4" aria-label={t.briefView}>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <BIActionPriorityBoard
                locale={locale}
                items={data.morningBrief.priorityActions}
                title={t.proofLinkedActions}
                detail={t.proofLinkedActionsDetail}
                maxItems={3}
              />
              <BIRiskOpportunityRadar
                locale={locale}
                risks={data.morningBrief.risks}
                title={t.ownerRisks}
                detail={t.ownerRisksDetail}
                maxItems={3}
              />
            </section>
            <BIWhatChangedStrip
              locale={locale}
              changes={data.morningBrief.changes}
              title={t.sinceYesterday}
              detail={t.sinceYesterdayDetail}
              maxItems={4}
            />
            {data.morningBrief.acknowledgement.supported ? (
              <section className={cn(dashboardPanelClass, "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between")}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", dashboardToneClass(briefAcknowledged ? "success" : "brand"))}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--dash-text)]">
                      {briefAcknowledged ? t.acknowledged : t.acknowledgeBrief}
                    </p>
                    <p className={cn("mt-1 text-xs", dashboardMutedTextClass)}>
                      {briefAcknowledged ? t.acknowledgedDetail : t.acknowledgementHelp}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={briefAcknowledged}
                  onClick={() => setBriefAcknowledged(true)}
                  className="w-full rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {briefAcknowledged ? t.acknowledged : t.acknowledgeBrief}
                </Button>
              </section>
            ) : null}

          </div>
        ) : null}

        {commandMode === "command" ? (
          <div className="space-y-4" aria-label={t.commandView}>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className={cn(dashboardPanelClass, "p-4")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.riskStrips}</h2>
                    <p className={cn("text-sm", dashboardMutedTextClass)}>
                      {t.controlDetail}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {data.summary.blockedCount} {t.blocked} / {data.summary.staleCount} {t.stale}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3">
                  {data.strips.map((strip) => (
                    <div key={strip.id} className={cn(dashboardRowClass, "p-4")}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                          <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", dashboardSeverityClass(severityToDashboardSeverity(strip.severity)))}>
                            {strip.severity === "critical" || strip.severity === "high" ? (
                              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-[var(--dash-text)]">{strip.title}</h3>
                              <StateBadge state={strip.state} label={t.state[strip.state]} />
                              <EvidenceGradeBadge grade={strip.evidenceGrade} locale={locale} />
                            </div>
                            <p className={cn("mt-2 text-sm leading-6", dashboardMutedTextClass)}>{strip.detail}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {strip.blockers.length ? (
                            <Badge variant="outline" className={cn("border", dashboardToneClass("danger"))}>
                              {strip.blockers.length} {t.blockers}
                            </Badge>
                          ) : null}
                          {strip.redactions.length ? (
                            <Badge variant="outline" className={cn("border", dashboardToneClass("gold"))}>
                              {strip.redactions.length} {t.redactions}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn(dashboardPanelClass, "p-4")}>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.actionQueue}</h2>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.actionQueueDetail}</p>
                </div>
                {data.actionQueue.filteredOutCount > 0 ? (
                  <div className="mt-4 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3 text-sm text-[var(--dash-text)]">
                    <div className="flex gap-2">
                      <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
                      <p>{t.filtered}</p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {data.actionQueue.actionItems.length ? (
                    data.actionQueue.actionItems.slice(0, 7).map((item) => (
                      <div key={item.id} className={cn(dashboardRowClass, "p-3")}>
                        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <BISeverityBadge severity={item.severity} locale={locale} />
                              <EvidenceGradeBadge grade={item.evidenceGrade} locale={locale} />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
                            <p className={cn("mt-1 text-xs leading-5", dashboardMutedTextClass)}>{item.nextStep}</p>
                          </div>
                          <BIActionButton
                            action={{ href: item.actionPath, label: t.open, disabled: false, disabledReason: null }}
                            locale={locale}
                            context={item.title}
                            className="sm:max-w-[45%] sm:shrink-0"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                            {locale === "fr" ? {
                              owner: "Dirigeant", accountant: "Comptable", finance: "Finance", stockkeeper: "Gestionnaire de stock",
                              purchasing: "Achats", payroll: "Paie", manager: "Responsable",
                            }[item.assignedRole] : {
                              owner: "Owner", accountant: "Accountant", finance: "Finance", stockkeeper: "Stockkeeper",
                              purchasing: "Purchasing", payroll: "Payroll", manager: "Manager",
                            }[item.assignedRole]}
                          </Badge>
                          <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                            {item.requiredPermission}
                          </Badge>
                          {item.redactions.length ? (
                            <Badge variant="outline" className={cn("border", dashboardToneClass("gold"))}>
                              <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                              {item.redactions.length} {t.redactions}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={dashboardEmptyClass}>{t.noActions}</div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {topCards.map((card) => (
                <article key={card.id} className={cn(dashboardPanelClass, "p-4")} style={dashboardStatStyle(card.tone)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--stat-soft)]">
                        {renderCardIcon(card.id, "h-5 w-5 text-[var(--stat-accent)]")}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-[var(--dash-text)]">{card.title}</h2>
                        <p className={cn("mt-1 line-clamp-2 text-xs leading-5", dashboardMutedTextClass)}>{card.detail}</p>
                      </div>
                    </div>
                    <StateBadge state={card.state} label={t.state[card.state]} />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-semibold tracking-normal text-[var(--dash-text)]">
                        {formatMetric(card.value, card.unit, formatterLocale)}
                      </p>
                      <p className={cn("mt-1 text-xs", dashboardFaintTextClass)}>
                        {t.unit[card.unit as keyof typeof t.unit] ?? card.unit}
                      </p>
                    </div>
                    <EvidenceGradeBadge grade={card.evidenceGrade} locale={locale} />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs">
                    <InfoLine icon={<Clock className="h-3.5 w-3.5" />} label={t.freshness}>
                      {card.freshness.stale ? card.freshness.staleReason ?? t.state.stale : t.state.ready}
                    </InfoLine>
                    <InfoLine icon={<LockKeyhole className="h-3.5 w-3.5" />} label={t.requiredPermission}>
                      {card.requiredPermission}
                    </InfoLine>
                    <InfoLine icon={<PackageSearch className="h-3.5 w-3.5" />} label={t.sourceModules}>
                      {card.sourceModules.join(", ")}
                    </InfoLine>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.blockers.length ? (
                      <Badge variant="outline" className={cn("border", dashboardToneClass("danger"))}>
                        {card.blockers.length} {t.blockers}
                      </Badge>
                    ) : null}
                    {card.redactions.length ? (
                      <Badge variant="outline" className={cn("border", dashboardToneClass("gold"))}>
                        <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                        {card.redactions.length} {t.redactions}
                      </Badge>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>

          </div>
        ) : null}

        {commandMode === "investigate" ? (
          <div className="space-y-4" aria-label={t.investigateView}>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t.redacted}: {data.summary.redactedCount}</Badge>
              <Badge variant="outline">{t.upgrades}: {data.summary.upgradePromptCount}</Badge>
              <Badge variant="outline">{t.observeMode}</Badge>
            </div>
            <section className="grid gap-4 xl:grid-cols-2">
              {data.morningBrief.zones.map((zone) => (
                <BIBusinessTruthZone key={zone.id} zone={zone} locale={formatterLocale} currencyCode="XAF" />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className={cn(dashboardPanelClass, "p-4")}>
                <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.proofTrail}</h2>
                <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.proofTrailDetail}</p>
                <div className="mt-4 space-y-3">
                  {data.proofSubjects.map((subject) => (
                    <button
                      key={subject.subjectType}
                      type="button"
                      disabled={!subject.enabled || isPending}
                      onClick={() => openProofTrail(subject)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition",
                        subject.enabled
                          ? "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] hover:border-[var(--dash-brand)]"
                          : "cursor-not-allowed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.18)] opacity-70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--dash-text)]">{subject.label}</p>
                          <p className={cn("mt-1 text-xs leading-5", dashboardMutedTextClass)}>
                            {subject.enabled ? subject.detail : subject.unavailableReason ?? t.unavailable}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                          {isPending && subject.enabled ? t.loadingProof : subject.enabled ? t.openProof : t.unavailable}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
                {proofError ? (
                  <div className="mt-4 rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm text-[var(--dash-text)]">
                    <div className="flex gap-2">
                      <XCircle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
                      <p>{proofError}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={cn(dashboardPanelClass, "p-4")}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.moduleState}</h2>
                    <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.moduleStateDetail}</p>
                  </div>
                  <Badge variant="outline" className={cn("border", dashboardToneClass(data.moduleControl.summary.wouldBlockCount ? "gold" : "success"))}>
                    {data.moduleControl.mode}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ModuleMetric label={t.catalog} value={data.moduleControl.summary.catalogCount} />
                  <ModuleMetric label={t.entitled} value={data.moduleControl.summary.entitledCount} />
                  <ModuleMetric label={t.wouldBlock} value={data.moduleControl.summary.wouldBlockCount} tone={data.moduleControl.summary.wouldBlockCount ? "gold" : "success"} />
                  <ModuleMetric label={t.trials} value={data.moduleControl.summary.trialCount} />
                  <ModuleMetric label={t.readOnly} value={data.moduleControl.summary.readOnlyCount} />
                  <ModuleMetric label={t.dependencyGaps} value={data.moduleControl.summary.dependencyGapCount} tone={data.moduleControl.summary.dependencyGapCount ? "danger" : "success"} />
                </div>
                <div className="mt-4 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-[var(--dash-brand)]" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[var(--dash-text)]">{t.unknownModules}</p>
                  </div>
                  <p className={cn("mt-2 text-sm", dashboardMutedTextClass)}>
                    {data.moduleControl.unknownRequestedModules.length
                      ? data.moduleControl.unknownRequestedModules.join(", ")
                      : t.noUnknownModules}
                  </p>
                </div>
              </div>
            </section>
            <BITrustLegend locale={locale} />
          </div>
        ) : null}
      </div>

    </main>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: OwnerWarRoomTone }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border-l-2 pl-3" style={{ borderColor: `var(--dash-${tone === "danger" ? "danger" : "gold"})` }}>
      <dt className={cn("text-xs font-medium", dashboardMutedTextClass)}>{label}</dt>
      <dd className="text-xl font-semibold tabular-nums text-[var(--dash-text)]">{value}</dd>
    </div>
  )
}

function ModuleMetric({ label, value, tone = "muted" }: { label: string; value: number; tone?: OwnerWarRoomTone }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
      <p className={cn("text-xs", dashboardMutedTextClass)}>{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", dashboardToneText(tone))}>{value}</p>
    </div>
  )
}

function StateBadge({ state, label }: { state: OwnerWarRoomCardState; label: string }) {
  return (
    <Badge variant="outline" className={cn("shrink-0 border text-xs", dashboardToneClass(stateTone[state]))}>
      {label}
    </Badge>
  )
}

function InfoLine({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2 text-[var(--dash-text-soft)]">
      <span className="mt-0.5 shrink-0 text-[var(--dash-text-faint)]">{icon}</span>
      <p className="min-w-0">
        <span className="font-medium text-[var(--dash-text)]">{label}: </span>
        <span className="break-words">{children}</span>
      </p>
    </div>
  )
}

function renderCardIcon(id: OwnerWarRoomCardId, className: string) {
  const Icon = cardIcons[id]
  return <Icon className={className} aria-hidden="true" />
}

function formatMetric(value: number | null, unit: string, locale: string) {
  if (value === null) return locale.startsWith("fr") ? "Total indisponible" : "Total unavailable"
  if (unit === "score") return `${Math.round(value)}%`
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === "value" ? 0 : 1,
    notation: unit === "value" && Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(value)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value))
}

function severityToDashboardSeverity(severity: string): DashboardSeverity {
  if (severity === "critical" || severity === "high") return "critical"
  if (severity === "medium") return "warning"
  if (severity === "low") return "info"
  return "info"
}
