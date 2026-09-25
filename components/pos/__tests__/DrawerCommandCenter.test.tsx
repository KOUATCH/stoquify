import { fireEvent, render, screen, within } from "@testing-library/react"
import { DrawerCommandCenter } from "../DrawerCommandCenter"
import type { CashDrawerDashboardDrawer } from "@/services/pos/drawer-dashboard.service"

jest.mock("lucide-react", () => {
  const Icon = () => null
  return { AlertTriangle: Icon, Check: Icon, ChevronLeft: Icon, ChevronRight: Icon, LayoutGrid: Icon, List: Icon, Search: Icon, Wallet: Icon }
})

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
    const messages = jest.requireActual("@/messages/en.json").cashDrawerDashboard
    let text: unknown = messages
    for (const part of key.split(".")) text = (text as Record<string, unknown>)[part]
    return String(text).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? name))
  },
}))

function drawer(id: string, overrides: Partial<CashDrawerDashboardDrawer> = {}): CashDrawerDashboardDrawer {
  return {
    id, name: `Drawer ${id}`, drawerNumber: `D-${id}`, terminalName: `Terminal ${id}`, terminalNumber: `T-${id}`,
    locationName: `Location ${id}`, isOpen: false, currentBalance: 100, expectedBalance: 110, variance: -10,
    severity: "info", activeSessionNumber: null, activeCashierName: null, lastEventAt: null,
    periodCashSales: 0, periodCashIn: 0, periodCashOut: 0, periodRefunds: 0, periodEventCount: 0,
    ...overrides,
  }
}

const money = (value: number) => `XAF ${value}`
const formatDateTime = (value: string | null) => value ?? "Not available"
function view(drawers: CashDrawerDashboardDrawer[]) {
  return <DrawerCommandCenter drawers={drawers} money={money} formatDateTime={formatDateTime} netMovement={25} />
}
const choose = (id: string) => screen.getByRole("button", { name: `Select Drawer ${id} at Location ${id}` })
const detail = (id: string) => within(screen.getByRole("region", { name: `Drawer ${id}` }))

describe("Drawer command center", () => {
  beforeEach(() => { Element.prototype.scrollTo = jest.fn() })

  it("handles no drawers and a single drawer with true zero and missing session data", () => {
    const { rerender } = render(view([]))
    expect(screen.getByText("No cash drawers were found for this scope.")).toBeInTheDocument()
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    rerender(view([drawer("1", { currentBalance: 0 })]))
    expect(detail("1").getAllByText("XAF 0")).toHaveLength(5)
    expect(detail("1").getAllByText("Not available")).toHaveLength(3)
    expect(screen.getByRole("button", { name: "Previous drawer" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next drawer" })).toBeDisabled()
  })

  it("shows one complete selected detail, with labeled money and period movements", () => {
    render(view(Array.from({ length: 13 }, (_, index) => drawer(String(index + 1)))))
    expect(screen.getAllByRole("region")).toHaveLength(1)
    expect(detail("1").getByText("Expected")).toBeInTheDocument()
    expect(detail("1").getByText("XAF 110")).toBeInTheDocument()
    expect(detail("1").getByText("XAF -10")).toBeInTheDocument()
    for (const label of ["Cash sales", "Cash in", "Cash out", "Refunds"]) expect(detail("1").getByText(label)).toBeInTheDocument()
    fireEvent.click(choose("13"))
    expect(choose("13")).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("region", { name: "Drawer 1" })).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("13 of 13")
    expect(screen.getByText("Net movement XAF 25")).toBeInTheDocument()
  })

  it("retains selection and focus across refreshed balances and reordering", () => {
    const { rerender } = render(view([drawer("1"), drawer("2"), drawer("3")]))
    const next = screen.getByRole("button", { name: "Next drawer" })
    next.focus()
    fireEvent.click(next)
    rerender(view([drawer("3"), drawer("1"), drawer("2", { currentBalance: 350 })]))
    expect(choose("2")).toHaveAttribute("aria-pressed", "true")
    expect(detail("2").getByText("XAF 350")).toBeInTheDocument()
    expect(next).toHaveFocus()
    expect(screen.getByRole("status")).toHaveTextContent("3 of 3")
  })

  it("falls back predictably after a drawer is removed without later jumping back", () => {
    const { rerender } = render(view([drawer("1"), drawer("2")]))
    fireEvent.click(choose("2"))
    rerender(view([drawer("1")]))
    expect(choose("1")).toHaveAttribute("aria-pressed", "true")
    rerender(view([drawer("2"), drawer("1")]))
    expect(choose("1")).toHaveAttribute("aria-pressed", "true")
  })

  it("finds a distant drawer by terminal and recovers from no results", () => {
    render(view(Array.from({ length: 50 }, (_, index) => drawer(String(index + 1)))))
    const search = screen.getByRole("searchbox")
    fireEvent.change(search, { target: { value: "Terminal 50" } })
    expect(screen.getByRole("region", { name: "Drawer 50" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("1 of 1")
    fireEvent.change(search, { target: { value: "no-match" } })
    expect(screen.getByText("No drawers match your filters.")).toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next drawer" })).toBeDisabled()
    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0])
    expect(search).toHaveValue("")
    expect(choose("1")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("status")).toHaveTextContent("1 of 50")
  })

  it("keeps an off-screen exception discoverable even when search excludes it", () => {
    render(view([drawer("1"), drawer("2"), drawer("13", { severity: "critical", variance: -12000 })]))
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Location 1" } })
    const review = screen.getByRole("button", { name: "1 need review" })
    fireEvent.click(review)
    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(review).toHaveAttribute("aria-pressed", "true")
    expect(detail("13").getByText("Critical attention")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("1 of 1")
    fireEvent.click(review)
    expect(screen.getByRole("status")).toHaveTextContent("3 of 3")
  })

  it("supports keyboard navigation and stops at the bounds without wrapping", () => {
    render(view([drawer("1"), drawer("2"), drawer("3")]))
    choose("1").focus()
    fireEvent.keyDown(choose("1"), { key: "ArrowRight" })
    expect(choose("2")).toHaveFocus()
    expect(choose("2")).toHaveAttribute("aria-pressed", "true")
    fireEvent.keyDown(choose("2"), { key: "End" })
    expect(choose("3")).toHaveFocus()
    fireEvent.keyDown(choose("3"), { key: "ArrowRight" })
    expect(choose("3")).toHaveFocus()
    fireEvent.keyDown(choose("3"), { key: "Home" })
    expect(choose("1")).toHaveFocus()
  })

  it("retains the selected drawer when switching between cards and the overview", () => {
    render(view([drawer("1"), drawer("2")]))
    fireEvent.click(choose("2"))
    fireEvent.click(screen.getByRole("button", { name: "All drawers" }))
    expect(choose("2")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "Card view" }))
    expect(screen.getByRole("region", { name: "Drawer 2" })).toBeInTheDocument()
  })
})
