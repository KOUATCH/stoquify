"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { AlertTriangle, CalendarIcon, DollarSign, FileText, Package, RefreshCw, SearchX, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { CashFlowReportComponent } from "@/components/reports/cash-flow-report"
import { CashierPerformanceReportComponent } from "@/components/reports/cashier-performance-report"
import { FinancialSummaryReportComponent } from "@/components/reports/financial-summary-report"
import { ItemPerformanceReportComponent } from "@/components/reports/item-performance-report"
import {
  analyticsContentClass,
  analyticsControlClass,
  analyticsFilterClass,
  analyticsMutedTextClass,
  analyticsPageClass,
  analyticsPanelClass,
  analyticsPrimaryButtonClass,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"

import {
  getCashFlowReport,
  getCashierPerformanceReport,
  getFinancialSummaryReport,
  getItemPerformanceReport,
  type CashFlowReport,
  type CashierPerformanceReport,
  type FinancialSummaryReport,
  type ItemPerformanceReport,
} from "@/actions/analytics/financial-reports"

type ReportType = "financial" | "cashier" | "items" | "cashflow"

interface ReportsClientProps {
  organizationId: string
  locationId: string
  initialReport?: string
  initialPeriod?: string
  focusItemId?: string
}

function normalizeReportType(report?: string): ReportType {
  if (report === "cashier") return "cashier"
  if (report === "items" || report === "item-performance" || report === "product-sales") return "items"
  if (report === "cashflow" || report === "cash-flow") return "cashflow"
  return "financial"
}

function getInitialDateRange(period?: string) {
  const now = new Date()

  if (period === "30d") return { from: subDays(now, 30), to: now }
  if (period === "90d") return { from: subDays(now, 90), to: now }
  if (period === "mtd") return { from: startOfMonth(now), to: now }

  return { from: subDays(now, 7), to: now }
}

const REPORT_LOAD_ERROR_MESSAGE = "Reports could not be loaded safely. Try again or adjust the filters."

const emptyReportCopy: Record<ReportType, { title: string; message: string }> = {
  financial: {
    title: "No financial report data",
    message: "No completed sales or payments matched this report period. Try a wider date range or another location.",
  },
  cashier: {
    title: "No cashier performance data",
    message: "No cashier sessions with reportable sales matched this period. Try a wider date range or another location.",
  },
  items: {
    title: "No item performance data",
    message: "No sold inventory items matched this report period. Try a wider date range or another location.",
  },
  cashflow: {
    title: "No cash flow report data",
    message: "No cash drawer or cash payment activity matched this report period. Try a wider date range or another location.",
  },
}

function hasSelectedReportData(
  selectedReport: ReportType,
  financialReport: FinancialSummaryReport | null,
  cashierReports: CashierPerformanceReport[],
  itemReports: ItemPerformanceReport[],
  cashFlowReport: CashFlowReport | null,
) {
  switch (selectedReport) {
    case "financial":
      return Boolean(financialReport && financialReport.provenance.rowCount > 0)
    case "cashier":
      return cashierReports.length > 0
    case "items":
      return itemReports.length > 0
    case "cashflow":
      return Boolean(
        cashFlowReport &&
          (cashFlowReport.provenance.rowCount > 0 ||
            cashFlowReport.dailyBreakdown.length > 0 ||
            cashFlowReport.drawerReconciliation.length > 0),
      )
  }

  return false
}

function ReportWorkspaceState({
  kind,
  title,
  message,
  actionLabel,
  onAction,
}: {
  kind: "empty" | "error"
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}) {
  const Icon = kind === "error" ? AlertTriangle : SearchX

  return (
    <Card className={analyticsPanelClass}>
      <CardContent className="flex min-h-[18rem] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--dash-border)] bg-[var(--dash-surface-elevated)] text-[var(--dash-muted)]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--dash-text)]">{title}</h2>
        <p className={`mt-2 max-w-2xl text-sm ${analyticsMutedTextClass}`}>{message}</p>
        <Button type="button" className={cn("mt-6", analyticsFilterClass)} variant="outline" onClick={onAction}>
          <RefreshCw className="me-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ReportsClient({
  organizationId,
  locationId,
  initialReport,
  initialPeriod,
  focusItemId,
}: ReportsClientProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>(() => normalizeReportType(initialReport))
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => getInitialDateRange(initialPeriod))
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [financialReport, setFinancialReport] = useState<FinancialSummaryReport | null>(null)
  const [cashierReports, setCashierReports] = useState<CashierPerformanceReport[]>([])
  const [itemReports, setItemReports] = useState<ItemPerformanceReport[]>([])
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null)

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setFinancialReport(null)
    setCashierReports([])
    setItemReports([])
    setCashFlowReport(null)

    try {
      switch (selectedReport) {
        case "financial": {
          const financial = await getFinancialSummaryReport(organizationId, locationId, dateRange.from, dateRange.to)
          setFinancialReport(financial)
          break
        }
        case "cashier": {
          const cashier = await getCashierPerformanceReport(organizationId, locationId, dateRange.from, dateRange.to)
          setCashierReports(cashier)
          break
        }
        case "items": {
          const items = await getItemPerformanceReport(organizationId, locationId, dateRange.from, dateRange.to)
          setItemReports(items)
          break
        }
        case "cashflow": {
          const cashflow = await getCashFlowReport(organizationId, locationId, dateRange.from, dateRange.to)
          setCashFlowReport(cashflow)
          break
        }
      }
    } catch (error) {
      console.error("Error loading reports:", error)
      setLoadError(REPORT_LOAD_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, locationId, organizationId, selectedReport])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    })
  }

  const setMonthRange = () => {
    const now = new Date()
    setDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    })
  }

  const reportTypes = [
    {
      id: "financial" as const,
      name: "Financial Summary",
      description: "Revenue, profit, and sales overview",
      icon: FileText,
    },
    {
      id: "cashier" as const,
      name: "Cashier Performance",
      description: "Individual cashier metrics and performance",
      icon: Users,
    },
    {
      id: "items" as const,
      name: "Item Performance",
      description: "Product sales and inventory analysis",
      icon: Package,
    },
    {
      id: "cashflow" as const,
      name: "Cash Flow",
      description: "Cash in/out and drawer reconciliation",
      icon: DollarSign,
    },
  ]
  const selectedReportHasData = hasSelectedReportData(
    selectedReport,
    financialReport,
    cashierReports,
    itemReports,
    cashFlowReport,
  )
  const selectedEmptyCopy = emptyReportCopy[selectedReport]

  return (
    <div className={analyticsPageClass}>
      <div className={analyticsContentClass}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--dash-text)]">Financial Reports</h1>
          <p className={analyticsMutedTextClass}>Comprehensive analytics and performance insights</p>
        </div>
      </div>

      <Card className={analyticsPanelClass}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-[var(--dash-text)]">Report Type</label>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {reportTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedReport === type.id
                  return (
                    <Button
                      key={type.id}
                      variant="outline"
                      className={cn(
                        "flex h-auto min-h-[6.75rem] flex-col items-center gap-2 whitespace-normal p-3 text-center",
                        isSelected ? analyticsPrimaryButtonClass : analyticsFilterClass
                      )}
                      onClick={() => setSelectedReport(type.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs font-medium">{type.name}</div>
                        <div className={`hidden text-xs lg:block ${isSelected ? "text-white/80" : analyticsMutedTextClass}`}>
                          {type.description}
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--dash-text)]">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        analyticsControlClass,
                        "w-[280px] justify-start text-start font-normal",
                        !dateRange && analyticsMutedTextClass
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={`${analyticsPanelClass} w-auto p-0`} align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-1">
                <Button size="sm" variant="outline" className={analyticsFilterClass} onClick={() => setQuickDateRange(7)}>
                  7 days
                </Button>
                <Button size="sm" variant="outline" className={analyticsFilterClass} onClick={() => setQuickDateRange(30)}>
                  30 days
                </Button>
                <Button size="sm" variant="outline" className={analyticsFilterClass} onClick={setMonthRange}>
                  This month
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className={analyticsPanelClass}>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--dash-brand)]" />
            <p className={analyticsMutedTextClass}>Loading report...</p>
          </CardContent>
        </Card>
      ) : loadError ? (
        <ReportWorkspaceState
          kind="error"
          title="Reports could not load"
          message={loadError}
          actionLabel="Retry"
          onAction={loadReports}
        />
      ) : selectedReportHasData ? (
        <>
          {selectedReport === "financial" && financialReport ? (
            <FinancialSummaryReportComponent report={financialReport} />
          ) : null}

          {selectedReport === "cashier" ? <CashierPerformanceReportComponent reports={cashierReports} /> : null}

          {selectedReport === "items" ? <ItemPerformanceReportComponent reports={itemReports} focusItemId={focusItemId} /> : null}

          {selectedReport === "cashflow" && cashFlowReport ? <CashFlowReportComponent report={cashFlowReport} /> : null}
        </>
      ) : (
        <ReportWorkspaceState
          kind="empty"
          title={selectedEmptyCopy.title}
          message={selectedEmptyCopy.message}
          actionLabel="Try 30 days"
          onAction={() => setQuickDateRange(30)}
        />
      )}
      </div>
    </div>
  )
}
