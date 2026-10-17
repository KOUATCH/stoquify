import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import SalesAttentionQueue from "../SalesAttentionQueue"
import { getSalesCashAttentionAction, getSalesReceivablesAction, getSalesProductsAction } from "@/actions/analytics/sales-insights.actions"
let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  const text = (mockLocale === "fr" ? fr : en).salesAttention[key as keyof typeof en.salesAttention]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
jest.mock("@/actions/analytics/sales-insights.actions", () => ({ getSalesCashAttentionAction: jest.fn(), getSalesReceivablesAction: jest.fn(), getSalesProductsAction: jest.fn() }))
jest.mock("lucide-react", () => ({ CircleDot: () => null, CalendarClock: () => null, ArrowUpRight: () => null }))
jest.mock("next/link", () => ({ __esModule: true, default: (props: any) => <a {...props} /> }))
const c = getSalesCashAttentionAction as jest.Mock, r = getSalesReceivablesAction as jest.Mock, p = getSalesProductsAction as jest.Mock
const base = { currency: "XAF", timezone: "Africa/Douala", checkedAt: "2026-10-11T12:00:00Z" }
const ready = (report: unknown) => ({ success: true, data: { state: "ready", report } })
function mount(locale = "en") {
  mockLocale = locale
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = (identity = "actor:org") => <QueryClientProvider client={client}><SalesAttentionQueue key={identity} identity={identity} revision="1" scope={{ organizationId: identity.split(":")[1], locationId: "loc" }} location="Store" /></QueryClientProvider>
  const rendered = render(view()); return { ...rendered, switchOrg: () => rendered.rerender(view("actor:other")) }
}
beforeEach(() => {
  jest.resetAllMocks()
  c.mockResolvedValue(ready({ ...base, expectedDays: 2, coveredDays: 1, findings: [{ id: "cash", date: "2026-10-01", amount: "-0.01", recordedAt: base.checkedAt, locationId: "loc", location: "Store", finalized: false }] }))
  r.mockResolvedValue(ready({ ...base, documentCount: 1, currencies: [{ currency: "XAF", overdue: "20.00" }] }))
  p.mockResolvedValue(ready({ ...base, canReadStock: true, stockCheckedAt: base.checkedAt, rows: ["A", "B"].map(id => ({ id, name: id, nameFr: id + " FR", active: true, quantity: "1.000", available: "0.000", unit: { symbol: "kg" }, stockStatus: "out" })) }))
})
it.each(["en", "fr"])("renders three initial findings, more disclosure and scoped cash links in %s", async locale => {
  mount(locale); const t = (locale === "fr" ? fr : en).salesAttention
  await screen.findByText(t.overdueTitle)
  const disclosure = screen.getByText(t.more.replace("{count}", "1")).closest("details")!
  expect(disclosure).not.toHaveAttribute("open")
  expect(screen.getByRole("link", { name: t.cashLink })).toHaveAttribute("href", `/${locale}/dashboard/sales?view=daily&date=2026-10-01&locationId=loc&reportOrg=org`)
  expect(screen.getByText(new RegExp(t.partial.replace(".", "\\.")))).toHaveTextContent(t.cashGap)
  expect(screen.getByText(t.provisional)).toBeInTheDocument()
  expect(within(disclosure).getByText(t.stockTitle.replace("{name}", locale === "fr" ? "B FR" : "B"))).toBeInTheDocument()
})
it("removes findings on permission revocation and preserves the usable cash source", async () => {
  mount(); await screen.findByText(en.salesAttention.overdueTitle)
  r.mockResolvedValue({ success: true, data: { state: "restricted" } }); p.mockResolvedValue({ success: false, error: "private error" })
  fireEvent.click(screen.getByRole("button", { name: en.salesAttention.refresh }))
  await waitFor(() => expect(screen.queryByText(en.salesAttention.overdueTitle)).not.toBeInTheDocument())
  expect(screen.queryByRole("link", { name: en.salesAttention.stockLink })).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: en.salesAttention.cashLink })).toBeInTheDocument()
  expect(screen.queryByText("private error")).not.toBeInTheDocument()
})
it("does not label missing sources healthy or show previous organization findings", async () => {
  const view = mount(); await screen.findByText(en.salesAttention.overdueTitle)
  c.mockReturnValue(new Promise(() => {})); r.mockReturnValue(new Promise(() => {})); p.mockReturnValue(new Promise(() => {}))
  view.switchOrg()
  expect(screen.queryByText(en.salesAttention.overdueTitle)).not.toBeInTheDocument()
  expect(screen.getByText(en.salesAttention.loading)).toBeInTheDocument()
})
it("distinguishes empty checked evidence from loading and explains partial assessment", async () => {
  c.mockResolvedValue(ready({ ...base, expectedDays: 2, coveredDays: 0, findings: [] })); r.mockResolvedValue({ success: true, data: { state: "restricted" } }); p.mockResolvedValue(ready({ ...base, canReadStock: true, rows: [] }))
  mount(); expect(await screen.findByText(en.salesAttention.empty)).toBeInTheDocument()
  expect(screen.getByText(/Assessment is partial/)).toHaveTextContent(en.salesAttention.receivablesGap)
})
