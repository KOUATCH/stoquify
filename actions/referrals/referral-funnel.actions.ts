"use server"

import {
  assertCanUseOrganization,
  requirePermission,
} from "@/lib/security/rbac"
import { getReferralFunnelReadModel } from "@/services/referrals/referral-funnel-read-model.service"

export async function getReferralFunnelAction(
  requestedOrganizationId?: string | null,
) {
  const requestedOrgId = requestedOrganizationId?.trim() || undefined
  const ctx = await requirePermission("analytics.read", {
    resource: "ReferralFunnel",
    resourceId: requestedOrgId,
  })
  const organizationId = requestedOrgId ?? ctx.orgId

  await assertCanUseOrganization(ctx, organizationId)

  return getReferralFunnelReadModel(organizationId)
}
