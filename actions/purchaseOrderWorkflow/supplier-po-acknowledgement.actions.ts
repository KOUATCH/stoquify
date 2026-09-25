"use server"

import { revalidatePath } from "next/cache"

import { RbacError } from "@/lib/security/rbac"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import {
  issueSupplierPoInviteInputSchema,
  reviewSupplierPoProposalInputSchema,
  revokeSupplierPoInviteInputSchema,
} from "@/services/purchase-order/supplier-po-acknowledgement.schemas"
import {
  issueSupplierPoInvite,
  reviewSupplierPoProposal,
  revokeSupplierPoInvite,
  getSupplierPoAcknowledgementWorkbench,
} from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { supplierPoWorkbenchInputSchema } from "@/services/purchase-order/supplier-po-buyer-contracts"

function currentSession(ctx: ProtectedActionContext) {
  if (!ctx.freshAuth || ctx.freshAuth.claims.userId !== ctx.userId || ctx.freshAuth.claims.tenantId !== ctx.orgId) throw new RbacError("Current buyer authentication is required", "FORBIDDEN", 403)
  return ctx.freshAuth.claims.sessionId
}

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
  requestReference: string
  correlationReference: string
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
      sessionId: currentSession(ctx),
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
      requestReference: result.requestReference,
      correlationReference: result.correlationReference,
    }
  },
)

export async function issueSupplierPoInviteAction(input: unknown) {
  return issueInvite(input)
}

const revokeInvite = protect<unknown, Awaited<ReturnType<typeof revokeSupplierPoInvite>>>(
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
      ...parsed,
      organizationId: ctx.orgId,
      revokedById: ctx.userId,
      sessionId: currentSession(ctx),
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
      sessionId: currentSession(ctx),
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

const readWorkbench = protect<unknown, Awaited<ReturnType<typeof getSupplierPoAcknowledgementWorkbench>>>({
  permission: "purchases.orders.read", auditResource: "SupplierPoEnvelope", auditAllowed: true,
  module: { moduleSlug: "purchasing", surface: "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:read", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: true },
}, async (input, ctx) => getSupplierPoAcknowledgementWorkbench({ ...supplierPoWorkbenchInputSchema.parse(input), organizationId: ctx.orgId, actorId: ctx.userId }))

export async function getSupplierPoAcknowledgementWorkbenchAction(input: unknown) { return readWorkbench(input) }
