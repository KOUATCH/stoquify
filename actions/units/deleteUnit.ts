"use server"

import { revalidatePath } from "next/cache"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { getAuthenticatedUser } from "@/config/useAuth"
import { removeUnitForManagement } from "@/services/unit/unit.service"

export const deleteUnit = async (id: string) => {
  try {
    const user = await getAuthenticatedUser()

    if (!user?.organizationId) {
      return {
        error: "Organization is required",
        success: false,
        data: null,
      }
    }

    const result = await removeUnitForManagement(user.organizationId, id)

    revalidatePath("/dashboard/inventory/units")
    revalidatePath("/[locale]/dashboard/inventory/units", "page")

    return {
      success: true,
      error: null,
      data: result,
    }
  } catch (error) {
    return safeSuccessActionErrorResult(error, { action: "deleteUnit" }, "Something went wrong, please try again")
  }
}

export default deleteUnit
