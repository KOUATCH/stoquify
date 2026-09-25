import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

jest.mock("next-intl", () => {
  const copy = require("@/messages/en.json").operationalReports
  const translate = (key: string, values: Record<string, unknown> = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll("{" + name + "}", String(value)), copy[key])
  return { useLocale: () => "en", useTranslations: jest.fn(() => translate) }
})

jest.mock("next/navigation", () => {
  const { useSyncExternalStore } = require("react")
  const subscribe = (listener: () => void) => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener) }
  return { useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)) }
})

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
  let replaceHistory: jest.SpyInstance

  beforeAll(() => {
    const original = window.history.replaceState.bind(window.history)
    // Model Next's search-parameter notification after its native history adapter commits the URL.
    replaceHistory = jest.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => {
      original(data, unused, url)
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
  })
  afterAll(() => { replaceHistory.mockRestore() })

  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, "", "/")
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

    expect(await screen.findByRole("heading", { name: "No cashier sessions" })).toBeInTheDocument()
    expect(screen.getByText(/No cashier sessions overlap this period/)).toBeInTheDocument()
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
  it("does not let a late earlier date request replace the selected report", async () => {
    let resolveOld!: (value: FinancialSummaryReport) => void
    mockGetFinancialSummaryReport.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve })).mockResolvedValueOnce({ provenance: { rowCount: 1 } })
    renderReportsClient()
    await waitFor(() => expect(mockGetFinancialSummaryReport).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole("button", { name: "30 days", exact: true }))
    await screen.findByTestId("financial-report")
    await act(async () => { resolveOld(emptyFinancialReport) })
    expect(screen.getByTestId("financial-report")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "No financial report data" })).not.toBeInTheDocument()
  })
  it("discards a failed old organization request and preserves the current result", async () => {
    let rejectOld!: (error: Error) => void
    mockGetFinancialSummaryReport.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject })).mockResolvedValueOnce({ provenance: { rowCount: 1 } })
    const view = render(<ReportsClient organizationId="org-1" locationId="all" />)
    view.rerender(<ReportsClient organizationId="org-2" locationId="all" />)
    await screen.findByTestId("financial-report")
    await act(async () => { rejectOld(new Error("old organization read failed")) })
    expect(screen.getByTestId("financial-report")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
  it("retains the selected report and dates through an application shell remount", async () => {
    mockGetItemPerformanceReport.mockResolvedValue([itemReport])
    const view = render(<ReportsClient organizationId="org-1" locationId="all" />)
    await screen.findByRole("heading", { name: "No financial report data" })
    fireEvent.click(screen.getByRole("button", { name: /Item performance/ }))
    await screen.findByTestId("item-report")
    fireEvent.click(screen.getByRole("button", { name: "30 days", exact: true }))
    await waitFor(() => expect(mockGetItemPerformanceReport).toHaveBeenCalledTimes(2))
    const selectedArgs = mockGetItemPerformanceReport.mock.calls[1]
    view.unmount()
    render(<ReportsClient organizationId="org-1" locationId="all" />)
    await screen.findByTestId("item-report")
    expect(mockGetItemPerformanceReport.mock.calls[2]).toEqual(selectedArgs)
    expect(new URL(window.location.href).searchParams.get("report")).toBe("items")
  })
  it("does not restart a failed read when the translation provider refreshes", async () => {
    mockGetFinancialSummaryReport.mockRejectedValue(new Error("read unavailable"))
    const view = render(<ReportsClient organizationId="org-1" locationId="all" />)
    await screen.findByRole("alert")
    jest.requireMock("next-intl").useTranslations.mockReturnValueOnce((key: string) => require("@/messages/en.json").operationalReports[key])
    view.rerender(<ReportsClient organizationId="org-1" locationId="all" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Reports could not load")
    expect(mockGetFinancialSummaryReport).toHaveBeenCalledTimes(1)
  })
})
