import type { SVGProps } from "react"
import { render, screen, within } from "@testing-library/react"

import type { ItemPerformanceReport } from "@/actions/analytics/financial-reports"
import { ItemPerformanceReportComponent } from "../item-performance-report"

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

    expect(screen.getByText("No Available Stock")).toBeInTheDocument()
    expect(within(card).getByText("Stock Scope")).toBeInTheDocument()
    expect(within(card).getByText("Organization-wide stock")).toBeInTheDocument()
    expect(within(card).getByText("On Hand")).toBeInTheDocument()
    expect(within(card).getByText("Available to Sell")).toBeInTheDocument()
    expect(within(card).getByText("Reserved / Committed")).toBeInTheDocument()
    expect(within(card).getAllByText("12").length).toBeGreaterThanOrEqual(2)
    expect(within(card).getByText("0")).toBeInTheDocument()
    expect(within(card).getByText("0 days")).toBeInTheDocument()
  })
})