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
    timezone: "Organization timezone",
    unavailable: "Unavailable",
    stockCoverage: "Stock evidence coverage",
    coverageDetail: "Inventory-tracked items with at least one stock record in the active location scope. This does not establish complete location-by-item coverage or synchronization.",
    coverageGap: "Items without a stock record in this scope may not be stocked here. Their quantity is unknown; do not treat it as zero. Review item and location setup before relying on stock warnings.",
    coverageNone: "No active items track inventory. Stock warnings are not applicable.",
    revenue: "Revenue",
    week: "Week",
    month: "Month",
    emptyCards: "Business pulse is blocked",
    emptyCardsDetail: "Resolve the reported blocker before rendering KPI cards.",
    whatChanged: "What changed",
    whatChangedDetail: "Today’s recorded activity versus yesterday’s full day. These are not comparable trading periods.",
    actions: "Suggested reviews",
    actionsDetail: "Suggestions from recorded activity, without assigned owners or deadlines. Order does not indicate assessed priority.",
    emptyActions: "No review suggestions",
    emptyActionsDetail: "These limited checks do not establish that operations are healthy or all risks are covered.",
    risks: "Observations to assess",
    risksDetail: "Observed conditions, without a risk score, urgency assessment or measured loss. Order is for display only.",
    trust: "Trust posture",
    trustDetail: "Operational analytics are useful for daily decisions and remain distinct from certified close evidence.",
  },
  fr: {
    pulse: "Pulse business",
    operatingReadModel: "Modele operationnel",
    source: "Source serveur",
    generated: "Genere",
    period: "Periode",
    timezone: "Fuseau horaire de l’organisation",
    unavailable: "Indisponible",
    stockCoverage: "Couverture des données de stock",
    coverageDetail: "Articles suivis en stock disposant d’au moins une fiche dans le périmètre des sites actifs. Cela ne prouve pas l’exhaustivité par article et par site, ni la synchronisation.",
    coverageGap: "Les articles sans fiche de stock dans ce périmètre peuvent ne pas être stockés ici. Leur quantité est inconnue ; ne l’assimilez pas à zéro. Vérifiez les articles et les sites avant de vous fier aux alertes de stock.",
    coverageNone: "Aucun article actif n’est suivi en stock. Les alertes de stock ne s’appliquent pas.",
    revenue: "Chiffre d'affaires",
    week: "Semaine",
    month: "Mois",
    emptyCards: "Pulse business bloque",
    emptyCardsDetail: "Corrigez le blocage signale avant d'afficher les indicateurs.",
    whatChanged: "Ce qui a change",
    whatChangedDetail: "Activité enregistrée aujourd’hui comparée à la journée entière d’hier. Les périodes d’activité ne sont pas équivalentes.",
    actions: "Examens suggérés",
    actionsDetail: "Suggestions issues des données, sans responsable ni échéance attribués. L’ordre ne représente pas une priorité évaluée.",
    emptyActions: "Aucun examen suggéré",
    emptyActionsDetail: "Ces contrôles limités ne prouvent pas le bon fonctionnement des opérations ni la couverture de tous les risques.",
    risks: "Observations à évaluer",
    risksDetail: "Constats sans score de risque, évaluation de l’urgence ni perte mesurée. L’ordre sert uniquement à l’affichage.",
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
      { label: t.revenue, value: data.commandBrief.state === "blocked" ? t.unavailable : formatMoney(data.summary.todaySales, data.currency, formatterLocale) },
      { label: t.week, value: data.commandBrief.state === "blocked" ? t.unavailable : formatMoney(data.summary.weekSales, data.currency, formatterLocale) },
      { label: t.month, value: data.commandBrief.state === "blocked" ? t.unavailable : formatMoney(data.summary.monthSales, data.currency, formatterLocale) },
    ],
    [data.commandBrief.state, data.currency, data.summary.monthSales, data.summary.todaySales, data.summary.weekSales, formatterLocale, t.month, t.revenue, t.week, t.unavailable],
  )

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <BICommandBriefHeader
          brief={data.commandBrief}
          mode={commandMode}
          onModeChange={setCommandMode}
          locale={formatterLocale}
          timezone={data.timezone}
        />

        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border", dashboardToneClass("brand"))}>{t.pulse}</Badge>
                <Badge variant="outline" className={cn("border", dashboardToneClass("info"))}>{t.operatingReadModel}</Badge>
                <Badge variant="outline" className={cn("border", dashboardToneClass("info"))}>{t.source}</Badge>
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
              <MetaLine label={t.generated} value={formatDateTime(data.generatedAt, formatterLocale, data.timezone)} />
              <MetaLine label={t.period} value={`${formatDate(data.periodStart, formatterLocale, data.timezone)} - ${formatDate(data.periodEnd, formatterLocale, data.timezone)}`} />
              <MetaLine label={t.timezone} value={data.timezone} />
            </div>
          </div>
        </section>

        {data.summary.stockCoverage ? (
          <section role="status" data-testid="pulse-stock-coverage" className={cn(dashboardPanelClass, "space-y-2 p-4 border", dashboardToneClass("info"))}>
            <h2 className="text-base font-semibold">{t.stockCoverage}</h2>
            <p className="text-lg font-semibold">{new Intl.NumberFormat(formatterLocale).format(data.summary.stockCoverage.itemsWithRecords)} / {new Intl.NumberFormat(formatterLocale).format(data.summary.stockCoverage.activeItems)}</p>
            <p className="text-sm leading-6">{t.coverageDetail}</p>
            {data.summary.stockCoverage.itemsWithoutRecords > 0 ? <p className="text-sm leading-6">{new Intl.NumberFormat(formatterLocale).format(data.summary.stockCoverage.itemsWithoutRecords)} · {t.coverageGap}</p> : null}
            {data.summary.stockCoverage.activeItems === 0 ? <p className="text-sm leading-6">{t.coverageNone}</p> : null}
          </section>
        ) : null}

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
            emptyTitle={t.emptyActions}
            emptyDetail={t.emptyActionsDetail}
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
  }).format(value)
}

function formatDate(value: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: timezone }).format(new Date(value))
}

function formatDateTime(value: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
