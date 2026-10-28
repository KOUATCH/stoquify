import { GET } from "../route"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { recordReferralClick } from "@/services/referrals/referral-attribution.service"

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL, status: number) => ({
      status,
      headers: new Headers({ Location: url.toString() }),
    }),
  },
}))
jest.mock("@/services/referrals/referral-attribution.service", () => ({
  recordReferralClick: jest.fn(),
}))
jest.mock("@/lib/error-handling/route-response", () => ({
  jsonErrorEnvelopeResponse: jest.fn((error: unknown) => ({
    status: error instanceof NotFoundError ? 404 : 500,
    headers: new Headers(),
  })),
}))

const mockRecordClick = recordReferralClick as jest.Mock
const mockErrorEnvelope = jsonErrorEnvelopeResponse as jest.Mock

function request(
  headers: Record<string, string> = {},
  url = "https://stoquify.test/api/referrals/referral_code_123",
) {
  return {
    url,
    headers: new Headers(headers),
  } as Request
}

describe("GET /api/referrals/[referralCode]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("records the click and redirects to non-cacheable attributed registration", async () => {
    mockRecordClick.mockResolvedValue({
      registrationPath: "/register-v2?ref=referral_code_123",
    })

    const response = await GET(request({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "Referral Browser",
    }), { params: Promise.resolve({ referralCode: "referral_code_123" }) })

    expect(response.status).toBe(307)
    expect(response.headers.get("Location")).toBe(
      "https://stoquify.test/register-v2?ref=referral_code_123",
    )
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(mockRecordClick).toHaveBeenCalledWith({
      referralCode: "referral_code_123",
      inviteToken: null,
      ipAddress: "203.0.113.10",
      userAgent: "Referral Browser",
    })
  })

  it("forwards an accountant invite secret without putting it in logs", async () => {
    const inviteToken = "invite-token-" + "a".repeat(32)
    mockRecordClick.mockResolvedValue({
      registrationPath:
        "/register-v2?ref=accountant_ref_123&role=accountant&invite=" +
        inviteToken,
    })

    const response = await GET(
      request(
        {},
        "https://stoquify.test/api/referrals/accountant_ref_123?invite=" +
          inviteToken,
      ),
      { params: Promise.resolve({ referralCode: "accountant_ref_123" }) },
    )

    expect(response.status).toBe(307)
    expect(mockRecordClick).toHaveBeenCalledWith(expect.objectContaining({
      referralCode: "accountant_ref_123",
      inviteToken,
    }))
  })

  it("returns the safe not-found envelope for unknown attribution", async () => {
    const error = new NotFoundError("Referral not found")
    mockRecordClick.mockRejectedValue(error)

    const response = await GET(request(), {
      params: Promise.resolve({ referralCode: "unknown_code_123" }),
    })

    expect(response.status).toBe(404)
    expect(mockErrorEnvelope).toHaveBeenCalledWith(
      error,
      { endpoint: "GET /api/referrals/[referralCode]" },
      { success: false },
    )
  })
})
