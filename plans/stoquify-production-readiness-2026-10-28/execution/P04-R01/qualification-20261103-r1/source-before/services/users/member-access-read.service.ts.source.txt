import "server-only"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { canGrantMemberRole, hasMemberControl, hasRecordedDeactivation, memberAccessRevision } from "./member-access-policy"
import { readMemberHistoryInTx } from "./member-history.service"

const memberSelect = { id: true, email: true, firstName: true, lastName: true, updatedAt: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true } as const

export async function getMemberAccess(input: { organizationId: string; actorId: string; targetUserId: string }) {
  return db.$transaction(async tx => {
    const actor = await tx.user.findFirst({ where: { id: input.actorId, organizationId: input.organizationId, organization: { isActive: true, deletedAt: null } }, select: { ...memberSelect, roles: { where: { organizationId: input.organizationId }, select: { permissions: true } } } })
    const permissions = actor?.roles.flatMap(role => role.permissions) ?? []
    if (!actor || !isUsableAccount(actor, new Date()) || !hasRbacPermission(permissions, "users.read")) throw new ForbiddenError()
    const member = await tx.user.findFirst({ where: { id: input.targetUserId, organizationId: input.organizationId }, select: { ...memberSelect, roles: { select: { id: true } } } })
    if (!member) throw new NotFoundError("Member not found.")
    const roles = await tx.role.findMany({ where: { organizationId: input.organizationId }, orderBy: { id: "asc" } })
    const { roles: memberships, ...account } = member
    const roleIds = memberships.map(role => role.id).sort()
    const inconsistent = roleIds.some(id => !roles.some(role => role.id === id))
    const ownAccount = member.id === actor.id
    const deactivation = !member.isActive ? await tx.auditLog.findFirst({ where: { organizationId: input.organizationId, entityType: "User", entityId: member.id, action: "DEACTIVATE_USER" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }) : null
    const canReadHistory = hasRbacPermission(permissions, "controls.audit.read")
    const history = canReadHistory ? await readMemberHistoryInTx(tx, input) : null
    return {
      organizationId: input.organizationId, checkedAt: new Date().toISOString(), revision: memberAccessRevision(account, roleIds, roles),
      member: { id: member.id, name: [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email, email: member.email, isActive: member.isActive, verified: member.isVerified || member.emailVerified },
      roleIds: roleIds.filter(id => roles.some(role => role.id === id)), inconsistent, ownAccount,
      canRemove: !ownAccount && !inconsistent && hasMemberControl(permissions, "remove"),
      canReactivate: !ownAccount && !inconsistent && hasMemberControl(permissions, "activate") && hasMemberControl(permissions, "assign") && hasRecordedDeactivation(account, deactivation),
      catalogue: roles.map(role => ({ id: role.id, nameEn: role.nameEn, nameFr: role.nameFr, description: role.description, permissionCount: role.permissions.length, canAssign: !ownAccount && !inconsistent && canGrantMemberRole(permissions, role) })),
      canReadHistory,
      history: history?.entries ?? [],
      historyPage: history ? { pageInfo: history.pageInfo, pageHash: history.pageHash, canExport: hasRbacPermission(permissions, "reports.export") } : null,
    }
  }, { isolationLevel: "RepeatableRead", timeout: 10000 })
}

export type MemberAccessModel = Awaited<ReturnType<typeof getMemberAccess>>
