"use client"

import { useLocale, useTranslations } from "next-intl"
import type { CashierPerformanceReport } from "@/actions/analytics/financial-reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyticsMutedTextClass, analyticsPanelClass, analyticsToneClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { ReportTrustBanner } from "./report-trust-banner"
import { CashCountRecords } from "./cash-count-records"

export function CashierPerformanceReportComponent({ reports }: { reports: CashierPerformanceReport[] }) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  return <section className="min-w-0 space-y-6 [overflow-wrap:anywhere]" data-testid="cashier-report">
    <h2 className="text-2xl font-bold">{t("cashierTitle")}</h2>
    {reports[0] && <ReportTrustBanner provenance={reports[0].provenance} />}
    <p className={analyticsToneClass("info") + " rounded-lg border p-4"}>{t("cashierBasis")}</p>
    {!reports.length && <p>{t("noShifts")}</p>}
    {reports.map(report => {
      const money = (value: number | null) => value === null ? t("unavailable") : new Intl.NumberFormat(locale, { style: "currency", currency: report.provenance.currency }).format(value)
      const metrics = [[t("orderValue"), money(report.totalSales)], [t("transactions"), number(report.totalTransactions)], [t("elapsedHours"), number(report.elapsedShiftHours)], [t("cashReceipts"), money(report.cashReceipts)], [t("cashOutflows"), money(report.cashOutflows)], [t("netCountVariance"), money(report.cashVariance)], [t("absoluteVariance"), money(report.absoluteVariance)]]
      return <Card key={report.cashierId} className={analyticsPanelClass + " min-w-0"}>
        <CardHeader><CardTitle>{report.cashierName === "Unknown" ? t("unknownCashier") : report.cashierName}</CardTitle></CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">{metrics.map(([label, value]) => <div key={label}><dt className={analyticsMutedTextClass}>{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}</dl>
          <p>{t("countCoverage", { recorded: report.recordedCountSessions, open: report.openCountSessions, outside: report.outsidePeriodCountSessions, inconsistent: report.inconsistentCountSessions })}</p>
          {report.inconsistentMovements > 0 && <p role="status" className={analyticsToneClass("gold") + " rounded-lg border p-3"}>{t("inconsistentCash", { count: report.inconsistentMovements })}</p>}
          <CashCountRecords currency={report.provenance.currency} timezone={report.provenance.timezone} records={report.sessions.map(session => ({ ...session, actualClosing: session.closingBalance }))} />
        </CardContent>
      </Card>
    })}
  </section>
}
