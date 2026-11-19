import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"

export type SetupActor = { organizationId: string; actorId: string; actorPermissions: string[] }
export type SetupDomain = "TIME_POLICY" | "WORK_SCHEDULE" | "TIME_REQUEST"
export type SetupGrant = { id: string; reviewerUserId: string; employeeId: string | null; domain: SetupDomain; authority: "PEOPLE_READ" | "APPROVAL_DECISION"; effectiveFrom: Date; effectiveTo: Date; revokedAt: Date | null }
export type SetupClient = typeof db | Prisma.TransactionClient

// Deployment-owned allowlist. Empty is disabled; changing it never edits retained grants.
export function assertSetupPilot(organizationId: string) {
  if (!(process.env.HRIS_SETUP_PILOT_ORGANIZATIONS ?? "").split(",").map(s => s.trim()).filter(Boolean).includes(organizationId)) {
    throw new ForbiddenError("HRIS_SETUP_PILOT_REQUIRED: Ask your administrator about HR setup availability.")
  }
}

export async function assertSetupAccount(tx: SetupClient, organizationId: string, userId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT u.id FROM users u JOIN organizations o ON o.id = u."organizationId"
    WHERE u.id = ${userId} AND u."organizationId" = ${organizationId} AND u."isActive" = true
    AND (u."isVerified" = true OR u."emailVerified" = true)
    AND (u."isLocked" = false OR u."lockedUntil" <= CURRENT_TIMESTAMP)
    AND o."isActive" = true AND o."deletedAt" IS NULL FOR SHARE OF u, o`
  if (!rows.length) throw new ForbiddenError("HRIS_SETUP_ACCOUNT_UNAVAILABLE: Use an active verified account in this organization.")
}

export async function assertSetupManager(tx: SetupClient, input: SetupActor) {
  assertSetupPilot(input.organizationId)
  await assertSetupAccount(tx, input.organizationId, input.actorId)
  const roles = await tx.$queryRaw<Array<{ permissions: string[] }>>`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A" = r.id
    WHERE m."B" = ${input.actorId} AND r."organizationId" = ${input.organizationId} FOR SHARE OF r, m`
  if (!hasAnyRbacPermission(roles.flatMap(r => r.permissions), ["hris.people.manage"])) throw new ForbiddenError("HRIS_SETUP_MANAGER_REQUIRED")
}

// Called inside the decision transaction. Never converts a grant to tenant-wide permissions.
export async function assertSetupReviewInTx(tx: SetupClient, input: SetupActor, domain: SetupDomain, employeeId?: string) {
  assertSetupPilot(input.organizationId)
  await assertSetupAccount(tx, input.organizationId, input.actorId)
  const roles = await tx.$queryRaw<Array<{permissions: string[]}>>`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A" = r.id
    WHERE m."B" = ${input.actorId} AND r."organizationId" = ${input.organizationId} FOR SHARE OF r, m`
  if (!hasAnyRbacPermission(roles.flatMap(r => r.permissions), ["hris.people.read"])) throw new ForbiddenError("HRIS_SETUP_READ_REQUIRED")
  if (employeeId) {
    const employees = await tx.$queryRaw<Array<{id: string}>>`SELECT id FROM payroll_employees
      WHERE id = ${employeeId} AND "organizationId" = ${input.organizationId} AND "deletedAt" IS NULL FOR SHARE`
    if (!employees.length) throw new ForbiddenError("HRIS_SETUP_EMPLOYEE_UNAVAILABLE")
  }
  const grants = await tx.$queryRaw<SetupGrant[]>`SELECT * FROM hris_setup_reviewer_grants
    WHERE "organizationId" = ${input.organizationId} AND "reviewerUserId" = ${input.actorId}
    AND domain = ${domain} AND "employeeId" IS NOT DISTINCT FROM ${employeeId ?? null}
    AND authority = 'APPROVAL_DECISION' AND "revokedAt" IS NULL
    AND "effectiveFrom" <= CURRENT_TIMESTAMP AND "effectiveTo" > CURRENT_TIMESTAMP FOR SHARE`
  if (!grants.length) throw new ForbiddenError("HRIS_SETUP_REVIEW_SCOPE_REQUIRED: Ask HR to review the employee, domain and expiry of your delegation.")
}
