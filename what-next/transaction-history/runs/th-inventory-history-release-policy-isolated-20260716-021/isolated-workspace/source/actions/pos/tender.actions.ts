"use server"

import { revalidateTag } from "next/cache"
import { protect } from "@/services/_shared/protect"
import { commitPOSSale, refundPOSSale, voidPOSSale } from "@/services/pos/pos.service"
import { commitSaleSchema, refundPOSSaleSchema, voidPOSSaleSchema } from "@/services/pos/pos.schemas"

function revalidatePOSSaleTags(input: { locationId: string; terminalId: string }) {
  revalidateTag("pos-cart")
  revalidateTag("pos-sessions")
  revalidateTag(`pos-stock-${input.locationId}`)
  revalidateTag(`pos-terminal-${input.terminalId}`)
  revalidateTag("finance-dashboard")
  revalidateTag("customer-ar")
}

export const commitPOSSaleAction = protect(
  { permission: "pos.use", auditResource: "POSSale", auditAllowed: true },
  async (input: unknown, ctx) => {
    const parsed = commitSaleSchema.parse(input)
    const sale = await commitPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })

    revalidatePOSSaleTags(parsed)
    return sale
  },
)

export const refundPOSSaleAction = protect(
  {
    permission: "pos.transactions.refund",
    auditResource: "POSSaleRefund",
    freshAuth: { maxAgeSeconds: 300 },
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
  },
  async (input: unknown, ctx) => {
    const parsed = voidPOSSaleSchema.parse(input)
    const voided = await voidPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })

    revalidatePOSSaleTags(parsed)
    return voided
  },
)
