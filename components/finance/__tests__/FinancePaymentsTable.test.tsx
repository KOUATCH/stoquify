import { fireEvent, render, screen, within } from "@testing-library/react"
import type { useTranslations } from "next-intl"

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}))

jest.mock("@/hooks/finance/useFinanceDashboard", () => ({
  useFinanceDashboard: jest.fn(),
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string) => href,
  pickLocale: () => "en",
}))

jest.mock("@/components/DataTableComponents/TableDateRangePicker", () => ({
  TableDateRangePicker: ({
    onChange,
    ariaLabel,
  }: {
    onChange: (value: { from?: string; to?: string }) => void
    ariaLabel: string
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => onChange({ from: "2026-08-10" })}
    >
      Choose payment range
    </button>
  ),
}))

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
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

import { FinancePayablesSurface, FinancePaymentsSurface, FinanceReceivablesSurface, PaymentsTable } from "@/components/finance/FinanceSpecializedLedgerSurfaces"
import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard"
import type {
  FinanceDashboardData,
  FinanceRecentPayment,
} from "@/services/finance/finance-dashboard.service"

type Translator = ReturnType<typeof useTranslations>

const mockedUseFinanceDashboard = jest.mocked(useFinanceDashboard)

const financeLabels: Record<string, string> = {
  "table.payment": "Payment",
  "table.counterparty": "Counterparty",
  "table.method": "Method",
  "table.status": "Status",
  "table.amount": "Amount",
  "table.time": "Time",
  "methods.CASH": "Cash",
  "methods.CARD": "Card",
  "statuses.PAID": "Paid",
  "statuses.PENDING": "Pending",
}

const surfaceLabels: Record<string, string> = {
  "payments.ledger.searchPlaceholder": "Search payment, counterparty, processor, method, or amount",
  "payments.ledger.searchLabel": "Search payment ledger",
  "payments.ledger.clearSearch": "Clear payment search",
  "payments.ledger.statusFilter": "Payment status",
  "payments.ledger.methodFilter": "Payment method",
  "payments.ledger.allStatuses": "All statuses",
  "payments.ledger.allMethods": "All methods",
  "payments.ledger.dateFrom": "Payments from date",
  "payments.ledger.dateTo": "Payments to date",
  "payments.ledger.columns": "Columns",
  "payments.ledger.visibleColumns": "Visible columns",
  "payments.ledger.reset": "Reset filters",
  "payments.ledger.noResultsTitle": "No payments match these filters",
  "payments.ledger.noResultsDescription": "Adjust or reset the ledger filters.",
  "payments.ledger.rowsPerPage": "Rows per page",
  "payments.ledger.firstPage": "Go to first page",
  "payments.ledger.previousPage": "Go to previous page",
  "payments.ledger.nextPage": "Go to next page",
  "payments.ledger.lastPage": "Go to last page",
}

const t = ((key: string) => financeLabels[key] ?? key) as unknown as Translator
const surfaceT = ((key: string, values?: Record<string, string | number>) => {
  if (key === "payments.ledger.sortBy") return `Sort by ${values?.column}`
  if (key === "payments.ledger.resultCount") return `Showing ${values?.visible} of ${values?.total} payments`
  if (key === "payments.ledger.pageOf") return `Page ${values?.page} of ${values?.total}`
  return surfaceLabels[key] ?? key
}) as unknown as Translator

function payments(): FinanceRecentPayment[] {
  return Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    const day = String(number).padStart(2, "0")

    return {
      id: `payment-${number}`,
      paymentNumber: `PAY-${String(number).padStart(3, "0")}`,
      amount: number * 100,
      method: number % 2 === 0 ? "CARD" : "CASH",
      status: number % 2 === 0 ? "PENDING" : "PAID",
      direction: number % 3 === 0 ? "out" : "in",
      counterparty: `Counterparty ${number}`,
      processedBy: `Processor ${number}`,
      createdAt: `2026-08-${day}T10:00:00.000Z`,
    }
  })
}

function dashboardData(): FinanceDashboardData {
  return {
    generatedAt: "2026-08-12T10:00:00.000Z",
    organization: {
      id: "org-1",
      name: "Stoquify Test",
      currency: "USD",
    },
    filters: {
      view: "payments",
      locationId: null,
      period: "mtd",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-31T23:59:59.999Z",
    },
    locations: [],
    summary: {
      cashPosition: 12000,
      netCashFlow: 3200,
      revenue: 15000,
      expenses: 5000,
      purchases: 3500,
      grossProfit: 10000,
      grossMargin: 66,
      paymentsCollected: 12000,
      paymentsPending: 500,
      refunds: 100,
      receivables: 1500,
      payables: 900,
      workingCapital: 600,
      openReceivableCount: 2,
      openPayableCount: 1,
      overdueReceivableAmount: 0,
      overduePayableAmount: 0,
      taxCollected: 800,
      taxOnPurchases: 200,
      drawerVariance: 0,
      financeConfidence: 92,
    },
    aging: {
      receivables: { current: 0, d31: 0, d61: 0, d90: 0 },
      payables: { current: 0, d31: 0, d61: 0, d90: 0 },
    },
    paymentMethods: [
      { method: "CASH", amount: 6500, count: 6 },
      { method: "CARD", amount: 5500, count: 6 },
    ],
    trend: [],
    topReceivables: [],
    topPayables: [],
    recentPayments: payments(),
    alerts: [],
    payrollForecast: {} as FinanceDashboardData["payrollForecast"],
  }
}

function setup() {
  render(
    <PaymentsTable
      payments={payments()}
      money={(value) => `USD ${value ?? 0}`}
      formatDateTime={(value) => value?.slice(0, 10) ?? ""}
      t={t}
      surfaceT={surfaceT}
      empty="No payments"
    />,
  )
}

describe("PaymentsTable", () => {
  it("paginates the complete payment ledger instead of slicing the rows", () => {
    setup()

    expect(screen.getByText("PAY-012")).toBeInTheDocument()
    expect(screen.queryByText("PAY-002")).not.toBeInTheDocument()
    expect(screen.getByText("Showing 12 of 12 payments")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))

    expect(screen.getByText("PAY-002")).toBeInTheDocument()
    expect(screen.getByText("PAY-001")).toBeInTheDocument()
    expect(screen.queryByText("PAY-012")).not.toBeInTheDocument()
  })

  it("filters by searchable payment fields and an explicit date range", () => {
    setup()

    fireEvent.change(screen.getByRole("searchbox", { name: "Search payment ledger" }), {
      target: { value: "Counterparty 12" },
    })

    expect(screen.getByText("PAY-012")).toBeInTheDocument()
    expect(screen.queryByText("PAY-011")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear payment search" }))
    fireEvent.click(screen.getByRole("button", {
      name: "Payments from date - Payments to date",
    }))

    expect(screen.getByText("PAY-010")).toBeInTheDocument()
    expect(screen.getByText("PAY-011")).toBeInTheDocument()
    expect(screen.getByText("PAY-012")).toBeInTheDocument()
    expect(screen.queryByText("PAY-009")).not.toBeInTheDocument()
  })

  it("sorts ledger rows from the column headers", () => {
    setup()

    fireEvent.click(screen.getByRole("button", { name: "Sort by Amount" }))

    const firstDataRow = screen.getAllByRole("row")[1]
    expect(within(firstDataRow).getByText("PAY-001")).toBeInTheDocument()
    expect(within(firstDataRow).getByText("USD 100")).toBeInTheDocument()
  })
})
describe("FinancePaymentsSurface layout", () => {
  it("places payment mix before assurance and gives workflows a full-width action row", () => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinancePaymentsSurface />)

    const mixTitle = screen.getByRole("heading", { name: "sections.methods" })
    const assuranceTitle = screen.getByText("payments.assuranceTitle")
    const ledgerTitle = screen.getByRole("heading", { name: "payments.sections.ledger" })
    const workflowTitle = screen.getByText("payments.sections.workflows")

    const mixSection = mixTitle.closest("section")
    const assuranceSection = assuranceTitle.closest("section")
    const ledgerSection = ledgerTitle.closest("section")
    const workflowSection = workflowTitle.closest("section")

    expect(mixSection).not.toBeNull()
    expect(assuranceSection).not.toBeNull()
    expect(ledgerSection).not.toBeNull()
    expect(workflowSection).not.toBeNull()
    expect(mixSection!.compareDocumentPosition(assuranceSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(assuranceSection!.compareDocumentPosition(ledgerSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ledgerSection!.compareDocumentPosition(workflowSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const workflowCard = workflowTitle.parentElement?.parentElement
    const workflowActions = workflowCard?.lastElementChild as HTMLElement

    expect(workflowActions).toHaveClass("xl:auto-cols-fr", "xl:grid-flow-col", "xl:grid-cols-none")
    expect(within(workflowActions).getAllByRole("link")).toHaveLength(5)
    expect(within(mixSection!).getByText("payments.mix.capturedVolume")).toBeInTheDocument()
    expect(within(mixSection!).getByText("payments.mix.transactions")).toBeInTheDocument()
    expect(within(mixSection!).getByText("payments.mix.averagePayment")).toBeInTheDocument()
    expect(within(mixSection!).getByText("payments.mix.leadingMethod")).toBeInTheDocument()

    const mixGrid = within(mixSection!).getByTestId("payment-mix-grid")
    expect(mixGrid).toHaveStyle({
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))",
    })
    expect(mixGrid.children).toHaveLength(6)
  })
})

describe("FinanceReceivablesSurface layout", () => {
  it("offers open-item work before the summary and preserves zero-day terms", () => {
    const data = dashboardData()
    data.topReceivables = [{ id: "customer-1", name: "Due immediately", balance: 100, terms: 0, severity: "info" }]
    mockedUseFinanceDashboard.mockReturnValue({ data: { success: true, data }, isLoading: false, isFetching: false, error: null, refetch: jest.fn() } as unknown as ReturnType<typeof useFinanceDashboard>)
    render(<FinanceReceivablesSurface />)
    expect(screen.getByRole("link", { name: "workQueue.receivablesAction" })).toHaveAttribute("href", "/dashboard/finance/receivables/history")
    expect(screen.getByText("workQueue.balanceScope")).toBeInTheDocument()
    expect(screen.getByText("workQueue.summaryScope")).toBeInTheDocument()
    expect(screen.getByText("workQueue.recentScope")).toBeInTheDocument()
    expect(screen.getByText("aging.terms")).toBeInTheDocument()
    const queue = screen.getByRole("region", { name: "workQueue.title" })
    expect(queue.compareDocumentPosition(screen.getByRole("heading", { name: "receivables.sections.aging" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("withdraws stale balances after a failed refresh", () => {
    mockedUseFinanceDashboard.mockReturnValue({ data: { success: true, data: dashboardData() }, isLoading: false, isFetching: false, error: new Error("private failure"), refetch: jest.fn() } as unknown as ReturnType<typeof useFinanceDashboard>)
    render(<FinanceReceivablesSurface />)
    expect(screen.queryByRole("heading", { name: "receivables.sections.aging" })).not.toBeInTheDocument()
    expect(screen.queryByText("private failure")).not.toBeInTheDocument()
  })
  it("renders every bottom workflow action in the responsive row grid", () => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceReceivablesSurface />)

    const workflowTitle = screen.getByText("receivables.sections.workflows")
    const receiptsTitle = screen.getByRole("heading", { name: "receivables.sections.receipts" })
    const receiptsSection = receiptsTitle.closest("section")
    const workflowSection = workflowTitle.closest("section")
    const workflowCard = workflowTitle.parentElement?.parentElement
    const workflowActions = workflowCard?.lastElementChild as HTMLElement

    expect(receiptsSection).toHaveAttribute("data-finance-final-section", "operational")
    expect(workflowSection).toHaveAttribute("data-finance-final-section", "workflow")
    expect(receiptsSection!.nextElementSibling).toBe(workflowSection)
    expect(workflowSection!.nextElementSibling).toBeNull()
    expect(workflowActions).toHaveClass("sm:grid-cols-2", "xl:auto-cols-fr", "xl:grid-flow-col", "xl:grid-cols-none")
    expect(within(workflowActions).getAllByRole("link")).toHaveLength(5)
  })

  it("keeps the same closing-section structure when the receipts ledger is empty", () => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: { ...dashboardData(), recentPayments: [] },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceReceivablesSurface />)

    const receiptsSection = screen.getByRole("heading", { name: "receivables.sections.receipts" }).closest("section")
    const workflowSection = screen.getByText("receivables.sections.workflows").closest("section")

    expect(within(receiptsSection!).getByText("empty.receipts")).toBeInTheDocument()
    expect(receiptsSection!.nextElementSibling).toBe(workflowSection)
    expect(workflowSection!.nextElementSibling).toBeNull()
    expect(within(workflowSection!).getAllByRole("link")).toHaveLength(5)
  })
})

describe("Finance cash-flow table controls", () => {
  it("gives the statement, receivables, payables, and payments independent search and pagination", () => {
    const data = dashboardData()
    data.trend = [{ key: "2026-09-01", label: "September 1", inflow: 100, outflow: 20, revenue: 100, expenses: 20, purchases: 0, net: 80 }]
    data.topReceivables = Array.from({ length: 12 }, (_, index) => ({ id: `customer-${index}`, name: `Customer ${index}`, balance: 100 + index, terms: 30, severity: "warning" }))
    data.topPayables = Array.from({ length: 12 }, (_, index) => ({ id: `supplier-${index}`, name: `Supplier ${index}`, balance: 200 + index, terms: 15, severity: "warning" }))
    mockedUseFinanceDashboard.mockReturnValue({
      data: { success: true, data }, isLoading: false, isFetching: false, error: null, refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceCommandCenterDashboard initialView="cash-flow" />)

    expect(screen.getAllByRole("table")).toHaveLength(4)
    expect(screen.getAllByRole("searchbox")).toHaveLength(4)
    expect(screen.getByRole("searchbox", { name: "Search cash-flow rows" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "payments.ledger.searchLabel" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "sections.movement" }).closest("section")).not.toHaveClass("xl:grid-cols-[minmax(0,1fr)_420px]")

    const navigation = screen.getByRole("navigation", { name: "navigation" })
    const targets = within(navigation).getAllByRole("link").map((link) => link.getAttribute("href"))
    expect(targets).toEqual(["#cash-flow-overview", "#cash-flow-movement", "#cash-flow-aging", "#cash-flow-payments"])
    for (const target of targets) expect(document.querySelector(target!)).toBeInTheDocument()
    const agingSection = document.getElementById("cash-flow-aging")!
    const paymentsSection = document.getElementById("cash-flow-payments")!
    expect(within(agingSection).getAllByRole("table")).toHaveLength(2)
    expect(agingSection.compareDocumentPosition(paymentsSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(paymentsSection).getByRole("heading", { name: "command.evidenceTitle" })).toBeInTheDocument()
    expect(screen.getByText("sections.payments").compareDocumentPosition(screen.getByText("command.evidenceTitle")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("img", { name: "chartDescription" })).toBeInTheDocument()

    for (const [title, prefix] of [["sections.receivables", "Customer"], ["sections.payables", "Supplier"]]) {
      const table = () => within(screen.getByRole("table", { name: title }))
      const pagination = within(screen.getByRole("navigation", { name: `${title} pagination` }))
      expect(pagination.getByRole("combobox", { name: "Rows per page" })).toBeInTheDocument()
      expect(table().queryByText(`${prefix} 11`)).not.toBeInTheDocument()
      fireEvent.click(pagination.getByRole("button", { name: "Go to next page" }))
      expect(table().getByText(`${prefix} 11`)).toBeInTheDocument()
      fireEvent.change(screen.getByRole("searchbox", { name: `Search: ${title}` }), { target: { value: `${prefix} 0` } })
      expect(table().getByText(`${prefix} 0`)).toBeInTheDocument()
      expect(pagination.getByText("Page 1 of 1")).toBeInTheDocument()
      fireEvent.change(screen.getByRole("searchbox", { name: `Search: ${title}` }), { target: { value: "missing counterparty" } })
      expect(table().getByText("No results.")).toBeInTheDocument()
      expect(pagination.getByRole("button", { name: "Go to next page" })).toBeDisabled()
    }
    expect(screen.getByText("PAY-001")).toBeInTheDocument()
  })
})

describe("Finance command-center closing-section layout", () => {
  it.each([
    { route: "/dashboard/finance", initialView: "overview", layout: undefined },
    { route: "/dashboard/finance/analytics", initialView: "analytics", layout: undefined },
    { route: "/dashboard/finance/cash-flow", initialView: "cash-flow", layout: undefined },
    { route: "/dashboard/finance/costs", initialView: "costs", layout: "costs" },
    { route: "/dashboard/finance/profit-loss", initialView: "profitability", layout: "profit-loss" },
    { route: "/dashboard/finance/profitability", initialView: "profitability", layout: undefined },
    { route: "/dashboard/finance/retail", initialView: "retail", layout: undefined },
    { route: "/dashboard/finance/sales", initialView: "sales", layout: undefined },
  ] as const)("normalizes $route through the shared footer contract", ({ initialView, layout }) => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceCommandCenterDashboard initialView={initialView} layout={layout} />)

    const sectionLinks = within(screen.getByRole("navigation", { name: initialView === "cash-flow" ? "navigation" : "presentation.navigation" })).getAllByRole("link")
    for (const link of sectionLinks) expect(document.getElementById(link.getAttribute("href")!.slice(1))).toBeInTheDocument()
    const methodsTitle = screen.getByRole("heading", { name: "sections.methods" })
    const workflowTitle = screen.getByText("sections.workflows")
    const methodsSection = methodsTitle.closest("section")
    const workflowSection = workflowTitle.closest("section")
    const actionGrid = workflowSection?.querySelector("[data-finance-workflow-actions]") as HTMLElement
    const paymentMixGrid = within(methodsSection!).getByTestId("payment-mix-grid")
    const commandHeader = screen.getByText(initialView === "cash-flow" ? "cashFlow.eyebrow" : "command.eyebrow").closest("section")
    const commandActionLinks = [
      within(commandHeader!).getByRole("link", { name: "actions.reconciliation" }),
      within(commandHeader!).getByRole("link", { name: "actions.orderPayments" }),
      within(commandHeader!).getByRole("link", { name: initialView === "cash-flow" ? "actions.cashDrawers" : "actions.cashFlow" }),
    ]
    const commandActionGrid = commandActionLinks[0].parentElement

    expect(methodsSection).toHaveAttribute("data-finance-final-section", "operational")
    expect(workflowSection).toHaveAttribute("data-finance-final-section", "workflow")
    expect(methodsSection!.nextElementSibling).toBe(workflowSection)
    expect(workflowSection!.nextElementSibling).toBeNull()
    expect(actionGrid).toHaveClass("sm:grid-cols-2", "xl:auto-cols-fr", "xl:grid-flow-col", "xl:grid-cols-none")
    const actionHrefs = within(actionGrid).getAllByRole("link").map((link) => link.getAttribute("href"))
    expect(actionHrefs).toHaveLength(5)
    expect(new Set(actionHrefs).size).toBe(actionHrefs.length)
    expect(within(methodsSection!).getByText("payments.sections.methodsDescription")).toBeInTheDocument()
    expect(paymentMixGrid).toHaveStyle({
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))",
    })
    expect(paymentMixGrid.children).toHaveLength(6)
    expect(within(paymentMixGrid).getByText("payments.mix.capturedVolume")).toBeInTheDocument()
    expect(within(paymentMixGrid).getByText("payments.mix.transactions")).toBeInTheDocument()
    expect(within(paymentMixGrid).getByText("payments.mix.averagePayment")).toBeInTheDocument()
    expect(within(paymentMixGrid).getByText("payments.mix.leadingMethod")).toBeInTheDocument()
    expect(commandActionGrid).toHaveClass("grid", "sm:grid-cols-2", "lg:grid-cols-3")
    expect(commandActionGrid!.closest("aside")).toBeNull()
    expect(commandActionLinks.every((link) => link.parentElement === commandActionGrid)).toBe(true)
  })
})

describe("Finance Retail and Sales recent-payment ledgers", () => {
  it.each([
    { route: "/dashboard/finance/retail", initialView: "retail" },
    { route: "/dashboard/finance/sales", initialView: "sales" },
  ] as const)("gives $route the Receivables-grade sorting, filtering, and pagination controls", ({ initialView }) => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceCommandCenterDashboard initialView={initialView} />)

    const paymentsSection = screen.getByText("sections.payments").closest("section")
    const ledger = within(paymentsSection!)

    expect(ledger.getByRole("searchbox", { name: "payments.ledger.searchLabel" })).toBeInTheDocument()
    expect(ledger.getByRole("combobox", { name: "payments.ledger.statusFilter" })).toBeInTheDocument()
    expect(ledger.getByRole("combobox", { name: "payments.ledger.methodFilter" })).toBeInTheDocument()
    expect(ledger.getByLabelText("payments.ledger.dateFrom - payments.ledger.dateTo")).toBeInTheDocument()
    expect(ledger.getByRole("button", { name: "payments.ledger.columns" })).toBeInTheDocument()
    expect(ledger.getAllByRole("button", { name: "payments.ledger.sortBy" })).toHaveLength(6)
    expect(ledger.getByRole("combobox", { name: "payments.ledger.rowsPerPage" })).toBeInTheDocument()

    fireEvent.click(ledger.getAllByRole("button", { name: "payments.ledger.sortBy" })[4])
    expect(within(ledger.getAllByRole("row")[1]).getByText("PAY-001")).toBeInTheDocument()

    fireEvent.click(ledger.getByRole("button", { name: "payments.ledger.nextPage" }))
    expect(ledger.getByText("PAY-011")).toBeInTheDocument()
    expect(ledger.getByText("PAY-012")).toBeInTheDocument()
    expect(within(ledger.getByRole("table")).queryByText("PAY-001")).not.toBeInTheDocument()
  })
})

describe("Finance costs layout", () => {
  it("groups full-width activity and actions, with evidence following the payment ledger", () => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinanceCommandCenterDashboard initialView="costs" layout="costs" />)

    const statusTitle = screen.getByText("command.statusTitle")
    const movementTitle = screen.getByRole("heading", { name: "sections.movement" })
    const actionTitle = screen.getByText("command.actionTitle")
    const evidenceTitle = screen.getByText("command.evidenceTitle")
    const paymentsTitle = screen.getByText("sections.payments")
    const mixTitle = screen.getByRole("heading", { name: "sections.methods" })

    const statusSection = screen.getByTestId("costs-operating-status")
    const movementSection = screen.getByTestId("costs-financial-movements")
    const actionEvidenceRow = screen.getByTestId("costs-action-evidence-row")
    const paymentsSection = screen.getByTestId("costs-payments-stack")
    const mixSection = mixTitle.closest("section")
    const workflowSection = screen.getByText("sections.workflows").closest("section")

    expect(within(actionEvidenceRow).getByText("command.actionTitle")).toBe(actionTitle)
    expect(within(paymentsSection).getByText("command.evidenceTitle")).toBe(evidenceTitle)
    expect(paymentsTitle.compareDocumentPosition(evidenceTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(actionEvidenceRow).not.toHaveClass("xl:grid-cols-2")
    expect(statusSection).not.toHaveClass("xl:grid-cols-[minmax(0,1fr)_420px]")
    expect(movementSection).not.toHaveClass("xl:grid-cols-[minmax(0,1fr)_420px]")
    expect(within(paymentsSection).getByText("sections.payments")).toBe(paymentsTitle)
    expect(within(mixSection!).getByText("sections.methods")).toBe(mixTitle)
    expect(mixSection).toHaveAttribute("data-finance-final-section", "operational")
    expect(workflowSection).toHaveAttribute("data-finance-final-section", "workflow")
    expect(mixSection!.nextElementSibling).toBe(workflowSection)
    expect(workflowSection!.nextElementSibling).toBeNull()
    expect(paymentsTitle.compareDocumentPosition(mixTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("searchbox", { name: "payments.ledger.searchLabel" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "payments.ledger.nextPage" })).toBeInTheDocument()
  })
})

describe("FinancePayablesSurface navigation", () => {
  it("stacks full-width disbursements before workflows and preserves the canonical AP history", () => {
    mockedUseFinanceDashboard.mockReturnValue({
      data: {
        success: true,
        data: dashboardData(),
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFinanceDashboard>)

    render(<FinancePayablesSurface />)

    expect(screen.getByRole("link", { name: "workQueue.payablesAction" })).toHaveAttribute("href", "/dashboard/purchases/payables")

    const disbursementsTitle = screen.getByRole("heading", { name: "payables.sections.disbursements" })
    const workflowsTitle = screen.getByText("payables.sections.workflows")
    const disbursementsSection = disbursementsTitle.closest("section")
    const workflowSection = workflowsTitle.closest("section")

    expect(disbursementsSection).toHaveAttribute("data-finance-final-section", "operational")
    expect(workflowSection).toHaveAttribute("data-finance-final-section", "workflow")
    expect(disbursementsSection!.nextElementSibling).toBe(workflowSection)
    expect(workflowSection!.nextElementSibling).toBeNull()
    expect(
      disbursementsTitle.compareDocumentPosition(workflowsTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const workflowCard = workflowsTitle.parentElement?.parentElement
    const workflowActions = workflowCard?.lastElementChild as HTMLElement
    expect(workflowActions).toHaveClass("sm:grid-cols-2", "xl:auto-cols-fr", "xl:grid-flow-col", "xl:grid-cols-none")
    expect(within(workflowActions).getAllByRole("link")).toHaveLength(6)
    expect(within(disbursementsSection!).getByRole("searchbox", { name: "payments.ledger.searchLabel" })).toBeInTheDocument()
    expect(within(disbursementsSection!).getByRole("button", { name: "payments.ledger.nextPage" })).toBeInTheDocument()
    expect(within(workflowSection!).getByRole("link", { name: /actions\.apHistory/ })).toHaveAttribute(
      "href",
      "/dashboard/purchases/payables/history",
    )
  })
})
