import { POST } from "../route"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { submitCustomerStatementRecipientAction } from "@/services/accounting/customer-statement-recipient-action.service"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => body,
    }),
  },
}))

jest.mock("@/services/accounting/customer-statement-recipient-action.service", () => ({
  submitCustomerStatementRecipientAction: jest.fn(),
}))

jest.mock("@/lib/error-handling/route-response", () => ({
  jsonErrorEnvelopeResponse: jest.fn((error: unknown, _options: unknown, envelope: Record<string, unknown>) => ({
    status: typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 500,
    headers: new Headers(),
    json: async () => ({ ...envelope, error: "safe error" }),
  })),
}))

const mockSubmitAction = submitCustomerStatementRecipientAction as jest.Mock
const mockJsonErrorEnvelopeResponse = jsonErrorEnvelopeResponse as jest.Mock

function request(body: unknown, token = "signed-token", headers: Record<string, string> = {}) {
  return {
    url: "http://localhost/api/customer-statements/statement-1/actions" + (token ? "?token=" + token : ""),
    headers: new Headers(headers),
    json: async () => body,
  } as Request
}

function params(statementId = "statement-1") {
  return { params: Promise.resolve({ statementId }) }
}

const disputeBody = {
  actionType: "DISPUTE",
  customerReceivableDocumentId: "document-1",
  requestedAmount: "12.50",
  note: "This invoice was already returned.",
  idempotencyKey: "dispute-request-001",
  correlationId: "statement-session-001",
}

describe("POST /api/customer-statements/[statementId]/actions", () => {
  beforeEach(() => jest.clearAllMocks())

  it("submits a dispute with signed scope and hashed-metadata inputs", async () => {
    mockSubmitAction.mockResolvedValue({ actionId: "action-1", replayed: false })

    const response = await POST(request(disputeBody, "signed-token", {
      "x-real-ip": "203.0.113.8",
      "user-agent": "Statement Client",
    }), params())

    expect(response.status).toBe(201)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(mockSubmitAction).toHaveBeenCalledWith({
      statementSnapshotId: "statement-1",
      token: "signed-token",
      actionType: "DISPUTE",
      customerReceivableDocumentId: "document-1",
      requestedAmount: "12.50",
      promisedFor: null,
      note: "This invoice was already returned.",
      idempotencyKey: "dispute-request-001",
      correlationId: "statement-session-001",
      ipAddress: "203.0.113.8",
      userAgent: "Statement Client",
    })
  })

  it("returns 200 for an exact idempotent replay", async () => {
    mockSubmitAction.mockResolvedValue({ actionId: "action-1", replayed: true })

    const response = await POST(request(disputeBody), params())

    expect(response.status).toBe(200)
  })

  it("rejects missing tokens before parsing recipient evidence", async () => {
    const response = await POST(request(disputeBody, ""), params())

    expect(response.status).toBe(404)
    expect(mockSubmitAction).not.toHaveBeenCalled()
    expect(mockJsonErrorEnvelopeResponse.mock.calls[0][0]).toBeInstanceOf(NotFoundError)
  })

  it("rejects unsupported action types before service access", async () => {
    const response = await POST(request({ ...disputeBody, actionType: "PAY_NOW" }), params())

    expect(response.status).toBe(422)
    expect(mockSubmitAction).not.toHaveBeenCalled()
    expect(mockJsonErrorEnvelopeResponse.mock.calls[0][0]).toBeInstanceOf(BusinessRuleError)
  })

  it("returns the safe error envelope when scoped action validation fails", async () => {
    const error = new BusinessRuleError("Promise exceeds balance")
    mockSubmitAction.mockRejectedValue(error)

    const response = await POST(request({ ...disputeBody, actionType: "PROMISE_TO_PAY" }), params())

    expect(response.status).toBe(422)
    expect(mockJsonErrorEnvelopeResponse).toHaveBeenCalledWith(
      error,
      { endpoint: "POST /api/customer-statements/[statementId]/actions" },
      { success: false },
    )
  })
})
