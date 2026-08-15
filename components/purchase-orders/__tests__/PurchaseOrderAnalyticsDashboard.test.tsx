import fs from "node:fs"
import path from "node:path"
import type { AnchorHTMLAttributes, ReactNode, SVGProps } from "react"
import { render, screen } from "@testing-library/react"

import { PurchaseOrderAnalyticsDashboard } from "../PurchaseOrderAnalyticsDashboard"
import type { PurchaseOrderAnalyticsData } from "@/types/purchase-order-analytics"

jest.mock("lucide-react", () => {
  const Icon = (props: SVGProps<SVGSVGElement>) => <svg {...props} />

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return Icon
      },
    },
  )
})

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

jest.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  const Empty = () => null

  return {
    ResponsiveContainer: Container,
    ComposedChart: Container,
    PieChart: Container,
    Pie: Container,
    BarChart: Container,
    Bar: Empty,
    CartesianGrid: Empty,
    Cell: Empty,
    Legend: Empty,
    Line: Empty,
    Tooltip: Empty,
    XAxis: Empty,
    YAxis: Empty,
  }
})

const data: PurchaseOrderAnalyticsData = {
  generatedAt: "2026-08-14T12:00:00.000Z",
  currency: "XAF",
  period: { from: "2026-05-16T00:00:00.000Z", to: "2026-08-14T23:59:59.999Z" },
  totals: {
    orders: 2,
    activeOrders: 2,
    totalSpend: 1600,
    averageOrderValue: 800,
    openCommitmentValue: 400,
    overdueOrders: 1,
    overdueValue: 400,
    orderedUnits: 16,
    receivedUnits: 12,
    receiptRate: 75,
    cancellationRate: 0,
    completionRate: 50,
    onTimeRate: 100,
    onTimeSampleSize: 1,
    supplierConcentrationRate: 62.5,
    approvalCycle: { averageHours: 24, medianHours: 24, p90Hours: 24, sampleSize: 1 },
  },
  monthly: [{ month: "2026-07", orderCount: 2, totalSpend: 1600, receivedOrders: 1 }],
  statusBreakdown: [
    { status: "SUBMITTED", orders: 1, totalValue: 600 },
    { status: "COMPLETED", orders: 1, totalValue: 1000 },
  ],
  supplierPerformance: [{
    supplierId: "supplier-a",
    name: "Atlas Supply",
    code: "ATL",
    orders: 2,
    totalSpend: 1600,
    openCommitmentValue: 400,
    overdueOrders: 1,
    receiptRate: 75,
    onTimeRate: 100,
    onTimeSampleSize: 1,
  }],
  locationPerformance: [{
    locationId: "location-a",
    name: "Main warehouse",
    orders: 2,
    totalSpend: 1600,
    openCommitmentValue: 400,
    overdueOrders: 1,
    receiptRate: 75,
  }],
  itemPerformance: [{
    itemId: "item-a",
    sku: "SKU-A",
    nameEn: "Coffee",
    nameFr: "Café",
    orderedUnits: 16,
    receivedUnits: 12,
    totalSpend: 1600,
    receiptRate: 75,
  }],
  aging: [
    { bucket: "0_7", orders: 0, openCommitmentValue: 0 },
    { bucket: "8_30", orders: 1, openCommitmentValue: 400 },
    { bucket: "31_60", orders: 0, openCommitmentValue: 0 },
    { bucket: "61_PLUS", orders: 0, openCommitmentValue: 0 },
  ],
  exceptions: [{
    id: "po-overdue",
    orderNumber: "PO-0002",
    supplierName: "Atlas Supply",
    locationName: "Main warehouse",
    status: "SUBMITTED",
    issue: "OVERDUE",
    risk: "high",
    orderDate: "2026-07-20T00:00:00.000Z",
    expectedDeliveryDate: "2026-07-25T00:00:00.000Z",
    daysOpen: 25,
    daysOverdue: 20,
    totalValue: 600,
    openCommitmentValue: 400,
    receiptRate: 33.3,
  }],
  dataQuality: {
    expectedDeliveryCoverage: 100,
    approvalEvidenceCoverage: 100,
    deliveryEvidenceCoverage: 100,
    expectedDeliverySampleSize: 2,
    approvalEvidenceSampleSize: 1,
    deliveryEvidenceSampleSize: 1,
  },
}

describe("PurchaseOrderAnalyticsDashboard", () => {
  it("renders the read-only purchasing intelligence and drill-down evidence", () => {
    render(<PurchaseOrderAnalyticsDashboard data={data} locale="en" range="90d" />)

    expect(screen.getByRole("heading", { name: "Purchase order analytics" })).toBeTruthy()
    expect(screen.getByText("Open goods commitment")).toBeTruthy()
    expect(screen.getByText("Data trust signals")).toBeTruthy()
    expect(screen.getAllByText("Atlas Supply").length).toBeGreaterThan(0)
    expect(screen.getByText("Delivery overdue")).toBeTruthy()
    expect(screen.getByLabelText("From date")).toBeTruthy()
    expect(screen.getByLabelText("To date")).toBeTruthy()
    expect(screen.getAllByTestId("analytics-table-workbench")).toHaveLength(4)
    expect(screen.getByLabelText("Search suppliers, codes, or metrics")).toBeTruthy()
    expect(screen.getByLabelText("Search locations or metrics")).toBeTruthy()
    expect(screen.getByLabelText("Search items, SKUs, or metrics")).toBeTruthy()
    expect(screen.getByLabelText("Search orders, suppliers, locations, or signals")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Export CSV" })).toHaveLength(4)
    expect(screen.getByRole("link", { name: "PO-0002" }).getAttribute("href")).toBe(
      "/dashboard/purchase-orders/po-overdue",
    )
    expect(screen.getByRole("link", { name: "30 days" }).getAttribute("href")).toBe(
      "/dashboard/purchase-orders/analytics?range=30d",
    )
  })

  it("keeps command workflows outside the analytics route and component", () => {
    const sources = [
      "components/purchase-orders/PurchaseOrderAnalyticsDashboard.tsx",
      "app/[locale]/(dashboard)/dashboard/purchase-orders/analytics/page.tsx",
    ].map(file => fs.readFileSync(path.join(process.cwd(), file), "utf8"))

    for (const source of sources) {
      expect(source).not.toMatch(/createPurchaseOrder|submitPurchaseOrder|approvePurchaseOrder/)
      expect(source).not.toMatch(/receiveItems|cancelPurchaseOrder|deletePurchaseOrder/)
      expect(source).not.toMatch(/useMutation|mutationFn/)
    }
  })

  it("keeps every operational list in its own full-width table section", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/purchase-orders/PurchaseOrderAnalyticsDashboard.tsx"),
      "utf8",
    )

    expect(source).not.toContain("2xl:grid-cols-2")
    expect(source.match(/<PurchaseOrderAnalyticsTable/g)).toHaveLength(4)
  })

  it("keeps date navigation available when the selected period has no orders", () => {
    const emptyData: PurchaseOrderAnalyticsData = {
      ...data,
      totals: { ...data.totals, orders: 0, activeOrders: 0 },
      monthly: [],
      statusBreakdown: [],
      supplierPerformance: [],
      locationPerformance: [],
      itemPerformance: [],
      exceptions: [],
    }

    render(<PurchaseOrderAnalyticsDashboard data={emptyData} locale="en" range="30d" />)

    expect(screen.getByText("No purchase-order data exists in this analysis period.")).toBeTruthy()
    expect(screen.getByLabelText("From date")).toBeTruthy()
    expect(screen.getByLabelText("To date")).toBeTruthy()
    expect(screen.getByRole("link", { name: "All time" })).toBeTruthy()
    expect(screen.queryAllByTestId("analytics-table-workbench")).toHaveLength(0)
  })
})
