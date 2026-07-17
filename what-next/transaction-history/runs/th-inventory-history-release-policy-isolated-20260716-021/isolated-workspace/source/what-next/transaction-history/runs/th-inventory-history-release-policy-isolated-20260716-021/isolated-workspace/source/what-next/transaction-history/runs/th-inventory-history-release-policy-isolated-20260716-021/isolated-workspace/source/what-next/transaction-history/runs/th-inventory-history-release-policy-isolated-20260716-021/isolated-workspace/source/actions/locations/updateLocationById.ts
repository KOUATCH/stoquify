"use server";

import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { requirePermission } from "@/lib/security/rbac";
import { updateLegacyLocationByIdForOrg } from "@/services/location/location.service";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { LocationDTO } from "@/types/location";
import { revalidatePath } from "next/cache";

const updateLocationById = async (id: string, data: LocationDTO) => {
  try {
    const ctx = await requirePermission("locations.update", {
      resource: "Location",
      resourceId: id,
      auditAllowed: true,
    });
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/updateLocationById.ts",
      accessIntent: "write",
      mode: "observe",
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
