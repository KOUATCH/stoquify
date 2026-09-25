"use client"

import { useTranslations } from "next-intl"
import type { CostEvidence } from "@/services/analytics/completed-sales-evidence"
import { analyticsToneClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"

export function ReportCostBasis({ evidence }: { evidence: CostEvidence }) {
  const t = useTranslations("operationalReports")
  return <div className={`rounded-lg border p-3 text-sm space-y-1 [overflow-wrap:anywhere] ${analyticsToneClass(evidence.uncoveredGroups ? "gold" : "info")}`} data-testid="report-cost-basis">
    <p>{t("basis")}</p>
    <p>{t(evidence.uncoveredGroups ? "missingCost" : "coveredCost", { count: evidence.uncoveredGroups || evidence.coveredGroups })}</p>
  </div>
}
