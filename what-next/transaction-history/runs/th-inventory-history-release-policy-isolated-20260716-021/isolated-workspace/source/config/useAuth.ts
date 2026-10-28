// config/useAuth.ts - Page-oriented authentication utilities backed by BetterAuth RBAC
import {
  RbacError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  requireRbacContext,
  type RbacRole,
  type RbacUser,
} from "@/lib/security/rbac"
import { LOCALE_COOKIE, localizePath, pickLocale } from "@/i18n/routing"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export type AuthenticatedRole = RbacRole
export interface AuthenticatedUser extends RbacUser {}

async function redirectWithRequestLocale(path: string): Promise<never> {
  const cookieStore = await cookies()
  const locale = pickLocale(cookieStore.get(LOCALE_COOKIE)?.value)

  redirect(localizePath(path, locale))
}

async function redirectForAuthError(error: unknown): Promise<never> {
  if (error instanceof RbacError) {
    if (error.code === "UNAUTHENTICATED") return redirectWithRequestLocale("/login")
    if (error.code === "NO_ACTIVE_ORG") return redirectWithRequestLocale("/dashboard?session=stale")
    if (error.code === "EMAIL_NOT_VERIFIED") return redirectWithRequestLocale("/login?error=email-not-verified")
    if (error.code === "ACCOUNT_LOCKED") return redirectWithRequestLocale("/forgot-password?error=account-locked")
  }

  return redirectWithRequestLocale("/unauthorized")
}

// Function to check authorization and redirect from pages/layouts when needed.
export async function checkPermission(requiredPermission: string) {
  try {
    await requirePermission(requiredPermission)
    return true
  } catch (error) {
    return redirectForAuthError(error)
  }
}

// Function to get authenticated user or redirect.
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  try {
    const ctx = await requireRbacContext()
    return ctx.user
  } catch (error) {
    return redirectForAuthError(error)
  }
}

// Function to check multiple permissions (any).
export async function checkAnyPermission(permissions: string[]) {
  try {
    await requireAnyPermission(permissions)
    return true
  } catch (error) {
    return redirectForAuthError(error)
  }
}

// Function to check multiple permissions (all).
export async function checkAllPermissions(permissions: string[]) {
  try {
    await requireAllPermissions(permissions)
    return true
  } catch (error) {
    return redirectForAuthError(error)
  }
}
