import {
  createCustomerStatementAccessToken,
  verifyCustomerStatementAccessToken,
} from "../customer-statement-token"

const SECRET = "statement-secret-that-is-at-least-thirty-two-characters"
const NOW = new Date("2026-08-09T12:00:00.000Z")

beforeEach(() => {
  process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET = SECRET
  delete process.env.STATEMENT_TOKEN_SECRET
})

afterAll(() => {
  delete process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET
})

describe("customer statement signed tokens", () => {
  it("signs a content-bound token with explicit recipient permissions", () => {
    const token = createCustomerStatementAccessToken({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      statementContentHash: "a".repeat(64),
      jti: "jti-1",
      permissions: ["promise_to_pay", "view", "dispute"],
      now: NOW,
      ttlSeconds: 3600,
    })

    expect(token).toBeTruthy()
    expect(
      verifyCustomerStatementAccessToken({
        token,
        statementSnapshotId: "statement-1",
        now: new Date(NOW.getTime() + 1000),
      }),
    ).toEqual({
      ok: true,
      payload: expect.objectContaining({
        v: "v1",
        scope: "customer_statement",
        organizationId: "org-1",
        statementSnapshotId: "statement-1",
        statementContentHash: "a".repeat(64),
        jti: "jti-1",
        permissions: ["dispute", "promise_to_pay", "view"],
      }),
    })
  })

  it.each([
    ["tampered signature", (token: string) => token.slice(0, -1) + "x", "bad_signature"],
    [
      "wrong statement",
      (token: string) => token,
      "statement_mismatch",
      "statement-other",
    ],
  ])(
    "rejects %s",
    (_name, mutate, reason, statementSnapshotId = "statement-1") => {
      const token = createCustomerStatementAccessToken({
        organizationId: "org-1",
        statementSnapshotId: "statement-1",
        statementContentHash: "b".repeat(64),
        jti: "jti-2",
        permissions: ["view"],
        now: NOW,
        ttlSeconds: 3600,
      })!

      expect(
        verifyCustomerStatementAccessToken({
          token: mutate(token),
          statementSnapshotId,
          now: NOW,
        }),
      ).toEqual({ ok: false, reason })
    },
  )

  it("rejects expired tokens and unsafe secret or lifetime configuration", () => {
    const token = createCustomerStatementAccessToken({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      statementContentHash: "c".repeat(64),
      jti: "jti-3",
      permissions: ["view"],
      now: NOW,
      ttlSeconds: 300,
    })!
    expect(
      verifyCustomerStatementAccessToken({
        token,
        statementSnapshotId: "statement-1",
        now: new Date(NOW.getTime() + 300_000),
      }),
    ).toEqual({ ok: false, reason: "expired" })

    process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET = "short"
    expect(
      createCustomerStatementAccessToken({
        organizationId: "org-1",
        statementSnapshotId: "statement-1",
        statementContentHash: "c".repeat(64),
        jti: "jti-4",
        permissions: ["view"],
        now: NOW,
        ttlSeconds: 3600,
      }),
    ).toBeNull()
  })
})
