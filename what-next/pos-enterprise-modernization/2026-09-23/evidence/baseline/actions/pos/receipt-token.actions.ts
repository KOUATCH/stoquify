"use server"

import { revalidateTag } from "next/cache"

import { protect } from "@/services/_shared/protect"
import { posReadResult, type POSReadSuccess } from "@/services/pos/pos-read-result"
import {
  listPublicReceiptAccessTokens,
  revokePublicReceiptAccessToken,
  searchPublicReceiptSales,
  type PublicReceiptAccessTokenManagementItem,
  type PublicReceiptSaleSearchItem,
} from "@/services/pos/public-receipt-token-registry.service"
import {
  listPublicReceiptAccessTokensActionSchema,
  revokePublicReceiptAccessTokenActionSchema,
  searchPublicReceiptSalesActionSchema,
} from "@/services/pos/pos.schemas"

function revalidateReceiptTokenSurfaces(salesOrderId?: string | null) {
  revalidateTag("pos-receipts")

  if (salesOrderId) {
    revalidateTag(`pos-receipt-${salesOrderId}`)
  }
}

export type PublicReceiptTokenManagementCapability = {
  canManageReceiptTokens: true
  moduleSlug: "pos"
  permission: "pos.receipts.revoke"
}

const readReceiptTokenManagementCapability = protect<unknown, POSReadSuccess<PublicReceiptTokenManagementCapability>>(
  {
    permission: "pos.receipts.revoke",
    auditResource: "PublicReceiptAccessToken",
    auditAllowed: true,
    module: {
      moduleSlug: "pos",
      surface: "actions/pos/receipt-token.actions.ts:getPublicReceiptTokenManagementCapabilityAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (_input, ctx) => posReadResult({
    canManageReceiptTokens: true,
    moduleSlug: "pos",
    permission: "pos.receipts.revoke",
  }, ctx),
)

const listReceiptTokens = protect<unknown, POSReadSuccess<PublicReceiptAccessTokenManagementItem[]>>(
  {
    permission: "pos.receipts.revoke",
    auditResource: "PublicReceiptAccessToken",
    auditAllowed: true,
    module: {
      moduleSlug: "pos",
      surface: "actions/pos/receipt-token.actions.ts:getPublicReceiptAccessTokensAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = listPublicReceiptAccessTokensActionSchema.parse(input)

    return posReadResult(await listPublicReceiptAccessTokens({
      organizationId: ctx.orgId,
      salesOrderId: parsed.salesOrderId,
    }), ctx)
  },
)
const searchReceiptSales = protect<unknown, POSReadSuccess<PublicReceiptSaleSearchItem[]>>(
  {
    permission: "pos.receipts.revoke",
    auditResource: "PublicReceiptAccessToken",
    auditAllowed: true,
    module: {
      moduleSlug: "pos",
      surface: "actions/pos/receipt-token.actions.ts:searchPublicReceiptSalesAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = searchPublicReceiptSalesActionSchema.parse(input)

    return posReadResult(await searchPublicReceiptSales({
      organizationId: ctx.orgId,
      query: parsed.query,
      limit: parsed.limit,
      recentDays: parsed.recentDays,
    }), ctx)
  },
)

const revokeReceiptToken = protect<
  unknown,
  {
    tokenId: string
    salesOrderId: string
    status: string
    revokedAt: string | null
  }
>(
  {
    permission: "pos.receipts.revoke",
    auditResource: "PublicReceiptAccessToken",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "pos",
      surface: "actions/pos/receipt-token.actions.ts:revokePublicReceiptAccessTokenAction",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = revokePublicReceiptAccessTokenActionSchema.parse(input)
    const revoked = await revokePublicReceiptAccessToken({
      organizationId: ctx.orgId,
      tokenId: parsed.tokenId,
      revokedById: ctx.userId,
      reason: parsed.reason ?? null,
    })

    revalidateReceiptTokenSurfaces(parsed.salesOrderId ?? revoked.salesOrderId)

    return {
      tokenId: revoked.id,
      salesOrderId: revoked.salesOrderId,
      status: revoked.status,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    }
  },
)

export async function getPublicReceiptAccessTokensAction(input: unknown) {
  const result = await listReceiptTokens(input)
  return result.success ? { ...result, data: result.data.data, scope: result.data.scope } : result
}

export async function searchPublicReceiptSalesAction(input: unknown) {
  const result = await searchReceiptSales(input)
  return result.success ? { ...result, data: result.data.data, scope: result.data.scope } : result
}

export async function getPublicReceiptTokenManagementCapabilityAction(input: unknown) {
  const result = await readReceiptTokenManagementCapability(input)
  return result.success ? { ...result, data: result.data.data, scope: result.data.scope } : result
}

export async function revokePublicReceiptAccessTokenAction(input: unknown) {
  return revokeReceiptToken(input)
}
