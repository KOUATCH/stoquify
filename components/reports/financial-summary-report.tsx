"use client"

import type { FinancialSummaryReport } from "@/actions/analytics/analytics/financial-reports"
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
import { CreditCard, DollarSign, Package, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface FinancialSummaryReportProps {
  report: FinancialSummaryReport
}

export function FinancialSummaryReportComponent({ report }: FinancialSummaryReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--dash-text)]">Financial Summary Report</h2>
          <p className={analyticsMutedTextClass}>{report.period}</p>
        </div>
      </div>

      <ReportTrustBanner provenance={report.provenance} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className={`h-4 w-4 ${analyticsToneText("brand")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.totalRevenue)}</div>
            <div className={`flex items-center text-xs ${analyticsMutedTextClass}`}>
              {report.revenueChange >= 0 ? (
                <TrendingUp className={`h-3 w-3 mr-1 ${analyticsTrendText(true)}`} />
              ) : (
                <TrendingDown className={`h-3 w-3 mr-1 ${analyticsTrendText(false)}`} />
              )}
              <span className={analyticsTrendText(report.revenueChange >= 0)}>
                {formatPercentage(report.revenueChange)}
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className={`h-4 w-4 ${analyticsToneText("success")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.grossProfit)}</div>
            <div className={`flex items-center text-xs ${analyticsMutedTextClass}`}>
              <Badge variant="outline" className={`text-xs ${analyticsToneClass("success")}`}>
                {report.grossMargin.toFixed(1)}% margin
              </Badge>
              <span className="ml-2">
                {report.profitChange >= 0 ? (
                  <span className={analyticsTrendText(true)}>{formatPercentage(report.profitChange)}</span>
                ) : (
                  <span className={analyticsTrendText(false)}>{formatPercentage(report.profitChange)}</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className={`h-4 w-4 ${analyticsToneText("info")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalTransactions.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${analyticsMutedTextClass}`}>
              <span>Avg: {formatCurrency(report.averageTransactionValue)}</span>
              <span className="ml-2">
                {report.transactionChange >= 0 ? (
                  <span className={analyticsTrendText(true)}>{formatPercentage(report.transactionChange)}</span>
                ) : (
                  <span className={analyticsTrendText(false)}>{formatPercentage(report.transactionChange)}</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPanelClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className={`h-4 w-4 ${analyticsToneText("gold")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalItemsSold.toLocaleString()}</div>
            <div className={`text-xs ${analyticsMutedTextClass}`}>
              Avg per transaction: {(report.totalItemsSold / Math.max(report.totalTransactions, 1)).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card className={analyticsPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--dash-success)]">{formatCurrency(report.cashSales)}</div>
              <div className={`text-sm ${analyticsMutedTextClass}`}>Cash Sales</div>
              <div className={`text-xs ${analyticsMutedTextClass}`}>
                {((report.cashSales / report.totalRevenue) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--dash-brand-strong)]">{formatCurrency(report.cardSales)}</div>
              <div className={`text-sm ${analyticsMutedTextClass}`}>Card Sales</div>
              <div className={`text-xs ${analyticsMutedTextClass}`}>
                {((report.cardSales / report.totalRevenue) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--dash-info)]">{formatCurrency(report.digitalSales)}</div>
              <div className={`text-sm ${analyticsMutedTextClass}`}>Digital Sales</div>
              <div className={`text-xs ${analyticsMutedTextClass}`}>
                {((report.digitalSales / report.totalRevenue) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales */}
        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle>Hourly Sales Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.hourlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-subtle)" opacity={0.35} />
                <XAxis dataKey="hour" tick={{ fill: "var(--dash-text-soft)" }} />
                <YAxis tick={{ fill: "var(--dash-text-soft)" }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  labelFormatter={(hour: number) => `${hour}:00`}
                  contentStyle={{
                    backgroundColor: "var(--dash-surface-raised)",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "8px",
                    color: "var(--dash-text)",
                  }}
                />
                <Bar dataKey="revenue" fill="var(--dash-brand)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.topSellingItems.slice(0, 5).map((item, index) => (
                <div key={item.itemId} className={`${analyticsRowClass} flex items-center justify-between p-3`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium ${analyticsToneClass(index === 0 ? "gold" : "muted")}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className={`text-sm ${analyticsMutedTextClass}`}>SKU: {item.itemSku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.revenue)}</div>
                    <div className={`text-sm ${analyticsMutedTextClass}`}>{item.quantitySold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
