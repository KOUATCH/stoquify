"use server"

import { revalidatePOSAfterCommit } from "./cache-revalidation"
import { preparePOSCheckout } from "@/services/pos/checkout.service"
import { checkoutLeaseSchema } from "@/services/pos/pos.schemas"
import { protect } from "@/services/_shared/protect"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError } from "@/services/_shared/action-errors"
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

  revalidatePOSAfterCommit({ tags })
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
    const parsed = commitSaleSchema.merge(checkoutLeaseSchema).parse(input)
    const { claims } = await requireSession()
    if (claims.userId !== ctx.userId || claims.tenantId !== ctx.orgId) throw new ForbiddenError("Current POS session is required.")
    await preparePOSCheckout({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })
    const sale = await commitPOSSale({
      ...parsed,
      organizationId: ctx.orgId,
      userId: ctx.userId,
    }, { sessionId: claims.sessionId, sessionToken: claims.sessionToken })

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
    if (!ctx.freshAuth) throw new ForbiddenError("Fresh authentication is required.")
    const refund = await refundPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId }, { sessionId: ctx.freshAuth.claims.sessionId, sessionToken: ctx.freshAuth.claims.sessionToken })

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
    if (!ctx.freshAuth) throw new ForbiddenError("Fresh authentication is required.")
    const voided = await voidPOSSale({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId }, { sessionId: ctx.freshAuth.claims.sessionId, sessionToken: ctx.freshAuth.claims.sessionToken })

    revalidatePOSSaleTags(parsed)
    return voided
  },
)
