"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { AlertTriangle, CalendarIcon, DollarSign, FileText, Package, RefreshCw, SearchX, Users } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { useLocale, useTranslations } from "next-intl"
import { enUS, fr } from "date-fns/locale"

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
  initialFrom?: string
  initialTo?: string
  focusItemId?: string
}

function normalizeReportType(report?: string): ReportType {
  if (report === "cashier") return "cashier"
  if (report === "items" || report === "item-performance" || report === "product-sales") return "items"
  if (report === "cashflow" || report === "cash-flow") return "cashflow"
  return "financial"
}

function getInitialDateRange(period?: string, initialFrom?: string, initialTo?: string) {
  const fromValue = initialFrom, toValue = initialTo
  if (fromValue && toValue && fromValue.length <= 30 && toValue.length <= 30) {
    const from = new Date(fromValue), to = new Date(toValue)
    if (Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from <= to) return { from, to }
  }
  const now = new Date()

  if (period === "30d") return { from: subDays(now, 29), to: now }
  if (period === "90d") return { from: subDays(now, 89), to: now }
  if (period === "mtd") return { from: startOfMonth(now), to: now }

  return { from: subDays(now, 6), to: now }
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
    <Card role={kind === "error" ? "alert" : "status"} className={analyticsPanelClass}>
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
  initialFrom,
  initialTo,
  focusItemId,
}: ReportsClientProps) {
  const t = useTranslations("operationalReports"), locale = useLocale()
  const dateLocale = locale === "fr" ? fr : enUS
  const currentReportScope = useRef("")
  const generation = useRef(0)
  const [completedScope, setCompletedScope] = useState("")
  const searchParams = useSearchParams()
  const selectedReport = normalizeReportType(searchParams.get("report") ?? initialReport)
  const fromValue = searchParams.get("reportFrom") ?? initialFrom, toValue = searchParams.get("reportTo") ?? initialTo
  const [initialRange] = useState(() => getInitialDateRange(initialPeriod, initialFrom, initialTo))
  const dateRange = useMemo(() => fromValue && toValue ? getInitialDateRange(initialPeriod, fromValue, toValue) : initialRange, [fromValue, toValue, initialPeriod, initialRange])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [financialReport, setFinancialReport] = useState<FinancialSummaryReport | null>(null)
  const [cashierReports, setCashierReports] = useState<CashierPerformanceReport[]>([])
  const [itemReports, setItemReports] = useState<ItemPerformanceReport[]>([])
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null)

  const scopeKey = JSON.stringify([organizationId, locationId, selectedReport, dateRange.from.toISOString(), dateRange.to.toISOString()])
  useLayoutEffect(() => { currentReportScope.current = scopeKey }, [scopeKey])
  const loadReports = useCallback(async () => {
    const request = ++generation.current
    const isCurrent = () => generation.current === request && currentReportScope.current === scopeKey
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
          if (isCurrent()) setFinancialReport(financial)
          break
        }
        case "cashier": {
          const cashier = await getCashierPerformanceReport(organizationId, locationId, dateRange.from, dateRange.to)
          if (isCurrent()) setCashierReports(cashier)
          break
        }
        case "items": {
          const items = await getItemPerformanceReport(organizationId, locationId, dateRange.from, dateRange.to)
          if (isCurrent()) setItemReports(items)
          break
        }
        case "cashflow": {
          const cashflow = await getCashFlowReport(organizationId, locationId, dateRange.from, dateRange.to)
          if (isCurrent()) setCashFlowReport(cashflow)
          break
        }
      }
    } catch {
      // Keep raw database/provider errors out of the client log.
      if (isCurrent()) setLoadError("REPORT_READ_FAILED")
    } finally {
      if (isCurrent()) { setIsLoading(false); setCompletedScope(scopeKey) }
    }
  }, [dateRange, locationId, organizationId, selectedReport, scopeKey])

  useEffect(() => {
    void loadReports()
    return () => { generation.current += 1 }
  }, [loadReports])

  const saveReportView = (report: ReportType, range: { from: Date; to: Date }) => {
    const url = new URL(window.location.href)
    url.searchParams.set("report", report)
    url.searchParams.set("reportFrom", range.from.toISOString())
    url.searchParams.set("reportTo", range.to.toISOString())
    // Let Next synchronize its canonical URL. Passing its internal __NA state skips that synchronization.
    window.history.replaceState(null, "", url)
  }
  const changeDateRange = (range: { from: Date; to: Date }) => {
    saveReportView(selectedReport, range)
  }
  const setQuickDateRange = (days: number) => {
    changeDateRange({
      from: subDays(new Date(), days - 1),
      to: new Date(),
    })
  }

  const setMonthRange = () => {
    const now = new Date()
    changeDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    })
  }

  const reportTypes = [
    {
      id: "financial" as const,
      name: t("financialName"),
      description: t("financialDescription"),
      icon: FileText,
    },
    {
      id: "cashier" as const,
      name: t("cashierName"),
      description: t("cashierDescription"),
      icon: Users,
    },
    {
      id: "items" as const,
      name: t("itemsName"),
      description: t("itemsDescription"),
      icon: Package,
    },
    {
      id: "cashflow" as const,
      name: t("cashflowName"),
      description: t("cashflowDescription"),
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
  const selectedEmptyCopy = { title: t((selectedReport + "Empty") as "financialEmpty"), message: t((selectedReport + "EmptyMessage") as "financialEmptyMessage") }

  return (
    <div className={analyticsPageClass} data-testid="report-workspace">
      <div className={analyticsContentClass}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--dash-text)]">{t("workspaceTitle")}</h1>
          <p className={analyticsMutedTextClass}>{t("workspaceDescription")}</p>
        </div>
      </div>

      <Card className={analyticsPanelClass}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-[var(--dash-text)]">{t("reportType")}</label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
                {reportTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedReport === type.id
                  return (
                    <Button
                      key={type.id}
                      variant="outline"
                      className={cn(
                        "flex h-auto min-h-[6.75rem] min-w-0 flex-col items-center gap-2 whitespace-normal p-3 text-center [overflow-wrap:anywhere]",
                        isSelected ? analyticsPrimaryButtonClass : analyticsFilterClass
                      )}
                      aria-pressed={isSelected}
                      onClick={() => saveReportView(type.id, dateRange)}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="min-w-0 max-w-full text-center">
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

            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium text-[var(--dash-text)]">{t("dateRange")}</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        analyticsControlClass,
                        "h-auto min-h-10 w-full max-w-full whitespace-normal justify-start text-start font-normal py-2",
                        !dateRange && analyticsMutedTextClass
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words whitespace-normal">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y", { locale: dateLocale })} - {format(dateRange.to, "LLL dd, y", { locale: dateLocale })}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>{t("pickRange")}</span>
                      )}
                      </span>
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
                          changeDateRange({ from: range.from, to: range.to })
                        }
                      }}
                      numberOfMonths={1}
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className={`${analyticsFilterClass} h-auto whitespace-normal py-2`} onClick={() => setQuickDateRange(7)}>
                  {t("quickDays", { count: 7 })}
                </Button>
                <Button size="sm" variant="outline" className={`${analyticsFilterClass} h-auto whitespace-normal py-2`} onClick={() => setQuickDateRange(30)}>
                  {t("quickDays", { count: 30 })}
                </Button>
                <Button size="sm" variant="outline" className={`${analyticsFilterClass} h-auto whitespace-normal py-2`} onClick={setMonthRange}>
                  {t("thisMonth")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading || completedScope !== scopeKey ? (
        <Card className={analyticsPanelClass}>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 motion-reduce:animate-none animate-spin rounded-full border-b-2 border-[var(--dash-brand)]" />
            <p role="status" className={analyticsMutedTextClass}>{t("loading")}</p>
          </CardContent>
        </Card>
      ) : loadError ? (
        <ReportWorkspaceState
          kind="error"
          title={t("loadFailed")}
          message={t("loadError")}
          actionLabel={t("retry")}
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
          actionLabel={t("try30")}
          onAction={() => setQuickDateRange(30)}
        />
      )}
      </div>
    </div>
  )
}
