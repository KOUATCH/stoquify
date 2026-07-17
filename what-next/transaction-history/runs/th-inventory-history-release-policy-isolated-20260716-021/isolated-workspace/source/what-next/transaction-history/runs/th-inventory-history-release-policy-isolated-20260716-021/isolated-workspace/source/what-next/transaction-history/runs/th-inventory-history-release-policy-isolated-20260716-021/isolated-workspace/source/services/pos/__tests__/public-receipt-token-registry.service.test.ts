import { NotFoundError } from "@/services/_shared/action-errors"
import { createPublicReceiptAccessToken } from "@/services/pos/public-receipt-token"
import {
  assertPublicReceiptAccessToken,
  hashPublicReceiptToken,
  issuePublicReceiptAccessToken,
  listPublicReceiptAccessTokens,
  revokePublicReceiptAccessToken,
  searchPublicReceiptSales,
} from "@/services/pos/public-receipt-token-registry.service"

const ORIGINAL_RECEIPT_TOKEN_SECRET = process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET

function registryClient() {
  return {
    salesOrder: {
      findMany: jest.fn(),
    },
    publicReceiptAccessToken: {
      create: jest.fn(async (args) => ({
        id: "token-row-1",
        organizationId: args.data.organizationId,
        salesOrderId: args.data.salesOrderId,
        status: args.data.status,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
      })),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(async (args) => ({
        id: args.where.id,
        organizationId: args.where.organizationId ?? "org-1",
        salesOrderId: "sale-1",
        status: args.data.status ?? "ACTIVE",
        expiresAt: new Date("2026-01-15T10:01:00.000Z"),
        revokedAt: args.data.revokedAt ?? null,
      })),
    },
    auditLog: {
      create: jest.fn(async () => ({})),
    },
  }
}

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

describe("public receipt token registry", () => {
  it("issues v2 receipt tokens with hash-only registry and redacted audit evidence", async () => {
    const client = registryClient()
    const issued = await issuePublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      issuedById: "user-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    }, client)

    const createData = client.publicReceiptAccessToken.create.mock.calls[0][0].data
    expect(issued.token).toEqual(expect.any(String))
    expect(createData).toMatchObject({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      status: "ACTIVE",
      issuedById: "user-1",
      tokenHash: issued.tokenHash,
      jtiHash: issued.jtiHash,
    })
    expect(JSON.stringify(createData)).not.toContain(issued.token)

    const audit = client.auditLog.create.mock.calls[0][0].data
    expect(audit.action).toBe("PUBLIC_RECEIPT_TOKEN_ISSUED")
    expect(audit.changes.tokenHashPrefix).toBe(issued.tokenHash.slice(0, 12))
    expect(audit.changes.jtiHashPrefix).toBe(issued.jtiHash.slice(0, 12))
    expect(JSON.stringify(audit)).not.toContain(issued.token)
  })

  it("requires an active registry row before public receipt access is allowed", async () => {
    const client = registryClient()
    const token = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      jti: "jti-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })
    expect(token).toEqual(expect.any(String))
    client.publicReceiptAccessToken.findFirst.mockResolvedValue({
      id: "token-row-1",
      organizationId: "org-1",
      salesOrderId: "sale-1",
      status: "ACTIVE",
      expiresAt: new Date("2026-01-15T10:01:00.000Z"),
      revokedAt: null,
    })

    const access = await assertPublicReceiptAccessToken({
      salesOrderId: "sale-1",
      token,
      now: new Date("2026-01-15T10:00:30.000Z"),
    }, client)

    expect(access).toEqual({ organizationId: "org-1", salesOrderId: "sale-1", tokenId: "token-row-1" })
    expect(client.publicReceiptAccessToken.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        salesOrderId: "sale-1",
        tokenHash: hashPublicReceiptToken(token as string),
        jtiHash: hashPublicReceiptToken("jti-1"),
      },
    })
    expect(client.publicReceiptAccessToken.update).toHaveBeenCalledWith({
      where: { id: "token-row-1" },
      data: {
        lastAccessedAt: new Date("2026-01-15T10:00:30.000Z"),
        accessCount: { increment: 1 },
      },
    })
    expect(client.auditLog.create.mock.calls[0][0].data.action).toBe("PUBLIC_RECEIPT_TOKEN_ACCESSED")
  })

  it("rejects legacy tokens before registry lookup", async () => {
    const client = registryClient()
    const token = createPublicReceiptAccessToken({
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })

    await expect(assertPublicReceiptAccessToken({
      salesOrderId: "sale-1",
      token,
      now: new Date("2026-01-15T10:00:30.000Z"),
    }, client)).rejects.toBeInstanceOf(NotFoundError)
    expect(client.publicReceiptAccessToken.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["unknown", null],
    ["revoked", { id: "token-row-1", organizationId: "org-1", salesOrderId: "sale-1", status: "REVOKED", expiresAt: new Date("2026-01-15T10:01:00.000Z"), revokedAt: new Date("2026-01-15T10:00:10.000Z") }],
    ["expired", { id: "token-row-1", organizationId: "org-1", salesOrderId: "sale-1", status: "ACTIVE", expiresAt: new Date("2026-01-15T09:59:59.000Z"), revokedAt: null }],
  ])("rejects %s registry rows before access update", async (_case, row) => {
    const client = registryClient()
    const token = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      jti: "jti-1",
      now: new Date("2026-01-15T10:00:00.000Z"),
      ttlSeconds: 60,
    })
    client.publicReceiptAccessToken.findFirst.mockResolvedValue(row)

    await expect(assertPublicReceiptAccessToken({
      salesOrderId: "sale-1",
      token,
      now: new Date("2026-01-15T10:00:30.000Z"),
    }, client)).rejects.toBeInstanceOf(NotFoundError)
    expect(client.publicReceiptAccessToken.update).not.toHaveBeenCalled()
  })

  it("lists receipt token management rows without exposing token secrets", async () => {
    const client = registryClient()
    client.publicReceiptAccessToken.findMany.mockResolvedValue([
      {
        id: "token-row-active-12345678",
        salesOrderId: "sale-1",
        status: "ACTIVE",
        issuedAt: new Date("2026-01-15T10:00:00.000Z"),
        expiresAt: new Date("2026-01-15T10:10:00.000Z"),
        lastAccessedAt: new Date("2026-01-15T10:02:00.000Z"),
        accessCount: 2,
        revokedAt: null,
        revocationReason: null,
      },
      {
        id: "token-row-revoked-87654321",
        salesOrderId: "sale-1",
        status: "REVOKED",
        issuedAt: new Date("2026-01-15T09:00:00.000Z"),
        expiresAt: new Date("2026-01-15T10:10:00.000Z"),
        lastAccessedAt: null,
        accessCount: 0,
        revokedAt: new Date("2026-01-15T09:30:00.000Z"),
        revocationReason: "operator-revoked-from-pos",
      },
    ])

    const tokens = await listPublicReceiptAccessTokens({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      now: new Date("2026-01-15T10:05:00.000Z"),
    }, client)

    expect(client.publicReceiptAccessToken.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        salesOrderId: "sale-1",
      },
      orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        salesOrderId: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        lastAccessedAt: true,
        accessCount: true,
        revokedAt: true,
        revocationReason: true,
      },
    })
    expect(tokens).toEqual([
      {
        id: "token-row-active-12345678",
        tokenIdSuffix: "12345678",
        salesOrderId: "sale-1",
        status: "ACTIVE",
        isActive: true,
        issuedAt: "2026-01-15T10:00:00.000Z",
        expiresAt: "2026-01-15T10:10:00.000Z",
        lastAccessedAt: "2026-01-15T10:02:00.000Z",
        accessCount: 2,
        revokedAt: null,
        revocationReason: null,
      },
      {
        id: "token-row-revoked-87654321",
        tokenIdSuffix: "87654321",
        salesOrderId: "sale-1",
        status: "REVOKED",
        isActive: false,
        issuedAt: "2026-01-15T09:00:00.000Z",
        expiresAt: "2026-01-15T10:10:00.000Z",
        lastAccessedAt: null,
        accessCount: 0,
        revokedAt: "2026-01-15T09:30:00.000Z",
        revocationReason: "operator-revoked-from-pos",
      },
    ])
    expect(JSON.stringify(tokens)).not.toContain("tokenHash")
    expect(JSON.stringify(tokens)).not.toContain("jtiHash")
    expect(JSON.stringify(tokens)).not.toContain("receipt-token-secret")
  })

  it("searches completed receipt sales with tenant scope and token-count metadata", async () => {
    const client = registryClient()
    client.salesOrder.findMany.mockResolvedValue([
      {
        id: "sale-1",
        orderNumber: "POS-20260703-0001",
        orderDate: new Date("2026-07-03T12:00:00.000Z"),
        total: { toNumber: () => 12500 },
        publicReceiptAccessTokens: [
          { status: "ACTIVE", expiresAt: new Date("2026-08-02T12:00:00.000Z"), revokedAt: null },
          { status: "REVOKED", expiresAt: new Date("2026-08-02T12:00:00.000Z"), revokedAt: new Date("2026-07-03T12:05:00.000Z") },
          { status: "ACTIVE", expiresAt: new Date("2026-07-03T11:59:00.000Z"), revokedAt: null },
        ],
      },
    ])

    const sales = await searchPublicReceiptSales({
      organizationId: "org-1",
      query: "POS-20260703",
      now: new Date("2026-07-03T12:10:00.000Z"),
      limit: 5,
    }, client)

    expect(client.salesOrder.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: "COMPLETED",
        deletedAt: null,
        OR: [
          { orderNumber: { contains: "POS-20260703", mode: "insensitive" } },
          { id: "POS-20260703" },
        ],
      },
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        total: true,
        publicReceiptAccessTokens: {
          select: {
            status: true,
            expiresAt: true,
            revokedAt: true,
          },
        },
      },
    })
    expect(sales).toEqual([
      {
        salesOrderId: "sale-1",
        orderNumber: "POS-20260703-0001",
        completedAt: "2026-07-03T12:00:00.000Z",
        total: 12500,
        tokenCount: 3,
        activeTokenCount: 1,
        revokedTokenCount: 1,
        expiredTokenCount: 1,
      },
    ])
    expect(JSON.stringify(sales)).not.toContain("tokenHash")
    expect(JSON.stringify(sales)).not.toContain("jtiHash")
    expect(JSON.stringify(sales)).not.toContain("customer")
  })
  it("revokes receipt tokens with actor and reason audit evidence", async () => {
    const client = registryClient()

    await revokePublicReceiptAccessToken({
      organizationId: "org-1",
      tokenId: "token-row-1",
      revokedById: "user-1",
      reason: "customer-request",
      now: new Date("2026-01-15T10:00:00.000Z"),
    }, client)

    expect(client.publicReceiptAccessToken.update).toHaveBeenCalledWith({
      where: {
        id: "token-row-1",
        organizationId: "org-1",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date("2026-01-15T10:00:00.000Z"),
        revokedById: "user-1",
        revocationReason: "customer-request",
      },
    })
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "PUBLIC_RECEIPT_TOKEN_REVOKED",
        organizationId: "org-1",
        userId: "user-1",
        changes: expect.objectContaining({
          tokenId: "token-row-1",
          revocationReason: "customer-request",
        }),
      }),
    })
  })
})
