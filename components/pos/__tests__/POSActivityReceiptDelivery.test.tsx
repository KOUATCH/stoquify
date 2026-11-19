import { fireEvent, render, screen } from "@testing-library/react"

import { getPOSWhatsAppReceiptStatusAction, queuePOSWhatsAppReceiptAction } from "@/actions/pos/whatsapp-receipt.actions"

import { POSActivityReceiptDelivery } from "../POSActivityReceiptDelivery"

jest.mock("lucide-react", () => ({ MessageCircle: () => null }))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock("@/actions/pos/whatsapp-receipt.actions", () => ({
  getPOSWhatsAppReceiptStatusAction: jest.fn(),
  queuePOSWhatsAppReceiptAction: jest.fn(),
}))

const queue = jest.mocked(queuePOSWhatsAppReceiptAction)
const readStatus = jest.mocked(getPOSWhatsAppReceiptStatusAction)

function requestReceipt() {
  render(<POSActivityReceiptDelivery language="en" locationId="fixture-shop" salesOrderId="fixture-sale" />)
  fireEvent.click(screen.getByText("Send by WhatsApp"))
  fireEvent.change(screen.getByRole("textbox", { name: "Customer’s WhatsApp number" }), { target: { value: "+12025550123" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByRole("button", { name: "Queue WhatsApp receipt" }))
}

describe("Activity WhatsApp request recovery", () => {
  beforeEach(() => {
    queue.mockReset()
    readStatus.mockReset()
  })

  it("checks a lost request and recovers the existing status without queuing again", async () => {
    queue.mockRejectedValue(new Error("Fixture response lost"))
    readStatus.mockResolvedValue({ success: true, error: null, status: 200, data: { reference: "receipt-fixture", status: "UNCERTAIN" } })
    requestReceipt()

    expect(queue).toHaveBeenCalledWith({
      salesOrderId: "fixture-sale", locationId: "fixture-shop", destination: "+12025550123",
      locale: "EN", whatsAppCustomerOptInConfirmed: true,
    })
    expect(screen.queryByRole("button", { name: "Retry same request" })).toBeNull()
    fireEvent.click(await screen.findByRole("button", { name: "Check status" }))
    expect(await screen.findByText("Acceptance uncertain")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry same request" })).toBeNull()
    expect(queue).toHaveBeenCalledTimes(1)
  })

  it("retries the same request only after checking that no delivery is recorded", async () => {
    queue.mockRejectedValueOnce(new Error("Fixture response lost"))
    queue.mockResolvedValueOnce({ success: true, error: null, status: 200, data: { reference: "receipt-fixture", status: "QUEUED" } })
    readStatus.mockResolvedValue({ success: true, error: null, status: 200, data: null })
    requestReceipt()

    fireEvent.click(await screen.findByRole("button", { name: "Check status" }))
    fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }))
    expect(await screen.findByText("Queued")).toBeInTheDocument()
    expect(queue).toHaveBeenCalledTimes(2)
    expect(queue.mock.calls[0]).toEqual(queue.mock.calls[1])
  })
})

