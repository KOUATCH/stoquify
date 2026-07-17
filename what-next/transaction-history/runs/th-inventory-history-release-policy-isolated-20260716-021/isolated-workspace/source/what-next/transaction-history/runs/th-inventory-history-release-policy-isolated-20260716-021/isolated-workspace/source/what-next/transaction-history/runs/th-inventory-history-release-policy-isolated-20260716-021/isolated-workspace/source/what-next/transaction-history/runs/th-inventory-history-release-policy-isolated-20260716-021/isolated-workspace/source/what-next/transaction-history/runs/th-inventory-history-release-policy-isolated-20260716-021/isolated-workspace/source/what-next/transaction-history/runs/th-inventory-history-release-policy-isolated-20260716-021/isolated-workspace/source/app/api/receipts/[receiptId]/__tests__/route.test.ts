import { GET } from "../route"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { getPublicSalesReceipt } from "@/services/pos/receipt.service"
import { NotFoundError } from "@/services/_shared/action-errors"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => body,
    }),
  },
}))

jest.mock("@/services/pos/receipt.service", () => ({
  getPublicSalesReceipt: jest.fn(),
}))

jest.mock("@/lib/error-handling/route-response", () => ({
  jsonErrorEnvelopeResponse: jest.fn((error: unknown, _options: unknown, envelope: Record<string, unknown>) => ({
    status: typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 500,
    headers: new Headers(),
    json: async () => ({ ...envelope, error: "safe error" }),
  })),
}))

const mockGetPublicSalesReceipt = getPublicSalesReceipt as jest.Mock
const mockJsonErrorEnvelopeResponse = jsonErrorEnvelopeResponse as jest.Mock

function request(url: string) {
  return { url } as Request
}

function params(receiptId = "sale-1") {
  return { params: Promise.resolve({ receiptId }) }
}

describe("GET /api/receipts/[receiptId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("passes signed receipt tokens to the public receipt service", async () => {
    mockGetPublicSalesReceipt.mockResolvedValue({ receipt: { id: "sale-1" } })

    const response = await GET(request("http://localhost/api/receipts/sale-1?token=signed-token"), params())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("X-AqStoqFlow-Receipt-Access")).toBeNull()
    expect(mockGetPublicSalesReceipt).toHaveBeenCalledWith({
      salesOrderId: "sale-1",
      receiptAccessToken: "signed-token",
    })
    expect(body).toEqual({ success: true, data: { receipt: { id: "sale-1" } } })
  })

  it("rejects raw receipt-id lookup before public service access", async () => {
    const response = await GET(request("http://localhost/api/receipts/sale-1"), params())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get("X-AqStoqFlow-Receipt-Access")).toBeNull()
    expect(mockGetPublicSalesReceipt).not.toHaveBeenCalled()
    expect(body).toMatchObject({ success: false, error: "safe error" })
    expect(mockJsonErrorEnvelopeResponse.mock.calls[0][0]).toBeInstanceOf(NotFoundError)
  })

  it("rejects blank receipt tokens before public service access", async () => {
    const response = await GET(request("http://localhost/api/receipts/sale-1?token=%20%20"), params())

    expect(response.status).toBe(404)
    expect(mockGetPublicSalesReceipt).not.toHaveBeenCalled()
  })

  it("returns the safe error envelope when token validation fails in the service", async () => {
    const error = new NotFoundError("Receipt not found")
    mockGetPublicSalesReceipt.mockRejectedValue(error)

    const response = await GET(request("http://localhost/api/receipts/sale-1?token=bad-token"), params())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ success: false, error: "safe error" })
    expect(mockJsonErrorEnvelopeResponse).toHaveBeenCalledWith(
      error,
      { endpoint: "GET /api/receipts/[receiptId]" },
      { success: false },
    )
  })
})
