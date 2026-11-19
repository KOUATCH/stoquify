import "server-only"

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { evaluateRoleGrantAuthority, evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"
import { readCurrentInvitationIssuer } from "./user-invitation-authority.service"

export type InvitationOptionsState = "ready" | "forbidden" | "roles_read_required" | "organization_unavailable" | "empty"
export type InvitationRoleOptions = {
  state: InvitationOptionsState
  roles: Array<{ value: string; label: string }>
  checkedAt: string
}

/** Server-derived context only. These choices never authorize submission. */
export async function readInvitationRoleOptions(input: {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  locale: "en" | "fr"
}): Promise<InvitationRoleOptions> {
  if (!input.organizationId?.trim() || !input.actorId?.trim()) throw new BusinessRuleError("Organization scope and current actor are required")
  const unavailable = (state: InvitationOptionsState): InvitationRoleOptions => ({ state, roles: [], checkedAt: new Date().toISOString() })
  if (!evaluateRoleGrantAuthority(input.actorPermissions).allowed) return unavailable("forbidden")
  // Keep the existing role-read boundary; assigning roles does not silently
  // grant a new permission to enumerate the organization's role definitions.
  if (!hasRbacPermission(input.actorPermissions, "roles.read")) return unavailable("roles_read_required")

  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({
      where: { id: input.organizationId, isActive: true, deletedAt: null },
      select: { id: true },
    })
    if (!organization) return unavailable("organization_unavailable")
    const issuer = await readCurrentInvitationIssuer(tx, { organizationId: input.organizationId, actorId: input.actorId, role: { organizationId: input.organizationId, permissions: [] } })
    if (!issuer) return unavailable("forbidden")
    if (!hasRbacPermission(issuer.permissions, "roles.read")) return unavailable("roles_read_required")
    const roles = await tx.role.findMany({
      where: { organizationId: input.organizationId },
      orderBy: [{ code: "asc" }, { id: "asc" }],
      select: { id: true, organizationId: true, code: true, nameEn: true, nameFr: true, permissions: true },
    })
    const grantable = roles.filter(role => evaluateRoleGrantPolicy({
      actorOrganizationId: input.organizationId,
      actorPermissions: issuer.permissions,
      targetRole: role,
    }).allowed).map(role => ({
      value: role.id,
      label: (input.locale === "fr" ? role.nameFr || role.nameEn : role.nameEn || role.nameFr) || role.code,
    }))
    return { state: grantable.length ? "ready" : "empty", roles: grantable, checkedAt: new Date().toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
