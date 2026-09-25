import { render, screen } from "@testing-library/react"
import { CashFlowMovementSummary } from "../CashFlowPresentation"
import type { FinanceTrendPoint } from "@/services/finance/finance-dashboard.service"

let mockLocale = "en"
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages = mockLocale === "fr" ? require("@/messages/fr.json") : require("@/messages/en.json")
    return messages.financeDashboard.cashFlow[key]
  },
}))
jest.mock("lucide-react", () => ({
  ArrowDownLeft: () => <svg aria-hidden="true" />,
  ArrowUpRight: () => <svg aria-hidden="true" />,
  ArrowRight: () => <svg aria-hidden="true" />,
}))

const point = (inflow: number, outflow: number, key = "2026-09-01"): FinanceTrendPoint => ({ key, label: key, inflow, outflow, net: inflow - outflow, revenue: inflow, expenses: outflow, purchases: 0 })
const money = (value: number) => `${value} XAF`

describe("CashFlowMovementSummary", () => {
  beforeEach(() => { mockLocale = "en" })

  it("summarizes the complete period, independently of table search and pagination", () => {
    render(<CashFlowMovementSummary trend={[point(400, 100), point(50, 200, "2026-09-02")]} locale="en" money={money} />)
    expect(screen.getByText("450 XAF")).toBeInTheDocument()
    expect(screen.getByText("300 XAF")).toBeInTheDocument()
    expect(screen.getByText("150 XAF")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Exact amounts are available in the statement/ })).toBeInTheDocument()
  })

  it("shows negative net movement and draws signed amounts without negative bar heights", () => {
    const { container } = render(<CashFlowMovementSummary trend={[point(-20, 100)]} locale="en" money={money} />)
    expect(screen.getByText("-120 XAF")).toBeInTheDocument()
    for (const bar of container.querySelectorAll("rect")) expect(Number(bar.getAttribute("height"))).toBeGreaterThanOrEqual(0)
  })

  it("shows an explicit empty state instead of inventing cash totals", () => {
    render(<CashFlowMovementSummary trend={[]} locale="en" money={money} />)
    expect(screen.getByText("No cash movement is available for this period.")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByText("0 XAF")).not.toBeInTheDocument()
  })

  it("localizes the summary and its accessible chart description in French", () => {
    mockLocale = "fr"
    render(<CashFlowMovementSummary trend={[point(10, 0)]} locale="fr" money={money} />)
    expect(screen.getByText("Mouvement net de trésorerie")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Entrées et sorties quotidiennes/ })).toBeInTheDocument()
  })
})
