// In your server action file
"use server";
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses";
import { requirePermission } from "@/lib/security/rbac";
import { listLocations } from "@/services/location/location.service";
import { resolveActionOrganization } from "@/services/_shared/resolve-action-organization";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { LocationResponse } from "@/types/location";

export const getOrgLocations = async (orgId?: string | null): Promise<LocationResponse> => {
  try {
    const ctx = await requirePermission("locations.read", { resource: "Location" });
    const scopedOrgId = await resolveActionOrganization(orgId, "locations");
    await observeModuleAccess({
      organizationId: scopedOrgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/getOrgLocations.ts",
      accessIntent: "read",
      mode: "observe",
    });
    const locations = await listLocations(scopedOrgId);
    
    return {
      success: true,
      error: null,
      data: locations,
    };  
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching locations",
        error,
        { action: "getOrgLocations" },
        "Failed to fetch locations",
      ),
      data: [],
    };
  }
}
