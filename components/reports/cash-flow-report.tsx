"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportTrustBanner } from "@/components/reports/report-trust-banner"
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
    if (variance === null) return "text-muted-foreground"
    if (Math.abs(variance) <= 5) return "text-green-600"
    if (Math.abs(variance) <= 15) return "text-yellow-600"
    return "text-red-600"
  }

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null) return <Badge variant="secondary">Pending</Badge>
    if (Math.abs(variance) <= 5) return <Badge className="bg-green-100 text-green-800">Good</Badge>
    if (Math.abs(variance) <= 15) return <Badge className="bg-yellow-100 text-yellow-800">Acceptable</Badge>
    return <Badge className="bg-red-100 text-red-800">High Variance</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Report</h2>
          <p className="text-muted-foreground">{report.period}</p>
        </div>
      </div>

      <ReportTrustBanner provenance={report.provenance} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(report.totalCashIn)}</div>
            <div className="text-xs text-muted-foreground mt-1">Sales: {formatCurrency(report.totalCashSales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(report.totalCashOut)}</div>
            <div className="text-xs text-muted-foreground mt-1">Refunds: {formatCurrency(report.cashRefunds)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            {report.netCashFlow >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(report.netCashFlow)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.netCashFlow >= 0 ? "Positive flow" : "Negative flow"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.totalCashSales)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((report.totalCashSales / report.totalCashIn) * 100).toFixed(1)}% of cash in
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Cash Inflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cash Sales</span>
              <span className="font-medium">{formatCurrency(report.totalCashSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Returns/Exchanges</span>
              <span className="font-medium">{formatCurrency(report.cashFromReturns)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Other Cash In</span>
              <span className="font-medium">{formatCurrency(report.otherCashIn)}</span>
            </div>
            <hr />
            <div className="flex justify-between items-center font-bold">
              <span>Total Cash In</span>
              <span className="text-green-600">{formatCurrency(report.totalCashIn)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Cash Outflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Refunds</span>
              <span className="font-medium">{formatCurrency(report.cashRefunds)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payouts</span>
              <span className="font-medium">{formatCurrency(report.cashPayouts)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Other Cash Out</span>
              <span className="font-medium">{formatCurrency(report.otherCashOut)}</span>
            </div>
            <hr />
            <div className="flex justify-between items-center font-bold">
              <span>Total Cash Out</span>
              <span className="text-red-600">{formatCurrency(report.totalCashOut)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
              />
              <Line type="monotone" dataKey="netFlow" stroke="#3b82f6" strokeWidth={2} name="Net Flow" />
              <Line type="monotone" dataKey="runningBalance" stroke="#10b981" strokeWidth={2} name="Running Balance" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Drawer Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Drawer Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.drawerReconciliation.map((drawer) => (
              <div key={drawer.sessionId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{drawer.sessionNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {drawer.stationName} • {drawer.cashierName}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Opening</div>
                    <div className="font-medium">{formatCurrency(drawer.openingBalance)}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Expected</div>
                    <div className="font-medium">{formatCurrency(drawer.expectedClosing)}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Actual</div>
                    <div className="font-medium">
                      {drawer.actualClosing !== null ? formatCurrency(drawer.actualClosing) : "Pending"}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Variance</div>
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
