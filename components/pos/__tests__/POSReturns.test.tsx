import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getPOSSaleReturnPreviewAction } from "@/actions/pos/returns.actions"
import { refundPOSSaleAction } from "@/actions/pos/tender.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { POSReturns } from "../POSReturns"

jest.mock("@/actions/pos/returns.actions", () => ({ getPOSSaleReturnPreviewAction: jest.fn() }))
jest.mock("@/actions/pos/tender.actions", () => ({ refundPOSSaleAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/hooks/posHooks/usePosOperations", () => ({ posOperationsKeys: { all: ["pos-operations"] } }))

const lookup = getPOSSaleReturnPreviewAction as jest.Mock
const refund = refundPOSSaleAction as jest.Mock
const verify = stepUpWithPasswordAction as jest.Mock
const scope = { locationId: "location-1", terminalId: "terminal-1", sessionId: "shift-1" }
const actor = { organizationId: "org-1", actorId: "cashier-1" }
const preview = {
  saleId: "sale-1",
  orderNumber: "POS-1001",
  status: "ELIGIBLE",
  total: { amount: "4500.00", currency: "XAF" },
  lines: [{ id: "line-1", nameEn: "Coffee", nameFr: "Café", sku: "COF", quantity: "2" }],
}

function previewResult(status = "ELIGIBLE", owner = actor) {
  return { success: true, data: { scope: owner, data: { ...preview, status } } }
}

async function openReturn() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <POSReturns locale="en" {...scope} {...actor} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole("button", { name: "Returns" }))
  fireEvent.change(screen.getByLabelText("Order number on the receipt"), { target: { value: " POS-1001 " } })
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Find sale" })) })
  await waitFor(() => expect(lookup).toHaveBeenCalledWith({ ...scope, orderNumber: "POS-1001" }))
}

async function confirm() {
  const button = await screen.findByRole("button", { name: "Confirm full cash refund" })
  fireEvent.change(screen.getByLabelText("Return reason"), { target: { value: "Incorrect item" } })
  await act(async () => { fireEvent.click(button) })
}

beforeEach(() => {
  jest.resetAllMocks()
  lookup.mockResolvedValue(previewResult())
  refund.mockResolvedValue({ success: true, data: { totalRefunded: 4500 } })
})

it("shows the items and immutable amount before recording an explicitly confirmed cash refund", async () => {
  await openReturn()
  expect(await screen.findByText("Coffee")).toBeVisible()
  expect(screen.getByRole("button", { name: "Confirm full cash refund" })).toBeDisabled()
  expect(refund).not.toHaveBeenCalled()
  await confirm()
  expect(await screen.findByText("Cash refund confirmed.")).toBeVisible()
  expect(refund).toHaveBeenCalledWith({
    ...scope,
    salesOrderId: "sale-1",
    reason: "Incorrect item",
    reviewedTotal: preview.total,
  })
})

it("keeps a lost response read-only until the recorded refund is found", async () => {
  refund.mockRejectedValue(new Error("Connection lost"))
  lookup.mockResolvedValueOnce(previewResult()).mockResolvedValueOnce(previewResult()).mockResolvedValueOnce(previewResult("RECORDED"))
  await openReturn()
  await confirm()
  expect(await screen.findByRole("alert")).toHaveTextContent("The outcome is unconfirmed")
  fireEvent.click(screen.getByRole("button", { name: "Check refund status" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ask a manager"))
  expect(screen.queryByRole("button", { name: "Confirm full cash refund" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Check refund status" }))
  expect(await screen.findByText(/A refund is already recorded/)).toBeVisible()
  expect(refund).toHaveBeenCalledTimes(1)
})

it("rechecks the original sale after password verification and waits for a fresh confirmation", async () => {
  refund.mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED", status: 403 })
  verify.mockResolvedValue({ success: true })
  await openReturn()
  await confirm()
  const password = await screen.findByLabelText("Current password")
  fireEvent.change(password, { target: { value: "fixture-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Verify password" }))
  expect(await screen.findByText(/Password verified/)).toBeVisible()
  expect(verify).toHaveBeenCalledWith({ password: "fixture-password" })
  expect(lookup).toHaveBeenCalledTimes(2)
  expect(refund).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Confirm full cash refund" }))
  expect(await screen.findByText("Cash refund confirmed.")).toBeVisible()
  expect(refund).toHaveBeenCalledTimes(2)
})

it("rejects previews from a stale organization or actor scope", async () => {
  lookup.mockResolvedValue(previewResult("ELIGIBLE", { ...actor, organizationId: "other-org" }))
  await openReturn()
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to check this sale")
  expect(screen.queryByText("Coffee")).not.toBeInTheDocument()
  expect(refund).not.toHaveBeenCalled()
})
