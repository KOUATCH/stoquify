/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getAPHistoryAction } from "@/actions/purchasing/ap-history.actions"
import { PayablesPaymentActivity } from "../PayablesPaymentActivity"
jest.mock("@/actions/purchasing/ap-history.actions", () => ({ getAPHistoryAction: jest.fn() }))
const props = { identity: { userId: "u", organizationId: "org", permissionKey: "finance.payables.read", enabled: true }, timezone: "Africa/Douala", checkedAt: "2026-10-12T12:00:00Z", locale: "en" as const, returnTo: "/en/dashboard/finance/payables?queue=overdue" }
const data = { scope: { organizationId: "org", actorUserId: "u" }, snapshot: { generatedAt: props.checkedAt }, summary: { currencyTotals: [{ currency: "XAF", releasedPaymentTotal: "123.45" }, { currency: "EUR", releasedPaymentTotal: null }] } }
function setup(patch = {}) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PayablesPaymentActivity {...props} {...patch} /></QueryClientProvider>) }
beforeEach(() => { jest.resetAllMocks(); (getAPHistoryAction as jest.Mock).mockResolvedValue({ success: true, data }) })
it("reads period activity independently, preserves currency unknowns and drills into that payment period", async () => {
  setup()
  await screen.findByText("123.45 XAF")
  expect(screen.getByText("Unavailable — unverified evidence")).toBeInTheDocument()
  expect(getAPHistoryAction).toHaveBeenCalledWith({ filters: { lane: "payment", dateFrom: "2026-10-01", dateTo: "2026-10-12", pageSize: 25 } })
  expect(screen.getByRole("link", { name: "Review payments and controlled exports" })).toHaveAttribute("href", expect.stringContaining("dateFrom=2026-10-01&dateTo=2026-10-12"))
})
it("does not fetch without AP history rights", async () => {
  setup({ identity: { ...props.identity, permissionKey: "finance.read" } })
  expect(screen.getByText("AP history read permission required.")).toBeInTheDocument()
  expect(getAPHistoryAction).not.toHaveBeenCalled()
})
it("withholds cross-workspace results and offers independent recovery", async () => {
  ;(getAPHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { ...data, scope: { organizationId: "foreign", actorUserId: "u" } } })
  setup()
  await screen.findByRole("alert")
  expect(screen.queryByText("123.45 XAF")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Retry payments" })).toBeInTheDocument()
})
it("renders a French empty period without inventing a cash balance", async () => {
  ;(getAPHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { ...data, summary: { currencyTotals: [] } } })
  setup({ locale: "fr" })
  await waitFor(() => expect(screen.getByText("Aucun paiement dans cette période.")).toBeInTheDocument())
})
it("restores date inputs and read scope when navigation changes the applied period", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const first = { start: "2026-09-01", end: "2026-09-30" }
  const restored = { start: "2026-08-01", end: "2026-08-31" }
  const view = render(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} selectedPeriod={first} /></QueryClientProvider>)
  await screen.findByText("123.45 XAF")
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-05" } })
  view.rerender(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} selectedPeriod={first} returnTo="/en/dashboard/finance/payables?queue=due7" /></QueryClientProvider>)
  expect(screen.getByLabelText("From")).toHaveValue("2026-09-05")
  view.rerender(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} selectedPeriod={restored} /></QueryClientProvider>)
  expect(screen.getByLabelText("From")).toHaveValue(restored.start)
  expect(screen.getByLabelText("Through")).toHaveValue(restored.end)
  await waitFor(() => expect(getAPHistoryAction).toHaveBeenLastCalledWith({ filters: { lane: "payment", dateFrom: restored.start, dateTo: restored.end, pageSize: 25 } }))
  view.rerender(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} selectedPeriod={first} /></QueryClientProvider>)
  expect(screen.getByLabelText("From")).toHaveValue(first.start)
})
it("clearing a URL period returns to the current month after a controlled period was applied", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onPeriodChange = jest.fn()
  const first = { start: "2026-09-01", end: "2026-09-30" }
  const view = render(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} selectedPeriod={first} onPeriodChange={onPeriodChange} /></QueryClientProvider>)
  await screen.findByText("123.45 XAF")
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-05" } })
  fireEvent.click(screen.getByRole("button", { name: "Apply period" }))
  expect(onPeriodChange).toHaveBeenCalledWith({ start: "2026-09-05", end: first.end })
  view.rerender(<QueryClientProvider client={client}><PayablesPaymentActivity {...props} onPeriodChange={onPeriodChange} /></QueryClientProvider>)
  expect(screen.getByLabelText("From")).toHaveValue("2026-10-01")
  expect(screen.getByLabelText("Through")).toHaveValue("2026-10-12")
})
