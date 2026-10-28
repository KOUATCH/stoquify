import Link from "next/link"
import { ArrowUpRight, Banknote, EyeOff, ShieldAlert, TimerReset } from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge"
import { BIStateSurface } from "@/components/bi/BIStateSurface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIActionLink, BIRiskRank } from "@/services/bi/bi-contracts"

type BIRiskOpportunityRadarProps = {
  risks: BIRiskRank[]
  title?: string
  detail?: string
  locale?: string
  currencyCode?: string
  className?: string
  maxItems?: number
}

export function BIRiskOpportunityRadar({
  risks,
  title = "Risk and opportunity radar",
  detail = "Ranked signals that deserve attention before they become leakage, delay, or missed upside.",
  locale = "en",
  currencyCode = "XAF",
  className,
  maxItems = 6,
}: BIRiskOpportunityRadarProps) {
  const visible = [...risks].sort((left, right) => left.rank - right.rank).slice(0, maxItems)

  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className={cn("text-sm", dashboardMutedTextClass)}>{detail}</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
          {risks.length} ranked
        </Badge>
      </div>

      {visible.length ? (
        <div className="mt-4 space-y-3">
          {visible.map((risk) => (
            <article key={risk.id} className={cn(dashboardRowClass, "p-3")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("border", dashboardToneClass(risk.rank <= 2 ? "danger" : "gold"))}>
                      #{risk.rank}
                    </Badge>
                    <BISeverityBadge severity={risk.severity} />
                    <BIStateBadge state={risk.state} />
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
                      <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
                      {risk.urgency}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{risk.title}</h3>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{risk.businessImpact || risk.detail}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                  {risk.moneyImpact !== null ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs font-medium text-[var(--dash-text)]">
                      <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatMoney(risk.moneyImpact, locale, currencyCode)}
                    </span>
                  ) : null}
                  {risk.actionLink ? <RiskActionButton action={risk.actionLink} /> : null}
                </div>
              </div>

              <BIEvidenceBadgeRow
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
          title="No ranked risk is visible"
          detail="When trusted signals detect leakage, delay, or opportunity, the radar will show the highest priority items here."
          className="mt-4"
        />
      )}
    </section>
  )
}

function RiskActionButton({ action }: { action: BIActionLink }) {
  if (action.disabled || !action.href) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title={action.disabledReason ?? undefined}
        className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        {action.label}
      </Button>
    )
  }

  return (
    <Button asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
      <Link href={action.href}>
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        {action.label}
      </Link>
    </Button>
  )
}

function formatMoney(value: number, locale: string, currencyCode: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value)
}
