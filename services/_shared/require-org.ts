import { getAuthenticatedUser, type AuthenticatedUser } from "@/config/useAuth"

export type AuthedContext = {
  user: AuthenticatedUser
  userId: string
  orgId: string
}

/**
 * Resolves the current session and asserts the user belongs to an organization.
 * Use at the top of every tenant-scoped server action.
 *
 * Throws if there is no session or the user has no organizationId. The thrown
 * error is meant to be caught by the action's outer try/catch and returned via
 * `err()`. For redirects on missing session, call `getAuthenticatedUser()` first.
 */
export async function requireOrg(): Promise<AuthedContext> {
  const user = await getAuthenticatedUser()
  if (!user?.organizationId) {
    throw new Error("Unauthorized: no active organization")
  }
  return { user, userId: user.id, orgId: user.organizationId }
}
