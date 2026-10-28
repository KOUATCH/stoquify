import Link from "next/link"
import { ArrowUpRight, EyeOff, LockKeyhole } from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BIDrillThroughButton } from "@/components/bi/BIKpiCard"
import { BIStateBadge } from "@/components/bi/BIStateBadge"
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
import type { BICommandZone, BIKpiCard as BIKpiCardData } from "@/services/bi/bi-contracts"

type BIBusinessTruthZoneProps = {
  zone: BICommandZone
  locale?: string
  currencyCode?: string
  className?: string
}

export function BIBusinessTruthZone({
  zone,
  locale = "en",
  currencyCode = "XAF",
  className,
}: BIBusinessTruthZoneProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BIStateBadge state={zone.state} />
            <Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              {zone.moduleSlug}
            </Badge>
          </div>
          <h2 className="mt-3 text-base font-semibold text-[var(--dash-text)]">{zone.title}</h2>
          <p className="mt-1 text-sm font-medium text-[var(--dash-text)]">{zone.businessQuestion}</p>
          <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{zone.summary}</p>
        </div>
        <BIEvidenceBadgeRow
          evidenceGrade={zone.evidenceGrade}
          trustState={zone.trustState}
          freshness={zone.freshness}
        />
      </div>

      {zone.primaryMetric ? (
        <div className={cn(dashboardRowClass, "mt-4 p-3")}>
          <MetricInline metric={zone.primaryMetric} locale={locale} currencyCode={currencyCode} />
        </div>
      ) : (
        <BIStateSurface state={zone.state} className="mt-4" />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {zone.drillThrough ? <BIDrillThroughButton drillThrough={zone.drillThrough} /> : null}
        {zone.actions.slice(0, 3).map((action) =>
          action.disabled ? (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              disabled
              title={action.disabledReason ?? undefined}
              className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Button>
          ) : (
            <Button key={action.id} asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <Link href={action.href}>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {action.label}
              </Link>
            </Button>
          ),
        )}
      </div>

      {zone.blockers.length || zone.redactions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {zone.blockers.map((blocker) => (
            <Badge key={blocker.id} variant="outline" className={cn("border", dashboardToneClass("danger"))}>
              {blocker.title}
            </Badge>
          ))}
          {zone.redactions.map((redaction) => (
            <Badge key={redaction.id} variant="outline" className={cn("border", dashboardToneClass("gold"))}>
              <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
              {redaction.field}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function MetricInline({
  metric,
  locale,
  currencyCode,
}: {
  metric: BIKpiCardData
  locale: string
  currencyCode: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--dash-text)]">{metric.title}</p>
        <p className={cn("mt-1 text-xs leading-5", dashboardMutedTextClass)}>{metric.detail}</p>
      </div>
      <p className="shrink-0 text-2xl font-semibold tracking-normal text-[var(--dash-text)]">
        {formatBIValue(metric.value, metric.format, metric.unit, locale, currencyCode)}
      </p>
    </div>
  )
}

function formatBIValue(
  value: BIKpiCardData["value"],
  format: BIKpiCardData["format"],
  unit: string,
  locale: string,
  currencyCode: string,
) {
  if (value === null || value === undefined || value === "") return "No value"
  if (typeof value === "string") return value

  if (format === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (format === "percent") {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: format === "score" ? 1 : 2,
  }).format(value)

  return unit ? `${formatted} ${unit}` : formatted
}
