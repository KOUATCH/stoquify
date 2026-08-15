"use server"

import { revalidateTag } from "next/cache"
import { logger } from "@/lib/logger"
import { protect } from "@/services/_shared/protect"
import { commitPOSSale, refundPOSSale, voidPOSSale } from "@/services/pos/pos.service"
import {
  commitSaleSchema,
  refundPOSSaleSchema,
  voidPOSSaleSchema,
} from "@/services/pos/pos.schemas"

const POS_TENDER_ACTION_MODULE = {
  moduleSlug: "pos" as const,
  surfaceType: "action" as const,
  accessIntent: "write" as const,
  mode: "enforce" as const,
  audit: true,
}

function revalidatePOSSaleTags(input: { locationId: string; terminalId: string }) {
  const tags = [
    "pos-cart",
    "pos-sessions",
    `pos-stock-${input.locationId}`,
    `pos-terminal-${input.terminalId}`,
    "finance-dashboard",
    "customer-ar",
  ]

  for (const tag of tags) {
    try {
      revalidateTag(tag)
    } catch (error) {
      logger.warn("POS sale cache revalidation failed after a committed operation", {
        tag,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
}

export const commitPOSSaleAction = protect(
  {
    permission: "pos.use",
    auditResource: "POSSale",
    auditAllowed: true,
    module: {
      ...POS_TENDER_ACTION_MODULE,
      surface: "actions/pos/tender.actions.ts:commitPOSSaleAction",
    },
  },
  async (input: unknown, ctx) => {
    const parsed = commitSaleSchema.parse(input)
    const sale = await commitPOSSale({
      ...parsed,
      organizationId: ctx.orgId,
      userId: ctx.userId,
    })

    revalidatePOSSaleTags(parsed)
    return sale
  },
)

export const refundPOSSaleAction = protect(
  {
    permission: "pos.transactions.refund",
    auditResource: "POSSaleRefund",
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      ...POS_TENDER_ACTION_MODULE,
      surface: "actions/pos/tender.actions.ts:refundPOSSaleAction",
    },
  },
  async (input: unknown, ctx) => {
    const parsed = refundPOSSaleSchema.parse(input)
    const refund = await refundPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })

    revalidatePOSSaleTags(parsed)
    return refund
  },
)

export const voidPOSSaleAction = protect(
  {
    permission: "pos.transactions.void",
    auditResource: "POSSaleVoid",
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      ...POS_TENDER_ACTION_MODULE,
      surface: "actions/pos/tender.actions.ts:voidPOSSaleAction",
    },
  },
  async (input: unknown, ctx) => {
    const parsed = voidPOSSaleSchema.parse(input)
    const voided = await voidPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })

    revalidatePOSSaleTags(parsed)
    return voided
  },
)
