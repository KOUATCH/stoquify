import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import SalesPerformanceDashboard from "../SalesPerformanceDashboard"
import { getSalesPerformanceAction, getSalesPerformanceOrderAction } from "@/actions/analytics/sales-performance.actions"
jest.mock("../SalesInsightsPanels", () => ({ __esModule: true, default: () => <div data-testid="insights" /> }))
jest.mock("../SalesAttentionQueue", () => ({ __esModule: true, default: () => <div data-testid="attention" /> }))
jest.mock("../SalesPerformanceExport", () => ({ __esModule: true, default: () => <div data-testid="export" /> }))
let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: any = (mockLocale === "en" ? en : fr).salesPerformance
  for (const part of key.split(".")) text = text?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
jest.mock("@/actions/analytics/sales-performance.actions", () => ({ getSalesPerformanceAction: jest.fn(), getSalesPerformanceOrderAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null, Search: () => null, Check: () => null, ChevronDown: () => null, ChevronUp: () => null }))
let mockOrg = "org-1"
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: () => ({ organizationId: mockOrg, user: { id: "actor" }, isLoading: false }) }))
const action = getSalesPerformanceAction as jest.Mock
const fixture = () => ({ currency: "XAF", timezone: "Africa/Douala", checkedAt: "2026-09-06T12:00:00Z", locations: [{ id: "loc-1", name: "Store" }], scope: { start: "2026-09-01", end: "2026-09-02" }, canReadCustomers: true,
  period: { start: "2026-08-31T23:00:00Z", endExclusive: "2026-09-02T23:00:00Z", partial: false, previousStart: "2026-08-29T23:00:00Z", previousEndExclusive: "2026-08-31T23:00:00Z" },
  current: { value: "200.00", count: "2", average: "100.00" }, previous: { value: "100.00", count: "1", average: "100.00" },
  changes: { value: { absolute: "100.00", percent: "100.00" }, count: { absolute: "1.00", percent: "100.00" }, average: { absolute: "0.00", percent: "0.00" } },
  trend: [{ date: "2026-09-01", value: "200.00", count: "2" }, { date: "2026-09-02", value: "0.00", count: "0" }],
  records: [{ id: "order-1", number: "SO-1", date: "2026-09-01T10:00:00Z", value: "200.00", status: "COMPLETED", channel: "POS", paymentStatus: "PAID", customer: "Alice" }], nextCursor: "order-1" })
function mount(locale = "en") {
  mockLocale = locale
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = () => <QueryClientProvider client={client}><SalesPerformanceDashboard /></QueryClientProvider>
  const mounted = render(view()); return { ...mounted, rerenderView: () => mounted.rerender(view()) }
}
beforeEach(() => { jest.resetAllMocks(); mockOrg = "org-1"; window.history.replaceState(null, "", "/en/dashboard/sales?view=performance&reportOrg=org-1&keep=yes#records"); action.mockResolvedValue({ success: true, data: fixture() }); HTMLElement.prototype.scrollIntoView = jest.fn() })

it("keeps exactly one export, attention queue and insight section after refresh without key collisions", async () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {})
  action.mockResolvedValue({ success: true, data: { ...fixture(), canExport: true } })
  mount(); await screen.findByTestId("export")
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.refresh }))
  await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
  for (const id of ["export", "attention", "insights"]) expect(screen.getAllByTestId(id)).toHaveLength(1)
  expect(error.mock.calls.filter(call => String(call[0]).includes("same key"))).toHaveLength(0)
  error.mockRestore()
})

it.each(["en", "fr"])("renders translated evidence, exact values, chart and records in %s", async locale => {
  mount(locale); await screen.findByText("SO-1")
  const t = locale === "fr" ? fr.salesPerformance : en.salesPerformance
  expect(screen.getByRole("heading", { name: t.records })).toBeInTheDocument()
  expect(screen.getByRole("group", { name: t.trendChart })).toBeInTheDocument()
  expect(screen.getByText(t.coverage)).toBeInTheDocument()
  expect(screen.getByText("Alice")).toBeInTheDocument()
})
it("applies a preset, preserves unrelated URL state, and restores scope on browser Back", async () => {
  mount(); await screen.findByText("SO-1")
  const original = window.location.href
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.today, exact: true }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ preset: "today" })))
  expect(window.location.search).toContain("keep=yes"); expect(window.location.hash).toBe("#records")
  act(() => { window.history.replaceState(null, "", original); window.dispatchEvent(new PopStateEvent("popstate")) })
  expect(screen.getByRole("button", { name: en.salesPerformance["7d"] })).toHaveAttribute("aria-pressed", "true")
})
it("applies population filters to the request and labels record-only search", async () => {
  mount(); await screen.findByText("SO-1")
  fireEvent.change(screen.getByLabelText(en.salesPerformance.status), { target: { value: "DELIVERED" } })
  fireEvent.change(screen.getByLabelText(en.salesPerformance.channel), { target: { value: "DELIVERY" } })
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.apply }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ status: "DELIVERED", channel: "DELIVERY", preset: "custom", start: "2026-09-01", end: "2026-09-02" })))
  await screen.findByText("SO-1")
  fireEvent.change(screen.getByLabelText(en.salesPerformance.search), { target: { value: "Alice" } })
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.searchButton }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Alice", status: "DELIVERED" })))
})
it("selects a chart day by keyboard and paginates through scoped records", async () => {
  mount(); await screen.findByText("SO-1")
  fireEvent.keyDown(screen.getByRole("button", { name: "2026-09-01: 200.00 XAF" }), { key: "Enter" })
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ preset: "custom", start: "2026-09-01", end: "2026-09-01" })))
  await screen.findByText("SO-1")
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.nextPage }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "order-1" })))
})
it("opens independently fetched read-only details and does not expose raw errors", async () => {
  ;(getSalesPerformanceOrderAction as jest.Mock).mockResolvedValue({ success: false, error: "private internal" })
  mount(); await screen.findByText("SO-1")
  fireEvent.click(screen.getByRole("button", { name: "SO-1" }))
  expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(en.salesPerformance.detailFailed)
  expect(getSalesPerformanceOrderAction).toHaveBeenCalledWith({ organizationId: "org-1", orderId: "order-1" })
  expect(screen.queryByText("private internal")).not.toBeInTheDocument()
})
it("returns keyboard focus to the current record button after the table rerenders", async () => {
  ;(getSalesPerformanceOrderAction as jest.Mock).mockResolvedValue({ success: false, error: "unavailable" })
  mount(); await screen.findByText("SO-1")
  const originalButton = screen.getByRole("button", { name: "SO-1" })
  originalButton.focus()
  fireEvent.click(originalButton)
  await within(screen.getByRole("dialog")).findByRole("alert")
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: en.salesPerformance.close }))
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getByRole("button", { name: "SO-1" })).toHaveFocus())
})
it("suppresses old figures while changing scope and discards previous-organization scope", async () => {
  const mounted = mount(); await screen.findByText("SO-1")
  action.mockImplementationOnce(() => new Promise(() => {}))
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.today, exact: true }))
  expect(screen.queryByText("SO-1")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent(en.salesPerformance.loading)
  mockOrg = "org-2"; mounted.rerenderView()
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ organizationId: "org-2" })))
  expect(action.mock.calls.at(-1)[0].preset).toBeUndefined()
})
it("shows invalid URL recovery without requesting a report", async () => {
  window.history.replaceState(null, "", "?view=performance&status=DRAFT")
  mount(); expect(screen.getByRole("alert")).toHaveTextContent(en.salesPerformance.invalid)
  expect(action).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.reset }))
  await screen.findByText("SO-1")
})
it("clears record search and pagination when inspecting the KPI population", async () => {
  window.history.replaceState(null, "", "?view=performance&search=Alice&cursor=order-1")
  mount(); await screen.findByText("SO-1")
  fireEvent.click(screen.getAllByRole("button", { name: en.salesPerformance.inspect })[0])
  await waitFor(() => expect(action).toHaveBeenLastCalledWith({ preset: "7d", organizationId: "org-1" }))
  expect(window.location.search).not.toContain("search="); expect(window.location.search).not.toContain("cursor=")
})
it("retains checked figures during refresh but hides them on a denied response", async () => {
  mount(); await screen.findByText("SO-1")
  let resolve: (value: unknown) => void = () => {}
  action.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.refresh }))
  await screen.findByText(en.salesPerformance.refreshing)
  expect(screen.getByText("SO-1")).toBeInTheDocument()
  await act(async () => resolve({ success: false, code: "FORBIDDEN", error: "private" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(en.salesPerformance.denied)
  expect(screen.queryByText("SO-1")).not.toBeInTheDocument()
})

it("returns to the previous cursor and resets pagination when clearing search", async () => {
  mount(); await screen.findByText("SO-1")
  expect(screen.getByRole("button", { name: en.salesPerformance.previousPage })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.nextPage }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "order-1" })))
  await screen.findByText("SO-1")
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.previousPage }))
  await waitFor(() => expect(window.location.search).not.toContain("cursor="))
  await screen.findByText("SO-1")
  fireEvent.change(screen.getByLabelText(en.salesPerformance.search), { target: { value: "Alice" } })
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.searchButton }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Alice" })))
  await screen.findByText("SO-1")
  fireEvent.click(screen.getByRole("button", { name: en.salesPerformance.clearSearch }))
  await waitFor(() => expect(window.location.search).not.toContain("search="))
})

it("uses the requested bounded page size and exposes shared pagination", async () => {
  window.history.replaceState(null, "", "?view=performance&pageSize=10&cursor=older")
  mount(); await screen.findByText("SO-1")
  expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: "10", cursor: "older" }))
  expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveTextContent("10")
  expect(screen.getByText("1 rows shown")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: en.salesPerformance.previousPage })).toBeDisabled()
  expect(screen.getByRole("button", { name: en.salesPerformance.firstPage })).toBeEnabled()
})
