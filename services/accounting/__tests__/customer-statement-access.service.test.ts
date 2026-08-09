import {
  CustomerStatementAccessAction,
  CustomerStatementAccessTokenStatus,
  Prisma,
} from "@prisma/client"

import { hashBusinessPayload } from "@/services/events/business-event.service"

import {
  getPublicCustomerStatement,
  hashCustomerStatementAccessValue,
  issueCustomerStatementAccessTokenInTx,
  revokeCustomerStatementAccessTokenInTx,
} from "../customer-statement-access.service"
import {
  createCustomerStatementAccessToken,
} from "../customer-statement-token"

const SECRET = "statement-secret-that-is-at-least-thirty-two-characters"
const NOW = new Date("2026-08-09T12:00:00.000Z")
const STATEMENT_PAYLOAD = {
  schemaVersion: "customer-statement.v1",
  customer: {
    name: "Ada Retail",
    email: "ada@example.test",
    phone: "+237600000000",
    address: "Private address",
    notes: "Private note",
  },
  balances: { closing: "25.00" },
  lines: [],
}
const CONTENT_HASH = hashBusinessPayload(STATEMENT_PAYLOAD)

beforeEach(() => {
  process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET = SECRET
})

afterAll(() => {
  delete process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET
})

function snapshot() {
  return {
    id: "statement-1",
    organizationId: "org-1",
    statementNumber: "STM-001",
    version: 1,
    contentHash: CONTENT_HASH,
    currency: "XAF",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-09T11:00:00.000Z"),
    closingBalance: new Prisma.Decimal(25),
    statementPayload: STATEMENT_PAYLOAD,
    truncated: false,
  }
}

describe("customer statement access service", () => {
  it("issues only a hash-registered content-bound token with explicit scopes", async () => {
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      customerStatementSnapshot: {
        findFirst: jest.fn().mockResolvedValue(snapshot()),
      },
      customerStatementAccessToken: {
        create: jest.fn(async ({ data }) => ({ id: "token-1", ...data })),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    } as unknown as Prisma.TransactionClient

    const result = await issueCustomerStatementAccessTokenInTx(tx, {
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      issuedById: "user-1",
      allowDispute: true,
      allowPromiseToPay: true,
      recipientReference: "ada@example.test",
      ttlSeconds: 3600,
      now: NOW,
    })

    expect(result.token).toBeTruthy()
    expect(result.permissions).toEqual([
      "view",
      "dispute",
      "promise_to_pay",
    ])
    const create = tx.customerStatementAccessToken.create as jest.Mock
    const data = create.mock.calls[0][0].data
    expect(data).toMatchObject({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      statementContentHash: CONTENT_HASH,
      allowView: true,
      allowDispute: true,
      allowPromiseToPay: true,
      status: CustomerStatementAccessTokenStatus.ACTIVE,
    })
    expect(data.tokenHash).toBe(hashCustomerStatementAccessValue(result.token))
    expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(data.jtiHash).toMatch(/^[0-9a-f]{64}$/)
    expect(data.recipientHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(data)).not.toContain(result.token)
  })

  it("returns a redacted view and appends only hashed request/access evidence", async () => {
    const jti = "public-jti-1"
    const token = createCustomerStatementAccessToken({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      statementContentHash: CONTENT_HASH,
      jti,
      permissions: ["view", "dispute"],
      now: NOW,
      ttlSeconds: 3600,
    })!
    const row = {
      id: "token-1",
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      tokenHash: hashCustomerStatementAccessValue(token),
      jtiHash: hashCustomerStatementAccessValue(jti),
      statementContentHash: CONTENT_HASH,
      allowView: true,
      allowDispute: true,
      allowPromiseToPay: false,
      status: CustomerStatementAccessTokenStatus.ACTIVE,
      revokedAt: null,
      expiresAt: new Date(NOW.getTime() + 3_600_000),
      statementSnapshot: snapshot(),
    }
    const tx = {
      customerStatementAccessToken: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
      },
      customerStatementAccessLog: {
        create: jest.fn(async ({ data }) => ({ id: "log-1", ...data })),
      },
    } as unknown as Prisma.TransactionClient
    const client = {
      $transaction: jest.fn(async (work) => work(tx)),
    } as unknown as typeof import("@/prisma/db").db

    const result = await getPublicCustomerStatement(
      {
        statementSnapshotId: "statement-1",
        token,
        now: new Date(NOW.getTime() + 1000),
        ipAddress: "203.0.113.20",
        userAgent: "Statement Client/1.0",
      },
      client,
    )

    expect(result).toMatchObject({
      statementId: "statement-1",
      contentHash: CONTENT_HASH,
      permissions: ["dispute", "view"],
      controls: {
        redacted: true,
        rawTokenStored: false,
        requestMetadataHashed: true,
      },
    })
    const serialized = JSON.stringify(result.payload)
    expect(serialized).toContain("Ada Retail")
    expect(serialized).not.toContain("ada@example.test")
    expect(serialized).not.toContain("+237600000000")
    expect(serialized).not.toContain("Private address")
    expect(serialized).not.toContain("Private note")
    const log = tx.customerStatementAccessLog.create as jest.Mock
    expect(log.mock.calls[0][0].data).toMatchObject({
      action: CustomerStatementAccessAction.VIEW,
      statementContentHash: CONTENT_HASH,
      tokenHashPrefix: row.tokenHash.slice(0, 12),
      ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      userAgentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      responseHash: result.responseHash,
      denialReason: null,
    })
    expect(JSON.stringify(log.mock.calls[0][0].data)).not.toContain(token)
  })

  it("rejects revoked access before counters or view logs are written", async () => {
    const jti = "public-jti-revoked"
    const token = createCustomerStatementAccessToken({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      statementContentHash: CONTENT_HASH,
      jti,
      permissions: ["view"],
      now: NOW,
      ttlSeconds: 3600,
    })!
    const update = jest.fn()
    const createLog = jest.fn()
    const tx = {
      customerStatementAccessToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: "token-revoked",
          organizationId: "org-1",
          statementSnapshotId: "statement-1",
          tokenHash: hashCustomerStatementAccessValue(token),
          jtiHash: hashCustomerStatementAccessValue(jti),
          statementContentHash: CONTENT_HASH,
          allowView: true,
          allowDispute: false,
          allowPromiseToPay: false,
          status: CustomerStatementAccessTokenStatus.REVOKED,
          revokedAt: NOW,
          expiresAt: new Date(NOW.getTime() + 3_600_000),
          statementSnapshot: snapshot(),
        }),
        update,
      },
      customerStatementAccessLog: { create: createLog },
    } as unknown as Prisma.TransactionClient
    const client = {
      $transaction: jest.fn(async (work) => work(tx)),
    } as unknown as typeof import("@/prisma/db").db

    await expect(
      getPublicCustomerStatement(
        {
          statementSnapshotId: "statement-1",
          token,
          now: new Date(NOW.getTime() + 1000),
        },
        client,
      ),
    ).rejects.toThrow("Customer statement not found")
    expect(update).not.toHaveBeenCalled()
    expect(createLog).not.toHaveBeenCalled()
  })

  it("revokes an active token by compare-and-set and records a redacted audit", async () => {
    const existing = {
      id: "token-1",
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      tokenHash: "d".repeat(64),
      status: CustomerStatementAccessTokenStatus.ACTIVE,
      revokedAt: null,
    }
    const updateMany = jest.fn().mockResolvedValue({ count: 1 })
    const audit = jest.fn().mockResolvedValue({ id: "audit-1" })
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      customerStatementAccessToken: {
        findFirst: jest.fn().mockResolvedValue(existing),
        updateMany,
      },
      auditLog: { create: audit },
    } as unknown as Prisma.TransactionClient

    const result = await revokeCustomerStatementAccessTokenInTx(tx, {
      organizationId: "org-1",
      tokenId: "token-1",
      revokedById: "user-1",
      reason: "Recipient access withdrawn",
      now: NOW,
    })

    expect(result).toMatchObject({
      replayed: false,
      token: {
        status: CustomerStatementAccessTokenStatus.REVOKED,
        revokedAt: NOW,
      },
    })
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "token-1",
        organizationId: "org-1",
        status: CustomerStatementAccessTokenStatus.ACTIVE,
        revokedAt: null,
      },
      data: {
        status: CustomerStatementAccessTokenStatus.REVOKED,
        revokedById: "user-1",
        revokedAt: NOW,
        revocationReason: "Recipient access withdrawn",
      },
    })
    expect(JSON.stringify(audit.mock.calls[0][0])).not.toContain(
      "d".repeat(64),
    )
  })
})
