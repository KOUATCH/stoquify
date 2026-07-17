import {
  createPublicReceiptAccessToken,
  verifyPublicReceiptAccessToken,
} from "@/services/pos/public-receipt-token"

const ORIGINAL_RECEIPT_TOKEN_SECRET = process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET

beforeEach(() => {
  process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = "receipt-token-secret"
})

afterEach(() => {
  if (ORIGINAL_RECEIPT_TOKEN_SECRET) {
    process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = ORIGINAL_RECEIPT_TOKEN_SECRET
  } else {
    delete process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET
  }
})

describe("public receipt access tokens", () => {
  it("verifies legacy signed unexpired receipt tokens for the bound sale", () => {
    const token = createPublicReceiptAccessToken({
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })

    expect(verifyPublicReceiptAccessToken({
      token,
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toMatchObject({
      ok: true,
      payload: {
        v: "v1",
        scope: "public_receipt",
        salesOrderId: "sale-1",
      },
    })
  })

  it("creates and verifies v2 receipt tokens with organization and jti binding", () => {
    const token = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      jti: "jti-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })

    expect(verifyPublicReceiptAccessToken({
      token,
      organizationId: "org-1",
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toMatchObject({
      ok: true,
      payload: {
        v: "v2",
        scope: "public_receipt",
        organizationId: "org-1",
        salesOrderId: "sale-1",
        jti: "jti-1",
      },
    })

    expect(verifyPublicReceiptAccessToken({
      token,
      organizationId: "org-2",
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toEqual({ ok: false, reason: "organization_mismatch" })
  })

  it("rejects tampered, mismatched, expired, and unconfigured tokens", () => {
    const token = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      jti: "jti-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })

    expect(verifyPublicReceiptAccessToken({
      token: `${token}tampered`,
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toEqual({ ok: false, reason: "bad_signature" })

    expect(verifyPublicReceiptAccessToken({
      token,
      salesOrderId: "sale-2",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toEqual({ ok: false, reason: "receipt_mismatch" })

    expect(verifyPublicReceiptAccessToken({
      token,
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:01:01.000Z"),
    })).toEqual({ ok: false, reason: "expired" })

    delete process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET
    expect(verifyPublicReceiptAccessToken({
      token,
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:30.000Z"),
    })).toEqual({ ok: false, reason: "not_configured" })
  })
})