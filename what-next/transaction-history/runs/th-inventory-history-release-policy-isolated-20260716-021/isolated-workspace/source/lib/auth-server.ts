import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { localizedRedirect } from "@/i18n/server-routing"
import {
  RbacError,
  requirePermission,
  requireRbacContext,
  getOptionalRbacContext,
} from "@/lib/security/rbac"

async function redirectTo(path: string): Promise<never> {
  await localizedRedirect(path)
  throw new Error(`Redirected to ${path}`)
}

// Raw BetterAuth session (null when not authenticated)
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

// Authenticated user with roles + permissions fetched fresh from DB.
// Redirects to localized recovery/auth routes if preconditions fail.
export async function getAuthenticatedUser() {
  try {
    return (await requireRbacContext()).user
  } catch (error) {
    if (error instanceof RbacError && error.code === "NO_ACTIVE_ORG") {
      return redirectTo("/dashboard?session=stale")
    }
    if (error instanceof RbacError && error.code === "EMAIL_NOT_VERIFIED") {
      return redirectTo("/login?error=email-not-verified")
    }
    if (error instanceof RbacError && error.code === "ACCOUNT_LOCKED") {
      return redirectTo("/forgot-password?error=account-locked")
    }
    return redirectTo("/login")
  }
}

// Permission check — throws on failure, redirects when not authenticated
export async function checkPermission(permission: string) {
  await requirePermission(permission)
  return true
}

// Boolean — no redirect
export async function isAuthenticated() {
  return !!(await getOptionalRbacContext())
}
