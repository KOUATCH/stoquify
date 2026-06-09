"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { CalendarIcon, DollarSign, FileText, Package, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { CashFlowReportComponent } from "@/components/reports/cash-flow-report"
import { CashierPerformanceReportComponent } from "@/components/reports/cashier-performance-report"
import { FinancialSummaryReportComponent } from "@/components/reports/financial-summary-report"
import { ItemPerformanceReportComponent } from "@/components/reports/item-performance-report"

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

  const [financialReport, setFinancialReport] = useState<FinancialSummaryReport | null>(null)
  const [cashierReports, setCashierReports] = useState<CashierPerformanceReport[]>([])
  const [itemReports, setItemReports] = useState<ItemPerformanceReport[]>([])
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null)

  const loadReports = useCallback(async () => {
    setIsLoading(true)
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Comprehensive analytics and performance insights</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Report Type</label>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {reportTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <Button
                      key={type.id}
                      variant={selectedReport === type.id ? "default" : "outline"}
                      className="flex h-auto flex-col items-center gap-2 p-3"
                      onClick={() => setSelectedReport(type.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs font-medium">{type.name}</div>
                        <div className="hidden text-xs text-muted-foreground lg:block">{type.description}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-start font-normal",
                        !dateRange && "text-muted-foreground"
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
                  <PopoverContent className="w-auto p-0" align="start">
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
                <Button size="sm" variant="outline" onClick={() => setQuickDateRange(7)}>
                  7 days
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuickDateRange(30)}>
                  30 days
                </Button>
                <Button size="sm" variant="outline" onClick={setMonthRange}>
                  This month
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading report...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedReport === "financial" && financialReport && (
            <FinancialSummaryReportComponent report={financialReport} />
          )}

          {selectedReport === "cashier" && cashierReports.length > 0 && (
            <CashierPerformanceReportComponent reports={cashierReports} />
          )}

          {selectedReport === "items" && itemReports.length > 0 && (
            <ItemPerformanceReportComponent reports={itemReports} focusItemId={focusItemId} />
          )}

          {selectedReport === "cashflow" && cashFlowReport && <CashFlowReportComponent report={cashFlowReport} />}
        </>
      )}
    </div>
  )
}
