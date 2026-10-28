"use client"

import { createAuthClient } from "better-auth/react"
import { useQuery } from "@tanstack/react-query"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import {
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
} from "@/lib/security/rbac-permissions"

export const authClient = createAuthClient({
  basePath: "/api/auth",
})

export function useSession() {
  return authClient.useSession()
}

export function useAuth() {
  const { data: session, isPending } = authClient.useSession()

  return {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    session,
  }
}

// Permissions are NOT stored in the session cookie — they are fetched fresh
// from /api/me/permissions via React Query (cached for 5 minutes).
export function usePermissions() {
  const { data: session } = authClient.useSession()

  const { data: permissionsData } = useQuery<{ permissions: string[] }>({
    queryKey: ["permissions", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/permissions")
      if (!res.ok) return { permissions: [] }
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: { permissions: [] },
  })

  const userPermissions = permissionsData?.permissions ?? []

  return {
    permissions: userPermissions,
    hasPermission: (permission: string) => hasRbacPermission(userPermissions, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyRbacPermission(userPermissions, permissions),
    hasAllPermissions: (permissions: string[]) => hasAllRbacPermissions(userPermissions, permissions),
    user: session?.user,
    isAuthenticated: !!session?.user,
  }
}

export async function signOut(options?: {
  redirectTo?: string
  redirect?: boolean
}) {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL ?? ""
      : window.location.origin
  const currentLocale =
    typeof window === "undefined"
      ? DEFAULT_LOCALE
      : (getLocaleFromPathname(window.location.pathname) ?? DEFAULT_LOCALE)
  const redirectPath = localizePath(
    options?.redirectTo ?? "/login",
    currentLocale
  )
  const callbackUrl = redirectPath.startsWith("http")
    ? redirectPath
    : `${baseUrl}${redirectPath}`

  await authClient.signOut()

  if (options?.redirect !== false) {
    window.location.href = callbackUrl
  }
}

export default useAuth
