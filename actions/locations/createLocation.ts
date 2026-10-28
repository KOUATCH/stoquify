"use server";

import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { requirePermission } from "@/lib/security/rbac";
import { createLocationForManagement } from "@/services/location/location.service";
import { LocationManagementSchema, type LocationManagementInput } from "@/services/location/location.schemas";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { revalidatePath } from "next/cache";

type CreateLocationData = Omit<LocationManagementInput, "type"> & {
  type?: string | null;
};

const createLocation = async (data: CreateLocationData) => {
  try {
    const ctx = await requirePermission("locations.create", {
      resource: "Location",
      auditAllowed: true,
    });

    const parsed = LocationManagementSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid location input",
        data: null,
      };
    }

    const newLocation = await createLocationForManagement(ctx.orgId, parsed.data);

    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/createLocation.ts",
      accessIntent: "write",
      mode: "observe",
    });

    revalidatePath("/dashboard/settings/locations");
    revalidatePath("/[locale]/dashboard/settings/locations", "page");

    return {
      success: true,
      error: null,
      data: newLocation,
    };
  } catch (error) {
    return safeSuccessActionErrorResult(error, { action: "createLocation" }, "Failed to create location. Please try again.");
  }
};

export default createLocation;
