"use client"

import type { ReportProvenance } from "@/actions/analytics/financial-reports"
import {
  analyticsMutedTextClass,
  analyticsRowClass,
  analyticsToneClass,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { Badge } from "@/components/ui/badge"
import { useLocale, useTranslations } from "next-intl"

interface ReportTrustBannerProps {
  provenance?: ReportProvenance
}

export function ReportTrustBanner({ provenance }: ReportTrustBannerProps) {
  const locale = useLocale(), t = useTranslations("operationalReports")
  const date = (value: string, includeTime = false) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", ...(includeTime ? { timeStyle: "short" } : {}), timeZone: provenance?.timezone }).format(new Date(value))
  if (!provenance) {
    return (
      <div className="rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] px-4 py-3 text-sm text-[var(--dash-warning)]">
        {t("trustMissing")}
      </div>
    )
  }

  return (
    <div className={`${analyticsRowClass} min-w-0 px-4 py-3 [overflow-wrap:anywhere]`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={analyticsToneClass("muted")}>{t("trustSource")}</Badge>
            <Badge variant="outline" className={analyticsToneClass("info")}>{t(provenance.freshness === "CURRENT_AS_OF_GENERATION" ? "trustCurrent" : "trustHistory")}</Badge>
            <Badge variant="outline" className={analyticsToneClass("info")}>{t("trustInternal")}</Badge>
          </div>
          <p className={`text-sm ${analyticsMutedTextClass}`}>
            {t("trustPeriod", { from: date(provenance.periodStart), to: date(provenance.periodEnd), count: provenance.rowCount, at: date(provenance.generatedAt, true) })}
          </p>
          <p className={`text-xs ${analyticsMutedTextClass}`}>
            {t("trustDetail", { currency: provenance.currency, sources: provenance.sourceTables.join(", "), hash: provenance.filterHash.slice(0, 12) })}
          </p>
        </div>
        {provenance.knownBlockers.length ? (
          <div className={`max-w-md text-xs ${analyticsMutedTextClass}`}>
            {t("trustLimit")}
            {provenance.knownBlockers.filter(blocker => !["Not a statutory OHADA certified export", "Not signed by Close & Assurance pack controls"].includes(blocker)).map(blocker => <p key={blocker}>{blocker}</p>)}
          </div>
        ) : null}
      </div>
    </div>
  )
}
