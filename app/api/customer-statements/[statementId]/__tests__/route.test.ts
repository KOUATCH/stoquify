import { GET } from "../route"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicCustomerStatement } from "@/services/accounting/customer-statement-access.service"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => body,
    }),
  },
}))

jest.mock("@/services/accounting/customer-statement-access.service", () => ({
  getPublicCustomerStatement: jest.fn(),
}))

jest.mock("@/lib/error-handling/route-response", () => ({
  jsonErrorEnvelopeResponse: jest.fn((error: unknown, _options: unknown, envelope: Record<string, unknown>) => ({
    status: typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 500,
    headers: new Headers(),
    json: async () => ({ ...envelope, error: "safe error" }),
  })),
}))

const mockGetPublicCustomerStatement = getPublicCustomerStatement as jest.Mock
const mockJsonErrorEnvelopeResponse = jsonErrorEnvelopeResponse as jest.Mock

function request(url: string, headers: Record<string, string> = {}) {
  return { url, headers: new Headers(headers) } as Request
}

function params(statementId = "statement-1") {
  return { params: Promise.resolve({ statementId }) }
}

describe("GET /api/customer-statements/[statementId]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns a non-cacheable redacted statement through the signed access service", async () => {
    mockGetPublicCustomerStatement.mockResolvedValue({ statementId: "statement-1", controls: { redacted: true } })

    const response = await GET(request(
      "http://localhost/api/customer-statements/statement-1?token=signed-token",
      { "x-forwarded-for": "203.0.113.5, 10.0.0.1", "user-agent": "Statement Client" },
    ), params())

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(mockGetPublicCustomerStatement).toHaveBeenCalledWith({
      statementSnapshotId: "statement-1",
      token: "signed-token",
      ipAddress: "203.0.113.5",
      userAgent: "Statement Client",
    })
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { statementId: "statement-1", controls: { redacted: true } },
    })
  })

  it("rejects missing tokens without looking up a statement", async () => {
    const response = await GET(request("http://localhost/api/customer-statements/statement-1"), params())

    expect(response.status).toBe(404)
    expect(mockGetPublicCustomerStatement).not.toHaveBeenCalled()
    expect(mockJsonErrorEnvelopeResponse.mock.calls[0][0]).toBeInstanceOf(NotFoundError)
  })

  it("uses the safe error envelope for invalid or revoked access", async () => {
    const error = new NotFoundError("Statement not found")
    mockGetPublicCustomerStatement.mockRejectedValue(error)

    const response = await GET(request(
      "http://localhost/api/customer-statements/statement-1?token=revoked-token",
    ), params())

    expect(response.status).toBe(404)
    expect(mockJsonErrorEnvelopeResponse).toHaveBeenCalledWith(
      error,
      { endpoint: "GET /api/customer-statements/[statementId]" },
      { success: false },
    )
  })
})
