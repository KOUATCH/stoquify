"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { FinancialSummaryReport } from "@/actions/analytics/financial-reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportTrustBanner } from "./report-trust-banner"
import { ReportCostBasis } from "./report-cost-basis"
import { analyticsMutedTextClass, analyticsPanelClass, analyticsRowClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function FinancialSummaryReportComponent({ report }: { report: FinancialSummaryReport }) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const [showHourlyValues, setShowHourlyValues] = useState(false)
  const money = (value: number | null) => value === null ? t("unavailable") : new Intl.NumberFormat(locale, { style: "currency", currency: report.provenance.currency }).format(value)
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  const comparison = (value: number | null) => value === null ? t("noComparison") : number(value) + "% · " + t("previous")
  const metrics = [
    { label: t("orderValue"), value: money(report.totalRevenue), detail: comparison(report.revenueChange) },
    { label: t("profit"), value: money(report.grossProfit), detail: report.grossMargin === null ? t("unavailable") : t("margin") + ": " + number(report.grossMargin) + "%" },
    { label: t("transactions"), value: number(report.totalTransactions), detail: t("average", { amount: money(report.averageTransactionValue) }) },
    { label: t("itemsSold"), value: number(report.totalItemsSold), detail: t("perTransaction", { count: number(report.totalItemsSold / Math.max(report.totalTransactions, 1)) }) },
  ]
  return <div className="space-y-6 min-w-0" data-testid="financial-summary-report">
    <h2 className="text-2xl font-bold text-[var(--dash-text)]">{t("summaryTitle")}</h2>
    <ReportTrustBanner provenance={report.provenance} />
    <ReportCostBasis evidence={report.costEvidence} />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(metric => <Card key={metric.label} className={analyticsPanelClass}>
      <CardHeader><CardTitle className="text-sm font-medium">{metric.label}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-bold break-words">{metric.value}</p><p className={analyticsMutedTextClass}>{metric.detail}</p></CardContent>
    </Card>)}</div>
    <p className={analyticsMutedTextClass}>{t("netValue")}: {money(report.netRevenue)} · {comparison(report.profitChange)}</p>
    <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("payments")}</CardTitle></CardHeader><CardContent>
      <p className={analyticsMutedTextClass}>{t("paymentBasis")}</p>
      <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">{[["cash", report.cashSales], ["card", report.cardSales], ["digital", report.digitalSales]].map(([key, value]) => <div key={key}><dt>{t(key as "cash" | "card" | "digital")}</dt><dd className="text-2xl font-bold break-words">{money(value as number)}</dd></div>)}</dl>
    </CardContent></Card>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("hourly", { timezone: report.timezone })}</CardTitle></CardHeader><CardContent className="min-w-0">
        <div aria-hidden="true"><ResponsiveContainer width="100%" height={250}><BarChart data={report.hourlyBreakdown}><CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-subtle)" /><XAxis dataKey="hour" tick={{ fill: "var(--dash-text-soft)" }} /><YAxis tick={{ fill: "var(--dash-text-soft)" }} /><Tooltip formatter={(value: number) => [money(value), t("orderValue")]} contentStyle={{ backgroundColor: "var(--dash-surface-raised)", color: "var(--dash-text)" }} /><Bar dataKey="revenue" fill="var(--dash-brand)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        <Button variant="outline" className="dashboard-filter-chip h-auto whitespace-normal" aria-expanded={showHourlyValues} aria-controls="report-hourly-values" onClick={() => setShowHourlyValues(value => !value)}>{t("hourlyTable")}</Button>
        {showHourlyValues && <table id="report-hourly-values" className="w-full text-sm"><caption className="sr-only">{t("hourly", { timezone: report.timezone })}</caption><thead><tr><th scope="col">{t("hour")}</th><th scope="col">{t("orderValue")}</th><th scope="col">{t("transactions")}</th></tr></thead><tbody>{report.hourlyBreakdown.map(hour => <tr key={hour.hour}><th scope="row">{hour.hour}:00</th><td>{money(hour.revenue)}</td><td>{number(hour.transactions)}</td></tr>)}</tbody></table>}
      </CardContent></Card>
      <Card className={analyticsPanelClass}><CardHeader><CardTitle>{t("topItems")}</CardTitle></CardHeader><CardContent><ol className="space-y-3">{report.topSellingItems.slice(0, 5).map(item => <li key={item.itemId} className={analyticsRowClass + " p-3 flex flex-wrap justify-between gap-2"}><div className="min-w-0 break-words"><p className="font-medium">{locale === "fr" ? item.itemNameFr || item.itemName : item.itemName}</p><p className={analyticsMutedTextClass}>{item.itemSku}</p></div><div><p>{money(item.revenue)}</p><p>{t("sold", { count: number(item.quantitySold) })}</p></div></li>)}</ol></CardContent></Card>
    </div>
  </div>
}
