"use client"

import { useMemo, useState, useTransition } from "react"
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
  CashCommandData,
  CashCommandTone,
  CashCommandTrustSignal,
  CashCommandTrustSignalId,
} from "@/services/cash-command/cash-command-contracts"

type CashCommandDashboardProps = {
  data: CashCommandData
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
    whatChanged: "What changed since yesterday",
    whatChangedDetail: "Current cash movements and newly visible risk signals from the last command window.",
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
  },
  fr: {
    readOnly: "Lecture seule",
    rbac: "Filtre RBAC",
    redaction: "Masquage sur",
    generated: "Genere",
    period: "Periode",
    trustBanner: "Banniere confiance cash",
    trustBannerDetail: "Signaux paiement, caisse, cloture et fraicheur issus des modeles de lecture fiables.",
    whatChanged: "Ce qui a change depuis hier",
    whatChangedDetail: "Mouvements de tresorerie et risques visibles dans la derniere fenetre de commande.",
    actionToday: "Actions a traiter aujourd'hui",
    actionTodayDetail: "Actions cash filtrees par permission, classees depuis les signaux metier et preuves caisse.",
    cashRisks: "Radar risque cash",
    cashRisksDetail: "Cash non rapproche, risque caisse et risque fournisseur classes pour aujourd'hui.",
    proof: "Liens de preuve",
    proofDetail: "Ouvrir les preuves disponibles sans exposer les identifiants fournisseur ni les details tenant.",
    openProof: "Ouvrir preuve",
    loadingProof: "Chargement preuve",
    proofError: "La piste de preuve n'a pas pu etre chargee en securite.",
    moduleState: "Modules observation",
    hiddenActions: "Certaines actions sont masquees car l'utilisateur n'a pas la permission requise.",
    drawer: "Caisse",
    modules: "Modules",
    noUnknownModules: "Aucun module demande inconnu.",
  },
} as const

export function CashCommandDashboard({ data, locale, title, subtitle }: CashCommandDashboardProps) {
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [commandMode, setCommandMode] = useState<BICommandMode>(data.commandBrief.mode)
  const [isPending, startTransition] = useTransition()
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const periodLabel = `${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`
  const primaryProofSubject = useMemo(
    () =>
      data.proofSubjects.find((subject): subject is AvailableProofSubject => subject.available) ??
      data.proofSubjects[0] ??
      null,
    [data.proofSubjects],
  )

  function openProofSubject(subject: AvailableProofSubject) {
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

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <BICommandBriefHeader
          brief={data.commandBrief}
          mode={commandMode}
          onModeChange={setCommandMode}
        />

        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.rbac}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.redaction}</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{title}</h1>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{subtitle}</p>
              </div>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-sm xl:min-w-[360px]")}>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
                <span className="font-medium text-[var(--dash-text)]">{data.organizationName ?? data.organizationId}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-[var(--dash-text-soft)]">
                <MetaLine label={t.generated} value={formatDateTime(data.generatedAt, formatterLocale)} />
                <MetaLine label={t.period} value={periodLabel} />
              </dl>
            </div>
          </div>
        </section>

        <CashTrustBanner signals={data.trustSignals} title={t.trustBanner} detail={t.trustBannerDetail} />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.cards.map((card) => (
            <BIKpiCard key={card.id} card={card} locale={formatterLocale} currencyCode={data.currency} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <BIWhatChangedStrip
            changes={data.changes}
            title={t.whatChanged}
            detail={t.whatChangedDetail}
            maxItems={4}
          />
          <BIActionPriorityBoard
            items={data.actionsToday}
            title={t.actionToday}
            detail={t.actionTodayDetail}
            maxItems={5}
          />
        </section>

        {data.actionQueue.filteredOutCount > 0 ? (
          <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-3")}>
            <div className="flex gap-2 text-sm text-[var(--dash-text)]">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
              <p>{t.hiddenActions}</p>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
          <BIRiskOpportunityRadar
            risks={data.risks}
            title={t.cashRisks}
            detail={t.cashRisksDetail}
            maxItems={3}
          />

          <section className={cn(dashboardPanelClass, "p-4")}>
            <div>
              <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.proof}</h2>
              <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.proofDetail}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <BIProofDrawerHost
                subject={primaryProofSubject}
                proofTrail={proofTrail}
                open={proofOpen}
                onOpenChange={setProofOpen}
                onOpenSubject={openProofSubject}
                triggerLabel={isPending ? t.loadingProof : t.openProof}
              />
              {data.proofSubjects.slice(1).map((subject) => (
                <BIProofDrawerHost
                  key={subject.label}
                  subject={subject}
                  proofTrail={proofTrail}
                  open={proofOpen}
                  onOpenChange={setProofOpen}
                  onOpenSubject={openProofSubject}
                  triggerLabel={isPending ? t.loadingProof : t.openProof}
                />
              ))}
            </div>
            {proofError ? (
              <div className="mt-4 rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm text-[var(--dash-text)]">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
                  <p>{proofError}</p>
                </div>
              </div>
            ) : null}
            <BITrustLegend compact className="mt-4" />
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <section className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.drawer}</h2>
                <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>
                  {data.drawerState.openDrawerCount}/{data.drawerState.drawerCount} open drawer(s)
                </p>
              </div>
              <Badge variant="outline" className={cn("border", dashboardToneClass(drawerTone(data.drawerState.highRiskAlertCount, data.drawerState.alertCount)))}>
                {data.drawerState.confidenceScore}%
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Live variance" value={formatMoney(data.drawerState.liveVariance, data.currency, formatterLocale)} tone={valueTone(data.drawerState.liveVariance)} />
              <MiniMetric label="Session variance" value={formatMoney(data.drawerState.sessionVariance, data.currency, formatterLocale)} tone={valueTone(data.drawerState.sessionVariance)} />
              <MiniMetric label="Alerts" value={String(data.drawerState.alertCount)} tone={drawerTone(data.drawerState.highRiskAlertCount, data.drawerState.alertCount)} />
            </div>
          </section>

          <section className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.moduleState}</h2>
                <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>
                  {data.moduleControl.mode} / {data.moduleControl.hardEnforcementEnabled ? "enforce" : "observe"}
                </p>
              </div>
              <Badge variant="outline" className={cn("border", dashboardToneClass(data.moduleControl.summary.wouldBlockCount ? "gold" : "success"))}>
                {data.moduleControl.summary.wouldBlockCount}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Entitled" value={String(data.moduleControl.summary.entitledCount)} tone="success" />
              <MiniMetric label="Read-only" value={String(data.moduleControl.summary.readOnlyCount)} tone="info" />
              <MiniMetric label="Dependency gaps" value={String(data.moduleControl.summary.dependencyGapCount)} tone={data.moduleControl.summary.dependencyGapCount ? "danger" : "success"} />
            </div>
            <p className={cn("mt-4 text-xs", dashboardFaintTextClass)}>
              {data.moduleControl.unknownRequestedModules.length
                ? data.moduleControl.unknownRequestedModules.join(", ")
                : t.noUnknownModules}
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}

function CashTrustBanner({
  signals,
  title,
  detail,
}: {
  signals: CashCommandTrustSignal[]
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
                <span className="truncate">{signal.label}</span>
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
                  {signal.freshness.state}
                </span>
              </div>
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
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value))
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
