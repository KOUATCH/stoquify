"use client"

import type { CashierPerformanceReport } from "@/actions/analytics/financial-reports"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportTrustBanner } from "@/components/reports/report-trust-banner"
import {
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { AlertTriangle, DollarSign, User } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"


interface CashierPerformanceReportProps {
  reports: CashierPerformanceReport[]
}

export function CashierPerformanceReportComponent({ reports }: CashierPerformanceReportProps) {
  const provenance = reports[0]?.provenance

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return analyticsToneText("success")
    if (score >= 75) return analyticsToneText("gold")
    return analyticsToneText("danger")
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge variant="outline" className={analyticsToneClass("success")}>Excellent</Badge>
    if (score >= 75) return <Badge variant="outline" className={analyticsToneClass("gold")}>Good</Badge>
    return <Badge variant="outline" className={analyticsToneClass("danger")}>Needs Improvement</Badge>
  }

  const chartData = reports.map((report) => ({
    name: report.cashierName.split(" ")[0],
    sales: report.totalSales,
    transactions: report.totalTransactions,
    performance: report.performanceScore,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--dash-text)]">Cashier Performance Report</h2>
          <p className={analyticsMutedTextClass}>{reports.length} cashiers analyzed</p>
        </div>
      </div>

      <ReportTrustBanner provenance={provenance} />

      {/* Performance Chart */}
      <Card className={analyticsPanelClass}>
        <CardHeader>
          <CardTitle>Sales Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-subtle)" opacity={0.35} />
              <XAxis dataKey="name" tick={{ fill: "var(--dash-text-soft)" }} />
              <YAxis tick={{ fill: "var(--dash-text-soft)" }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "sales") return [formatCurrency(value), "Total Sales"]
                  if (name === "transactions") return [value, "Transactions"]
                  return [value, "Performance Score"]
                }}
                contentStyle={{
                  backgroundColor: "var(--dash-surface-raised)",
                  border: "1px solid var(--dash-border)",
                  borderRadius: "8px",
                  color: "var(--dash-text)",
                }}
              />
              <Bar dataKey="sales" fill="var(--dash-brand)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Individual Cashier Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.cashierId} className={analyticsPanelClass}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className={analyticsToneClass("brand")}>
                      {report.cashierName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{report.cashierName}</CardTitle>
                    <p className={`text-sm ${analyticsMutedTextClass}`}>
                      {report.sessionsWorked} sessions • {report.totalHoursWorked.toFixed(1)} hours
                    </p>
                  </div>
                </div>
                {getPerformanceBadge(report.performanceScore)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${analyticsMutedTextClass}`}>
                    <DollarSign className="h-4 w-4" />
                    Total Sales
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(report.totalSales)}</div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>{formatCurrency(report.salesPerHour)}/hour</div>
                </div>

                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${analyticsMutedTextClass}`}>
                    <User className="h-4 w-4" />
                    Transactions
                  </div>
                  <div className="text-xl font-bold">{report.totalTransactions}</div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>{report.transactionsPerHour.toFixed(1)}/hour</div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Average Transaction</span>
                  <span className="font-medium">{formatCurrency(report.averageTransactionValue)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Cash Variance</span>
                  <div className="flex items-center gap-2">
                    {report.averageVariance > 10 && <AlertTriangle className={`h-4 w-4 ${analyticsToneText("gold")}`} />}
                    <span className={`font-medium ${report.averageVariance > 10 ? analyticsToneText("gold") : ""}`}>
                      {formatCurrency(report.averageVariance)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Performance Score</span>
                  <span className={`font-bold text-lg ${getPerformanceColor(report.performanceScore)}`}>
                    {report.performanceScore.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="space-y-2">
                <h4 className={`text-sm font-medium ${analyticsMutedTextClass}`}>Recent Sessions</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {report.sessions.slice(0, 3).map((session) => (
                    <div key={session.sessionId} className={`${analyticsRowClass} flex justify-between items-center p-2 text-sm`}>
                      <div>
                        <div className="font-medium">{session.sessionNumber}</div>
                        <div className={analyticsMutedTextClass}>{new Date(session.startTime).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(session.totalSales)}</div>
                        <div className={analyticsMutedTextClass}>{session.transactionCount} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
