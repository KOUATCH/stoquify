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
import { useLocale, useTranslations } from "next-intl"
import { ReportCostBasis } from "./report-cost-basis"

interface ItemPerformanceReportProps {
  reports: ItemPerformanceReport[]
  focusItemId?: string
}

export function ItemPerformanceReportComponent({ reports, focusItemId }: ItemPerformanceReportProps) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"revenue" | "quantity" | "profit" | "margin">("revenue")
  const [showFocusedOnly, setShowFocusedOnly] = useState(Boolean(focusItemId))
  const focusedReport = focusItemId ? reports.find((report) => report.itemId === focusItemId) : undefined
  const reportSource = focusedReport && showFocusedOnly ? [focusedReport] : reports
  const provenance = focusedReport?.provenance ?? reports[0]?.provenance

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return t("unavailable")
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: provenance!.currency,
    }).format(amount)
  }

  const getStockStatusBadge = (report: ItemPerformanceReport) => {
    const status = report.stockStatus
    const className = analyticsToneClass(analyticsStockTone(status))

    switch (status) {
      case "in_stock":
        return <Badge variant="outline" className={className}>{t("available")}</Badge>
      case "low_stock":
        return <Badge variant="outline" className={className}>{t("lowAvailable")}</Badge>
      case "out_of_stock":
        return (
          <Badge variant="outline" className={className}>
            {t(report.currentStock > 0 ? "noneAvailable" : "outOfStock")}
          </Badge>
        )
      default:
        return <Badge variant="outline" className={className}>{t("unknown")}</Badge>
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
          return a.grossProfit === null ? (b.grossProfit === null ? 0 : 1) : b.grossProfit === null ? -1 : b.grossProfit - a.grossProfit
        case "margin":
          return a.profitMargin === null ? (b.profitMargin === null ? 0 : 1) : b.profitMargin === null ? -1 : b.profitMargin - a.profitMargin
        default:
          return 0
      }
    })

  return (
    <div className="space-y-6 min-w-0 [overflow-wrap:anywhere]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--dash-text)]">
            {t(focusedReport ? "focusedTitle" : "itemTitle")}
          </h2>
          <p className={analyticsMutedTextClass}>
            {focusedReport ? t("focusedDescription", { name: focusedReport.itemName }) : t("itemCount", { count: reports.length })}
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
            {t("showAll")}
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
                placeholder={t("search")}
                aria-label={t("search")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowFocusedOnly(false)
                }}
                className="dashboard-control pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "revenue" ? "dashboard-button-primary rounded-lg h-auto whitespace-normal py-2" : analyticsFilterClass + " h-auto whitespace-normal py-2"}
                aria-pressed={sortBy === "revenue"}
                onClick={() => setSortBy("revenue")}
              >
                {t("orderValue")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "quantity" ? "dashboard-button-primary rounded-lg h-auto whitespace-normal py-2" : analyticsFilterClass + " h-auto whitespace-normal py-2"}
                aria-pressed={sortBy === "quantity"}
                onClick={() => setSortBy("quantity")}
              >
                {t("quantity")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "profit" ? "dashboard-button-primary rounded-lg h-auto whitespace-normal py-2" : analyticsFilterClass + " h-auto whitespace-normal py-2"}
                aria-pressed={sortBy === "profit"}
                onClick={() => setSortBy("profit")}
              >
                {t("sortProfit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={sortBy === "margin" ? "dashboard-button-primary rounded-lg h-auto whitespace-normal py-2" : analyticsFilterClass + " h-auto whitespace-normal py-2"}
                aria-pressed={sortBy === "margin"}
                onClick={() => setSortBy("margin")}
              >
                {t("sortMargin")}
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{locale === "fr" ? report.itemNameFr || report.itemName : report.itemName}</CardTitle>
                  <p className={`text-sm ${analyticsMutedTextClass}`}>SKU: {report.itemSku}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={analyticsToneClass("muted")}>{report.category === "Uncategorized" ? t("uncategorized") : report.category}</Badge>
                    {report.brand && <Badge variant="outline" className={analyticsToneClass("muted")}>{report.brand === "Unbranded" ? t("unbranded") : report.brand}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(report.salesTrend)}
                  {getStockStatusBadge(report)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sales Metrics */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-4">
                <div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>{t("orderValue")}</div>
                  <div className="text-lg font-bold">{formatCurrency(report.totalRevenue)}</div>
                  {report.revenueChange !== null && report.revenueChange !== 0 && (
                    <div className={`text-xs ${analyticsTrendText(report.revenueChange > 0)}`}>
                      {report.revenueChange > 0 ? "+" : ""}
                      {report.revenueChange.toFixed(1)}%
                    </div>
                  )}
                </div>

                <div>
                  <div className={`text-sm ${analyticsMutedTextClass}`}>{t("quantitySold")}</div>
                  <div className="text-lg font-bold">{report.quantitySold}</div>
                  {report.quantityChange !== null && report.quantityChange !== 0 && (
                    <div className={`text-xs ${analyticsTrendText(report.quantityChange > 0)}`}>
                      {report.quantityChange > 0 ? "+" : ""}
                      {report.quantityChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              <ReportCostBasis evidence={report.costEvidence} />
              {/* Profitability */}
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("profit")}</span>
                  <span className="font-medium">{formatCurrency(report.grossProfit)}</span>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("margin")}</span>
                  <span className="font-medium">
                    {report.profitMargin === null ? t("unavailable") : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(report.profitMargin) + "%"}
                  </span>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("averagePrice")}</span>
                  <span className="font-medium">{formatCurrency(report.averageSellingPrice)}</span>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("stockScope")}</span>
                  <Badge variant="outline" className={analyticsToneClass("info")}>
                    {t(report.stockScope === "organization" ? "organizationStock" : "locationStock")}
                  </Badge>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("onHand")}</span>
                  <div className="flex items-center gap-2">
                    {report.currentStock <= 5 && report.currentStock > 0 && (
                      <AlertTriangle className={`h-4 w-4 ${analyticsToneText("gold")}`} />
                    )}
                    <span className="font-medium">{report.currentStock}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("availableToSell")}</span>
                  <div className="flex items-center gap-2">
                    {report.availableToSell <= 5 && report.availableToSell > 0 && (
                      <AlertTriangle className={`h-4 w-4 ${analyticsToneText("gold")}`} />
                    )}
                    <span className={`font-medium ${report.availableToSell <= 0 ? analyticsToneText("danger") : ""}`}>
                      {report.availableToSell}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("reserved")}</span>
                  <span className="font-medium">{report.reservedStock}</span>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("stockValue")}</span>
                  <span className="font-medium">{formatCurrency(report.stockValue)}</span>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-sm ${analyticsMutedTextClass}`}>{t("turnover")}</span>
                  <span className="font-medium">{report.turnoverRate.toFixed(1)}x</span>
                </div>

                {report.daysOfAvailableStock !== null && report.daysOfAvailableStock < 999 && (
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className={`text-sm ${analyticsMutedTextClass}`}>{t("daysStock")}</span>
                    <span className={`font-medium ${report.daysOfAvailableStock < 30 ? analyticsToneText("gold") : ""}`}>
                      {t("days", { count: Math.round(report.daysOfAvailableStock) })}
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
            <h3 className="text-lg font-medium mb-2">{t("noItems")}</h3>
            <p className={analyticsMutedTextClass}>{t("adjustSearch")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
