import "server-only"

import { createHash } from "node:crypto"
import { Prisma, type User, type Role, type Session } from "@prisma/client"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { isCommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { moduleForPath } from "@/services/modules/module-catalog.service"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { assertAssuranceAssignmentScopeInTx } from "./assurance-assignment-scope"
import { assuranceAssignmentRevision } from "./assurance-assignment-revision"
import type { AssignWorkflowAssuranceIncidentInput } from "./assurance-incident-contracts"

type Account = Pick<User, "id" | "organizationId" | "isActive" | "isVerified" | "emailVerified" | "isLocked" | "lockedUntil">
type TenantRole = Pick<Role, "id" | "organizationId" | "permissions" | "code">
const activeStatuses = new Set(["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"])

/** Existing incident/event/audit storage only. Caller owns the Serializable transaction.
 * Lock order follows the existing organization/member authority writers, then the incident.
 * No generic signal completion or financial command is performed here. */
export async function assignAssuranceIncidentInTx(tx: Prisma.TransactionClient, input: AssignWorkflowAssuranceIncidentInput) {
  if (!input.actorId || !input.session?.id || !input.session.token ||
    !/^[a-f0-9]{64}$/.test(input.expectedRevision) || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId) ||
    !input.ownerId?.trim() || (input.dueAt && !Number.isFinite(input.dueAt.getTime()))) {
    throw new BusinessRuleError("A current session, source revision and assignment request are required.")
  }
  const organizations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "organizations" WHERE "id" = ${input.organizationId}
    AND "isActive" = true AND "deletedAt" IS NULL FOR SHARE`)
  if (organizations.length !== 1) throw new ForbiddenError("Assignment access is unavailable.")

  const users = await tx.$queryRaw<Account[]>(Prisma.sql`
    SELECT "id", "organizationId", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil"
    FROM "users" WHERE "organizationId" = ${input.organizationId}
    AND "id" IN (${Prisma.join([...new Set([input.actorId, input.ownerId])].sort())}) ORDER BY "id" FOR SHARE`)
  const roles = await tx.$queryRaw<TenantRole[]>(Prisma.sql`
    SELECT "id", "organizationId", "permissions", "code" FROM "roles"
    WHERE "organizationId" = ${input.organizationId} ORDER BY "id" FOR SHARE`)
  const memberships = await tx.$queryRaw<Array<{ roleId: string; userId: string }>>(Prisma.sql`
    SELECT membership."A" AS "roleId", membership."B" AS "userId" FROM "_UserRoles" membership
    INNER JOIN "roles" role ON role."id" = membership."A"
    WHERE role."organizationId" = ${input.organizationId}
    AND membership."B" IN (${Prisma.join([...new Set([input.actorId, input.ownerId])].sort())})
    ORDER BY membership."B", membership."A" FOR SHARE OF membership`)
  const sessions = await tx.$queryRaw<Array<Pick<Session, "id" | "userId" | "expiresAt">>>(Prisma.sql`
    SELECT "id", "userId", "expiresAt" FROM "sessions" WHERE "id" = ${input.session.id}
    AND "token" = ${input.session.token} AND "userId" = ${input.actorId} FOR SHARE`)
  const permissions = (userId: string) => {
    const assigned = new Set(memberships.filter(m => m.userId === userId).map(m => m.roleId))
    return roles.filter(r => r.organizationId === input.organizationId && assigned.has(r.id)).flatMap(r => r.permissions)
  }
  const actorPermissions = permissions(input.actorId)
  function revalidate(requiredPermission?: string) {
    const now = new Date()
    const actor = users.find(u => u.id === input.actorId && u.organizationId === input.organizationId)
    const owner = users.find(u => u.id === input.ownerId && u.organizationId === input.organizationId)
    const session = sessions[0]
    if (!actor || !isUsableAccount(actor, now) || !session || session.userId !== input.actorId || session.expiresAt <= now ||
      !hasRbacPermission(actorPermissions, "controls.manage") || !hasRbacPermission(actorPermissions, "controls.audit.read")) {
      throw new ForbiddenError("Current assignment authority is required. Refresh the source view.")
    }
    if (!owner || !isUsableAccount(owner, now) || !hasRbacPermission(permissions(owner.id), "controls.audit.read") ||
      (requiredPermission && (!hasRbacPermission(permissions(owner.id), requiredPermission) || !hasRbacPermission(actorPermissions, requiredPermission)))) {
      throw new ForbiddenError("The assignee must have an active account in this organization and current access to the incident source.")
    }
  }
  revalidate()
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "workflow_assurance_incidents" WHERE "id" = ${input.incidentId}
    AND "organizationId" = ${input.organizationId} FOR UPDATE`)
  if (rows.length !== 1) throw new NotFoundError("Workflow assurance incident not found.")
  await tx.$queryRaw(Prisma.sql`SELECT definition."id" FROM "workflow_assurance_check_definitions" definition
    INNER JOIN "workflow_assurance_incidents" incident ON incident."definitionId" = definition."id"
    WHERE incident."id" = ${input.incidentId} AND incident."organizationId" = ${input.organizationId} FOR SHARE OF definition`)
  const incident = await tx.workflowAssuranceIncident.findFirst({where: {id: input.incidentId, organizationId: input.organizationId}, include: {definition: true}})
  if (!incident) throw new NotFoundError("Workflow assurance incident not found.")
  revalidate(incident.definition.requiredPermission)

  const party = (id: string) => ({id, permissions: permissions(id), roleCodes: roles.filter(role =>
    memberships.some(membership => membership.userId === id && membership.roleId === role.id)).map(role => role.code)})
  const assignmentScope = await assertAssuranceAssignmentScopeInTx(tx, {
    organizationId: input.organizationId, incident, actor: party(input.actorId), owner: party(input.ownerId),
  })

  // Definitions may use a broad module (finance) while their source route belongs
  // to a narrower product (payment reconciliation). Require both, never infer
  // access from a display route alone or fall back from an unknown module.
  const declaredModule = incident.definition.moduleSlug === "business-events" ? "dashboard" : incident.definition.moduleSlug
  if (!isCommercialModuleSlug(declaredModule) || incident.moduleSlug !== incident.definition.moduleSlug) {
    throw new ForbiddenError("Assignment source module access is unavailable.")
  }
  const destinationModule = moduleForPath(incident.definition.actionRoute.split(/[?#]/, 1)[0])?.slug
  const requiredModules = [...new Set([declaredModule, ...(destinationModule ? [destinationModule] : [])])].sort()
  async function revalidateModules() {
    for (const moduleSlug of requiredModules) {
      const decision = await evaluateModuleAccessInTx(tx, {
        organizationId: input.organizationId, userId: input.actorId,
        actorPermissions, moduleSlug, surfaceType: "action",
        surface: "workflow-assurance-incident:assign", accessIntent: "write", mode: "enforce",
      })
      if (!decision.allowed) throw new ForbiddenError("Assignment source module access is unavailable.")
    }
  }
  // Retry never bypasses current entitlement. The shared evaluator reads and
  // locks persisted grants in this transaction and never falls back on failure.
  await revalidateModules()

  const dueAt = input.dueAt === undefined ? incident.dueAt : input.dueAt
  // Omitted dueAt means preserve, not silently clear. The request hash binds the original intent.
  const requestHash = createHash("sha256").update(JSON.stringify([
    input.organizationId, input.incidentId, input.actorId, input.expectedRevision, input.ownerId,
    input.dueAt === undefined ? "preserve" : input.dueAt?.toISOString() ?? null,
  ])).digest("hex")
  const replay = await tx.workflowAssuranceIncidentEvent.findFirst({where: {
    organizationId: input.organizationId, incidentId: incident.id, eventType: "ASSIGNED",
    metadata: {path: ["assignmentRequestId"], equals: input.requestId},
  }})
  if (replay) {
    const metadata = replay.metadata as Record<string, unknown> | null
    if (replay.actorId !== input.actorId || metadata?.requestHash !== requestHash ||
      metadata?.resultRevision !== assuranceAssignmentRevision(incident)) {
      throw new ConflictError("The assignment request or source changed. Refresh before starting a new assignment.")
    }
    await revalidateModules()
    revalidate(incident.definition.requiredPermission)
    return incident
  }
  if (assuranceAssignmentRevision(incident) !== input.expectedRevision) {
    throw new ConflictError("The incident changed. Refresh and review its current assignment before retrying.")
  }
  if (!activeStatuses.has(incident.status)) throw new BusinessRuleError("Finalized incidents must be reopened before assignment.")
  // Preserve in-progress work. Routing an owner never resolves or certifies its source.
  const status = incident.status === "IN_PROGRESS" ? "IN_PROGRESS" : "ASSIGNED"
  const before = {status: incident.status, ownerId: incident.ownerId, assignedRole: incident.assignedRole, dueAt: incident.dueAt?.toISOString() ?? null}
  revalidate(incident.definition.requiredPermission)
  await revalidateModules()
  revalidate(incident.definition.requiredPermission)
  const updated = await tx.workflowAssuranceIncident.update({where: {id: incident.id}, data: {ownerId: input.ownerId, assignedRole: incident.definition.ownerRole, dueAt, status}})
  const after = {status: updated.status, ownerId: updated.ownerId, assignedRole: updated.assignedRole, dueAt: updated.dueAt?.toISOString() ?? null}
  const metadata = {assignmentRequestId: input.requestId, requestHash, expectedRevision: input.expectedRevision,
    resultRevision: assuranceAssignmentRevision(updated), sourceHash: incident.sourceHash,
    assignmentScope, sourceType: incident.sourceType, sourceFingerprint: incident.fingerprint, occurrenceCount: incident.occurrenceCount, before, after}
  await tx.workflowAssuranceIncidentEvent.create({data: {organizationId: input.organizationId, incidentId: incident.id,
    eventType: "ASSIGNED", fromStatus: incident.status, toStatus: updated.status, actorId: input.actorId,
    message: "Workflow assurance incident assigned", metadata}})
  await tx.auditLog.create({data: {organizationId: input.organizationId, userId: input.actorId,
    entityType: "WorkflowAssuranceIncident", entityId: incident.id, action: "WORKFLOW_ASSURANCE_INCIDENT_ASSIGNED",
    changes: {before, after, sourceHash: incident.sourceHash, assignmentRequestId: input.requestId}}})
  return updated
}
