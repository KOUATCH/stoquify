/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { OpenItemsDashboard } from "../OpenItemsDashboard"
import { useOpenItemsDashboard } from "@/hooks/finance/useOpenItemsDashboard"
import { useLocale } from "next-intl"
import { useOpenItemsScope } from "@/hooks/finance/useOpenItemsScope"
import { ReceivablesCollectionsPanel } from "../ReceivablesCollectionsPanel"
jest.mock("@/hooks/finance/useOpenItemsDashboard", () => ({ useOpenItemsDashboard: jest.fn() }))
jest.mock("@/hooks/finance/useOpenItemsScope", () => ({ useOpenItemsScope: jest.fn() }))
jest.mock("next-intl", () => ({ useLocale: jest.fn() }))
jest.mock("../ReceivablesCollectionsPanel", () => ({ ReceivablesCollectionsPanel: jest.fn(() => <div>Receipt activity</div>) }))
jest.mock("../PayablesPaymentActivity", () => ({ PayablesPaymentActivity: () => <div>Payment activity</div> }))
jest.mock("../PayablesWorkflowPanel", () => ({ PayablesWorkflowPanel: () => <div>AP workflows</div> }))
jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: (props: any) => <div data-testid="route-state">{props.kind}{props.title}{props.actions}</div> }))

const report = () => ({
  organization: { id: "org1", name: "Example", timezone: "Africa/Douala" },
  checkedAt: "2026-10-12T12:00:00Z", revision: "a".repeat(64), locations: [{ id: "branch", name: "Branch" }],
  coverage: "unverified", unassignedDocumentCount: 2,
  currencies: [{ currency: "XAF", outstanding: null, overdue: null, due: null, aging: null }],
  records: { total: 26, page: 1, pageSize: 25, rows: [{ id: "1", reference: "INV-1", counterparty: "Supplier", dueDate: null, bucket: "unknown", outstanding: null, original: "100.00", allocated: null, credits: null, state: "POSTED", currency: "XAF", evidence: "unverified" }] },
})
beforeEach(() => {
  jest.clearAllMocks()
  ;(useOpenItemsScope as jest.Mock).mockImplementation((view: string) => require("react").useState({ view }))
  ;(useLocale as jest.Mock).mockReturnValue("en")
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data: report(), identity: { enabled: true, permissionKey: "finance.receivables.read|finance.payables.read|purchasing.ap.invoice.view" }, refetch: jest.fn() })
})
it("uses restored URL receipt scope after applying a period and discards drafts from another period", () => {
  const setPeriod = jest.fn()
  const first = { start: "2026-09-01", end: "2026-09-30" }
  const restored = { start: "2026-08-01", end: "2026-08-31" }
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "receivables" }, jest.fn(), { period: first, setPeriod }])
  const view = render(<OpenItemsDashboard view="receivables" />)
  const panel = () => (ReceivablesCollectionsPanel as jest.Mock).mock.calls.at(-1)[0]
  act(() => { panel().onDraftChange({ start: "2026-09-05", end: first.end }); panel().onPeriodChange(first) })
  expect(setPeriod).toHaveBeenCalledWith(first)
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "receivables", queue: "overdue" }, jest.fn(), { period: first, setPeriod }])
  view.rerender(<OpenItemsDashboard view="receivables" />)
  expect(panel().draft.start).toBe("2026-09-05")
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "receivables" }, jest.fn(), { period: restored, setPeriod }])
  view.rerender(<OpenItemsDashboard view="receivables" />)
  expect(panel().period).toEqual(restored)
  expect(panel().draft).toBeUndefined()
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "receivables" }, jest.fn(), { period: first, setPeriod }])
  view.rerender(<OpenItemsDashboard view="receivables" />)
  expect(panel().draft).toBeUndefined()
})
it.each(["en", "fr"])("renders %s explicit missing evidence and existing workflow links", locale => {
  ;(useLocale as jest.Mock).mockReturnValue(locale)
  render(<OpenItemsDashboard view="payables" />)
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(locale === "fr" ? "Dettes fournisseurs" : "Supplier payables")
  expect(screen.getAllByText(locale === "fr" ? "Indisponible" : "Unavailable").length).toBeGreaterThan(2)
  expect(screen.getByRole("region", { name: locale === "fr" ? "Factures restant à régler" : "Outstanding invoices" })).toHaveAttribute("tabindex", "0")
  expect(screen.getByRole("link", { name: locale === "fr" ? "Ouvrir l’historique des factures" : "Open invoice history" })).toHaveAttribute("href", expect.stringContaining(`/${locale}/dashboard/purchases/payables/history?returnTo=`))
  expect(screen.queryByText("0.00 XAF")).not.toBeInTheDocument()
})
it("restores the URL search after browser navigation without retaining an unrelated input draft", () => {
  const setScope = jest.fn()
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "payables", search: "first invoice" }, setScope])
  const view = render(<OpenItemsDashboard view="payables" />)
  const search = () => screen.getByRole("textbox", { name: "Invoice or customer / supplier" })
  fireEvent.change(search(), { target: { value: "unsent draft" } })
  expect(search()).toHaveValue("unsent draft")
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "payables", search: "restored invoice" }, setScope])
  view.rerender(<OpenItemsDashboard view="payables" />)
  expect(search()).toHaveValue("restored invoice")
  fireEvent.click(screen.getByRole("button", { name: "Search", exact: true }))
  expect(setScope).toHaveBeenLastCalledWith(expect.objectContaining({ search: "restored invoice", page: 1, revision: undefined }))
})
it("pins pagination to the evidence revision and resets it on a location change", () => {
  render(<OpenItemsDashboard view="receivables" />)
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
  expect(useOpenItemsDashboard).toHaveBeenLastCalledWith({ view: "receivables", page: 2, revision: "a".repeat(64) })
  fireEvent.change(screen.getByRole("combobox", { name: "Location" }), { target: { value: "branch" } })
  expect(useOpenItemsDashboard).toHaveBeenLastCalledWith({ view: "receivables", locationId: "branch" })
})
it.each(["en", "fr"])("localizes a draft invoice with unverified evidence in %s", locale => {
  ;(useLocale as jest.Mock).mockReturnValue(locale)
  const data = report()
  data.records.rows[0].state = "DRAFT"
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data, identity: { enabled: true, permissionKey: "finance.payables.read" } })
  render(<OpenItemsDashboard view="payables" />)
  fireEvent.click(screen.getByRole("button", { name: `${locale === "fr" ? "Détail de la facture" : "Invoice detail"}: INV-1` }))
  const detail = screen.getByRole("dialog")
  expect(detail).toHaveTextContent(locale === "fr" ? "Brouillon" : "Draft")
  expect(detail).not.toHaveTextContent("DRAFT")
  expect(detail).toHaveTextContent(locale === "fr" ? "Indisponible" : "Unavailable")
})
it("applies a review queue without reinterpreting balance cards, and opens invoice details", () => {
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data: { ...report(), queueCounts: { all: 26, overdue: 3, due7: 2, due30: 4, unknown: 1, unverified: 1 } }, identity: { enabled: true, permissionKey: "finance.receivables.read|finance.payables.read|purchasing.ap.invoice.view" }, refetch: jest.fn() })
  render(<OpenItemsDashboard view="receivables" />)
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Overdue (3)" }), { button: 0, ctrlKey: false })
  expect(useOpenItemsDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ queue: "overdue", page: 1, revision: undefined }))
  fireEvent.click(screen.getByRole("button", { name: "Invoice detail: INV-1" }))
  expect(screen.getByRole("dialog")).toHaveTextContent("Original amount")
  expect(screen.getByRole("dialog")).toHaveTextContent("100.00 XAF")
  expect(screen.getByRole("dialog")).toHaveTextContent("broader organization scope")
})
it.each(["error", "stale_session", "locked_module"])("displays %s access state without invoice rows", accessState => {
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ accessState })
  render(<OpenItemsDashboard view="receivables" />)
  expect(screen.getByTestId("route-state")).toHaveTextContent(accessState)
  expect(screen.queryByText("INV-1")).not.toBeInTheDocument()
})
it("displays a retry on read failure and differentiates no-document evidence", () => {
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ isError: true, identity: { enabled: true, permissionKey: "finance.receivables.read|finance.payables.read|purchasing.ap.invoice.view" }, refetch: jest.fn() })
  const view = render(<OpenItemsDashboard view="receivables" />)
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data: { ...report(), coverage: "no-documents", currencies: [], records: { total: 0, rows: [], page: 1, pageSize: 25 } } })
  view.rerender(<OpenItemsDashboard view="receivables" />)
  expect(screen.getByText(/No source documents/)).toBeInTheDocument()
})

describe("stalled dashboard loading", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it.each(["en", "fr"])("offers a scoped page reload after 30 seconds without exposing figures in %s", locale => {
    ;(useLocale as jest.Mock).mockReturnValue(locale)
    ;(useOpenItemsScope as jest.Mock).mockReturnValue([{ view: "receivables", queue: "overdue", locationId: "branch" }, jest.fn(), { period: { start: "2026-09-01", end: "2026-09-30" } }])
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ identity: { enabled: false, userId: "actor", organizationId: "org1" } })
    render(<OpenItemsDashboard view="receivables" />)
    act(() => jest.advanceTimersByTime(29_999))
    expect(screen.getByTestId("route-state")).toHaveTextContent("loading")
    expect(screen.queryByRole("link", { name: /Reload page|Recharger la page/ })).not.toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    const reload = screen.getByRole("link", { name: locale === "fr" ? "Recharger la page" : "Reload page" })
    const url = new URL(reload.getAttribute("href")!, "https://example.test")
    expect(url.pathname).toBe(`/${locale}/dashboard/finance/receivables`)
    expect(url.searchParams.get("queue")).toBe("overdue")
    expect(url.searchParams.get("locationId")).toBe("branch")
    expect(url.searchParams.get("activityStart")).toBe("2026-09-01")
    expect(url.searchParams.get("activityEnd")).toBe("2026-09-30")
    expect(screen.queryByText("INV-1")).not.toBeInTheDocument()
  })

  it("accepts an authorized result after the delay and resets the wait for a later read", () => {
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({})
    const view = render(<OpenItemsDashboard view="receivables" />)
    act(() => jest.advanceTimersByTime(30_000))
    expect(screen.getByRole("link", { name: "Reload page" })).toBeInTheDocument()
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data: report() })
    view.rerender(<OpenItemsDashboard view="receivables" />)
    expect(screen.getByText("INV-1")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Reload page" })).not.toBeInTheDocument()
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({})
    view.rerender(<OpenItemsDashboard view="receivables" />)
    act(() => jest.advanceTimersByTime(29_999))
    expect(screen.getByTestId("route-state")).toHaveTextContent("loading")
  })

  it("keeps a module denial authoritative after a delayed AP read", () => {
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({})
    const view = render(<OpenItemsDashboard view="payables" />)
    act(() => jest.advanceTimersByTime(30_000))
    expect(screen.getByRole("link", { name: "Reload page" })).toBeInTheDocument()
    ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ accessState: "locked_module" })
    view.rerender(<OpenItemsDashboard view="payables" />)
    expect(screen.getByTestId("route-state")).toHaveTextContent("locked_module")
    expect(screen.queryByRole("link", { name: "Reload page" })).not.toBeInTheDocument()
  })
})


it.each(["receivables", "payables"] as const)("uses shared table pagination with server totals for %s", view => {
  const setScope = jest.fn()
  const scope = { view, page: 2, pageSize: 10 as const, queue: "overdue" as const, currency: "XAF", revision: "b".repeat(64) }
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([scope, setScope])
  const data = report()
  data.records = { ...data.records, page: 2, pageSize: 10, total: 45 }
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data, identity: { enabled: true, permissionKey: "finance.receivables.read|finance.payables.read" } })
  render(<OpenItemsDashboard view={view} />)
  expect(screen.getByRole("tab", { name: "Overdue (0)" })).toHaveAttribute("aria-selected", "true")
  expect(screen.getByText("Page 2 of 5")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Go to last page" }))
  expect(setScope).toHaveBeenLastCalledWith({ ...scope, page: 5, revision: data.revision })
  fireEvent.click(screen.getByRole("button", { name: "Go to first page" }))
  expect(setScope).toHaveBeenLastCalledWith({ ...scope, page: 1, revision: data.revision })
  expect(screen.getByRole("combobox", { name: "Rows per page" })).toBeInTheDocument()
})

it("keeps pagination visible for an empty French queue and disables it during refresh", () => {
  ;(useLocale as jest.Mock).mockReturnValue("fr")
  const data = report()
  data.records = { rows: [], total: 0, page: 1, pageSize: 25 }
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data, isFetching: true, identity: { enabled: true, permissionKey: "finance.payables.read" } })
  render(<OpenItemsDashboard view="payables" />)
  expect(screen.getByRole("tablist", { name: "Trouver les factures à examiner" })).toBeInTheDocument()
  expect(screen.getByText("Page 1 sur 1")).toBeInTheDocument()
  expect(screen.getByRole("combobox", { name: "Lignes par page" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Aller à la page suivante" })).toBeDisabled()
  expect(screen.getByRole("table")).toHaveTextContent("Aucune facture à régler")
})

it("resets the evidence revision and page when the shared page-size control changes", () => {
  const setScope = jest.fn()
  const scope = { view: "payables", page: 2, pageSize: 10, locationId: "branch", queue: "unknown", revision: "b".repeat(64) }
  ;(useOpenItemsScope as jest.Mock).mockReturnValue([scope, setScope])
  const data = report()
  data.records = { ...data.records, page: 2, pageSize: 10 }
  ;(useOpenItemsDashboard as jest.Mock).mockReturnValue({ data })
  const scrollIntoView = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = jest.fn()
  try {
    render(<OpenItemsDashboard view="payables" />)
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Rows per page" }), { key: "ArrowDown" })
    fireEvent.click(screen.getByRole("option", { name: "50" }))
    expect(setScope).toHaveBeenLastCalledWith({ ...scope, page: 1, pageSize: 50, revision: undefined })
  } finally {
    HTMLElement.prototype.scrollIntoView = scrollIntoView
  }
})
