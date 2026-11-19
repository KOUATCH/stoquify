import "server-only"

import { db } from "@/prisma/db"
import {
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
export { createOrganizationRole, updateOrganizationRole } from "./role-write.service"

export type RoleServiceContext = {
  orgId: string
  userId: string
  isSuperUser: boolean
  session?: { id: string; token: string }
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

export async function resolveRoleOrganization(
  ctx: RoleServiceContext,
  explicitOrgId?: string | null,
) {
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === ctx.orgId) {
    return ctx.orgId
  }

  throw new ForbiddenError("Forbidden")
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
