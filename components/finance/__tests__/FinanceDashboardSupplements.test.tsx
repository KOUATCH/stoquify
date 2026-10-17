/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { ReceivablesCollectionsPanel } from "../ReceivablesCollectionsPanel"
import { PayablesWorkflowPanel } from "../PayablesWorkflowPanel"
import { useReceivablesCollections, usePayablesWorkflow } from "@/hooks/finance/useFinanceDashboardSupplements"
jest.mock("@/hooks/finance/useFinanceDashboardSupplements", () => ({ useReceivablesCollections: jest.fn(), usePayablesWorkflow: jest.fn() }))
const props = { organizationId: "org", timezone: "Africa/Douala", checkedAt: "2026-10-12T12:00:00Z", locale: "en" as const, onPeriodChange: jest.fn(), onDraftChange: jest.fn(), identity: { userId: "actor", organizationId: "org", permissionKey: "finance.read", enabled: true } }
beforeEach(() => jest.clearAllMocks())
it("shows missing receipt timestamps as unavailable net and uses an independent applied period", () => {
  ;(useReceivablesCollections as jest.Mock).mockReturnValue({ data: { state: "ready", report: { start: "2026-10-01", end: "2026-10-12", timezone: props.timezone, checkedAt: props.checkedAt, currency: "XAF", receipts: "100.00", refunds: "20.00", reversals: "5.00", net: null, missingTimes: 1, methods: [] } } })
  const view = render(<ReceivablesCollectionsPanel {...props} locationId="loc" />)
  expect(screen.getByText("Unavailable")).toBeInTheDocument()
  expect(useReceivablesCollections).toHaveBeenLastCalledWith("org", { locationId: "loc", start: "2026-10-01", end: "2026-10-12" }, props.identity)
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } })
  expect(props.onPeriodChange).not.toHaveBeenCalled()
  expect(props.onDraftChange).toHaveBeenCalledWith({ start: "2026-09-01", end: "2026-10-12" })
  view.rerender(<ReceivablesCollectionsPanel {...props} locationId="loc" draft={{ start: "2026-09-01", end: "2026-10-12" }} />)
  fireEvent.click(screen.getByRole("button", { name: "Apply period" }))
  expect(props.onPeriodChange).toHaveBeenCalledWith({ start: "2026-09-01", end: "2026-10-12" })
})
it("renders French restricted receipt access without pretending the amount is zero", () => {
  ;(useReceivablesCollections as jest.Mock).mockReturnValue({ data: { state: "restricted" } })
  render(<ReceivablesCollectionsPanel {...props} locale="fr" />)
  expect(screen.getByText(/autorisation de lecture/)).toBeInTheDocument()
  expect(screen.queryByText(/0,00/)).not.toBeInTheDocument()
})
it("returns to the current month when navigation clears an explicit receipt period", () => {
  ;(useReceivablesCollections as jest.Mock).mockReturnValue({ data: { state: "restricted" } })
  const view = render(<ReceivablesCollectionsPanel {...props} period={{ start: "2026-09-01", end: "2026-09-30" }} />)
  view.rerender(<ReceivablesCollectionsPanel {...props} />)
  expect(screen.getByLabelText("From")).toHaveValue("2026-10-01")
  expect(screen.getByLabelText("Through")).toHaveValue("2026-10-12")
  expect(useReceivablesCollections).toHaveBeenLastCalledWith("org", { start: "2026-10-01", end: "2026-10-12", locationId: undefined }, props.identity)
})
it("keeps workflow counts separate, masks restricted counts and routes to existing controls", () => {
  ;(usePayablesWorkflow as jest.Mock).mockReturnValue({ data: { state: "ready", report: { checkedAt: props.checkedAt, draftInvoices: 2, awaitingApproval: null, awaitingExecution: 5, counts: { ledgerBlockers: 3, reconciliationBlockers: 1, matchExceptions: 2, pendingBankChanges: 0, paymentPendingInvoices: 4, releasedPayments: 7 } } } })
  render(<PayablesWorkflowPanel {...props} identity={{ ...props.identity, permissionKey: "purchasing.ap.payment.release" }} />)
  expect(screen.getByText("Restricted")).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: /Draft requests/ })).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Open workflow: Approved/ })).toHaveAttribute("href", "/en/dashboard/purchases/payables/payments/record")
  expect(screen.getByRole("link", { name: "Payment recovery" })).toHaveAttribute("href", "/en/dashboard/purchases/payables/payments/recovery")
  expect(screen.getByText(/Released does not mean reconciled/)).toBeInTheDocument()
})
it("offers independent retry when workflow evidence fails", () => {
  const refetch = jest.fn()
  ;(usePayablesWorkflow as jest.Mock).mockReturnValue({ isError: true, refetch })
  render(<PayablesWorkflowPanel {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "Retry workflows" }))
  expect(refetch).toHaveBeenCalledTimes(1)
})
