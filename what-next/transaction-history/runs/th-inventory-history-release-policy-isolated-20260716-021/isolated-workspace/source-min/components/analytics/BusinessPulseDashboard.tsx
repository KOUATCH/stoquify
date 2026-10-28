"use client"

import { useMemo, useState } from "react"

import {
  BIActionPriorityBoard,
  BICommandBriefHeader,
  BIKpiCard,
  BIRiskOpportunityRadar,
  BIStateSurface,
  BITrustLegend,
  BIWhatChangedStrip,
} from "@/components/bi"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BICommandMode } from "@/services/bi/bi-contracts"
import type { BusinessPulseCommandData } from "@/services/analytics/business-pulse-contracts"

type BusinessPulseDashboardProps = {
  data: BusinessPulseCommandData
  locale: "en" | "fr"
}

const copy = {
  en: {
    pulse: "Business pulse",
    operatingReadModel: "Operational read model",
    source: "Source-owned",
    generated: "Generated",
    period: "Period",
    revenue: "Revenue",
    week: "Week",
    month: "Month",
    emptyCards: "Business pulse is blocked",
    emptyCardsDetail: "Resolve the reported blocker before rendering KPI cards.",
    whatChanged: "What changed",
    whatChangedDetail: "Revenue and transaction movement composed from trusted analytics services.",
    actions: "What needs action today",
    actionsDetail: "Server-ranked actions from sales, POS, and inventory signals.",
    risks: "Business pulse risks",
    risksDetail: "Signals that can affect today's operating rhythm or sales conversion.",
    trust: "Trust posture",
    trustDetail: "Operational analytics are useful for daily decisions and remain distinct from certified close evidence.",
  },
  fr: {
    pulse: "Pulse business",
    operatingReadModel: "Modele operationnel",
    source: "Source serveur",
    generated: "Genere",
    period: "Periode",
    revenue: "Chiffre d'affaires",
    week: "Semaine",
    month: "Mois",
    emptyCards: "Pulse business bloque",
    emptyCardsDetail: "Corrigez le blocage signale avant d'afficher les indicateurs.",
    whatChanged: "Ce qui a change",
    whatChangedDetail: "Mouvements ventes et transactions composes depuis les services analytiques.",
    actions: "Actions du jour",
    actionsDetail: "Actions classees cote serveur depuis ventes, POS et stock.",
    risks: "Risques business",
    risksDetail: "Signaux qui peuvent affecter le rythme operationnel ou la conversion des ventes.",
    trust: "Posture de confiance",
    trustDetail: "Les analyses operationnelles servent les decisions quotidiennes sans remplacer les preuves de cloture certifiees.",
  },
} as const

export function BusinessPulseDashboard({ data, locale }: BusinessPulseDashboardProps) {
  const [commandMode, setCommandMode] = useState<BICommandMode>(data.commandBrief.mode)
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-CM" : "en"
  const summaryCards = useMemo(
    () => [
      { label: t.revenue, value: formatMoney(data.summary.todaySales, data.currency, formatterLocale) },
      { label: t.week, value: formatMoney(data.summary.weekSales, data.currency, formatterLocale) },
      { label: t.month, value: formatMoney(data.summary.monthSales, data.currency, formatterLocale) },
    ],
    [data.currency, data.summary.monthSales, data.summary.todaySales, data.summary.weekSales, formatterLocale, t.month, t.revenue, t.week],
  )

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
                <Badge variant="outline" className={cn("border", dashboardToneClass("brand"))}>{t.pulse}</Badge>
                <Badge variant="outline" className={cn("border", dashboardToneClass("info"))}>{t.operatingReadModel}</Badge>
                <Badge variant="outline" className={cn("border", dashboardToneClass("success"))}>{t.source}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {summaryCards.map((card) => (
                  <div key={card.label} className={cn(dashboardRowClass, "p-3")}>
                    <p className={cn("text-xs font-medium uppercase", dashboardMutedTextClass)}>{card.label}</p>
                    <p className="mt-1 text-lg font-semibold tracking-normal text-[var(--dash-text)]">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-xs text-[var(--dash-text-soft)] xl:min-w-[360px]")}>
              <MetaLine label={t.generated} value={formatDateTime(data.generatedAt, formatterLocale)} />
              <MetaLine label={t.period} value={`${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`} />
            </div>
          </div>
        </section>

        {data.cards.length ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.cards.map((card) => (
              <BIKpiCard key={card.id} card={card} locale={formatterLocale} currencyCode={data.currency} />
            ))}
          </section>
        ) : (
          <BIStateSurface state={data.commandBrief.state} title={t.emptyCards} detail={t.emptyCardsDetail} />
        )}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <BIWhatChangedStrip
            changes={data.changes}
            title={t.whatChanged}
            detail={t.whatChangedDetail}
            maxItems={4}
          />
          <BIActionPriorityBoard
            items={data.actionsToday}
            title={t.actions}
            detail={t.actionsDetail}
            maxItems={5}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
          <BIRiskOpportunityRadar
            risks={data.risks}
            title={t.risks}
            detail={t.risksDetail}
            locale={formatterLocale}
            currencyCode={data.currency}
            maxItems={4}
          />
          <BITrustLegend title={t.trust} detail={t.trustDetail} compact />
        </section>
      </div>
    </main>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="font-medium text-[var(--dash-text)]">{label}: </span>
      <span className="break-words">{value}</span>
    </p>
  )
}

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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
