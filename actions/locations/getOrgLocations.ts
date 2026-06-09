// In your server action file
"use server";
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
    console.error("Error fetching locations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}
