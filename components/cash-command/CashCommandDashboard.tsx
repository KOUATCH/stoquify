"use client"

import { WorkspaceSectionNavigation } from "@/components/dashboard/WorkspaceSectionNavigation"
import styles from "./cash-command.module.css"
import { biCopy } from "@/lib/dashboard/bi-presentation"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Database,
  EyeOff,
  Landmark,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react"

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import {
  BIActionPriorityBoard,
  BICommandBriefHeader,
  BIKpiCard,
  BIProofDrawerHost,
  BIRiskOpportunityRadar,
  BITrustLegend,
  BIWhatChangedStrip,
} from "@/components/bi"
import { Badge } from "@/components/ui/badge"
import {
  dashboardFaintTextClass,
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
  dashboardToneText,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandMode, BIProofDrawerSubject } from "@/services/bi/bi-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import type {
  AuthorizedCashCommandData,
  CashCommandTone,
  CashCommandTrustSignal,
  CashCommandTrustSignalId,
} from "@/services/cash-command/cash-command-contracts"

type CashCommandDashboardProps = {
  data: AuthorizedCashCommandData
  locale: "en" | "fr"
  title: string
  subtitle: string
}

type AvailableProofSubject = Extract<BIProofDrawerSubject, { available: true }>

const trustIcons: Record<CashCommandTrustSignalId, typeof ShieldCheck> = {
  provider_evidence: Database,
  reconciliation_signoff: ShieldCheck,
  open_suspense: AlertTriangle,
  drawer_confidence: WalletCards,
  close_readiness: Landmark,
  freshness: RefreshCw,
}

const copy = {
  en: {
    readOnly: "Read-only",
    rbac: "RBAC filtered",
    redaction: "Redaction-safe",
    generated: "Generated",
    period: "Period",
    trustBanner: "Cash trust banner",
    trustBannerDetail: "Payment, drawer, close, and freshness signals carried from trusted read models.",
    reviewConditions: "Review conditions",
    whatChanged: "Current cash observations",
    whatChangedDetail: "Current source observations for this scope. No comparison with an earlier snapshot is available.",
    actionToday: "What needs action today",
    actionTodayDetail: "Permission-filtered cash actions ranked from business signals and drawer evidence.",
    cashRisks: "Cash risk radar",
    cashRisksDetail: "Unreconciled cash, drawer risk, and provider risk ranked for today.",
    proof: "Proof links",
    proofDetail: "Open available proof without exposing provider identifiers or tenant internals.",
    openProof: "Open proof",
    loadingProof: "Loading proof",
    proofError: "Proof trail could not be loaded safely.",
    moduleState: "Module observe",
    hiddenActions: "Some action items are hidden because this user lacks their required permission.",
    drawer: "Drawer",
    modules: "Modules",
    noUnknownModules: "No unknown requested modules.",
    openDrawers: "open drawer(s)",
    liveVariance: "Live variance",
    sessionVariance: "Session variance",
    alerts: "Alerts",
    entitled: "Entitled",
    dependencyGaps: "Dependency gaps",
    observe: "Observe",
    enforce: "Enforce",
  },
  fr: {
    readOnly: "Lecture seule",
    rbac: "Filtre RBAC",
    redaction: "Données protégées",
    generated: "Généré",
    period: "Période",
    trustBanner: "État des preuves de trésorerie",
    trustBannerDetail: "Signaux de paiement, de caisse, de clôture et de fraîcheur issus des sources autorisées.",
    reviewConditions: "Examiner les conditions",
    whatChanged: "Observations actuelles de trésorerie",
    whatChangedDetail: "Observations issues des sources actuelles pour ce périmètre. Aucune comparaison avec un instantané antérieur n’est disponible.",
    actionToday: "Actions à traiter aujourd’hui",
    actionTodayDetail: "Actions de trésorerie accessibles selon vos droits, classées à partir des signaux métier et des preuves de caisse.",
    cashRisks: "Risques de trésorerie",
    cashRisksDetail: "Trésorerie non rapprochée, risques de caisse et risques liés aux prestataires classés pour aujourd’hui.",
    proof: "Liens de preuve",
    proofDetail: "Consultez les preuves disponibles sans exposer les identifiants des prestataires ni les données internes de l’organisation.",
    openProof: "Ouvrir la preuve",
    loadingProof: "Chargement de la preuve",
    proofError: "La piste de preuve n’a pas pu être chargée en toute sécurité.",
    moduleState: "Contrôle des modules",
    hiddenActions: "Certaines actions sont masquées car vous ne disposez pas de l’autorisation requise.",
    drawer: "Caisse",
    modules: "Modules",
    noUnknownModules: "Aucun module demandé inconnu.",
    openDrawers: "caisse(s) ouverte(s)",
    liveVariance: "Écart actuel",
    sessionVariance: "Écart de session",
    alerts: "Alertes",
    entitled: "Modules autorisés",
    dependencyGaps: "Dépendances manquantes",
    observe: "Observation",
    enforce: "Application des contrôles",
  },
} as const

export function CashCommandDashboard({ data, locale, title, subtitle }: CashCommandDashboardProps) {
  const [commandMode, setCommandMode] = useState<BICommandMode>(data.commandBrief.mode)
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const periodLabel = `${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`
  // Remount synchronously when the server's evidence or authority scope changes.
  const proofScope = JSON.stringify([data.organizationId, data.periodStart, data.periodEnd, locale, data.proofSubjects])

  return (
    <div className={cn(styles.workspace, "dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]")}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] min-w-0 space-y-6 px-4 py-4 text-[var(--dash-text)] sm:px-6 sm:py-6">
        {(data.restrictedCapabilities?.length ?? 0) > 0 ? (
          <p role="status" className={cn(dashboardPanelClass, "p-4 text-sm text-[var(--dash-text)]")}>
            {locale === "fr" ? "Certains indicateurs ne sont pas accessibles avec vos autorisations ou modules actuels. Une valeur indisponible ne signifie pas un solde nul." : "Some indicators are unavailable with your current permissions or modules. An unavailable value does not mean a zero balance."}
          </p>
        ) : null}
        <BICommandBriefHeader
          brief={data.commandBrief}
          mode={commandMode}
          onModeChange={setCommandMode}
          locale={locale}
          timezone="UTC"
          periodTimezone="UTC"
        />

        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{title}</h2>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{subtitle}</p>
              </div>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-sm xl:min-w-[360px]")}>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
                <span className="font-medium text-[var(--dash-text)]">{data.organizationName ?? data.organizationId}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-[var(--dash-text-soft)]">
                <MetaLine label={`${t.generated} (UTC)`} value={formatDateTime(data.generatedAt, formatterLocale)} />
                <MetaLine label={`${t.period} (UTC)`} value={periodLabel} />
              </dl>
            </div>
          </div>
        </section>

        <WorkspaceSectionNavigation label={locale === "fr" ? "Sections de la page" : "Page sections"} items={[
          { id: "cash-signals", label: t.trustBanner },
          { id: "cash-actions", label: t.actionToday },
          { id: "cash-risks", label: t.cashRisks },
        ]} />
        <div id="cash-signals" className="scroll-mt-24">
        <CashTrustBanner signals={data.trustSignals} locale={locale} title={t.trustBanner} detail={t.trustBannerDetail} />
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.cards.map((card) => (
            <div key={card.id} className="min-w-0 space-y-2">
              <BIKpiCard card={card} locale={formatterLocale} currencyCode={data.currency} />
              {card.actionLink?.disabled && card.actionLink.disabledReason ? (
                <p className="px-1 text-xs text-[var(--dash-text-soft)]">{card.actionLink.disabledReason}</p>
              ) : null}
            </div>
          ))}
        </section>

        <section id="cash-actions" className="grid min-w-0 scroll-mt-24 gap-4 2xl:grid-cols-2">
          <BIWhatChangedStrip
            changes={data.changes}
            contentKind="observations"
            locale={locale}
            title={t.whatChanged}
            detail={t.whatChangedDetail}
            maxItems={4}
          />
          <BIActionPriorityBoard
            items={data.actionsToday}
            locale={locale}
            title={t.actionToday}
            detail={t.actionTodayDetail}
            maxItems={5}
          />
        </section>

        {data.actionQueue.filteredOutCount !== null && data.actionQueue.filteredOutCount > 0 ? (
          <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-3")}>
            <div className="flex gap-2 text-sm text-[var(--dash-text)]">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
              <p>{t.hiddenActions}</p>
            </div>
          </section>
        ) : null}

        <section id="cash-risks" className="grid min-w-0 scroll-mt-24 gap-4 2xl:grid-cols-2">
          <BIRiskOpportunityRadar
            className="[&_a]:[overflow-wrap:anywhere]"
            risks={data.risks}
            locale={locale}
            currencyCode={data.currency}
            title={t.cashRisks}
            detail={t.cashRisksDetail}
            maxItems={3}
          />

          <section className={cn(dashboardPanelClass, "p-4")}>
            <div>
              <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.proof}</h2>
              <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.proofDetail}</p>
            </div>
            <CashProofLinks key={proofScope} subjects={data.proofSubjects} locale={locale} />
            <BITrustLegend locale={locale} compact className="mt-4" />
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {data.drawerState ? <section className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.drawer}</h2>
                <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>
                  {data.drawerState.openDrawerCount}/{data.drawerState.drawerCount} {t.openDrawers}
                </p>
              </div>
              <Badge variant="outline" className={cn("border", dashboardToneClass(drawerTone(data.drawerState.highRiskAlertCount, data.drawerState.alertCount)))}>
                {data.drawerState.confidenceScore}%
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label={t.liveVariance} value={formatMoney(data.drawerState.liveVariance, data.currency, formatterLocale)} tone={valueTone(data.drawerState.liveVariance)} />
              <MiniMetric label={t.sessionVariance} value={formatMoney(data.drawerState.sessionVariance, data.currency, formatterLocale)} tone={valueTone(data.drawerState.sessionVariance)} />
              <MiniMetric label={t.alerts} value={String(data.drawerState.alertCount)} tone={drawerTone(data.drawerState.highRiskAlertCount, data.drawerState.alertCount)} />
            </div>
          </section> : null}

          {data.moduleControl ? <section className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.moduleState}</h2>
                <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>
                  {t[data.moduleControl.mode]} / {data.moduleControl.hardEnforcementEnabled ? t.enforce : t.observe}
                </p>
              </div>
              <Badge variant="outline" className={cn("border", dashboardToneClass(data.moduleControl.summary.wouldBlockCount ? "gold" : "success"))}>
                {data.moduleControl.summary.wouldBlockCount}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label={t.entitled} value={String(data.moduleControl.summary.entitledCount)} tone="success" />
              <MiniMetric label={t.readOnly} value={String(data.moduleControl.summary.readOnlyCount)} tone="info" />
              <MiniMetric label={t.dependencyGaps} value={String(data.moduleControl.summary.dependencyGapCount)} tone={data.moduleControl.summary.dependencyGapCount ? "danger" : "success"} />
            </div>
            <p className={cn("mt-4 text-xs", dashboardFaintTextClass)}>
              {data.moduleControl.unknownRequestedModules.length
                ? data.moduleControl.unknownRequestedModules.join(", ")
                : t.noUnknownModules}
            </p>
          </section> : null}
        </section>
      </div>
    </div>
  )
}

function CashProofLinks({ subjects, locale }: { subjects: BIProofDrawerSubject[]; locale: "en" | "fr" }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const mounted = useRef(true)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const t = copy[locale]
  const identity = (subject: AvailableProofSubject) => JSON.stringify([subject.organizationId, subject.subjectType, subject.subjectId])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; request.current++ }
  }, [])

  async function open(subject: AvailableProofSubject) {
    const sequence = ++request.current
    setSelected(identity(subject))
    setProofTrail(null)
    setError(null)
    setLoading(true)
    try {
      const response = await getProofTrailAction({ subjectType: subject.subjectType, subjectId: subject.subjectId })
      if (!mounted.current || sequence !== request.current) return
      if (!response.success || response.data.organizationId !== subject.organizationId || response.data.subjectType !== subject.subjectType || response.data.subjectId !== subject.subjectId) {
        throw new Error("Proof response does not match the selected subject")
      }
      setProofTrail(response.data)
    } catch {
      if (mounted.current && sequence === request.current) {
        setError(locale === "fr" ? "La preuve est indisponible. Fermez ce panneau puis rouvrez la preuve pour réessayer." : "Proof is unavailable. Close this panel and reopen the proof to retry.")
      }
    } finally {
      if (mounted.current && sequence === request.current) setLoading(false)
    }
  }

  function close() {
    request.current++
    setSelected(null)
    setProofTrail(null)
    setError(null)
    setLoading(false)
    const button = trigger.current
    // The shared drawer has no SheetTrigger; restore the actual initiating button.
    setTimeout(() => { if (mounted.current && button?.isConnected) button.focus() }, 0)
  }

  return <div className="mt-4 flex flex-wrap gap-2" onClickCapture={event => {
    const button = event.target instanceof Element ? event.target.closest("button") : null
    if (button && !button.closest('[role="dialog"]') && event.currentTarget.contains(button)) trigger.current = button
  }}>
    {subjects.map((subject, index) => {
      const active = subject.available && selected === identity(subject)
      return <BIProofDrawerHost key={subject.available ? identity(subject) : subject.label + index}
        locale={locale} subject={subject} proofTrail={active ? proofTrail : null} open={active}
        onOpenChange={value => { if (!value && active) close() }} onOpenSubject={open}
        triggerLabel={t.openProof} loadingLabel={t.loadingProof}
        isLoading={active && loading} error={active ? error : null} />
    })}
  </div>
}

function CashTrustBanner({
  signals,
  locale,
  title,
  detail,
}: {
  signals: CashCommandTrustSignal[]
  locale: "en" | "fr"
  title: string
  detail: string
}) {
  return (
    <section aria-label={title} className={cn(dashboardPanelClass, "p-4")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase leading-5 tracking-normal text-[var(--dash-text)]">{title}</h2>
            <p className={cn("text-xs leading-5", dashboardMutedTextClass)}>{detail}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {signals.map((signal) => {
          const Icon = trustIcons[signal.id]
          return (
            <div key={signal.id} className={cn("min-w-0 rounded-lg border p-3", dashboardToneClass(signal.tone))}>
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase leading-4">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{signal.label}</span>
              </div>
              <div className="mt-2 break-words text-lg font-semibold leading-tight tabular-nums">{signal.value}</div>
              {signal.detail ? <div className="mt-1 text-xs leading-4 opacity-85">{signal.detail}</div> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {signal.redactions.length ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border-subtle)] px-1.5 py-0.5 text-[0.68rem]">
                    <EyeOff className="h-3 w-3" aria-hidden="true" />
                    {signal.redactions.length}
                  </span>
                ) : null}
                {signal.blockers.length ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border-subtle)] px-1.5 py-0.5 text-[0.68rem]">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    {signal.blockers.length}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border-subtle)] px-1.5 py-0.5 text-[0.68rem]">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {biCopy[locale][signal.freshness.state]}
                </span>
              </div>
              {signal.blockers.length > 0 ? (
                <details className="mt-3 text-xs leading-5 [overflow-wrap:anywhere]">
                  <summary className="cursor-pointer rounded-md font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)]">
                    {copy[locale].reviewConditions}<span className="sr-only">: {signal.label}</span>
                  </summary>
                  <ul className="mt-2 space-y-3">
                    {signal.blockers.map(blocker => (
                      <li key={blocker.id}>
                        <p className="font-semibold">{blocker.title}</p>
                        <p>{blocker.detail}</p>
                        {blocker.nextAction ? <p className="mt-1">{blocker.nextAction}</p> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-[var(--dash-text)]">{value}</dd>
    </div>
  )
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: CashCommandTone }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
      <p className={cn("text-xs", dashboardMutedTextClass)}>{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", dashboardToneText(tone))}>{value}</p>
    </div>
  )
}

function drawerTone(highRiskAlertCount: number, alertCount: number): CashCommandTone {
  if (highRiskAlertCount > 0) return "danger"
  if (alertCount > 0) return "gold"
  return "success"
}

function valueTone(value: number): CashCommandTone {
  if (value < 0) return "danger"
  if (value > 0) return "gold"
  return "success"
}

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
  }).format(value)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(value))
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
