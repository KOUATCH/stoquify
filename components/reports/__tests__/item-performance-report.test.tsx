import type { SVGProps } from "react"
import { render, screen, within } from "@testing-library/react"

import type { ItemPerformanceReport } from "@/actions/analytics/financial-reports"
import { ItemPerformanceReportComponent } from "../item-performance-report"

jest.mock("next-intl", () => {
  const copy = require("@/messages/en.json").operationalReports
  return { useLocale: () => "en", useTranslations: () => (key: string, values: Record<string, unknown> = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll("{" + name + "}", String(value)), copy[key]) }
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

jest.mock("@/components/reports/report-trust-banner", () => ({
  ReportTrustBanner: () => <div data-testid="report-trust-banner" />,
}))

const provenance = {
  source: "PRISMA_OPERATIONAL_READ_MODEL",
  sourceLabel: "Service-backed operational database read model",
  sourceTables: ["item", "inventoryLevel"],
  periodStart: "2026-06-01T00:00:00.000Z",
  periodEnd: "2026-06-30T23:59:59.999Z",
  generatedAt: "2026-06-30T12:00:00.000Z",
  freshness: "CURRENT_AS_OF_GENERATION",
  evidenceStatus: "OPERATIONAL_READ_MODEL",
  certificationStatus: "INTERNAL_REPORT_ONLY",
  certificationLabel: "Internal management report only",
  knownBlockers: [],
  rowCount: 1,
  filterHash: "a".repeat(64),
  currency: "XAF",
} satisfies ItemPerformanceReport["provenance"]

function report(overrides: Partial<ItemPerformanceReport> = {}): ItemPerformanceReport {
  return {
    provenance,
    itemId: "item-1",
    itemName: "Arabica Coffee",
    itemSku: "COF-001",
    category: "Beverages",
    brand: "AqStoq",
    quantitySold: 10,
    totalRevenue: 500,
    netRevenue: 500,
    itemNameFr: "Café Arabica",
    costEvidence: { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 1, uncoveredGroups: 0 },
    totalCost: 200,
    grossProfit: 300,
    profitMargin: 60,
    averageSellingPrice: 50,
    currentStock: 12,
    availableToSell: 0,
    reservedStock: 12,
    stockValue: 240,
    turnoverRate: 0.8,
    daysOfStock: 36,
    daysOfAvailableStock: 0,
    stockScope: "organization",
    stockScopeLabel: "Organization-wide stock",
    stockStatus: "out_of_stock",
    salesTrend: "stable",
    revenueChange: 0,
    quantityChange: 0,
    ...overrides,
  }
}

describe("ItemPerformanceReportComponent stock clarity", () => {
  it("separates on-hand stock from sellable availability and labels the scope", () => {
    render(<ItemPerformanceReportComponent reports={[report()]} />)

    const card = screen.getByText("Arabica Coffee").closest(".dashboard-glass-panel") as HTMLElement

    expect(screen.getByText("No available stock")).toBeInTheDocument()
    expect(within(card).getByText("Stock scope")).toBeInTheDocument()
    expect(within(card).getByText("Organization-wide stock")).toBeInTheDocument()
    expect(within(card).getByText("On hand")).toBeInTheDocument()
    expect(within(card).getByText("Available to sell")).toBeInTheDocument()
    expect(within(card).getByText("Reserved / committed")).toBeInTheDocument()
    expect(within(card).getAllByText("12").length).toBeGreaterThanOrEqual(2)
    expect(within(card).getByText("0")).toBeInTheDocument()
    expect(within(card).getByText("0 days")).toBeInTheDocument()
  })
  it("renders missing cost as unavailable and explains the source review needed", () => {
    render(<ItemPerformanceReportComponent reports={[report({ totalCost: null, grossProfit: null, profitMargin: null, costEvidence: { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 1 } })]} />)
    expect(screen.getAllByText("Unavailable")).toHaveLength(2)
    expect(screen.getByText(/Ask inventory operations to review the original stock issues/)).toBeInTheDocument()
  })
})
