jest.mock("resend", () => ({ Resend: jest.fn() }))

import { Resend } from "resend"
import { sendCustomerStatementDelivery } from "../customer-statement-delivery.provider"

const mockResend = Resend as jest.Mock
const mockEmailSend = jest.fn()

const baseInput = {
  channel: "EMAIL" as const,
  destination: "customer@example.com",
  accessUrl: "https://stoquify.test/customer-statement/statement-1?token=signed",
  statementNumber: "STM-2026-001",
  closingBalance: "125.50",
  currency: "XAF",
  businessName: "Demo Shop",
  locale: "EN" as const,
  referralCode: "referral_code_123",
}

describe("customer statement delivery provider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResend.mockImplementation(() => ({
      emails: { send: mockEmailSend },
    }))
  })

  it("defers email without touching a provider when live sends are disabled", async () => {
    const result = await sendCustomerStatementDelivery(baseInput, {
      environment: {
        RESEND_API_KEY: "configured",
        RESEND_FROM_EMAIL: "statements@stoquify.test",
      },
    })

    expect(result.status).toBe("DEFERRED")
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("sends a branded email only when the provider is explicitly enabled", async () => {
    mockEmailSend.mockResolvedValue({
      data: { id: "email-provider-1" },
      error: null,
    })

    const result = await sendCustomerStatementDelivery(baseInput, {
      environment: {
        STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "true",
        RESEND_API_KEY: "configured",
        RESEND_FROM_EMAIL: "statements@stoquify.test",
      },
    })

    expect(result).toMatchObject({
      status: "SENT",
      providerReference: "email-provider-1",
      retryable: false,
    })
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "statements@stoquify.test",
      to: "customer@example.com",
      subject: expect.stringContaining("STM-2026-001"),
      html: expect.stringContaining("Powered by Stoquify"),
    }))
    expect(mockEmailSend.mock.calls[0][0].html).toContain(baseInput.accessUrl.replaceAll("&", "&amp;"))
  })

  it("sends the approved WhatsApp template with statement and referral context", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wa-provider-1" }] }),
    })

    const result = await sendCustomerStatementDelivery({
      ...baseInput,
      channel: "WHATSAPP",
      destination: "+237670000001",
    }, {
      environment: {
        STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: "true",
        WHATSAPP_PHONE_NUMBER_ID: "phone-number-1",
        WHATSAPP_ACCESS_TOKEN: "provider-secret",
        WHATSAPP_STATEMENT_TEMPLATE_NAME: "stoquify_customer_statement",
      },
      fetcher: fetcher as typeof globalThis.fetch,
    })

    expect(result).toMatchObject({
      status: "SENT",
      providerReference: "wa-provider-1",
    })
    const request = fetcher.mock.calls[0]
    expect(request[0]).toContain("phone-number-1/messages")
    const body = JSON.parse(request[1].body)
    expect(body.to).toBe("237670000001")
    expect(body.template.name).toBe("stoquify_customer_statement")
    expect(JSON.stringify(body)).toContain(baseInput.accessUrl)
  })

  it.each(["rate_limit_exceeded", "invalid_parameter", "application_error", "invalid_idempotent_request", "internal_server_error"])("distinguishes rejection from uncertainty for SDK email error %s", async name => {
    mockEmailSend.mockResolvedValue({ data: null, error: { name, message: "Owned SDK error" } })
    const result = await sendCustomerStatementDelivery(baseInput, { environment: { STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "true", RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "worker@example.invalid" } })
    expect(result.status).toBe(name === "rate_limit_exceeded" || name === "invalid_parameter" ? "FAILED" : "UNKNOWN")
    expect(result.retryable).toBe(name === "rate_limit_exceeded")
  })

  it.each(["throw", "missing-reference"])("does not present %s as a safely retryable email", async kind => {
    if (kind === "throw") mockEmailSend.mockRejectedValue(new Error("private transport detail"))
    else mockEmailSend.mockResolvedValue({ data: {}, error: null })
    const result = await sendCustomerStatementDelivery(baseInput, { environment: { STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "true", RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "worker@example.invalid" } })
    expect(result).toMatchObject({ status: "UNKNOWN", retryable: false })
    expect(result.message).not.toContain("private transport detail")
  })

  it.each([429, 400, 408, 409, 500, 200])("classifies WhatsApp response %s without inventing acceptance evidence", async status => {
    const fetcher = jest.fn().mockResolvedValue({ ok: status === 200, status, json: async () => ({}) })
    const result = await sendCustomerStatementDelivery({ ...baseInput, channel: "WHATSAPP" }, { fetcher, environment: { STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: "true", WHATSAPP_PHONE_NUMBER_ID: "owned", WHATSAPP_ACCESS_TOKEN: "test-only" } })
    expect(result.status).toBe(status === 400 || status === 429 ? "FAILED" : "UNKNOWN")
    expect(result.retryable).toBe(status === 429)
  })
})
