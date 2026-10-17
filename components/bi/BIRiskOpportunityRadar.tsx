import { biLocale, biCopy } from "@/lib/dashboard/bi-presentation"
import { Banknote, EyeOff, ShieldAlert, TimerReset } from "lucide-react"

import { BIActionButton } from "@/components/bi/BIActionButton"
import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge"
import { BIStateSurface } from "@/components/bi/BIStateSurface"
import { Badge } from "@/components/ui/badge"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIRiskRank, BIUnassessedObservation } from "@/services/bi/bi-contracts"

type BIRiskOpportunityRadarProps = {
  risks: (BIRiskRank | BIUnassessedObservation)[]
  title?: string
  detail?: string
  locale?: string
  currencyCode?: string
  className?: string
  maxItems?: number
}

export function BIRiskOpportunityRadar({
  risks,
  title,
  detail,
  locale = "en",
  currencyCode = "XAF",
  className,
  maxItems = 6,
}: BIRiskOpportunityRadarProps) {
  const visible = [...risks].sort((left, right) => left.rank - right.rank).slice(0, maxItems)

  return (
    <section className={cn(dashboardPanelClass, "min-w-0 p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title ?? biCopy[biLocale(locale)].radar}</h2>
          <p className={cn("text-sm", dashboardMutedTextClass)}>{detail ?? biCopy[biLocale(locale)].radarDetail}</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
          {risks.length} {locale.startsWith("fr") ? risks.length === 1 ? "signal" : "signaux" : risks.length === 1 ? "signal" : "signals"}
        </Badge>
      </div>

      {visible.length ? (
        <div className="mt-4 space-y-3">
          {visible.map((risk) => (
            <article key={risk.id} className={cn(dashboardRowClass, "p-3")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("border", dashboardToneClass(risk.severity === "high" || risk.severity === "critical" ? "danger" : risk.severity === "medium" ? "gold" : "info"))}>
                      #{risk.rank}
                    </Badge>
                    <BISeverityBadge severity={risk.severity} locale={locale} />
                    <BIStateBadge state={risk.state} locale={locale} />
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
                      <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
                      {(risk.urgency === "watch" ? locale.startsWith("fr") ? "à surveiller" : "watch" : risk.urgency === "now" || risk.urgency === "today" || risk.urgency === "soon" ? biCopy[biLocale(locale)][risk.urgency] : risk.urgency) ?? (locale.startsWith("fr") ? "Urgence non évaluée" : "Urgency not assessed")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{risk.title}</h3>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{risk.detail}</p>
                  {risk.businessImpact && risk.businessImpact !== risk.detail ? <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{risk.businessImpact}</p> : null}
                </div>
                <div className="flex min-w-0 flex-col items-start gap-2 lg:max-w-[50%] lg:items-end">
                  {risk.moneyImpact !== null ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs font-medium text-[var(--dash-text)]">
                      <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatMoney(risk.moneyImpact, locale, currencyCode)}
                    </span>
                  ) : null}
                  {risk.actionLink ? <BIActionButton action={risk.actionLink} locale={locale} context={risk.title} /> : null}
                </div>
              </div>

              <BIEvidenceBadgeRow locale={locale}
                className="mt-3"
                evidenceGrade={risk.evidenceGrade}
                trustState={risk.trustState}
                freshness={risk.freshness}
              />

              {risk.blockers.length || risk.redactions.length ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {risk.blockers.map((blocker) => (
                    <span key={blocker.id} className={cn("rounded-md border px-2 py-1", dashboardToneClass("danger"))}>
                      <ShieldAlert className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {blocker.title}
                    </span>
                  ))}
                  {risk.redactions.map((redaction) => (
                    <span key={redaction.id} className={cn("rounded-md border px-2 py-1", dashboardToneClass("gold"))}>
                      <EyeOff className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {redaction.field}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <BIStateSurface
          state="empty"
          title={locale.startsWith("fr") ? "Aucun signal affiché" : "No signals displayed"}
          detail={locale.startsWith("fr") ? "L’absence de signal ne prouve pas l’absence de risque. Consultez le périmètre et les limites des sources." : "An empty list does not establish absence of risk. Review the scope and source limitations."}
          className="mt-4"
        />
      )}
    </section>
  )
}

function formatMoney(value: number, locale: string, currencyCode: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(value)
}
