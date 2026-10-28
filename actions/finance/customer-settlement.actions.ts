"use server"

import { revalidatePath } from "next/cache"

import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import {
  reverseCustomerSettlementWithControls,
  type CustomerSettlementReversalControlContext,
} from "@/services/accounting/customer-settlement-reversal.service"
import { reverseCustomerSettlementInputSchema } from "@/services/accounting/customer-settlement.schemas"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"

type CustomerSettlementReversalResult = Awaited<
  ReturnType<typeof reverseCustomerSettlementWithControls>
>

type VerifiedFreshAuthEvidence = NonNullable<
  CustomerSettlementReversalControlContext["freshAuth"]
>

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

    revalidatePath("/dashboard/finance/receivables", "page")
    revalidatePath("/dashboard/accounting", "page")
    return result
  },
)

export async function reverseCustomerSettlementAction(input: unknown) {
  return reverseSettlement(input)
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
