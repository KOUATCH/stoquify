import type { Prisma } from "@prisma/client"
import {
  assertCanUseOrganization,
  getOptionalRbacContext,
  hasRbacPermission,
} from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
  ModuleSurfaceType,
} from "@/services/modules/module-control-contracts"

export const safeUserSelect = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  phone: true,
  image: true,
  jobTitle: true,
  isActive: true,
  isVerified: true,
  preferredLocale: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameFr: true,
      description: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>

export async function requireApiSessionForOrg(organizationId: string) {
  const ctx = await getOptionalRbacContext()

  if (!ctx) {
    return { error: "Unauthorized", status: 401 as const, session: null }
  }

  try {
    await assertCanUseOrganization(ctx, organizationId)
  } catch {
    return { error: "Forbidden", status: 403 as const, session: null }
  }

  return { error: null, status: 200 as const, session: { user: ctx.user } }
}

export async function requireApiSessionForCurrentOrg() {
  const ctx = await getOptionalRbacContext()

  if (!ctx) {
    return { error: "Unauthorized", status: 401 as const, session: null, organizationId: null }
  }

  return {
    error: null,
    status: 200 as const,
    session: { user: ctx.user },
    organizationId: ctx.orgId,
  }
}

type PermissionUser = {
  id: string
  email?: string | null
  name?: string | null
  roles?: Array<string | { code?: string | null; permissions?: string[] | null }> | null
  permissions?: string[] | null
}

export function hasAppPermission(user: PermissionUser, permission: string) {
  const rolePermissions = (user.roles ?? []).flatMap((role) =>
    typeof role === "string" ? [] : role.permissions ?? [],
  )

  return hasRbacPermission([...(user.permissions ?? []), ...rolePermissions], permission)
}

function actorPermissionsFor(user: PermissionUser) {
  const permissions = new Set(user.permissions ?? [])

  for (const role of user.roles ?? []) {
    if (typeof role === "string") continue
    for (const permission of role.permissions ?? []) {
      permissions.add(permission)
    }
  }

  return [...permissions]
}

export async function requireApiModuleAccess(input: {
  organizationId: string
  user: PermissionUser & { id: string }
  moduleSlug: CommercialModuleSlug
  surface: string
  surfaceType?: ModuleSurfaceType
  accessIntent?: ModuleAccessIntent
  audit?: boolean
}) {
  const decision = await observeModuleAccess({
    organizationId: input.organizationId,
    userId: input.user.id,
    actorPermissions: actorPermissionsFor(input.user),
    moduleSlug: input.moduleSlug,
    surfaceType: input.surfaceType ?? "api",
    surface: input.surface,
    accessIntent: input.accessIntent ?? "read",
    mode: "enforce",
    audit: input.audit ?? true,
  })

  if (!decision.allowed) {
    return { allowed: false as const, error: "Forbidden", status: 403 as const, decision }
  }

  return { allowed: true as const, error: null, status: 200 as const, decision }
}

export function requireAppPermission(user: PermissionUser, permission: string) {
  if (!hasAppPermission(user, permission)) {
    throw new Error("Forbidden")
  }
}

export function requireAnyAppPermission(user: PermissionUser, permissions: readonly string[]) {
  if (!permissions.some((permission) => hasAppPermission(user, permission))) {
    throw new Error("Forbidden")
  }
}
