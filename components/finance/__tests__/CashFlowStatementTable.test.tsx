import { fireEvent, render, screen } from "@testing-library/react"

import { CashFlowStatementTable } from "../FinanceCommandCenterDashboard"

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}))

jest.mock("@/hooks/finance/useFinanceDashboard", () => ({
  useFinanceDashboard: () => ({ data: undefined, isLoading: false, isFetching: false, refetch: jest.fn() }),
}))

jest.mock("@/components/finance/FinanceSpecializedLedgerSurfaces", () => ({
  FinancePaymentMethodBreakdown: () => null,
  FinanceWorkflowActionPanel: () => null,
  PaymentsTable: () => null,
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({ info: jest.fn(), success: jest.fn(), error: jest.fn() }),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string) => href,
  pickLocale: () => "en",
}))

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})

describe("CashFlowStatementTable", () => {
  it("searches all periods and resets shared pagination when filtering", () => {
    render(<CashFlowStatementTable
      trend={Array.from({ length: 30 }, (_, index) => ({ key: `2026-09-${String(index + 1).padStart(2, "0")}`, label: `Period ${index + 1}`, inflow: 100, outflow: 20, revenue: 100, expenses: 20, purchases: 0, net: 80 }))}
      currency="XAF" locale="en" entityId="org-1" entityName="Demo" period="mtd" periodStart="2026-09-01" periodEnd="2026-09-30" money={(value) => `${value} XAF`}
    />)
    expect(screen.queryByText("Period 30")).not.toBeInTheDocument()
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go to last page" }))
    expect(screen.getByText("Period 30")).toBeInTheDocument()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search cash-flow rows" }), { target: { value: "Period 1" } })
    expect(screen.getByText("Period 1")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()
    expect(screen.queryByText("Period 30")).not.toBeInTheDocument()
  })

  it("renders bounded cash-flow rows with entity, period, currency, and evidence context", () => {
    render(
      <CashFlowStatementTable
        trend={[
          {
            key: "2026-08-28",
            label: "Aug 28",
            inflow: 150000,
            outflow: 50000,
            revenue: 150000,
            expenses: 50000,
            purchases: 0,
            net: 100000,
          },
        ]}
        currency="XAF"
        locale="en"
        entityId="org-1"
        entityName="Demo organization"
        period="mtd"
        periodStart="2026-08-01"
        periodEnd="2026-08-28"
        money={(value) => `${value ?? 0} XAF`}
      />,
    )

    expect(screen.getByText("Cash-flow statement")).toBeInTheDocument()
    expect(screen.getByText("Demo organization / XAF / Aug 1, 2026 – Aug 28, 2026")).toBeInTheDocument()
    expect(screen.getByText("Finance read model")).toBeInTheDocument()
    expect(screen.getAllByText(/150000 XAF/).length).toBeGreaterThan(0)
    expect(screen.getByText("Table ready")).toBeInTheDocument()
    const toolbar = screen.getByRole("searchbox", { name: "Search cash-flow rows" }).closest(".dashboard-table-toolbar")
    expect(toolbar).toContainElement(screen.getByRole("button", { name: "View columns" }))
    expect(toolbar).toContainElement(screen.getByRole("group", { name: "Table density" }))
  })
})
