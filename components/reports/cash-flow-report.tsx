"use client"

import { useLocale, useTranslations } from "next-intl"
import type { CashFlowReport } from "@/actions/analytics/financial-reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyticsPanelClass, analyticsToneClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { ReportTrustBanner } from "./report-trust-banner"
import { CashCountRecords } from "./cash-count-records"

export function CashFlowReportComponent({ report }: { report: CashFlowReport }) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const money = (value: number | null) => value === null ? t("unavailable") : new Intl.NumberFormat(locale, { style: "currency", currency: report.provenance.currency }).format(value)
  const metrics = [[t("cashReceipts"), report.totalCashIn], [t("cashOutflows"), report.totalCashOut], [t("netMovement"), report.netCashFlow]] as const
  const details = [[t("cashSales"), report.totalCashSales], [t("otherCashIn"), report.otherCashIn], [t("cashReturns"), report.cashReturns], [t("cashRefunds"), report.cashRefunds], [t("cashPayouts"), report.cashPayouts], [t("otherCashOut"), report.otherCashOut]] as const
  return <section className="min-w-0 space-y-6 [overflow-wrap:anywhere]" data-testid="cash-flow-report">
    <h2 className="text-2xl font-bold">{t("cashFlowTitle")}</h2>
    <ReportTrustBanner provenance={report.provenance} />
    <p className={analyticsToneClass("info") + " rounded-lg border p-4"}>{t("cashFlowBasis")}</p>
    {report.inconsistentMovements > 0 && <p role="status" className={analyticsToneClass("gold") + " rounded-lg border p-4"}>{t("inconsistentCash", { count: report.inconsistentMovements })}</p>}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{metrics.map(([label, value]) => <Card key={label} className={analyticsPanelClass}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{money(value)}</p></CardContent></Card>)}</div>
    <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("cashBreakdown")}</CardTitle></CardHeader><CardContent>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="text-xl font-semibold">{money(value)}</dd></div>)}</dl>
      <p className="mt-4">{t("excludedCashCounts", report.excludedCounts)}</p>
    </CardContent></Card>
    <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("dailyCash")}</CardTitle></CardHeader><CardContent className="min-w-0">
      <p className="mb-4">{t("cumulativeBasis")}</p>
      {!report.dailyBreakdown.length && <p>{t("noCashMovements")}</p>}
      <ol className="space-y-4">{report.dailyBreakdown.map(day => <li key={day.date} className="border-b border-[var(--dash-border-subtle)] pb-4">
        <h3 className="font-semibold">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(day.date + "T12:00:00Z"))}</h3>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3 mt-2">{[[t("cashReceipts"), day.cashIn], [t("cashOutflows"), day.cashOut], [t("netMovement"), day.netFlow], [t("cumulativeMovement"), day.cumulativeNetMovement]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{money(value as number | null)}</dd></div>)}</dl>
      </li>)}</ol>
    </CardContent></Card>
    <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("closingCounts")}</CardTitle></CardHeader><CardContent><CashCountRecords currency={report.provenance.currency} timezone={report.provenance.timezone} records={report.drawerReconciliation} /></CardContent></Card>
  </section>
}
