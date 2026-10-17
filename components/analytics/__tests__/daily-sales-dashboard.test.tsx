import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getDailySalesReportAction, getLatestDailySalesDayAction } from "@/actions/analytics/daily-sales.actions"
import { readDailySalesScope, organizationCalendarDay } from "@/hooks/analytics/useDailySalesScope"
import { useClientAuth } from "@/hooks/useClientAuth"
import { resolveOrganizationAnalyticalContext } from "@/services/analytics/analytical-context-contracts"
import type { DailySalesReadModel } from "@/services/analytics/daily-sales-read.service"
import Dashboard from "../CompleteIntegratedDailySalesDashboard"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: any = (mockLocale === "en" ? en : fr).dailySalesReport
  for (const part of key.split(".")) text = text?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
jest.mock("lucide-react", () => ({ BarChart3: () => null, RefreshCw: () => null }))
jest.mock("@/actions/analytics/daily-sales.actions", () => ({ getDailySalesReportAction: jest.fn(), getLatestDailySalesDayAction: jest.fn() }))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: jest.fn() }))
let mockCanOperatePos = false
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ organizationId: "org-1", hasPermission: () => mockCanOperatePos }) }))
const action = getDailySalesReportAction as jest.Mock, auth = useClientAuth as jest.Mock
const clients: QueryClient[] = []
function report(organizationId = "org-1", value = "25.75"): DailySalesReadModel {
  const context = resolveOrganizationAnalyticalContext({ organizationId, currency: "XAF", timezone: "Africa/Douala", generatedAt: "2026-09-06T12:00:00Z", periodStart: "2026-09-05T23:00:00Z", periodEndExclusive: "2026-09-06T23:00:00Z", locationId: "location-1" })
  if (context.state !== "ready") throw new Error("Invalid test context")
  return { context: context.context, date: "2026-09-06", locationId: "location-1", locations: [{ id: "location-1", name: "Douala", retained: false }, { id: "location-2", name: "Historical site", retained: true }], source: { kind: "ORDER_AGGREGATION", recordId: null, recordedAt: null, finalized: null }, metrics: { value, count: 1, quantity: "1.125", average: value }, recordedCash: null, recordedPayments: null, topItems: [{ itemId: "item-1", nameEn: "Local item", nameFr: "Article local", sku: "LOCAL", quantity: "1.125", value }] }
}
const success = (data: DailySalesReadModel) => ({ success: true, data, error: null, status: 200 })
function mount(persistScope = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client)
  const tree = () => <QueryClientProvider client={client}><Dashboard persistScope={persistScope} /></QueryClientProvider>
  const rendered = render(tree())
  return { ...rendered, rerenderView: () => rendered.rerender(tree()) }
}
beforeEach(() => { jest.clearAllMocks(); mockLocale = "en"; mockCanOperatePos = false; window.history.replaceState(null, "", "/en/dashboard/sales"); auth.mockReturnValue({ user: { id: "user-1" }, organizationId: "org-1", isLoading: false }); action.mockResolvedValue(success(report())) })
afterEach(() => { for (const client of clients.splice(0)) client.clear() })

it.each(["en", "fr"] as const)("shows exact %s order evidence without fabricated cash, sessions or targets", async locale => {
  mockLocale = locale; const copy = (locale === "en" ? en : fr).dailySalesReport
  mount(); expect(await screen.findByText(copy.orderMeaning)).toBeInTheDocument()
  expect(screen.getAllByText(locale === "en" ? "25.75 XAF" : "25,75 XAF").length).toBeGreaterThan(0)
  expect(screen.getByText(copy.cashUnavailable)).toBeInTheDocument()
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-09-06"); expect(screen.getByLabelText(copy.location)).toHaveValue("location-1")
  expect(screen.getByText(locale === "en" ? "Local item" : "Article local")).toBeInTheDocument()
  expect(screen.queryByText(/94.9%|96%|\$200|Real-time data|Revenue Goal|Session Status/)).not.toBeInTheDocument()
  expect(action).toHaveBeenCalledTimes(1)
})
it("does not refetch because a render created a new default Date", async () => {
  const mounted = mount(); await screen.findByText(en.dailySalesReport.orderMeaning)
  mounted.rerenderView(); mounted.rerenderView(); expect(action).toHaveBeenCalledTimes(1)
})
it("shows read failure and preserves scope for retry without presenting zero sales", async () => {
  mount(); await screen.findByText(en.dailySalesReport.orderMeaning)
  action.mockResolvedValueOnce({ success: false, code: "DATABASE_UNAVAILABLE", retryable: true, error: "Private database detail" })
  fireEvent.change(screen.getByLabelText(en.dailySalesReport.date), { target: { value: "2026-09-05" } })
  expect(await screen.findByRole("alert")).toHaveTextContent(en.dailySalesReport.failed)
  expect(screen.queryByText("Private database detail")).not.toBeInTheDocument(); expect(screen.queryByText(en.dailySalesReport.empty)).not.toBeInTheDocument()
  expect(screen.getByLabelText(en.dailySalesReport.date)).toHaveValue("2026-09-05"); expect(screen.getByLabelText(en.dailySalesReport.location)).toBeEnabled()
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.refresh })); await screen.findByText(en.dailySalesReport.orderMeaning)
  expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ organizationId: "org-1", date: "2026-09-05" }))
})
it("explains denial without retry loops or a successful empty report", async () => {
  action.mockResolvedValue({ success: false, code: "FORBIDDEN", retryable: false, error: "Denied" })
  mount(); expect(await screen.findByRole("alert")).toHaveTextContent(en.dailySalesReport.denied)
  expect(screen.queryByText(en.dailySalesReport.empty)).not.toBeInTheDocument(); expect(action).toHaveBeenCalledTimes(1)
})
it("does not request reports without an authenticated organization", () => {
  auth.mockReturnValue({ user: undefined, organizationId: undefined, isLoading: false }); mount()
  expect(screen.getByText(en.dailySalesReport.organizationRequired)).toBeInTheDocument(); expect(action).not.toHaveBeenCalled()
})
it("ignores a delayed older-scope response and hides prior-tenant results", async () => {
  let resolveOld!: (value: unknown) => void
  action.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValueOnce(success(report("org-2", "12.50")))
  const mounted = mount(); await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  auth.mockReturnValue({ user: { id: "user-2" }, organizationId: "org-2", isLoading: false }); mounted.rerenderView()
  await screen.findAllByText("12.50 XAF")
  await act(async () => { resolveOld(success(report("org-1", "999.99"))) })
  expect(screen.queryByText("999.99 XAF")).not.toBeInTheDocument(); expect(screen.getAllByText("12.50 XAF").length).toBeGreaterThan(0)
})
it("distinguishes no locations from a genuinely empty successful order summary", async () => {
  action.mockResolvedValue(success({ ...report(), source: { kind: "NO_LOCATIONS", recordId: null, recordedAt: null, finalized: null }, metrics: null, locations: [], locationId: null, topItems: [] }))
  mount(); await screen.findByText(en.dailySalesReport.noLocations); expect(screen.queryByText("0.00 XAF")).not.toBeInTheDocument()
})

it("pins defaults without refetching and restores URL scope on history navigation", async () => {
  action.mockImplementation(async input => success({ ...report(), date: input.date ?? "2026-09-06", locationId: input.locationId ?? "location-1" }))
  mount(true)
  await screen.findByText(en.dailySalesReport.orderSummary)
  await waitFor(() => expect(window.location.search).toContain("date=2026-09-06"))
  expect(action).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText(en.dailySalesReport.date), { target: { value: "2026-09-05" } })
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-09-05", locationId: "location-1" })))
  expect(window.location.search).toContain("view=daily")
  act(() => { window.history.replaceState(null, "", "?date=2026-09-04&locationId=location-2&view=daily&reportOrg=org-1"); window.dispatchEvent(new PopStateEvent("popstate")) })
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-09-04", locationId: "location-2" })))
  expect(screen.getByLabelText(en.dailySalesReport.date)).toHaveValue("2026-09-04")
})

it("does not load an invalid bookmark and can reset it without losing unrelated parameters", async () => {
  window.history.replaceState(null, "", "?date=2026-02-30&view=daily&keep=yes#report")
  mount(true)
  expect(screen.getByRole("alert")).toHaveTextContent(en.dailySalesReport.invalidScope)
  expect(action).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.resetScope }))
  await screen.findByText(en.dailySalesReport.orderSummary)
  expect(window.location.search).toContain("keep=yes")
  expect(window.location.hash).toBe("#report")
})

it("loads a bookmarked location and drops old-organization filters after an organization switch", async () => {
  window.history.replaceState(null, "", "?date=2026-09-05&locationId=location-2&reportOrg=org-1&view=daily")
  action.mockImplementation(async input => success({ ...report(input.organizationId), date: input.date ?? "2026-09-06", locationId: input.locationId ?? "location-1" }))
  const mounted = mount(true)
  await screen.findByText(en.dailySalesReport.orderSummary)
  expect(action).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-09-05", locationId: "location-2" }))
  auth.mockReturnValue({ user: { id: "user-2" }, organizationId: "org-2", isLoading: false })
  mounted.rerenderView()
  await waitFor(() => expect(action).toHaveBeenLastCalledWith({ organizationId: "org-2", locationId: undefined, date: undefined }))
})

it("hides old metrics while a new date loads and identifies a same-scope refresh", async () => {
  mount(); await screen.findByText(en.dailySalesReport.orderSummary)
  let resolve!: (value: unknown) => void
  action.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.refresh }))
  await screen.findByText(en.dailySalesReport.refreshing)
  expect(screen.getAllByText("25.75 XAF").length).toBeGreaterThan(0)
  await act(async () => { resolve(success(report())) })
  action.mockImplementationOnce(() => new Promise(() => {}))
  fireEvent.change(screen.getByLabelText(en.dailySalesReport.date), { target: { value: "2026-09-05" } })
  await screen.findByText(en.dailySalesReport.loading)
  expect(screen.queryByText("25.75 XAF")).not.toBeInTheDocument()
})

it("offers permission-aware empty recovery, focuses filters and distinguishes latest search outcomes", async () => {
  action.mockResolvedValue(success({ ...report(), metrics: { value: "0.00", count: 0, quantity: "0.000", average: null }, topItems: [] }))
  const mounted = mount()
  await screen.findByText(en.dailySalesReport.empty)
  expect(screen.queryByRole("link", { name: en.dailySalesReport.openPos })).not.toBeInTheDocument()
  mockCanOperatePos = true; mounted.rerenderView()
  expect(screen.getByRole("link", { name: en.dailySalesReport.openPos })).toHaveAttribute("href", "/en/dashboard/pos")
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.changeLocation }))
  expect(screen.getByLabelText(en.dailySalesReport.location)).toHaveFocus()
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.changeDate }))
  expect(screen.getByLabelText(en.dailySalesReport.date)).toHaveFocus()
  ;(getLatestDailySalesDayAction as jest.Mock).mockResolvedValueOnce({ success: true, data: { date: null } }).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, data: { date: "2026-09-01" } })
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.latestDay }))
  await screen.findByText(en.dailySalesReport.latestEmpty)
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.latestDay }))
  await screen.findByText(en.dailySalesReport.latestFailed)
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.latestDay }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-09-01" })))
})

it("ignores latest-activity responses after the user changes the date", async () => {
  action.mockResolvedValue(success({ ...report(), metrics: { value: "0.00", count: 0, quantity: "0.000", average: null } }))
  let resolve!: (value: unknown) => void
  ;(getLatestDailySalesDayAction as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  mount(); await screen.findByText(en.dailySalesReport.empty)
  fireEvent.click(screen.getByRole("button", { name: en.dailySalesReport.latestDay }))
  fireEvent.change(screen.getByLabelText(en.dailySalesReport.date), { target: { value: "2026-09-05" } })
  await act(async () => { resolve({ success: true, data: { date: "2026-08-01" } }) })
  expect(screen.getByLabelText(en.dailySalesReport.date)).toHaveValue("2026-09-05")
})

it("validates report URLs and computes shortcuts by organization calendar across DST", () => {
  for (const search of ["?date=invalid", "?date=2026-02-30", "?date=2026-01-01&date=2026-01-02", "?locationId=", "?view=performance"]) expect(readDailySalesScope(search, "org-1").invalid).toBe(true)
  expect(readDailySalesScope("?date=bad&locationId=foreign&reportOrg=old-org", "org-1")).toEqual({ invalid: false })
  expect(organizationCalendarDay("Africa/Douala", 0, new Date("2026-09-05T23:30:00Z"))).toBe("2026-09-06")
  expect(organizationCalendarDay("Europe/Paris", -1, new Date("2026-03-30T00:30:00Z"))).toBe("2026-03-29")
})
