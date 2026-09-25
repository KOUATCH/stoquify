import "server-only"
import type { Prisma, Session } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { organizationProfileInput } from "./organization-profile-input"
import type { OrganizationSettingsInput } from "./organization-settings.service"

export type OrganizationProfileChangeContext = {
  actorUserId: string
  expectedUpdatedAt?: string
  session: { id: string; token: string }
}

export const organizationProfileSelect = {
  id: true, name: true, slug: true, industry: true, country: true, state: true, address: true,
  currency: true, timezone: true, defaultLocale: true, inventoryStartDate: true, fiscalYearStart: true,
  isActive: true, createdAt: true, updatedAt: true,
} as const

export async function updateOrganizationSettingsForOrg(organizationId: string, data: OrganizationSettingsInput, context?: OrganizationProfileChangeContext) {
  const parsed = organizationProfileInput.safeParse(data)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the organization details, currency, timezone and calendar.", 400)
  if (!context?.actorUserId || !context.session?.id || !context.session.token || !organizationId.trim()) throw new ForbiddenError("Current organization authority is required.")
  const expected = new Date(context.expectedUpdatedAt ?? "")
  if (!context.expectedUpdatedAt || Number.isNaN(expected.getTime())) throw new ConflictError("Reload the organization profile before reviewing this change.")
  const input = parsed.data
  const changes = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.industry !== undefined ? { industry: input.industry || null } : {}),
    ...(input.country !== undefined ? { country: input.country || null } : {}),
    ...(input.state !== undefined ? { state: input.state || null } : {}),
    ...(input.address !== undefined ? { address: input.address || null } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale === "fr" ? "FR" as const : "EN" as const } : {}),
    ...(input.inventoryStartDate !== undefined ? { inventoryStartDate: input.inventoryStartDate } : {}),
    ...(input.fiscalYearStart !== undefined ? { fiscalYearStart: input.fiscalYearStart || null } : {}),
  }
  return db.$transaction(async tx => {
    // Match the repository's organization → user → role → session lock order.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`
    const before = await tx.organization.findFirst({ where: { id: organizationId, isActive: true, deletedAt: null }, select: organizationProfileSelect })
    if (!before) throw new NotFoundError("The organization is no longer available.")
    if (before.updatedAt.getTime() !== expected.getTime()) throw new ConflictError("The organization changed after you opened it. Reload and review your entries.")
    const users = await tx.$queryRaw<Array<{ isActive: boolean; isVerified: boolean; emailVerified: boolean; isLocked: boolean; lockedUntil: Date | null }>>`
      SELECT "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users
      WHERE id = ${context.actorUserId} AND "organizationId" = ${organizationId} FOR SHARE`
    const actor = users[0], now = new Date()
    if (!actor?.isActive || (!actor.isVerified && !actor.emailVerified) || (actor.isLocked && (!actor.lockedUntil || actor.lockedUntil > now))) throw new ForbiddenError("Your current account cannot update this organization.")
    const roles = await tx.$queryRaw<Array<{ permissions: string[] }>>`
      SELECT r.permissions FROM roles r INNER JOIN "_UserRoles" membership ON membership."A" = r.id
      WHERE membership."B" = ${context.actorUserId} AND r."organizationId" = ${organizationId}
      ORDER BY r.id FOR SHARE OF r, membership`
    if (!hasRbacPermission(expandPermissions(roles.flatMap(role => role.permissions)), "system.organization.update")) throw new ForbiddenError("Your permission to update the organization has changed.")
    const sessions = await tx.$queryRaw<Session[]>`
      SELECT * FROM sessions WHERE id = ${context.session.id} AND token = ${context.session.token}
      AND "userId" = ${context.actorUserId} FOR SHARE`
    const session = sessions[0]
    if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== organizationId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before saving these settings.", 403)
    // POS receipts and inventory/payment history still label amounts with this value.
    // Changing it safely requires an explicit currency migration, not a profile edit.
    if (input.currency !== undefined && input.currency !== before.currency) throw new BusinessRuleError("Changing the organization currency requires a separate controlled migration of operating records.")
    const after = await tx.organization.update({ where: { id: organizationId }, data: { ...changes, updatedAt: new Date(Math.max(now.getTime(), before.updatedAt.getTime() + 1)) }, select: organizationProfileSelect })
    await tx.auditLog.create({ data: {
      organizationId, userId: context.actorUserId, entityType: "Organization", entityId: organizationId,
      action: "ORGANIZATION_SETTINGS_UPDATED",
      changes: JSON.parse(JSON.stringify({ before, after, changedFields: Object.keys(changes), reviewedUpdatedAt: expected.toISOString() })) as Prisma.InputJsonValue,
    } })
    return after
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
