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

type PermissionSnapshot = { userId: string; organizationId: string; permissions: string[]; fetchedAt: number }
class PermissionLookupError extends Error {
  constructor(public readonly code: string) { super(code) }
}

// This display snapshot never authorizes an operation. Server guards check current authority.
export function usePermissions() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user?.id

  const query = useQuery<PermissionSnapshot>({
    queryKey: ["permissions", userId],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/me/permissions", { cache: "no-store", signal })
      if (!res.ok) throw new PermissionLookupError(res.status === 401 ? "UNAUTHENTICATED" : res.status === 403 ? "FORBIDDEN" : "AUTHORIZATION_CHECK_FAILED")
      const body = await res.json()
      if (body?.userId !== userId) throw new PermissionLookupError("IDENTITY_CHANGED")
      if (typeof body.organizationId !== "string" || !body.organizationId || !Array.isArray(body.permissions) || !body.permissions.every((value: unknown) => typeof value === "string") || !Number.isFinite(body.fetchedAt)) throw new PermissionLookupError("AUTHORIZATION_CHECK_FAILED")
      return body
    },
    enabled: !!userId && !sessionPending,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: "always",
    meta: { suppressErrorNotification: true },
  })

  const permissionState = sessionPending ? "loading" : !userId ? "signed_out" : query.isFetching || query.isPending ? "loading" : query.isError ? "error" : "ready"
  const userPermissions = permissionState === "ready" && query.data && query.data.userId === userId ? query.data.permissions : []

  return {
    permissions: userPermissions,
    // Preserve this actor's cache scope during refetch; permissions still remain empty until ready.
    organizationId: !sessionPending && !query.isError && query.data?.userId === userId ? query.data?.organizationId : undefined,
    permissionState,
    permissionError: permissionState === "error" ? query.error instanceof PermissionLookupError ? query.error.code : "AUTHORIZATION_CHECK_FAILED" : null,
    permissionsCheckedAt: permissionState === "ready" ? query.data?.fetchedAt : undefined,
    refreshPermissions: query.refetch,
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

  const result = await authClient.signOut()
  if (result.error || result.data?.success !== true) {
    throw new Error("SIGN_OUT_UNCONFIRMED")
  }

  if (options?.redirect !== false) {
    window.location.href = callbackUrl
  }
}

export default useAuth
