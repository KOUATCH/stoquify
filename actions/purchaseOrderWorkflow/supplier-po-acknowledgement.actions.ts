"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  issueSupplierPoInviteInputSchema,
  reviewSupplierPoProposalInputSchema,
  revokeSupplierPoInviteInputSchema,
} from "@/services/purchase-order/supplier-po-acknowledgement.schemas"
import {
  issueSupplierPoInvite,
  reviewSupplierPoProposal,
  revokeSupplierPoInvite,
} from "@/services/purchase-order/supplier-po-acknowledgement.service"

function inviteUrl(input: {
  envelopeId: string
  token: string
  preferredLocale: string
}) {
  const locale = input.preferredLocale === "FR" ? "fr" : "en"
  const path =
    "/" + locale + "/supplier-purchase-order/" +
    encodeURIComponent(input.envelopeId)
  const query = "?token=" + encodeURIComponent(input.token)
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "")
  return baseUrl ? baseUrl + path + query : path + query
}

const issueInvite = protect<unknown, {
  tokenId: string
  envelopeId: string
  purchaseOrderId: string
  expiresAt: string
  inviteUrl: string
  replayed: boolean
}>(
  {
    permission: "purchases.orders.update",
    auditResource: "SupplierPoAccessToken",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "purchasing",
      surface:
        "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:issue",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = issueSupplierPoInviteInputSchema.parse(input)
    const result = await issueSupplierPoInvite({
      ...parsed,
      organizationId: ctx.orgId,
      issuedById: ctx.userId,
    })
    revalidatePath(
      "/[locale]/dashboard/purchase-orders/[id]/supplier-acknowledgement",
      "page",
    )
    return {
      tokenId: result.tokenId,
      envelopeId: result.envelopeId,
      purchaseOrderId: result.purchaseOrderId,
      expiresAt: result.expiresAt,
      inviteUrl: inviteUrl(result),
      replayed: result.replayed,
    }
  },
)

export async function issueSupplierPoInviteAction(input: unknown) {
  return issueInvite(input)
}

const revokeInvite = protect<unknown, {
  tokenId: string
  status: string
  replayed: boolean
}>(
  {
    permission: "purchases.orders.update",
    auditResource: "SupplierPoAccessToken",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "purchasing",
      surface:
        "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:revoke",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = revokeSupplierPoInviteInputSchema.parse(input)
    const result = await revokeSupplierPoInvite({
      organizationId: ctx.orgId,
      tokenId: parsed.tokenId,
      revokedById: ctx.userId,
      reason: parsed.reason,
    })
    revalidatePath(
      "/[locale]/dashboard/purchase-orders/[id]/supplier-acknowledgement",
      "page",
    )
    return result
  },
)

export async function revokeSupplierPoInviteAction(input: unknown) {
  return revokeInvite(input)
}

const reviewProposal = protect<unknown, Awaited<
  ReturnType<typeof reviewSupplierPoProposal>
>>(
  {
    permission: "purchases.orders.update",
    auditResource: "SupplierPoProposal",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "purchasing",
      surface:
        "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:review",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = reviewSupplierPoProposalInputSchema.parse(input)
    const result = await reviewSupplierPoProposal({
      ...parsed,
      organizationId: ctx.orgId,
      reviewedById: ctx.userId,
    })
    revalidatePath(
      "/[locale]/dashboard/purchase-orders/[id]/supplier-acknowledgement",
      "page",
    )
    return result
  },
)

export async function reviewSupplierPoProposalAction(input: unknown) {
  return reviewProposal(input)
}
