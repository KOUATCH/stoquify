"use client"

import type { ItemPerformanceReport } from "@/actions/analytics/analytics/financial-reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ReportTrustBanner } from "@/components/reports/report-trust-banner"
import {
  analyticsFilterClass,
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsStockTone,
  analyticsToneClass,
  analyticsToneText,
  analyticsTrendText,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { AlertTriangle, Package, Search, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"

interface ItemPerformanceReportProps {
  reports: ItemPerformanceReport[]
  focusItemId?: string
}

export function ItemPerformanceReportComponent({ reports, focusItemId }: ItemPerformanceReportProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"revenue" | "quantity" | "profit" | "margin">("revenue")
  const [showFocusedOnly, setShowFocusedOnly] = useState(Boolean(focusItemId))
  const focusedReport = focusItemId ? reports.find((report) => report.itemId === focusItemId) : undefined
  const reportSource = focusedReport && showFocusedOnly ? [focusedReport] : reports
  const provenance = focusedReport?.provenance ?? reports[0]?.provenance

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStockStatusBadge = (status: string) => {
    const className = analyticsToneClass(analyticsStockTone(status))

    switch (status) {
      case "in_stock":
        return <Badge variant="outline" className={className}>In Stock</Badge>
      case "low_stock":
        return <Badge variant="outline" className={className}>Low Stock</Badge>
      case "out_of_stock":
        return <Badge variant="outline" className={className}>Out of Stock</Badge>
      default:
        return <Badge variant="outline" className={className}>Unknown</Badge>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className={`h-4 w-4 ${analyticsTrendText(true)}`} />
      case "decreasing":
        return <TrendingDown className={`h-4 w-4 ${analyticsTrendText(false)}`} />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const filteredReports = reportSource
    .filter(
      (report) =>
        report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.itemSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.category.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.totalRevenue - a.totalRevenue
        case "quantity":
          return b.quantitySold - a.quantitySold
        case "profit":
          return b.grossProfit - a.grossProfit
        case "margin":
          return b.profitMargin - a.profitMargin
        default:
          return 0
      }
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--dash-text)]">
            {focusedReport ? "Product Sales Analysis" : "Item Performance Report"}
          </h2>
          <p className={analyticsMutedTextClass}>
            {focusedReport ? `${focusedReport.itemName} sales, profitability, and inventory record` : `${reports.length} items analyzed`}
          </p>
        </div>
        {focusedReport ? (
          <Button
            variant="outline"
            size="sm"
            className={analyticsFilterClass}
            onClick={() => {
              setSearchTerm("")
              setShowFocusedOnly(false)
            }}
          >
            Show all products
          </Button>
        ) : null}
      </div>

      <ReportTrustBanner provenance={provenance} />

      {/* Filters */}
      <Card className={analyticsPanelClass}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${analyticsMutedTextClass}`} />
              <Input
                placeholder="Search items, SKU, or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowFocusedOnly(false)
                }}
                className="dashboard-control pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "revenue" ? "dashboard-button-primary rounded-lg" : analyticsFilterClass}
                onClick={() => setSortBy("revenue")}
              >
                Revenue
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "quantity" ? "dashboard-button-primary rounded-lg" : analyticsFilterClass}
                onClick={() => setSortBy("quantity")}
              >
                Quantity
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "profit" ? "dashboard-button-primary rounded-lg" : analyticsFilterClass}
                onClick={() => setSortBy("profit")}
              >
                Profit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "margin" ? "dashboard-button-primary rounded-lg" : analyticsFilterClass}
                onClick={() => setSortBy("margin")}
              >
                Margin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.itemId} className={analyticsPanelClass}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{report.itemName}</CardTitle>
                  <p className={`text-sm ${analyticsMutedTextClass}`}>SKU: {report.itemSku}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={analyticsToneClass("muted")}>{report.category}</Badge>
                    {report.brand && <Badge variant="outline" className={analyticsToneClass("muted")}>{report.brand}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(report.salesTrend)}
                  {getStockStatusBadge(report.stockStatus)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sales Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>Revenue</div>
                  <div className="text-lg font-bold">{formatCurrency(report.totalRevenue)}</div>
                  {report.revenueChange !== 0 && (
                    <div className={`text-xs ${analyticsTrendText(report.revenueChange > 0)}`}>
                      {report.revenueChange > 0 ? "+" : ""}
                      {report.revenueChange.toFixed(1)}%
                    </div>
                  )}
                </div>

                <div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>Quantity Sold</div>
                  <div className="text-lg font-bold">{report.quantitySold}</div>
                  {report.quantityChange !== 0 && (
                    <div className={`text-xs ${analyticsTrendText(report.quantityChange > 0)}`}>
                      {report.quantityChange > 0 ? "+" : ""}
                      {report.quantityChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Profitability */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Gross Profit</span>
                  <span className="font-medium">{formatCurrency(report.grossProfit)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Profit Margin</span>
                  <span className={`font-medium ${report.profitMargin < 20 ? analyticsToneText("gold") : analyticsToneText("success")}`}>
                    {report.profitMargin.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Avg. Price</span>
                  <span className="font-medium">{formatCurrency(report.averageSellingPrice)}</span>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Current Stock</span>
                  <div className="flex items-center gap-2">
                    {report.currentStock <= 5 && report.stockStatus !== "out_of_stock" && (
                      <AlertTriangle className={`h-4 w-4 ${analyticsToneText("gold")}`} />
                    )}
                    <span className="font-medium">{report.currentStock}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Stock Value</span>
                  <span className="font-medium">{formatCurrency(report.stockValue)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>Turnover Rate</span>
                  <span className="font-medium">{report.turnoverRate.toFixed(1)}x</span>
                </div>

                {report.daysOfStock < 999 && (
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${analyticsMutedTextClass}`}>Days of Stock</span>
                    <span className={`font-medium ${report.daysOfStock < 30 ? analyticsToneText("gold") : ""}`}>
                      {Math.round(report.daysOfStock)} days
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card className={analyticsPanelClass}>
          <CardContent className="text-center py-8">
            <Package className={`h-12 w-12 mx-auto mb-4 ${analyticsMutedTextClass}`} />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className={analyticsMutedTextClass}>Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
