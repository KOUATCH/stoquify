import "server-only"

import { getAllPermissions } from "@/config/permissions"
import { createRoleName } from "@/lib/createRoleName"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import type { RoleFormData } from "@/types/types"

export type RoleServiceContext = {
  orgId: string
  userId: string
  isSuperUser: boolean
}

function displayRoleName(role: { nameEn: string; nameFr: string | null }) {
  return role.nameEn || role.nameFr || ""
}

function withDisplayRoleName<T extends { nameEn: string; nameFr: string | null }>(role: T) {
  return {
    ...role,
    name: displayRoleName(role),
  }
}

function assertValidPermissions(permissions: string[]) {
  const validPermissions = getAllPermissions()
  const invalidPermissions = permissions.filter(
    (permission) => !validPermissions.includes(permission),
  )

  if (invalidPermissions.length > 0) {
    throw new BusinessRuleError(
      `Invalid permissions detected: ${invalidPermissions.join(", ")}`,
    )
  }
}

export async function resolveRoleOrganization(
  ctx: RoleServiceContext,
  explicitOrgId?: string | null,
) {
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === ctx.orgId) {
    return ctx.orgId
  }

  if (!ctx.isSuperUser) {
    throw new ForbiddenError("Forbidden")
  }

  const organization = await db.organization.findFirst({
    where: {
      id: requestedOrgId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new NotFoundError("Organization not found or inactive")
  }

  return organization.id
}

export async function listOrganizationRoles(input: {
  ctx: RoleServiceContext
  organizationId?: string | null
}) {
  const organizationId = await resolveRoleOrganization(input.ctx, input.organizationId)
  const orgRoles = await db.role.findMany({
    where: { organizationId },
    orderBy: {
      createdAt: "desc",
    },
  })

  return orgRoles.map(withDisplayRoleName)
}

export async function getOrganizationRoleById(input: {
  ctx: RoleServiceContext
  id: string
}) {
  const role = await db.role.findFirst({
    where: { id: input.id, organizationId: input.ctx.orgId },
  })

  if (!role) {
    throw new NotFoundError("Role not found")
  }

  return withDisplayRoleName(role)
}

export async function createOrganizationRole(input: {
  ctx: RoleServiceContext
  data: RoleFormData
}) {
  assertValidPermissions(input.data.permissions)

  const existingRole = await db.role.findFirst({
    where: {
      nameEn: input.data.name,
      organizationId: input.ctx.orgId,
    },
  })

  if (existingRole) {
    throw new ConflictError("A role with this name already exists")
  }

  const role = await db.role.create({
    data: {
      code: createRoleName(input.data.name),
      nameEn: input.data.name,
      description: input.data.description,
      permissions: input.data.permissions,
      organizationId: input.ctx.orgId,
    },
  })

  await logSecurityEvent({
    type: SecurityEventType.ROLE_CHANGED,
    userId: input.ctx.userId,
    organizationId: input.ctx.orgId,
    resource: role.id,
    details: {
      action: "role.create",
      roleCode: role.code,
      permissions: role.permissions,
    },
  })

  return withDisplayRoleName(role)
}

export async function updateOrganizationRole(input: {
  ctx: RoleServiceContext
  id: string
  data: Partial<RoleFormData>
}) {
  if (input.data.permissions) {
    assertValidPermissions(input.data.permissions)
  }

  if (input.data.name) {
    const existingRole = await db.role.findFirst({
      where: {
        nameEn: input.data.name,
        organizationId: input.ctx.orgId,
        NOT: {
          id: input.id,
        },
      },
    })

    if (existingRole) {
      throw new ConflictError("A role with this name already exists")
    }
  }

  const beforeRole = await db.role.findFirst({
    where: { id: input.id, organizationId: input.ctx.orgId },
  })

  if (!beforeRole) {
    throw new NotFoundError("Role not found")
  }

  const updated = await db.role.updateMany({
    where: { id: input.id, organizationId: input.ctx.orgId },
    data: {
      ...(input.data.name && {
        nameEn: input.data.name,
        code: createRoleName(input.data.name),
      }),
      ...(input.data.description && { description: input.data.description }),
      ...(input.data.permissions && { permissions: input.data.permissions }),
    },
  })

  if (updated.count === 0) {
    throw new NotFoundError("Role not found")
  }

  const role = await db.role.findFirst({
    where: { id: input.id, organizationId: input.ctx.orgId },
  })

  if (!role) {
    throw new NotFoundError("Role was updated but could not be reloaded")
  }

  await logSecurityEvent({
    type: SecurityEventType.ROLE_CHANGED,
    userId: input.ctx.userId,
    organizationId: input.ctx.orgId,
    resource: role.id,
    details: {
      action: "role.update",
      before: {
        code: beforeRole.code,
        nameEn: beforeRole.nameEn,
        permissions: beforeRole.permissions,
      },
      after: {
        code: role.code,
        nameEn: role.nameEn,
        permissions: role.permissions,
      },
    },
  })

  return withDisplayRoleName(role)
}
