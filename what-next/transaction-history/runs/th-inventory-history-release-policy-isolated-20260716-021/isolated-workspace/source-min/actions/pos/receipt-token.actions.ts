"use server"

import { revalidateTag } from "next/cache"

import { protect } from "@/services/_shared/protect"
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

const readReceiptTokenManagementCapability = protect<unknown, PublicReceiptTokenManagementCapability>(
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
  async () => ({
    canManageReceiptTokens: true,
    moduleSlug: "pos",
    permission: "pos.receipts.revoke",
  }),
)

const listReceiptTokens = protect<unknown, PublicReceiptAccessTokenManagementItem[]>(
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

    return listPublicReceiptAccessTokens({
      organizationId: ctx.orgId,
      salesOrderId: parsed.salesOrderId,
    })
  },
)
const searchReceiptSales = protect<unknown, PublicReceiptSaleSearchItem[]>(
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

    return searchPublicReceiptSales({
      organizationId: ctx.orgId,
      query: parsed.query,
      limit: parsed.limit,
      recentDays: parsed.recentDays,
    })
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
  return listReceiptTokens(input)
}

export async function searchPublicReceiptSalesAction(input: unknown) {
  return searchReceiptSales(input)
}

export async function getPublicReceiptTokenManagementCapabilityAction(input: unknown) {
  return readReceiptTokenManagementCapability(input)
}

export async function revokePublicReceiptAccessTokenAction(input: unknown) {
  return revokeReceiptToken(input)
}
