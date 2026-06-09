"use server"

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
    console.error("Error fetching units:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    }
  }
}

export default getOrgUnits
