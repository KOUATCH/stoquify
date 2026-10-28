import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

jest.mock("@/actions/analytics/financial-reports", () => ({
  __esModule: true,
  getCashFlowReport: jest.fn(),
  getCashierPerformanceReport: jest.fn(),
  getFinancialSummaryReport: jest.fn(),
  getItemPerformanceReport: jest.fn(),
}))

jest.mock("@/components/reports/cash-flow-report", () => ({
  CashFlowReportComponent: () => <div data-testid="cash-flow-report" />,
}))

jest.mock("@/components/reports/cashier-performance-report", () => ({
  CashierPerformanceReportComponent: ({ reports }: { reports: unknown[] }) => (
    <div data-testid="cashier-report">{reports.length}</div>
  ),
}))

jest.mock("@/components/reports/financial-summary-report", () => ({
  FinancialSummaryReportComponent: () => <div data-testid="financial-report" />,
}))

jest.mock("@/components/reports/item-performance-report", () => ({
  ItemPerformanceReportComponent: ({ reports, focusItemId }: { reports: unknown[]; focusItemId?: string }) => (
    <div data-testid="item-report">{`${reports.length}:${focusItemId ?? "none"}`}</div>
  ),
}))

import {
  getCashFlowReport,
  getCashierPerformanceReport,
  getFinancialSummaryReport,
  getItemPerformanceReport,
  type FinancialSummaryReport,
  type ItemPerformanceReport,
} from "@/actions/analytics/financial-reports"

import ReportsClient from "../ReportsClient"

const mockGetCashFlowReport = getCashFlowReport as jest.Mock
const mockGetCashierPerformanceReport = getCashierPerformanceReport as jest.Mock
const mockGetFinancialSummaryReport = getFinancialSummaryReport as jest.Mock
const mockGetItemPerformanceReport = getItemPerformanceReport as jest.Mock

const emptyFinancialReport = {
  period: "Jun 01, 2026 - Jun 24, 2026",
  provenance: {
    rowCount: 0,
  },
} as unknown as FinancialSummaryReport

const itemReport = {
  itemId: "item-1",
  itemName: "Widget",
  itemSku: "SKU-1",
} as unknown as ItemPerformanceReport

function renderReportsClient(initialReport = "financial") {
  render(
    <ReportsClient
      organizationId="org-1"
      locationId="all"
      initialReport={initialReport}
      focusItemId="item-1"
    />,
  )
}

describe("ReportsClient empty and error states", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    mockGetCashFlowReport.mockResolvedValue(null)
    mockGetCashierPerformanceReport.mockResolvedValue([])
    mockGetFinancialSummaryReport.mockResolvedValue(emptyFinancialReport)
    mockGetItemPerformanceReport.mockResolvedValue([])
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it("renders an empty state when a financial report has no source rows", async () => {
    renderReportsClient("financial")

    expect(await screen.findByRole("heading", { name: "No financial report data" })).toBeInTheDocument()
    expect(screen.getByText(/No completed sales or payments matched this report period/)).toBeInTheDocument()
    expect(screen.queryByTestId("financial-report")).not.toBeInTheDocument()
  })

  it("renders an empty state when an array-backed report returns no rows", async () => {
    renderReportsClient("cashier")

    expect(await screen.findByRole("heading", { name: "No cashier performance data" })).toBeInTheDocument()
    expect(screen.getByText(/No cashier sessions with reportable sales matched this period/)).toBeInTheDocument()
    expect(screen.queryByTestId("cashier-report")).not.toBeInTheDocument()
  })

  it("redacts action failures and preserves successful report rendering", async () => {
    mockGetFinancialSummaryReport.mockRejectedValueOnce(new Error("raw database password leaked"))

    renderReportsClient("financial")

    expect(await screen.findByRole("heading", { name: "Reports could not load" })).toBeInTheDocument()
    expect(screen.getByText("Reports could not be loaded safely. Try again or adjust the filters.")).toBeInTheDocument()
    expect(screen.queryByText(/raw database password leaked/)).not.toBeInTheDocument()

    jest.clearAllMocks()
    mockGetItemPerformanceReport.mockResolvedValueOnce([itemReport])
    renderReportsClient("items")

    expect(await screen.findByTestId("item-report")).toHaveTextContent("1:item-1")
  })
})