import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { FinancialSummaryReport } from "@/actions/analytics/financial-reports"
import { FinancialSummaryReportComponent } from "../financial-summary-report"

let mockLocale = "en"
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
    const messages = mockLocale === "fr" ? require("@/messages/fr.json") : require("@/messages/en.json")
    return Object.entries(values).reduce((text, [name, value]) => text.replaceAll("{" + name + "}", String(value)), messages.operationalReports[key])
  },
}))
jest.mock("recharts", () => ({ ResponsiveContainer: () => <div />, BarChart: () => null, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }))
const report: FinancialSummaryReport = {
  period: "2026-09-01", timezone: "Africa/Douala", totalRevenue: 120, netRevenue: 100, totalCost: 20, grossProfit: 80, grossMargin: 80,
  costEvidence: { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 1, uncoveredGroups: 0 }, totalTransactions: 1, totalItemsSold: 1, averageTransactionValue: 120,
  cashSales: 120, cardSales: 0, digitalSales: 0, revenueChange: null, transactionChange: null, profitChange: null, topSellingItems: [], hourlyBreakdown: [{ hour: 10, revenue: 120, transactions: 1 }],
  provenance: { source: "PRISMA_OPERATIONAL_READ_MODEL", sourceLabel: "Operational", sourceTables: ["salesOrder", "inventoryTransaction"], currency: "XAF", timezone: "Africa/Douala", periodStart: "2026-09-01T00:00:00Z", periodEnd: "2026-09-01T23:59:59Z", generatedAt: "2026-09-02T12:00:00Z", freshness: "HISTORICAL_PERIOD", evidenceStatus: "OPERATIONAL_READ_MODEL", certificationStatus: "INTERNAL_REPORT_ONLY", certificationLabel: "Internal", knownBlockers: ["Not a statutory OHADA certified export"], rowCount: 1, filterHash: "a".repeat(64) },
}
beforeEach(() => { mockLocale = "en" })
it("provides the chart values through a keyboard-operated table disclosure", async () => {
  // The repository setup owns a non-configurable clipboard; direct keyboard events do not replace it.
  const user = userEvent
  render(<FinancialSummaryReportComponent report={report} />)
  const toggle = screen.getByRole("button", { name: "View hourly values" })
  toggle.focus(); await user.keyboard("{Enter}")
  expect(toggle).toHaveAttribute("aria-expanded", "true")
  expect(screen.getByRole("table")).toBeVisible()
  expect(screen.getByRole("rowheader", { name: "10:00" })).toBeVisible()
  await user.keyboard("{Enter}")
  expect(screen.queryByRole("table")).not.toBeInTheDocument()
})
it("explains missing cost and internal evidence in French without a zero margin", () => {
  mockLocale = "fr"
  render(<FinancialSummaryReportComponent report={{ ...report, totalCost: null, grossProfit: null, grossMargin: null, costEvidence: { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 1 } }} />)
  expect(screen.getByRole("heading", { name: "Synthèse des ventes et des marges" })).toBeVisible()
  expect(screen.getAllByText("Indisponible")).toHaveLength(2)
  expect(screen.getByText(/Demandez au responsable des stocks/)).toBeVisible()
  expect(screen.getByText("Rapport de gestion interne uniquement")).toBeVisible()
})
