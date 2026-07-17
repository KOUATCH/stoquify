import { createHash, randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import {
  createPublicReceiptAccessToken,
  verifyPublicReceiptAccessToken,
} from "./public-receipt-token"

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60
const ACTIVE_STATUS = "ACTIVE"
const REVOKED_STATUS = "REVOKED"

type PublicReceiptTokenRow = {
  id: string
  organizationId: string
  salesOrderId: string
  status: string
  expiresAt: Date
  revokedAt?: Date | null
}

type PublicReceiptTokenListRow = {
  id: string
  salesOrderId: string
  status: string
  issuedAt: Date
  expiresAt: Date
  lastAccessedAt: Date | null
  accessCount: number
  revokedAt: Date | null
  revocationReason: string | null
}

type PublicReceiptSaleSearchRow = {
  id: string
  orderNumber: string
  orderDate: Date
  total: unknown
  publicReceiptAccessTokens: Array<{
    status: string
    expiresAt: Date
    revokedAt: Date | null
  }>
}

export type PublicReceiptAccessTokenManagementItem = {
  id: string
  tokenIdSuffix: string
  salesOrderId: string
  status: string
  isActive: boolean
  issuedAt: string
  expiresAt: string
  lastAccessedAt: string | null
  accessCount: number
  revokedAt: string | null
  revocationReason: string | null
}

export type PublicReceiptSaleSearchItem = {
  salesOrderId: string
  orderNumber: string
  completedAt: string
  total: number
  tokenCount: number
  activeTokenCount: number
  revokedTokenCount: number
  expiredTokenCount: number
}

type PublicReceiptTokenRegistryClient = {
  salesOrder: {
    findMany(args: unknown): Promise<PublicReceiptSaleSearchRow[]>
  }
  publicReceiptAccessToken: {
    create(args: unknown): Promise<PublicReceiptTokenRow>
    findFirst(args: unknown): Promise<PublicReceiptTokenRow | null>
    findMany(args: unknown): Promise<PublicReceiptTokenListRow[]>
    update(args: unknown): Promise<PublicReceiptTokenRow>
  }
  auditLog: {
    create(args: unknown): Promise<unknown>
  }
}

type RegistryClientInput = PublicReceiptTokenRegistryClient | typeof db

export function hashPublicReceiptToken(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function registryClient(client: RegistryClientInput = db) {
  return client as unknown as PublicReceiptTokenRegistryClient
}

function hashPrefix(value: string) {
  return value.slice(0, 12)
}

function expiresAtFrom(now: Date, ttlSeconds: number) {
  return new Date(now.getTime() + ttlSeconds * 1000)
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (value && typeof value === "object") {
    const decimalLike = value as { toNumber?: () => number; toString?: () => string }
    if (typeof decimalLike.toNumber === "function") return decimalLike.toNumber()
    if (typeof decimalLike.toString === "function") return Number(decimalLike.toString()) || 0
  }
  return 0
}

async function writeTokenAudit(
  client: PublicReceiptTokenRegistryClient,
  input: {
    action: "PUBLIC_RECEIPT_TOKEN_ISSUED" | "PUBLIC_RECEIPT_TOKEN_ACCESSED" | "PUBLIC_RECEIPT_TOKEN_REVOKED"
    organizationId: string
    salesOrderId: string
    tokenId?: string
    tokenHash?: string
    jtiHash?: string
    userId?: string | null
    status: string
    expiresAt?: Date
    revokedAt?: Date | null
    revocationReason?: string | null
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "SalesOrder",
      entityId: input.salesOrderId,
      action: input.action,
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      changes: {
        tokenId: input.tokenId,
        salesOrderId: input.salesOrderId,
        organizationId: input.organizationId,
        tokenHashPrefix: input.tokenHash ? hashPrefix(input.tokenHash) : undefined,
        jtiHashPrefix: input.jtiHash ? hashPrefix(input.jtiHash) : undefined,
        status: input.status,
        expiresAt: input.expiresAt?.toISOString(),
        revokedAt: input.revokedAt?.toISOString(),
        revocationReason: input.revocationReason ?? undefined,
      },
    },
  })
}

export async function issuePublicReceiptAccessToken(input: {
  organizationId: string
  salesOrderId: string
  issuedById?: string | null
  now?: Date
  ttlSeconds?: number
  metadata?: Record<string, unknown>
}, clientInput: RegistryClientInput = db) {
  const now = input.now ?? new Date()
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const jti = randomUUID()
  const token = createPublicReceiptAccessToken({
    organizationId: input.organizationId,
    salesOrderId: input.salesOrderId,
    jti,
    now,
    ttlSeconds,
  })

  if (!token) {
    throw new BusinessRuleError("Receipt access token signing secret is not configured.")
  }

  const client = registryClient(clientInput)
  const tokenHash = hashPublicReceiptToken(token)
  const jtiHash = hashPublicReceiptToken(jti)
  const expiresAt = expiresAtFrom(now, ttlSeconds)

  const row = await client.publicReceiptAccessToken.create({
    data: {
      organizationId: input.organizationId,
      salesOrderId: input.salesOrderId,
      tokenHash,
      jtiHash,
      status: ACTIVE_STATUS,
      issuedById: input.issuedById ?? null,
      issuedAt: now,
      expiresAt,
      metadata: input.metadata,
    },
  })

  await writeTokenAudit(client, {
    action: "PUBLIC_RECEIPT_TOKEN_ISSUED",
    organizationId: input.organizationId,
    salesOrderId: input.salesOrderId,
    tokenId: row.id,
    tokenHash,
    jtiHash,
    userId: input.issuedById,
    status: ACTIVE_STATUS,
    expiresAt,
  })

  return { token, tokenHash, jtiHash, expiresAt, tokenId: row.id }
}

export async function assertPublicReceiptAccessToken(input: {
  salesOrderId: string
  token?: string | null
  now?: Date
}, clientInput: RegistryClientInput = db) {
  const now = input.now ?? new Date()
  const verification = verifyPublicReceiptAccessToken({
    token: input.token,
    salesOrderId: input.salesOrderId,
    now,
  })

  if (!verification.ok) {
    throw new NotFoundError("Receipt not found")
  }

  const payload = verification.payload
  if (!("organizationId" in payload) || !("jti" in payload)) {
    throw new NotFoundError("Receipt not found")
  }

  const client = registryClient(clientInput)
  const tokenHash = hashPublicReceiptToken(input.token ?? "")
  const jtiHash = hashPublicReceiptToken(payload.jti)
  const row = await client.publicReceiptAccessToken.findFirst({
    where: {
      organizationId: payload.organizationId,
      salesOrderId: payload.salesOrderId,
      tokenHash,
      jtiHash,
    },
  })

  if (
    !row ||
    row.status !== ACTIVE_STATUS ||
    row.revokedAt ||
    row.expiresAt.getTime() <= now.getTime()
  ) {
    throw new NotFoundError("Receipt not found")
  }

  await client.publicReceiptAccessToken.update({
    where: { id: row.id },
    data: {
      lastAccessedAt: now,
      accessCount: { increment: 1 },
    },
  })

  await writeTokenAudit(client, {
    action: "PUBLIC_RECEIPT_TOKEN_ACCESSED",
    organizationId: row.organizationId,
    salesOrderId: row.salesOrderId,
    tokenId: row.id,
    tokenHash,
    jtiHash,
    status: row.status,
    expiresAt: row.expiresAt,
  })

  return {
    organizationId: row.organizationId,
    salesOrderId: row.salesOrderId,
    tokenId: row.id,
  }
}

export async function listPublicReceiptAccessTokens(input: {
  organizationId: string
  salesOrderId: string
  now?: Date
  limit?: number
}, clientInput: RegistryClientInput = db): Promise<PublicReceiptAccessTokenManagementItem[]> {
  const now = input.now ?? new Date()
  const take = Math.min(Math.max(input.limit ?? 10, 1), 50)
  const client = registryClient(clientInput)
  const rows = await client.publicReceiptAccessToken.findMany({
    where: {
      organizationId: input.organizationId,
      salesOrderId: input.salesOrderId,
    },
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    take,
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

  return rows.map((row) => ({
    id: row.id,
    tokenIdSuffix: row.id.slice(-8),
    salesOrderId: row.salesOrderId,
    status: row.status,
    isActive: row.status === ACTIVE_STATUS && !row.revokedAt && row.expiresAt.getTime() > now.getTime(),
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    lastAccessedAt: row.lastAccessedAt?.toISOString() ?? null,
    accessCount: row.accessCount,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revocationReason: row.revocationReason,
  }))
}

export async function searchPublicReceiptSales(input: {
  organizationId: string
  query?: string | null
  now?: Date
  recentDays?: number
  limit?: number
}, clientInput: RegistryClientInput = db): Promise<PublicReceiptSaleSearchItem[]> {
  const now = input.now ?? new Date()
  const take = Math.min(Math.max(input.limit ?? 10, 1), 25)
  const recentDays = Math.min(Math.max(input.recentDays ?? 30, 1), 120)
  const query = input.query?.trim()
  const client = registryClient(clientInput)
  const rows = await client.salesOrder.findMany({
    where: {
      organizationId: input.organizationId,
      status: "COMPLETED",
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: "insensitive" } },
              { id: query },
            ],
          }
        : {
            orderDate: {
              gte: new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000),
              lte: now,
            },
          }),
    },
    orderBy: [{ orderDate: "desc" }, { id: "desc" }],
    take,
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

  return rows.map((row) => {
    const tokens = row.publicReceiptAccessTokens
    const activeTokenCount = tokens.filter(
      (token) => token.status === ACTIVE_STATUS && !token.revokedAt && token.expiresAt.getTime() > now.getTime(),
    ).length
    const revokedTokenCount = tokens.filter((token) => token.status === REVOKED_STATUS || token.revokedAt).length
    const expiredTokenCount = tokens.filter((token) => token.expiresAt.getTime() <= now.getTime()).length

    return {
      salesOrderId: row.id,
      orderNumber: row.orderNumber,
      completedAt: row.orderDate.toISOString(),
      total: toNumber(row.total),
      tokenCount: tokens.length,
      activeTokenCount,
      revokedTokenCount,
      expiredTokenCount,
    }
  })
}
export async function revokePublicReceiptAccessToken(input: {
  organizationId: string
  tokenId: string
  revokedById?: string | null
  reason?: string | null
  now?: Date
}, clientInput: RegistryClientInput = db) {
  const now = input.now ?? new Date()
  const client = registryClient(clientInput)
  const row = await client.publicReceiptAccessToken.update({
    where: {
      id: input.tokenId,
      organizationId: input.organizationId,
    },
    data: {
      status: REVOKED_STATUS,
      revokedAt: now,
      revokedById: input.revokedById ?? null,
      revocationReason: input.reason ?? null,
    },
  })

  await writeTokenAudit(client, {
    action: "PUBLIC_RECEIPT_TOKEN_REVOKED",
    organizationId: row.organizationId,
    salesOrderId: row.salesOrderId,
    tokenId: row.id,
    userId: input.revokedById,
    status: REVOKED_STATUS,
    revokedAt: now,
    revocationReason: input.reason,
  })

  return row
}
