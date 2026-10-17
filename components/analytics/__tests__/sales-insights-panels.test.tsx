import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import SalesInsightsPanels from "../SalesInsightsPanels"
import { getSalesCollectionsAction, getSalesReceivablesAction, getSalesProductsAction } from "@/actions/analytics/sales-insights.actions"
let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: any = (mockLocale === "fr" ? fr : en).salesInsights
  for (const part of key.split(".")) text = text?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
jest.mock("@/actions/analytics/sales-insights.actions", () => ({ getSalesCollectionsAction: jest.fn(), getSalesReceivablesAction: jest.fn(), getSalesProductsAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null, Search: () => null, Check: () => null, ChevronDown: () => null, ChevronUp: () => null }))
const c = getSalesCollectionsAction as jest.Mock, r = getSalesReceivablesAction as jest.Mock, p = getSalesProductsAction as jest.Mock
const base = { currency: "XAF", timezone: "Africa/Douala", checkedAt: "2026-09-06T12:00:00Z" }
const product = (id: string, value: string, quantity: string, unit = "kg") => ({ id, name: id, nameFr: id + " FR", sku: "SKU-" + id, active: true, value, quantity, unit: { id: unit, symbol: unit }, change: { absolute: "10.00", percent: "20.00" }, available: null, stockStatus: "unknown", contribution: null, margin: null, uncoveredCosts: 1 })
const productReport = () => ({ ...base, stockCheckedAt: base.checkedAt, canReadStock: true, canReadMargin: true, lineValue: "150.00", orderValue: "155.00", orderDifference: "5.00", rows: [product("Rice", "100.00", "2.000"), product("Beans", "50.00", "10.000"), product("Milk", "20.00", "30.000", "L")] })
function mount(locale = "en") {
  mockLocale = locale
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = (identity = "actor:org-1") => <QueryClientProvider client={client}><SalesInsightsPanels key={identity} identity={identity} revision="1" scope={{ organizationId: identity.split(":")[1], search: "private", cursor: "record" }} /></QueryClientProvider>
  const mounted = render(view()); return { ...mounted, switchOrg: () => mounted.rerender(view("actor:org-2")) }
}
beforeEach(() => {
  jest.resetAllMocks()
  c.mockResolvedValue({ success: true, data: { state: "ready", report: { ...base, start: "2026-09-01", end: "2026-09-02", receipts: "100.00", creditIssued: "90.00", refunds: "10.00", reversals: "5.00", net: "85.00", missingTimes: 0, methods: [{ method: "CASH", amount: "100.00", percent: "100.00" }] } } })
  r.mockResolvedValue({ success: true, data: { state: "ready", report: { ...base, documentCount: 2, currencies: [{ currency: "XAF", outstanding: "300.00", overdue: "200.00", count: 2 }] } } })
  p.mockResolvedValue({ success: true, data: { state: "ready", report: productReport() } })
})
it.each(["en", "fr"])("renders independent time bases, translated metrics and source links in %s", async locale => {
  mount(locale); const t = (locale === "fr" ? fr : en).salesInsights
  expect(await screen.findByText(locale === "fr" ? "Rice FR" : "Rice")).toBeInTheDocument()
  expect(screen.getByText(t.receivablesBasis)).toBeInTheDocument(); expect(screen.getByText(t.marginBasis)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: t.paymentsLink })).toHaveAttribute("href", `/${locale}/dashboard/finance/payments`)
  expect(screen.getAllByText(t.stock.unknown).length).toBeGreaterThan(0)
  expect(c).toHaveBeenCalledWith(expect.objectContaining({ search: undefined, cursor: undefined }))
})
it("prevents mixed-unit sorting, then ranks quantities within one unit", async () => {
  mount(); await screen.findByText("Rice")
  const t = en.salesInsights
  expect(screen.getByRole("option", { name: t.quantity })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(t.unitFilter), { target: { value: "kg" } })
  expect(screen.getByRole("option", { name: t.quantity })).toBeEnabled()
  fireEvent.change(screen.getByLabelText(t.sort), { target: { value: "quantity" } })
  const table = screen.getByRole("table", { name: "" }) // only the product table has no caption
  expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Beans")
  expect(screen.queryByText("Milk")).not.toBeInTheDocument()
})
it("keeps independent panels usable when finance is restricted or unavailable", async () => {
  c.mockResolvedValue({ success: true, data: { state: "restricted" } }); r.mockResolvedValue({ success: false, error: "secret database message" })
  mount(); await screen.findByText("Rice")
  expect(screen.getByText(en.salesInsights.restricted)).toBeInTheDocument(); expect(screen.getByRole("alert")).toHaveTextContent(en.salesInsights.failed)
  expect(screen.queryByRole("link", { name: en.salesInsights.paymentsLink })).not.toBeInTheDocument()
  expect(screen.queryByText(/secret database/)).not.toBeInTheDocument()
})
it("removes previous values after denial and shows the previous check time while refreshing", async () => {
  mount(); await screen.findByText("Rice")
  let resolve!: (value: unknown) => void
  c.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const section = screen.getByRole("region", { name: en.salesInsights.collections })
  fireEvent.click(within(section).getByRole("button", { name: en.salesInsights.refresh }))
  await screen.findByText(en.salesInsights.refreshing)
  expect(within(section).getByText("85.00 XAF")).toBeInTheDocument()
  await act(async () => resolve({ success: true, data: { state: "restricted" } }))
  await waitFor(() => expect(within(section).queryByText("85.00 XAF")).not.toBeInTheDocument())
})
it("clears previous organization data while the new scope loads", async () => {
  const view = mount(); await screen.findByText("Rice")
  c.mockReturnValue(new Promise(() => {})); r.mockReturnValue(new Promise(() => {})); p.mockReturnValue(new Promise(() => {}))
  view.switchOrg()
  expect(screen.queryByText("Rice")).not.toBeInTheDocument(); expect(screen.getAllByText(en.salesInsights.loading)).toHaveLength(3)
})
it("paginates all products and orders exact decimal values beyond Number precision", async () => {
  const report = productReport()
  report.rows = Array.from({ length: 27 }, (_, i) => product(`Item-${i}`, `${100 + i}.00`, "1.000"))
  report.rows.push(product("Largest", "9007199254740993.00", "1.000"), product("Second", "9007199254740992.99", "1.000"))
  p.mockResolvedValue({ success: true, data: { state: "ready", report } })
  mount(); await screen.findByText("Largest")
  const rows = within(screen.getByRole("table", { name: "" })).getAllByRole("row")
  expect(rows).toHaveLength(26); expect(rows[1]).toHaveTextContent("Largest"); expect(rows[2]).toHaveTextContent("Second")
  fireEvent.click(screen.getByRole("button", { name: en.salesInsights.next }))
  expect(screen.queryByText("Largest")).not.toBeInTheDocument(); expect(screen.getByText("Item-0")).toBeInTheDocument()
  fireEvent.change(screen.getByRole("searchbox", { name: en.salesInsights.searchProducts }), { target: { value: "SKU-Largest" } })
  expect(screen.getByText("Largest")).toBeInTheDocument()
  expect(within(screen.getByRole("table", { name: "" })).getAllByRole("row")).toHaveLength(2)
  expect(screen.getByRole("button", { name: en.salesInsights.previous })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: en.salesInsights.clearProductSearch }))
  expect(within(screen.getByRole("table", { name: "" })).getAllByRole("row")).toHaveLength(26)
})
it.each(["en", "fr"])("searches localized product names and recovers from no results in %s", async locale => {
  mount(locale); await screen.findByText(locale === "fr" ? "Rice FR" : "Rice")
  const t = (locale === "fr" ? fr : en).salesInsights
  const search = screen.getByRole("searchbox", { name: t.searchProducts })
  fireEvent.change(search, { target: { value: "missing" } })
  expect(screen.getByText(t.noMatchingProducts)).toBeInTheDocument()
  fireEvent.change(search, { target: { value: locale === "fr" ? "rice fr" : "rice" } })
  expect(screen.getByText(locale === "fr" ? "Rice FR" : "Rice")).toBeInTheDocument()
  expect(screen.queryByText(locale === "fr" ? "Beans FR" : "Beans")).not.toBeInTheDocument()
  expect(screen.getByText(t.productsBasis)).toBeInTheDocument()
})
it("distinguishes empty source coverage and absent cached amounts from zero", async () => {
  c.mockResolvedValue({ success: true, data: { state: "ready", report: { ...base, start: "2026-09-01", end: "2026-09-02", receipts: "0.00", refunds: "0.00", reversals: "0.00", net: null, missingTimes: 1, methods: [] } } })
  r.mockResolvedValue({ success: true, data: { state: "ready", report: { ...base, documentCount: 0, currencies: [] } } })
  p.mockResolvedValue({ success: true, data: { state: "ready", report: { ...productReport(), rows: [] } } })
  mount()
  expect(await screen.findByText(en.salesInsights.noReceivables)).toBeInTheDocument()
  expect(screen.getByText(en.salesInsights.noProducts)).toBeInTheDocument()
  expect(screen.getByText(en.salesInsights.noReceipts)).toBeInTheDocument()
  expect(screen.getByText(en.salesInsights.creditIssued.replace("{amount}", en.salesInsights.unavailable))).toBeInTheDocument()
})
