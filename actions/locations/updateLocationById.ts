"use server";

import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { requirePermission } from "@/lib/security/rbac";
import { updateLegacyLocationByIdForOrg } from "@/services/location/location.service";
import { LocationDTO } from "@/types/location";
import { revalidatePath } from "next/cache";

const updateLocationById = async (id: string, data: LocationDTO) => {
  try {
    const ctx = await requirePermission("locations.update", {
      resource: "Location",
      resourceId: id,
      auditAllowed: true,
    });
    const updatedLocation = await updateLegacyLocationByIdForOrg(ctx.orgId, id, data);
    revalidatePath("/inventory/locations");

    return {
      data: updatedLocation,
      success: true,
      error: null,
    }
    } catch (error) {
      return safeSuccessActionErrorResult(error, { action: "updateLocationById" }, "Failed to update location");
    }
  }

export default updateLocationById
