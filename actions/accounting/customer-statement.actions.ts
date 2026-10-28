"use server"

import {
  createCustomerStatementSnapshot,
  type CustomerStatementSnapshotResult,
} from "@/services/accounting/customer-statement.service"
import {
  queueCustomerStatementDelivery,
  type CustomerStatementDeliveryResult,
} from "@/services/accounting/customer-statement-delivery.service"
import {
  createCustomerStatementInputSchema,
  queueCustomerStatementDeliveryInputSchema,
  revokeCustomerStatementAccessInputSchema,
} from "@/services/accounting/customer-statement.schemas"
import { revokeCustomerStatementAccessToken } from "@/services/accounting/customer-statement-access.service"
import { protect } from "@/services/_shared/protect"

const createStatement = protect<unknown, CustomerStatementSnapshotResult>(
  {
    permission: "accounting.exports.create",
    auditResource: "CustomerStatementSnapshot",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "accounting",
      surface: "actions/accounting/customer-statement.actions.ts:create",
      surfaceType: "action",
      accessIntent: "export",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = createCustomerStatementInputSchema.parse(input)
    return createCustomerStatementSnapshot({
      ...parsed,
      organizationId: ctx.orgId,
      generatedById: ctx.userId,
    })
  },
)

export async function createCustomerStatementAction(input: unknown) {
  return createStatement(input)
}

const queueDelivery = protect<unknown, CustomerStatementDeliveryResult>(
  {
    permission: "accounting.exports.create",
    auditResource: "CustomerStatementDelivery",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "accounting",
      surface: "actions/accounting/customer-statement.actions.ts:deliver",
      surfaceType: "action",
      accessIntent: "export",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = queueCustomerStatementDeliveryInputSchema.parse(input)
    return queueCustomerStatementDelivery({
      ...parsed,
      organizationId: ctx.orgId,
      issuedById: ctx.userId,
    })
  },
)

export async function queueCustomerStatementDeliveryAction(input: unknown) {
  return queueDelivery(input)
}

const revokeAccess = protect<unknown, {
  tokenId: string
  status: string
  replayed: boolean
}>(
  {
    permission: "accounting.exports.create",
    auditResource: "CustomerStatementAccessToken",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "accounting",
      surface: "actions/accounting/customer-statement.actions.ts:revoke",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = revokeCustomerStatementAccessInputSchema.parse(input)
    const result = await revokeCustomerStatementAccessToken({
      organizationId: ctx.orgId,
      tokenId: parsed.tokenId,
      revokedById: ctx.userId,
      reason: parsed.reason,
    })
    return {
      tokenId: result.token.id,
      status: result.token.status,
      replayed: result.replayed,
    }
  },
)

export async function revokeCustomerStatementAccessAction(input: unknown) {
  return revokeAccess(input)
}
