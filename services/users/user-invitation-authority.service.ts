import "server-only"
import type { Prisma } from "@prisma/client"
import { evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"

export async function readCurrentInvitationIssuer(tx: Pick<Prisma.TransactionClient, "user">, input: {
  organizationId: string; actorId: string; role: { code: string; organizationId: string; permissions: readonly string[] }
}) {
  const actor = await tx.user.findFirst({
    where: { id: input.actorId, organizationId: input.organizationId, isActive: true },
    select: {
      id: true, isLocked: true, lockedUntil: true, isVerified: true, emailVerified: true,
      organization: { select: { name: true, isActive: true, deletedAt: true } },
      roles: { where: { organizationId: input.organizationId }, select: { code: true, permissions: true } },
    },
  })
  if (!actor || !actor.organization?.isActive || actor.organization.deletedAt
    || (actor.isLocked && (!actor.lockedUntil || actor.lockedUntil > new Date()))
    || (!actor.isVerified && !actor.emailVerified)) return null
  const permissions = actor.roles.flatMap(role => role.permissions)
  const roleCodes = actor.roles.map(role => role.code)
  if (!evaluateRoleGrantPolicy({ actorOrganizationId: input.organizationId, actorPermissions: permissions, actorRoleCodes: roleCodes, targetRole: input.role }).allowed) return null
  return { actorId: actor.id, roleCodes: [...new Set(roleCodes)].sort(), permissions: [...new Set(permissions)].sort(), companyName: actor.organization.name }
}
