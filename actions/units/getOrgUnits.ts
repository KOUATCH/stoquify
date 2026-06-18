"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { resolveActionOrganization } from "@/services/_shared/resolve-action-organization"
import { listUnits } from "@/services/unit/unit.service"
import type { UnitResponse } from "@/types/unit"

const getOrgUnits = async (orgId?: string | null): Promise<UnitResponse> => {
  try {
    const scopedOrgId = await resolveActionOrganization(orgId, "units")
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
