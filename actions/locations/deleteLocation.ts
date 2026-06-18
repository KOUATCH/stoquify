

"use server";

import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { archiveLocationForManagement } from "@/services/location/location.service"


const deleteLocation = async (id: string) => {

  try {
      const ctx = await requirePermission("locations.delete", {
        resource: "Location",
        resourceId: id,
        auditAllowed: true,
      })
      const archivedLocation = await archiveLocationForManagement(ctx.orgId, id)

      return {
        success: true,
        error: null,
        data: archivedLocation
      };

  } catch (error) {
    return safeSuccessActionErrorResult(error, { action: "deleteLocation" }, "Something went wrong, Please try again");
  }
}
export default deleteLocation
