"use server";

import { getAuthenticatedUser } from "@/config/useAuth";
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { createLocationForManagement } from "@/services/location/location.service";
import { LocationManagementSchema, type LocationManagementInput } from "@/services/location/location.schemas";
import { revalidatePath } from "next/cache";

type CreateLocationData = Omit<LocationManagementInput, "type"> & {
  type?: string | null;
};

const createLocation = async (data: CreateLocationData) => {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.organizationId) {
      return {
        error: "Authentication required or organization not found for user.",
        success: false,
        data: null,
      };
    }

    const parsed = LocationManagementSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid location input",
        data: null,
      };
    }

    const newLocation = await createLocationForManagement(user.organizationId, parsed.data);

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
