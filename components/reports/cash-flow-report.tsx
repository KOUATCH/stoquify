"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportTrustBanner } from "@/components/reports/report-trust-banner"
import {
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
  analyticsTrendText,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingDown, TrendingUp } from "lucide-react"

import { type CashFlowReport } from "@/actions/analytics/financial-reports"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface CashFlowReportProps {
  report: CashFlowReport
}

export function CashFlowReportComponent({ report }: CashFlowReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return analyticsMutedTextClass
    if (Math.abs(variance) <= 5) return analyticsToneText("success")
    if (Math.abs(variance) <= 15) return analyticsToneText("gold")
    return analyticsToneText("danger")
  }

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null) return <Badge variant="outline" className={analyticsToneClass("muted")}>Pending</Badge>
    if (Math.abs(variance) <= 5) return <Badge variant="outline" className={analyticsToneClass("success")}>Good</Badge>
    if (Math.abs(variance) <= 15) return <Badge variant="outline" className={analyticsToneClass("gold")}>Acceptable</Badge>
    return <Badge variant="outline" className={analyticsToneClass("danger")}>High Variance</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--dash-text)]">Cash Flow Report</h2>
          <p className={analyticsMutedTextClass}>{report.period}</p>
        </div>
      </div>

      <ReportTrustBanner provenance={report.provenance} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
            <ArrowUpRight className={`h-4 w-4 ${analyticsTrendText(true)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--dash-success)]">{formatCurrency(report.totalCashIn)}</div>
            <div className={`mt-1 text-xs ${analyticsMutedTextClass}`}>Sales: {formatCurrency(report.totalCashSales)}</div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
            <ArrowDownRight className={`h-4 w-4 ${analyticsTrendText(false)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--dash-danger)]">{formatCurrency(report.totalCashOut)}</div>
            <div className={`mt-1 text-xs ${analyticsMutedTextClass}`}>Refunds: {formatCurrency(report.cashRefunds)}</div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            {report.netCashFlow >= 0 ? (
              <TrendingUp className={`h-4 w-4 ${analyticsTrendText(true)}`} />
            ) : (
              <TrendingDown className={`h-4 w-4 ${analyticsTrendText(false)}`} />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analyticsTrendText(report.netCashFlow >= 0)}`}>
              {formatCurrency(report.netCashFlow)}
            </div>
            <div className={`mt-1 text-xs ${analyticsMutedTextClass}`}>
              {report.netCashFlow >= 0 ? "Positive flow" : "Negative flow"}
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
            <DollarSign className={`h-4 w-4 ${analyticsToneText("brand")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.totalCashSales)}</div>
            <div className={`mt-1 text-xs ${analyticsMutedTextClass}`}>
              {((report.totalCashSales / report.totalCashIn) * 100).toFixed(1)}% of cash in
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle className="text-[var(--dash-success)]">Cash Inflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Cash Sales</span>
              <span className="font-medium">{formatCurrency(report.totalCashSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Returns/Exchanges</span>
              <span className="font-medium">{formatCurrency(report.cashFromReturns)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Other Cash In</span>
              <span className="font-medium">{formatCurrency(report.otherCashIn)}</span>
            </div>
            <hr className="border-[var(--dash-border-subtle)]" />
            <div className="flex justify-between items-center font-bold">
              <span>Total Cash In</span>
              <span className="text-[var(--dash-success)]">{formatCurrency(report.totalCashIn)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle className="text-[var(--dash-danger)]">Cash Outflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Refunds</span>
              <span className="font-medium">{formatCurrency(report.cashRefunds)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Payouts</span>
              <span className="font-medium">{formatCurrency(report.cashPayouts)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${analyticsMutedTextClass}`}>Other Cash Out</span>
              <span className="font-medium">{formatCurrency(report.otherCashOut)}</span>
            </div>
            <hr className="border-[var(--dash-border-subtle)]" />
            <div className="flex justify-between items-center font-bold">
              <span>Total Cash Out</span>
              <span className="text-[var(--dash-danger)]">{formatCurrency(report.totalCashOut)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cash Flow Chart */}
      <Card className={analyticsPanelClass}>
        <CardHeader>
          <CardTitle>Daily Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-subtle)" opacity={0.35} />
              <XAxis dataKey="date" tick={{ fill: "var(--dash-text-soft)" }} />
              <YAxis tick={{ fill: "var(--dash-text-soft)" }} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                contentStyle={{
                  backgroundColor: "var(--dash-surface-raised)",
                  border: "1px solid var(--dash-border)",
                  borderRadius: "8px",
                  color: "var(--dash-text)",
                }}
              />
              <Line type="monotone" dataKey="netFlow" stroke="var(--dash-brand)" strokeWidth={2} name="Net Flow" />
              <Line type="monotone" dataKey="runningBalance" stroke="var(--dash-success)" strokeWidth={2} name="Running Balance" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Drawer Reconciliation */}
      <Card className={analyticsPanelClass}>
        <CardHeader>
          <CardTitle>Cash Drawer Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.drawerReconciliation.map((drawer) => (
              <div key={drawer.sessionId} className={`${analyticsRowClass} flex items-center justify-between p-4`}>
                <div className="flex-1">
                  <div className="font-medium">{drawer.sessionNumber}</div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>
                    {drawer.stationName} • {drawer.cashierName}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-sm ${analyticsMutedTextClass}`}>Opening</div>
                    <div className="font-medium">{formatCurrency(drawer.openingBalance)}</div>
                  </div>

                  <div className="text-center">
                    <div className={`text-sm ${analyticsMutedTextClass}`}>Expected</div>
                    <div className="font-medium">{formatCurrency(drawer.expectedClosing)}</div>
                  </div>

                  <div className="text-center">
                    <div className={`text-sm ${analyticsMutedTextClass}`}>Actual</div>
                    <div className="font-medium">
                      {drawer.actualClosing !== null ? formatCurrency(drawer.actualClosing) : "Pending"}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`text-sm ${analyticsMutedTextClass}`}>Variance</div>
                    <div className={`font-medium ${getVarianceColor(drawer.variance)}`}>
                      {drawer.variance !== null ? formatCurrency(Math.abs(drawer.variance)) : "N/A"}
                    </div>
                  </div>

                  <div>{getVarianceBadge(drawer.variance)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
