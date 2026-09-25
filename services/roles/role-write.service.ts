import "server-only"
import { createHash } from "node:crypto"
import type { Prisma, Role, Session } from "@prisma/client"
import { getAllPermissions } from "@/config/permissions"
import { createRoleName } from "@/lib/createRoleName"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ApplicationError, BusinessRuleError, ConflictError, DuplicateKeyConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import type { RoleFormData } from "@/types/types"
import type { RoleServiceContext } from "./role.service"
import { roleCommandInput, roleDetailsInput, type RoleCommand } from "./role-command"
import { canChangeRolePermissions, canGrantRolePermission } from "./role-permission-policy"
import { isRoleCustodian, isUsableAccount } from "./role-custodian-policy"

type ActorRow = { id: string; isActive: boolean; isVerified: boolean; emailVerified: boolean; isLocked: boolean; lockedUntil: Date | null }
type Membership = { roleId: string; userId: string }
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const snapshot = (role: Role) => JSON.parse(JSON.stringify(role)) as Prisma.InputJsonValue

function checkPermissionChanges(actorPermissions: string[], before: string[], after: string[]) {
  const added = after.filter(value => !before.includes(value))
  const removed = before.filter(value => !after.includes(value))
  // Unknown historical values may be retained or explicitly removed, never newly granted.
  if (added.some(value => !getAllPermissions().includes(value))) throw new ApplicationError("VALIDATION_ERROR", "The selection contains an unsupported new permission.", 400)
  if (added.length && (!canChangeRolePermissions(actorPermissions, "assign") || added.some(value => !canGrantRolePermission(actorPermissions, value)))) throw new ForbiddenError("You cannot grant one or more selected permissions.")
  if (removed.length && !canChangeRolePermissions(actorPermissions, "remove")) throw new ForbiddenError("Permission-removal authority is required.")
  return { added, removed }
}

async function saveRole(input: { ctx: RoleServiceContext; id?: string; data: Partial<RoleFormData>; command?: RoleCommand }) {
  const parsed = (input.id ? roleDetailsInput.partial() : roleDetailsInput).safeParse(input.data)
  const command = roleCommandInput.safeParse(input.command)
  if (!parsed.success || !command.success || (input.id && !command.data.expectedUpdatedAt)) throw new ApplicationError("VALIDATION_ERROR", "Review the role details and reload its current version before saving.", 400)
  const data = parsed.data, ctx = input.ctx
  if (!ctx.userId || !ctx.orgId || !ctx.session?.id || !ctx.session.token || (data.organizationId && data.organizationId !== ctx.orgId)) throw new ForbiddenError("Current organization authority is required.")
  const normalized = { ...data, permissions: data.permissions ? [...new Set(data.permissions)].sort() : undefined, organizationId: ctx.orgId }
  const fingerprint = digest({ operation: input.id ? "update" : "create", id: input.id ?? null, data: normalized, expected: command.data.expectedUpdatedAt ?? null })
  const auditId = "role_command_" + digest([ctx.orgId, ctx.userId, command.data.requestId])
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${ctx.orgId} FOR UPDATE`
    if (!await tx.organization.findFirst({ where: { id: ctx.orgId, isActive: true, deletedAt: null }, select: { id: true } })) throw new NotFoundError("The organization is no longer available.")
    // Organization serialization plus row locks prevent authority changes during this commit.
    const users = await tx.$queryRaw<ActorRow[]>`SELECT id, "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users WHERE "organizationId" = ${ctx.orgId} ORDER BY id FOR SHARE`
    const roles = await tx.$queryRaw<Role[]>`SELECT * FROM roles WHERE "organizationId" = ${ctx.orgId} ORDER BY id FOR UPDATE`
    const members = await tx.$queryRaw<Membership[]>`SELECT membership."A" AS "roleId", membership."B" AS "userId" FROM "_UserRoles" membership INNER JOIN roles r ON r.id = membership."A" WHERE r."organizationId" = ${ctx.orgId} ORDER BY membership."A", membership."B" FOR SHARE OF membership`
    const now = new Date(), actor = users.find(user => user.id === ctx.userId)
    if (!actor || !isUsableAccount(actor, now)) throw new ForbiddenError("Your current account cannot manage roles.")
    const userPermissions = (userId: string, availableRoles: Role[]) => availableRoles.filter(role => members.some(member => member.userId === userId && member.roleId === role.id)).flatMap(role => role.permissions)
    const actorPermissions = userPermissions(actor.id, roles)
    if (!hasRbacPermission(actorPermissions, input.id ? "roles.update" : "roles.create")) throw new ForbiddenError("Your role-management authority has changed.")
    const sessions = await tx.$queryRaw<Session[]>`SELECT * FROM sessions WHERE id = ${ctx.session!.id} AND token = ${ctx.session!.token} AND "userId" = ${ctx.userId} FOR SHARE`
    const session = sessions[0]
    if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== ctx.orgId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before changing roles.", 403)
    const previous = await tx.auditLog.findFirst({ where: { id: auditId, organizationId: ctx.orgId, userId: ctx.userId, entityType: "Role", action: "ROLE_CHANGED" } })
    if (previous) {
      const receipt = previous.changes as { fingerprint?: string; after?: { updatedAt?: string }; delta?: { added: string[]; removed: string[] } } | null
      if (receipt?.fingerprint !== fingerprint) throw new IdempotencyConflictError()
      const current = roles.find(role => role.id === previous.entityId)
      if (!current || current.updatedAt.toISOString() !== receipt.after?.updatedAt) throw new ConflictError("This request was saved, but the role has since changed. Reload the current role.")
      if (receipt.delta?.added.length && (!canChangeRolePermissions(actorPermissions, "assign") || receipt.delta.added.some(value => !canGrantRolePermission(actorPermissions, value)))) throw new ForbiddenError("Your assignment authority has changed.")
      if (receipt.delta?.removed.length && !canChangeRolePermissions(actorPermissions, "remove")) throw new ForbiddenError("Your removal authority has changed.")
      return { ...current, name: current.nameEn || current.nameFr || "" }
    }
    const before = input.id ? roles.find(role => role.id === input.id) : null
    if (input.id && !before) throw new NotFoundError("Role not found.")
    if (before && before.updatedAt.toISOString() !== new Date(command.data.expectedUpdatedAt!).toISOString()) throw new ConflictError("The role changed after you opened it. Reload and review your draft.")
    const permissions = normalized.permissions ?? before?.permissions ?? []
    const delta = checkPermissionChanges(actorPermissions, before?.permissions ?? [], permissions)
    const nameEn = normalized.name ?? before!.nameEn
    const code = before?.code ?? createRoleName(nameEn)
    if (roles.some(role => role.id !== before?.id && (role.nameEn.toLocaleLowerCase() === nameEn.toLocaleLowerCase() || role.code === code))) throw new DuplicateKeyConflictError("A role with this name already exists.")
    if (before && delta.removed.length) {
      const custodians = (available: Role[]) => users.filter(user => {
        const permissions = userPermissions(user.id, available)
        return isRoleCustodian(user, permissions, now)
      })
      if (custodians(roles).length && !custodians(roles.map(role => role.id === before.id ? { ...role, permissions } : role)).length) throw new BusinessRuleError("Keep at least one active administrator able to manage roles and invite members before removing these permissions.")
    }
    const changes = { nameEn, nameFr: normalized.nameFr !== undefined ? normalized.nameFr || null : before?.nameFr ?? null, description: normalized.description !== undefined ? normalized.description || null : before?.description ?? null, permissions, updatedAt: new Date(Math.max(now.getTime(), (before?.updatedAt.getTime() ?? 0) + 1)) }
    const after = before
      ? await tx.role.update({ where: { id: before.id, organizationId: ctx.orgId }, data: changes })
      : await tx.role.create({ data: { ...changes, id: "role_" + digest([ctx.orgId, ctx.userId, command.data.requestId]), code, organizationId: ctx.orgId } })
    await tx.auditLog.create({ data: { id: auditId, organizationId: ctx.orgId, userId: ctx.userId, entityType: "Role", entityId: after.id, action: "ROLE_CHANGED", changes: { operation: before ? "role.update" : "role.create", fingerprint, before: before ? snapshot(before) : null, after: snapshot(after), delta, reviewedUpdatedAt: command.data.expectedUpdatedAt ?? null } } })
    return { ...after, name: after.nameEn || after.nameFr || "" }
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}

export async function createOrganizationRole(input: { ctx: RoleServiceContext; data: RoleFormData; command?: RoleCommand }) { return saveRole(input) }
export async function updateOrganizationRole(input: { ctx: RoleServiceContext; id: string; data: Partial<RoleFormData>; command?: RoleCommand }) { return saveRole(input) }
