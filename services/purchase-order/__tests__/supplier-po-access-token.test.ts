import {
  createSupplierPoAccessToken,
  verifySupplierPoAccessToken,
} from "../supplier-po-access-token"

const SECRET = "supplier-po-secret-that-is-at-least-thirty-two-characters"
const NOW = new Date("2026-08-15T12:00:00.000Z")

beforeEach(() => {
  process.env.AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET = SECRET
  delete process.env.SUPPLIER_PO_TOKEN_SECRET
  delete process.env.AQSTOQFLOW_EXTERNAL_ACCESS_TOKEN_SECRET
})

afterAll(() => {
  delete process.env.AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET
})

describe("supplier PO signed access tokens", () => {
  it("binds invite-only access to the organization, PO, envelope and content hash", () => {
    const token = createSupplierPoAccessToken({
      organizationId: "org-1",
      purchaseOrderId: "po-1",
      envelopeId: "envelope-1",
      envelopeContentHash: "a".repeat(64),
      jti: "invite-1",
      allowRespond: true,
      now: NOW,
      ttlSeconds: 3600,
    })

    expect(token).toBeTruthy()
    expect(
      verifySupplierPoAccessToken({
        token,
        envelopeId: "envelope-1",
        now: new Date(NOW.getTime() + 1000),
      }),
    ).toEqual({
      ok: true,
      payload: expect.objectContaining({
        v: "v1",
        scope: "supplier_po_acknowledgement",
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        envelopeId: "envelope-1",
        envelopeContentHash: "a".repeat(64),
        jti: "invite-1",
        permissions: ["respond", "view"],
      }),
    })
  })

  it.each([
    ["tampered signature", (token: string) => token.slice(0, -1) + "x", "bad_signature", "envelope-1"],
    ["different envelope", (token: string) => token, "envelope_mismatch", "envelope-2"],
  ])("rejects %s", (_name, mutate, reason, envelopeId) => {
    const token = createSupplierPoAccessToken({
      organizationId: "org-1",
      purchaseOrderId: "po-1",
      envelopeId: "envelope-1",
      envelopeContentHash: "b".repeat(64),
      jti: "invite-2",
      now: NOW,
      ttlSeconds: 3600,
    })!

    expect(
      verifySupplierPoAccessToken({
        token: mutate(token),
        envelopeId,
        now: NOW,
      }),
    ).toEqual({ ok: false, reason })
  })

  it("rejects expiry and unsafe signer configuration", () => {
    const token = createSupplierPoAccessToken({
      organizationId: "org-1",
      purchaseOrderId: "po-1",
      envelopeId: "envelope-1",
      envelopeContentHash: "c".repeat(64),
      jti: "invite-3",
      now: NOW,
      ttlSeconds: 300,
    })!
    expect(
      verifySupplierPoAccessToken({
        token,
        envelopeId: "envelope-1",
        now: new Date(NOW.getTime() + 300_000),
      }),
    ).toEqual({ ok: false, reason: "expired" })

    process.env.AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET = "short"
    expect(
      createSupplierPoAccessToken({
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        envelopeId: "envelope-1",
        envelopeContentHash: "c".repeat(64),
        jti: "invite-4",
        now: NOW,
        ttlSeconds: 3600,
      }),
    ).toBeNull()
  })
})
