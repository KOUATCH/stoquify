"use client"

import type { ItemPerformanceReport } from "@/actions/analytics/analytics/financial-reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
      case "low_stock":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
      case "out_of_stock":
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />
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
          <h2 className="text-2xl font-bold">{focusedReport ? "Product Sales Analysis" : "Item Performance Report"}</h2>
          <p className="text-muted-foreground">
            {focusedReport ? `${focusedReport.itemName} sales, profitability, and inventory record` : `${reports.length} items analyzed`}
          </p>
        </div>
        {focusedReport ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("")
              setShowFocusedOnly(false)
            }}
          >
            Show all products
          </Button>
        ) : null}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items, SKU, or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowFocusedOnly(false)
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "revenue" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("revenue")}
              >
                Revenue
              </Button>
              <Button
                variant={sortBy === "quantity" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("quantity")}
              >
                Quantity
              </Button>
              <Button
                variant={sortBy === "profit" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("profit")}
              >
                Profit
              </Button>
              <Button
                variant={sortBy === "margin" ? "default" : "outline"}
                size="sm"
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
          <Card key={report.itemId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{report.itemName}</CardTitle>
                  <p className="text-sm text-muted-foreground">SKU: {report.itemSku}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{report.category}</Badge>
                    {report.brand && <Badge variant="outline">{report.brand}</Badge>}
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
                  <div className="text-sm text-muted-foreground">Revenue</div>
                  <div className="text-lg font-bold">{formatCurrency(report.totalRevenue)}</div>
                  {report.revenueChange !== 0 && (
                    <div className={`text-xs ${report.revenueChange > 0 ? "text-green-600" : "text-red-600"}`}>
                      {report.revenueChange > 0 ? "+" : ""}
                      {report.revenueChange.toFixed(1)}%
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Quantity Sold</div>
                  <div className="text-lg font-bold">{report.quantitySold}</div>
                  {report.quantityChange !== 0 && (
                    <div className={`text-xs ${report.quantityChange > 0 ? "text-green-600" : "text-red-600"}`}>
                      {report.quantityChange > 0 ? "+" : ""}
                      {report.quantityChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Profitability */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gross Profit</span>
                  <span className="font-medium">{formatCurrency(report.grossProfit)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <span className={`font-medium ${report.profitMargin < 20 ? "text-yellow-600" : "text-green-600"}`}>
                    {report.profitMargin.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Price</span>
                  <span className="font-medium">{formatCurrency(report.averageSellingPrice)}</span>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Stock</span>
                  <div className="flex items-center gap-2">
                    {report.currentStock <= 5 && report.stockStatus !== "out_of_stock" && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{report.currentStock}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stock Value</span>
                  <span className="font-medium">{formatCurrency(report.stockValue)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Turnover Rate</span>
                  <span className="font-medium">{report.turnoverRate.toFixed(1)}x</span>
                </div>

                {report.daysOfStock < 999 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Days of Stock</span>
                    <span className={`font-medium ${report.daysOfStock < 30 ? "text-yellow-600" : ""}`}>
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
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
