"use server"

import { revalidatePath } from "next/cache"
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
    console.error("Error deleting unit:", error)
    return {
      error: error instanceof Error ? error.message : "Something went wrong, please try again",
      success: false,
      data: null,
    }
  }
}

export default deleteUnit
