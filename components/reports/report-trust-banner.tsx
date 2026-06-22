"use client"

import type { ReportProvenance } from "@/actions/analytics/financial-reports"
import {
  analyticsMutedTextClass,
  analyticsRowClass,
  analyticsToneClass,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { Badge } from "@/components/ui/badge"

interface ReportTrustBannerProps {
  provenance?: ReportProvenance
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function freshnessLabel(value: ReportProvenance["freshness"]) {
  if (value === "CURRENT_AS_OF_GENERATION") return "Current at generation"
  return "Historical period"
}

export function ReportTrustBanner({ provenance }: ReportTrustBannerProps) {
  if (!provenance) {
    return (
      <div className="rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] px-4 py-3 text-sm text-[var(--dash-warning)]">
        Source status unavailable. Treat this report as unverified until provenance is provided.
      </div>
    )
  }

  return (
    <div className={`${analyticsRowClass} px-4 py-3`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={analyticsToneClass("brand")}>{provenance.sourceLabel}</Badge>
            <Badge variant="outline" className={analyticsToneClass("info")}>{freshnessLabel(provenance.freshness)}</Badge>
            <Badge variant="outline" className={analyticsToneClass("success")}>{provenance.certificationLabel}</Badge>
          </div>
          <p className={`text-sm ${analyticsMutedTextClass}`}>
            Period {new Date(provenance.periodStart).toLocaleDateString()} - {new Date(provenance.periodEnd).toLocaleDateString()}
            {" "}from {provenance.rowCount.toLocaleString()} source rows. Generated {formatDateTime(provenance.generatedAt)}.
          </p>
          <p className={`text-xs ${analyticsMutedTextClass}`}>
            Sources: {provenance.sourceTables.join(", ")}. Filter hash: {provenance.filterHash.slice(0, 12)}.
          </p>
        </div>
        {provenance.knownBlockers.length ? (
          <div className={`max-w-md text-xs ${analyticsMutedTextClass}`}>
            {provenance.knownBlockers.join("; ")}.
          </div>
        ) : null}
      </div>
    </div>
  )
}
