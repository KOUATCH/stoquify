"use client"

import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, Info } from "lucide-react"
import type { CashCountStatus } from "@/services/analytics/cash-report-evidence"
import { analyticsRowClass, analyticsToneClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"

type CountRecord = { sessionId: string; sessionNumber: string; stationName?: string; expectedClosing: number | null; actualClosing: number | null; variance: number | null; countStatus: CashCountStatus; endTime: Date | null }

export function CashCountRecords({ records, currency, timezone }: { records: CountRecord[]; currency: string; timezone?: string }) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const money = (value: number | null) => value === null ? t("unavailable") : new Intl.NumberFormat(locale, { style: "currency", currency }).format(value)
  return <div className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
    <p>{t("closingCountBasis")}</p>
    {!records.length && <p>{t("noShifts")}</p>}
    <ol className="space-y-3">{records.map(record => {
      const attention = record.countStatus === "INCONSISTENT" || (record.variance !== null && record.variance !== 0)
      const Icon = attention ? AlertCircle : Info
      return <li key={record.sessionId} className={analyticsRowClass + " p-3 min-w-0 space-y-3"}>
        <h4 className="font-semibold">{record.sessionNumber}{record.stationName ? " · " + record.stationName : ""}</h4>
        <p className={analyticsToneClass(attention ? "gold" : "info") + " rounded-lg border p-2 flex items-start gap-2"}><Icon aria-hidden="true" className="size-4 shrink-0 mt-1" /><span>{t("count" + record.countStatus)}{record.variance !== null && record.variance !== 0 ? " · " + t(record.variance < 0 ? "shortage" : "overage") : ""}</span></p>
        {record.endTime && <p>{t("countedAt")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(record.endTime))}</p>}
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">{[[t("expectedCount"), record.expectedClosing], [t("actualCount"), record.actualClosing], [t("signedVariance"), record.variance]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{money(value as number | null)}</dd></div>)}</dl>
      </li>
    })}</ol>
  </div>
}
