import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { loadPurchaseReturnSource } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import { postPurchaseReturnFromReceiptAction } from "@/actions/purchasing/purchase-return-credit.actions"
import { PurchaseReturnDialog } from "../PurchaseReturnDialog"

jest.mock("next-intl", () => ({ useLocale: () => "en" }))
jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }))
jest.mock("@/actions/purchaseOrderWorkflow/purchase-receiving.actions", () => ({ loadPurchaseReturnSource: jest.fn() }))
jest.mock("@/actions/purchasing/purchase-return-credit.actions", () => ({ postPurchaseReturnFromReceiptAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))

const props = { organizationId: "org", actorId: "actor", orderId: "order", receiptId: "receipt", onChanged: jest.fn() }
const load = loadPurchaseReturnSource as jest.Mock
const post = postPurchaseReturnFromReceiptAction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "return-request-1" })
  load.mockResolvedValue({ success: true, data: {
    organizationId: props.organizationId, actorId: props.actorId, purchaseOrderId: props.orderId, goodsReceiptId: props.receiptId,
    receiptNumber: "GR-001", location: "Primary warehouse", revision: "1".repeat(64), requiresFreshAuth: false,
    lines: [{ id: "line-1", nameEn: "Item", nameFr: "Article", available: "2.500" }],
  } })
})

it("recovers the exact reviewed return after a transport failure and refresh", async () => {
  post.mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce({ success: true, data: {
    organizationId: props.organizationId, actorId: props.actorId, purchaseOrderId: props.orderId, goodsReceiptId: props.receiptId,
    returnNumber: "PR-001", requestReference: "return-request-1", replayed: true,
  } })
  const first = render(<PurchaseReturnDialog {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "Return to supplier" }))
  fireEvent.change(await screen.findByLabelText("Quantity to return"), { target: { value: "1.250" } })
  fireEvent.change(screen.getByLabelText("Reason for return"), { target: { value: "Damaged packaging" } })
  fireEvent.click(screen.getByRole("button", { name: "Review return" }))
  expect(post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Record return" }))
  await screen.findByRole("alert")
  first.unmount()

  render(<PurchaseReturnDialog {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "Return to supplier" }))
  fireEvent.click(await screen.findByRole("button", { name: "Recover this return" }))
  await screen.findByText("Supplier return recorded · PR-001")
  expect(post.mock.calls[0][0]).toEqual(post.mock.calls[1][0])
  expect(post.mock.calls[1][0]).toMatchObject({ purchaseOrderId: "order", goodsReceiptId: "receipt", expectedRevision: "1".repeat(64), lines: [{ sourceGoodsReceiptLineId: "line-1", quantity: "1.250" }] })
  expect(props.onChanged).toHaveBeenCalledTimes(1)
})

it("refuses quantities above the verified source and location availability", async () => {
  render(<PurchaseReturnDialog {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "Return to supplier" }))
  fireEvent.change(await screen.findByLabelText("Quantity to return"), { target: { value: "3" } })
  fireEvent.change(screen.getByLabelText("Reason for return"), { target: { value: "Damaged packaging" } })
  fireEvent.click(screen.getByRole("button", { name: "Review return" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("within the available amount"))
  expect(post).not.toHaveBeenCalled()
})
