"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { resolveActionOrganization } from "@/services/_shared/resolve-action-organization"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { listUnits } from "@/services/unit/unit.service"
import type { UnitResponse } from "@/types/unit"

const getOrgUnits = async (orgId?: string | null): Promise<UnitResponse> => {
  try {
    const ctx = await requirePermission("inventory.units.read", { resource: "Unit" })
    const scopedOrgId = await resolveActionOrganization(orgId, "units")
    await observeModuleAccess({
      organizationId: scopedOrgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/units/getOrgUnits.ts",
      accessIntent: "read",
      mode: "observe",
    })
    const units = await listUnits(scopedOrgId)

    return {
      success: true,
      error: null,
      data: units,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching units",
        error,
        { action: "getOrgUnits" },
        "Failed to fetch units",
      ),
      data: [],
    }
  }
}

export default getOrgUnits
