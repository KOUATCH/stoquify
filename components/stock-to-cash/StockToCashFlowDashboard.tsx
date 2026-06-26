"use client"

import { useState, useTransition } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  CircleDollarSign,
  EyeOff,
  GitBranch,
  PackageCheck,
  ShieldCheck,
} from "lucide-react"

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import {
  BICommandBriefHeader,
  BIKpiCard,
  BIProofDrawerHost,
  BIRiskOpportunityRadar,
  BIStateBadge,
  BITrustLegend,
} from "@/components/bi"
import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { Badge } from "@/components/ui/badge"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
  dashboardToneText,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandMode, BIFlowStep, BIProofDrawerSubject } from "@/services/bi/bi-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import type { StockToCashFlowData } from "@/services/stock-to-cash/stock-to-cash-contracts"

type StockToCashFlowDashboardProps = {
  data: StockToCashFlowData
  locale: "en" | "fr"
}

type AvailableProofSubject = Extract<BIProofDrawerSubject, { available: true }>

const copy = {
  en: {
    title: "Stock-to-cash chain",
    subtitle: "Purchasing, stock, sales, cash, reconciliation, ledger, and close readiness in one read-only flow.",
    readOnly: "Read-only",
    sourceOwned: "Source-owned",
    honestProof: "Proof where supported",
    flow: "Flow steps",
    flowDetail: "Each step is derived from existing inventory, payment, ledger, or close read models.",
    proof: "Proof links",
    proofDetail: "Proof is shown only for supported subjects. Unsupported stock and PO steps stay route-only.",
    openProof: "Open proof",
    loadingProof: "Loading proof",
    proofError: "Proof trail could not be loaded safely.",
    riskTitle: "Trapped cash signals",
    riskDetail: "Blocked or partial steps that can distort stock-to-cash reporting.",
    summary: "Flow summary",
    unavailableProof: "Unavailable proof",
  },
  fr: {
    title: "Chaine stock-vers-cash",
    subtitle: "Achats, stock, ventes, cash, rapprochement, ledger et cloture dans un flux en lecture seule.",
    readOnly: "Lecture seule",
    sourceOwned: "Sources metier",
    honestProof: "Preuve si disponible",
    flow: "Etapes du flux",
    flowDetail: "Chaque etape vient des modeles inventaire, paiement, ledger ou cloture existants.",
    proof: "Liens de preuve",
    proofDetail: "Les preuves sont limitees aux sujets supportes. Le stock et les PO restent en navigation.",
    openProof: "Ouvrir preuve",
    loadingProof: "Chargement preuve",
    proofError: "La piste de preuve n'a pas pu etre chargee en securite.",
    riskTitle: "Cash bloque",
    riskDetail: "Etapes bloquees ou partielles qui peuvent fausser le reporting stock-vers-cash.",
    summary: "Synthese du flux",
    unavailableProof: "Preuve indisponible",
  },
} as const

export function StockToCashFlowDashboard({ data, locale }: StockToCashFlowDashboardProps) {
  const [mode, setMode] = useState<BICommandMode>(data.commandBrief.mode)
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"

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
        <BICommandBriefHeader brief={data.commandBrief} mode={mode} onModeChange={setMode} />

        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.sourceOwned}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.honestProof}</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{t.title}</h1>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{t.subtitle}</p>
              </div>
            </div>
            <div className={cn(dashboardRowClass, "grid gap-2 p-3 text-sm sm:grid-cols-2 xl:min-w-[460px]")}>
              <SummaryMetric label="Stock exposure" value={formatMoney(data.summary.stockCashExposure, data.currency, formatterLocale)} tone="gold" />
              <SummaryMetric label="Cash collected" value={formatMoney(data.summary.cashCollected, data.currency, formatterLocale)} tone="success" />
              <SummaryMetric label="Suspense" value={formatMoney(data.summary.unresolvedSuspenseAmount, data.currency, formatterLocale)} tone={data.summary.unresolvedSuspenseAmount > 0 ? "danger" : "success"} />
              <SummaryMetric label="Source links" value={String(data.summary.sourceLinkCount)} tone={data.summary.sourceLinkCount > 0 ? "success" : "gold"} />
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.cards.map((card) => (
            <BIKpiCard key={card.id} card={card} locale={formatterLocale} currencyCode={data.currency} />
          ))}
        </section>

        <section className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.flow}</h2>
              <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.flowDetail}</p>
            </div>
            <Badge variant="outline" className={cn("border", dashboardToneClass(data.summary.blockedStepCount ? "danger" : "success"))}>
              {data.summary.blockedStepCount} blocked
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-7">
            {data.flowSteps.map((step) => (
              <FlowStepCard key={step.id} step={step} locale={formatterLocale} currency={data.currency} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
          <BIRiskOpportunityRadar
            risks={data.risks}
            title={t.riskTitle}
            detail={t.riskDetail}
            maxItems={4}
          />

          <section className={cn(dashboardPanelClass, "p-4")}>
            <div>
              <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.proof}</h2>
              <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{t.proofDetail}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.proofSubjects.map((subject) => (
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
            {data.summary.unavailableProofCount > 0 ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--dash-text-soft)]">
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {data.summary.unavailableProofCount} {t.unavailableProof}
                </span>
              </div>
            ) : null}
            <BITrustLegend compact className="mt-4" />
          </section>
        </section>
      </div>
    </main>
  )
}

function FlowStepCard({
  step,
  locale,
  currency,
}: {
  step: BIFlowStep
  locale: string
  currency: string
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
          {iconForStep(step.id)}
        </span>
        <BIStateBadge state={step.state} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase leading-4 text-[var(--dash-text-soft)]">Step {step.order}</p>
      <h3 className="mt-1 text-sm font-semibold leading-5 text-[var(--dash-text)]">{step.label}</h3>
      <p className={cn("mt-2 line-clamp-3 text-xs leading-5", dashboardMutedTextClass)}>{step.detail}</p>
      <p className="mt-3 text-lg font-semibold tracking-normal text-[var(--dash-text)]">
        {formatBIValue(step.value, step.format, step.unit, locale, currency)}
      </p>
      <BIEvidenceBadgeRow
        className="mt-3"
        evidenceGrade={step.evidenceGrade}
        trustState={step.trustState}
        freshness={step.freshness}
      />
      {step.blockers.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {step.blockers.slice(0, 2).map((blocker) => (
            <Badge key={blocker.id} variant="outline" className={cn("border", dashboardToneClass("danger"))}>
              {blocker.title}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-3">
      <p className="text-xs text-[var(--dash-text-soft)]">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", dashboardToneText(tone))}>{value}</p>
    </div>
  )
}

function iconForStep(stepId: string) {
  if (stepId.includes("purchase")) return <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
  if (stepId.includes("stock") || stepId.includes("available")) return <PackageCheck className="h-4 w-4" aria-hidden="true" />
  if (stepId.includes("sold") || stepId.includes("cash")) return <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
  if (stepId.includes("ledger")) return <GitBranch className="h-4 w-4" aria-hidden="true" />
  return <ShieldCheck className="h-4 w-4" aria-hidden="true" />
}

function formatBIValue(
  value: BIFlowStep["value"],
  format: BIFlowStep["format"],
  unit: string | null,
  locale: string,
  currency: string,
) {
  if (value === null || value === undefined || value === "") return "No value"
  if (typeof value === "string") return value
  if (format === "currency") return formatMoney(value, unit || currency, locale)
  if (format === "percent") {
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value)
  }
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: format === "score" ? 1 : 2 }).format(value)
  return unit ? `${formatted} ${unit}` : formatted
}

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
  }).format(value)
}
