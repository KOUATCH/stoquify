"use server"

import { revalidatePath } from "next/cache"

import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { collectCustomerSettlementWithControls } from "@/services/accounting/customer-settlement.service"
import {
  reverseCustomerSettlementWithControls,
  type CustomerSettlementReversalControlContext,
} from "@/services/accounting/customer-settlement-reversal.service"
import {
  collectCustomerSettlementInputSchema,
  reverseCustomerSettlementInputSchema,
} from "@/services/accounting/customer-settlement.schemas"
import {
  customerSettlementWorkbenchInputSchema,
  getCustomerSettlementWorkbench,
  type CustomerSettlementWorkbench,
} from "@/services/accounting/customer-settlement-workbench.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

type CustomerSettlementReversalResult = Awaited<
  ReturnType<typeof reverseCustomerSettlementWithControls>
>

type VerifiedFreshAuthEvidence = NonNullable<
  CustomerSettlementReversalControlContext["freshAuth"]
>

const readWorkbench = protect<unknown, CustomerSettlementWorkbench>(
  {
    permission: "finance.receivables.read",
    auditResource: "CustomerSettlement",
    module: {
      moduleSlug: "finance",
      surface: "actions/finance/customer-settlement.actions.ts:getCustomerSettlementWorkbenchAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = customerSettlementWorkbenchInputSchema.parse(input)
    const result = await getCustomerSettlementWorkbench(parsed, {
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      permissions: ctx.permissions,
    })
    const current = await requirePermission("finance.receivables.read", { resource: "CustomerSettlement" })
    if (current.orgId !== ctx.orgId || current.userId !== ctx.userId) {
      throw new ForbiddenError("Customer settlement workspace changed. Refresh the workspace.")
    }
    const decision = await observeModuleAccess({
      organizationId: current.orgId,
      userId: current.userId,
      actorPermissions: current.permissions,
      moduleSlug: "finance",
      surface: "actions/finance/customer-settlement.actions.ts:getCustomerSettlementWorkbenchAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    })
    if (!decision.allowed) throw new ForbiddenError("Finance module is not available.")
    return {
      ...result,
      canCollect: result.canCollect && hasRbacPermission(current.permissions, "finance.receivables.collect"),
      providerReceipts: result.canCollect && hasRbacPermission(current.permissions, "finance.receivables.collect") ? result.providerReceipts : [],
      settlements: result.settlements.map(settlement => ({
        ...settlement,
        canReverse: settlement.canReverse && hasRbacPermission(current.permissions, "finance.receivables.reverse"),
      })),
    }
  },
)

type CollectionReceipt = {
  settlementId: string
  settlementNumber: string
  status: string
  journalEntryId: string
  replayed: boolean
}

const collectSettlement = protect<unknown, CollectionReceipt>(
  {
    permission: "finance.receivables.collect",
    auditResource: "CustomerSettlement",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "finance",
      surface: "actions/finance/customer-settlement.actions.ts:collectCustomerSettlementAction",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const freshAuth = verifiedFreshAuthEvidence(ctx)
    const parsed = collectCustomerSettlementInputSchema.parse(input)
    const result = await collectCustomerSettlementWithControls(parsed, {
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: freshAuth.lastAuthAt,
    })
    revalidateSettlementSurfaces()
    return {
      settlementId: result.settlementId,
      settlementNumber: result.settlement.settlementNumber,
      status: result.settlement.status,
      journalEntryId: result.journalEntryId,
      replayed: result.replayed,
    }
  },
)

export async function getCustomerSettlementWorkbenchAction(input: unknown) {
  return readWorkbench(input)
}

export async function collectCustomerSettlementAction(input: unknown) {
  return collectSettlement(input)
}

const reverseSettlement = protect<unknown, CustomerSettlementReversalResult>(
  {
    permission: "finance.receivables.reverse",
    auditResource: "CustomerSettlement",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "finance",
      surface:
        "actions/finance/customer-settlement.actions.ts:reverseCustomerSettlementAction",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const freshAuth = verifiedFreshAuthEvidence(ctx)
    const parsed = reverseCustomerSettlementInputSchema.parse(input)
    const result = await reverseCustomerSettlementWithControls(parsed, {
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      freshAuth,
    })

    revalidateSettlementSurfaces()
    return result
  },
)

export async function reverseCustomerSettlementAction(input: unknown) {
  return reverseSettlement(input)
}

function revalidateSettlementSurfaces() {
  revalidatePath("/[locale]/dashboard/finance/receivables", "page")
  revalidatePath("/[locale]/dashboard/finance/receivables/history", "page")
  revalidatePath("/[locale]/dashboard/accounting", "layout")
}

function verifiedFreshAuthEvidence(
  ctx: ProtectedActionContext,
): VerifiedFreshAuthEvidence {
  const freshAuth = ctx.freshAuth
  const lastAuthAtMs =
    freshAuth?.lastAuthAt instanceof Date
      ? freshAuth.lastAuthAt.getTime()
      : Number.NaN

  if (
    !freshAuth ||
    !Number.isFinite(lastAuthAtMs) ||
    freshAuth.claims.userId !== ctx.userId ||
    freshAuth.claims.tenantId !== ctx.orgId ||
    freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
    !Number.isFinite(freshAuth.claims.assuranceLevel) ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== lastAuthAtMs
  ) {
    throw new FreshAuthRequiredError()
  }

  return {
    lastAuthAt: new Date(lastAuthAtMs),
    claims: {
      userId: freshAuth.claims.userId,
      tenantId: freshAuth.claims.tenantId,
      assuranceOrganizationId: freshAuth.claims.assuranceOrganizationId,
      assuranceLevel: freshAuth.claims.assuranceLevel,
      lastAuthAt: freshAuth.claims.lastAuthAt,
    },
  }
}
