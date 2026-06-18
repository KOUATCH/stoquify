"use server"

import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { createOrganizationOwner } from "@/services/users/user-identity.service"
import type { OrgDataProps, UserProps } from "@/types/types"

/**
 * Creates a new user with organization and default admin role
 */
const createUser = async (data: UserProps, orgData: OrgDataProps) => {
  try {
    return await createOrganizationOwner(data, orgData)
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.create",
      component: "User",
    }, "Something went wrong. Please try again.")
  }
}

export default createUser
