// In your server action file
"use server";
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses";
import { listLocations } from "@/services/location/location.service";
import { resolveActionOrganization } from "@/services/_shared/resolve-action-organization";
import { LocationResponse } from "@/types/location";

export const getOrgLocations = async (orgId?: string | null): Promise<LocationResponse> => {
  try {
    const scopedOrgId = await resolveActionOrganization(orgId, "locations");
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
