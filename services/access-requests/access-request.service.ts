import "server-only"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import type { RbacContext } from "@/lib/security/rbac"
import { hasAllRbacPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { accessDigest, canGrantMemberRole, hasMemberControl, memberAccessRevision } from "@/services/users/member-access-policy"
import { changeMemberAccessInTx } from "@/services/users/member-access.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { accessTargets, accessTargetInput, submitAccessRequestInput, requestRevisionInput, decideAccessRequestInput, requestListInput, requestHistoryInput, accessRequestEvent, type AccessRequestHistory, type AccessRequestReview, type AccessRequestView, type AccessRequestList } from "./access-request-contracts"

type Actor = Pick<RbacContext, "orgId" | "userId" | "permissions">
type Tx = Prisma.TransactionClient
type Row = {
  id: string; organizationId: string; requesterId: string; reviewerId: string | null; targetKey: string;
  reason: string; submissionHash: string; decision: string; application: string; revision: number;
  expiresAt: Date; createdAt: Date; decidedAt: Date | null; appliedAt: Date | null;
  decisionReason: string | null; selectedRoleIds: string[]; memberRevision: string | null;
  applicationCommandId: string | null; applicationError: string | null; grantAuditId: string | null; due: boolean;
}
type Session = { id: string; token: string }
const select = Prisma.sql`SELECT r.*, (r."expiresAt" <= CURRENT_TIMESTAMP) AS due FROM access_requests r`
export const accessRequestSubmissionsEnabled = () => process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED === "true"
const applicationEnabled = () => process.env.ACCESS_REQUEST_APPLICATION_ENABLED === "true"
export class AccessRequestModuleUnavailable extends BusinessRuleError {}

// This is current authority for the narrowly registered task, not a role label.
export function canReviewAccessRequests(permissions: readonly string[]) {
  return hasRbacPermission(permissions, "users.read") && hasMemberControl(permissions, "assign") && canGrantMemberRole(permissions, { permissions: [...accessTargets.items.permissions] })
}

async function actorInTx(tx: Tx, ctx: Actor) {
  const actor = await tx.user.findFirst({ where: { id: ctx.userId, organizationId: ctx.orgId, organization: { isActive: true, deletedAt: null } },
    select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: ctx.orgId }, select: { permissions: true } } } })
  if (!actor || !isUsableAccount(actor, new Date())) throw new ForbiddenError()
  return actor.roles.flatMap(role => role.permissions)
}

async function transaction<T>(ctx: Actor, run: (tx: Tx, grants: string[]) => Promise<T>) {
  if (!ctx.orgId || !ctx.userId) throw new ForbiddenError()
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`
    // Same lock order as the existing role/member services. It serializes
    // duplicate submissions, decisions, withdrawal and grant application.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${ctx.orgId} FOR UPDATE`
    const grants = await actorInTx(tx, ctx)
    return run(tx, grants)
  }, { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 1000 })
}

function reviewer(ctx: Actor, grants: string[], row?: Row) {
  if (![ctx.permissions, grants].every(canReviewAccessRequests) || row?.requesterId === ctx.userId) throw new ForbiddenError()
}

async function readRow(tx: Tx, ctx: Actor, id: string, grants: string[]) {
  const canReview = [ctx.permissions, grants].every(canReviewAccessRequests)
  const rows = await tx.$queryRaw<Row[]>(Prisma.sql`${select} WHERE r.id = ${id} AND r."organizationId" = ${ctx.orgId}
    AND (r."requesterId" = ${ctx.userId} OR ${canReview}) AND r."targetKey" = 'items' FOR UPDATE`)
  if (!rows[0]) throw new NotFoundError()
  return rows[0]
}

async function event(tx: Tx, ctx: Actor, row: Row, action: string) {
  await tx.auditLog.create({ data: { id: `access_request_${row.id}_${row.revision}`, organizationId: ctx.orgId, userId: ctx.userId,
    entityType: "AccessRequest", entityId: row.id, action, changes: { revision: row.revision, decision: row.decision, application: row.application, target: row.targetKey } } })
}

async function expire(tx: Tx, ctx: Actor, row: Row) {
  if (row.decision !== "PENDING" || !row.due) return row
  const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE access_requests SET decision = 'EXPIRED', revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${row.id} AND "organizationId" = ${ctx.orgId} AND revision = ${row.revision} RETURNING *`)
  const expired = rows[0]
  if (!expired) throw new ConflictError("Reload this request.")
  await event(tx, ctx, expired, "ACCESS_REQUEST_EXPIRED")
  return expired
}

function view(row: Row, ctx: Actor, grants: string[]): AccessRequestView {
  const canReview = [ctx.permissions, grants].every(canReviewAccessRequests) && row.requesterId !== ctx.userId
  return { id: row.id, target: accessTargetInput.parse(row.targetKey), requesterId: row.requesterId, reviewerId: row.reviewerId,
    reason: row.reason, decision: row.decision, application: row.application, revision: row.revision,
    createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null, decisionReason: row.decisionReason,
    applicationError: ["REVIEW_REQUIRED", "FRESH_AUTH_REQUIRED", "MODULE_UNAVAILABLE", "RETRY_REQUIRED"].includes(row.applicationError ?? "") ? row.applicationError : null,
    canCheckAccess: row.requesterId === ctx.userId && row.decision === "APPROVED" && row.application === "APPLIED",
    canWithdraw: row.requesterId === ctx.userId && (row.decision === "PENDING" || (row.decision === "APPROVED" && row.application !== "APPLIED")),
    canReview: canReview && row.decision === "PENDING", canApply: applicationEnabled() && canReview && row.reviewerId === ctx.userId && row.decision === "APPROVED" && row.application !== "APPLIED" }
}

async function moduleAvailable(ctx: Actor) {
  const result = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, moduleSlug: "inventory",
    surfaceType: "action", surface: "access-request:items", accessIntent: "read", mode: "enforce", audit: false })
  if (!result.allowed) throw new AccessRequestModuleUnavailable("The inventory module is unavailable. A permission request cannot enable it.")
}

export async function submitAccessRequest(ctx: Actor, input: unknown) {
  const command = submitAccessRequestInput.parse(input)
  if (!accessRequestSubmissionsEnabled()) throw new BusinessRuleError("New access requests are currently unavailable.")
  await moduleAvailable(ctx)
  const id = accessDigest([ctx.orgId, ctx.userId, command.commandId]), hash = accessDigest(command)
  return transaction(ctx, async (tx, grants) => {
    const replay = await tx.$queryRaw<Row[]>(Prisma.sql`${select} WHERE r.id = ${id} AND r."organizationId" = ${ctx.orgId} AND r."requesterId" = ${ctx.userId}`)
    if (replay[0]) {
      if (replay[0].submissionHash !== hash) throw new IdempotencyConflictError()
      return view(await expire(tx, ctx, replay[0]), ctx, grants)
    }
    if (hasAllRbacPermissions(grants, [...accessTargets[command.target].permissions])) throw new BusinessRuleError("Your current roles already provide this permission. Refresh the task or ask an administrator to investigate its other controls.")
    const open = await tx.$queryRaw<Row[]>(Prisma.sql`${select} WHERE r."organizationId" = ${ctx.orgId} AND r."requesterId" = ${ctx.userId} AND r."targetKey" = ${command.target}
      AND (r.decision = 'PENDING' OR (r.decision = 'APPROVED' AND r.application <> 'APPLIED')) FOR UPDATE`)
    if (open[0]) {
      const current = await expire(tx, ctx, open[0])
      if (current.decision !== "EXPIRED") return view(current, ctx, grants)
    }
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`INSERT INTO access_requests (id, "organizationId", "requesterId", "targetKey", reason, "submissionHash", "expiresAt", "updatedAt")
      VALUES (${id}, ${ctx.orgId}, ${ctx.userId}, ${command.target}, ${command.reason}, ${hash}, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP) RETURNING *`)
    await event(tx, ctx, rows[0]!, "ACCESS_REQUEST_SUBMITTED")
    return view(rows[0]!, ctx, grants)
  })
}

export async function listAccessRequests(ctx: Actor, input: unknown): Promise<AccessRequestList> {
  const query = requestListInput.parse(input)
  return transaction(ctx, async (tx, grants) => {
    if (query.queue === "review") reviewer(ctx, grants)
    const scope = Prisma.sql`r."organizationId" = ${ctx.orgId} AND r."targetKey" = 'items' ${query.queue === "mine" ? Prisma.sql`AND r."requesterId" = ${ctx.userId}` : Prisma.sql`AND r."requesterId" <> ${ctx.userId}`}`
    if (query.beforeId) {
      const anchor = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT r.id FROM access_requests r WHERE ${scope} AND r.id = ${query.beforeId}`)
      if (!anchor.length) throw new ConflictError("Reload the request list.")
    }
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`${select} WHERE ${scope}
      ${query.beforeId ? Prisma.sql`AND (r."createdAt", r.id) < (SELECT p."createdAt", p.id FROM access_requests p WHERE p."organizationId" = ${ctx.orgId} AND p.id = ${query.beforeId})` : Prisma.empty}
      ORDER BY r."createdAt" DESC, r.id DESC LIMIT 26`)
    const entries: AccessRequestView[] = []
    for (const row of rows.slice(0, 25)) entries.push(view(await expire(tx, ctx, row), ctx, grants))
    return { entries, nextCursor: rows.length > 25 ? entries[24]!.id : null, canReview: [ctx.permissions, grants].every(canReviewAccessRequests), submissionsEnabled: accessRequestSubmissionsEnabled() }
  })
}

export async function withdrawAccessRequest(ctx: Actor, input: unknown) {
  const command = requestRevisionInput.parse(input)
  return transaction(ctx, async (tx, grants) => {
    const original = await readRow(tx, ctx, command.id, grants)
    if (original.requesterId !== ctx.userId) throw new ForbiddenError()
    const row = await expire(tx, ctx, original)
    if (row.decision === "EXPIRED") return view(row, ctx, grants)
    if (row.decision === "WITHDRAWN") return view(row, ctx, grants)
    if (row.revision !== command.revision || !view(row, ctx, grants).canWithdraw) throw new ConflictError("Reload the request before withdrawing it.")
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE access_requests SET decision = 'WITHDRAWN', application = 'NOT_REQUIRED', revision = revision + 1, "applicationError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${row.id} AND "organizationId" = ${ctx.orgId} AND revision = ${row.revision} RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload this request.")
    await event(tx, ctx, rows[0], "ACCESS_REQUEST_WITHDRAWN")
    return view(rows[0], ctx, grants)
  })
}

// Same member revision/grant policy as the source editor, read with request and
// role state in one locked transaction. A preview is never grant authority.
export async function previewAccessRequest(ctx: Actor, input: unknown): Promise<AccessRequestReview> {
  const command = requestRevisionInput.parse(input)
  return transaction(ctx, async (tx, grants) => {
    const row = await readRow(tx, ctx, command.id, grants)
    reviewer(ctx, grants, row)
    if (row.revision !== command.revision || row.decision !== "PENDING" || row.due) throw new ConflictError("Reload this request.")
    const { member, roles, revision } = await reviewSnapshot(tx, ctx, row)
    return { request: row.id, revision: row.revision, memberRevision: revision, existingRoleCount: member.roles.length,
      roles: roles.filter(role => !member.roles.some(existing => existing.id === role.id) && [ctx.permissions, grants].every(authority => canGrantMemberRole(authority, role)))
        .map(role => ({ id: role.id, nameEn: role.nameEn, nameFr: role.nameFr, permissions: [...role.permissions].sort() })) }
  })
}

async function reviewSnapshot(tx: Tx, ctx: Actor, row: Row) {
  const member = await tx.user.findFirst({ where: { id: row.requesterId, organizationId: ctx.orgId }, select: {
    id: true, email: true, firstName: true, lastName: true, updatedAt: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true,
    roles: { select: { id: true, organizationId: true, permissions: true } } } })
  if (!member || !isUsableAccount(member, new Date()) || member.roles.some(role => role.organizationId !== ctx.orgId)) throw new BusinessRuleError("The member needs administrator review.")
  const roles = await tx.role.findMany({ where: { organizationId: ctx.orgId }, orderBy: { id: "asc" } })
  return { member, roles, revision: memberAccessRevision(member, member.roles.map(role => role.id), roles) }
}

export async function decideAccessRequest(ctx: Actor, input: unknown) {
  const command = decideAccessRequestInput.parse(input)
  return transaction(ctx, async (tx, grants) => {
    const row = await readRow(tx, ctx, command.id, grants)
    reviewer(ctx, grants, row)
    if (row.revision !== command.revision || row.decision !== "PENDING" || row.due) throw new ConflictError("Reload this request; it changed or expired.")
    // Approval selects additions only. Never silently remove existing roles.
    const { member, roles: tenantRoles, revision } = await reviewSnapshot(tx, ctx, row)
    if (revision !== command.memberRevision) throw new ConflictError("The member or role definitions changed. Review again.")
    let roleIds: string[] = []
    if (command.decision === "APPROVED") {
      const roles = tenantRoles.filter(role => command.roleIds.includes(role.id))
      if (!roles.length || roles.length !== command.roleIds.length || roles.some(role => !canGrantMemberRole(grants, role) || !canGrantMemberRole(ctx.permissions, role))) throw new ForbiddenError()
      if (roles.some(role => member.roles.some(existing => existing.id === role.id))) throw new ConflictError("Select only new roles.")
      if (!hasAllRbacPermissions([...member.roles.flatMap(role => role.permissions), ...roles.flatMap(role => role.permissions)], [...accessTargets.items.permissions])) throw new BusinessRuleError("The selected roles do not provide the requested access.")
      roleIds = [...new Set([...member.roles.map(role => role.id), ...command.roleIds])].sort()
      if (roleIds.length > 100) throw new BusinessRuleError("The proposed assignment exceeds the member role limit.")
    } else if (command.roleIds.length) throw new BusinessRuleError("A declined request cannot select roles.")
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE access_requests SET decision = ${command.decision}, application = ${command.decision === "APPROVED" ? "PENDING" : "NOT_REQUIRED"},
      "reviewerId" = ${ctx.userId}, "decidedAt" = CURRENT_TIMESTAMP, "decisionReason" = ${command.reason}, "selectedRoleIds" = ${roleIds}::text[],
      "memberRevision" = ${command.memberRevision}, "applicationCommandId" = ${randomUUID()}, revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${row.id} AND "organizationId" = ${ctx.orgId} AND revision = ${row.revision} RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload this request.")
    await event(tx, ctx, rows[0], "ACCESS_REQUEST_DECIDED")
    return view(rows[0], ctx, grants)
  })
}

export async function readAccessRequestHistory(ctx: Actor, input: unknown): Promise<AccessRequestHistory> {
  const command = requestHistoryInput.parse(input)
  return transaction(ctx, async (tx, grants) => {
    const row = await readRow(tx, ctx, command.id, grants)
    if (row.revision !== command.revision) throw new ConflictError("The request changed. Reload its current status.")
    const scope = Prisma.sql`a."organizationId" = ${ctx.orgId} AND a."entityType" = 'AccessRequest' AND a."entityId" = ${row.id}
      AND a.action IN ('ACCESS_REQUEST_SUBMITTED','ACCESS_REQUEST_EXPIRED','ACCESS_REQUEST_WITHDRAWN','ACCESS_REQUEST_DECIDED','ACCESS_REQUEST_APPLIED','ACCESS_REQUEST_APPLICATION_FAILED')`
    if (command.beforeId) {
      const cursor = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT a.id FROM audit_logs a WHERE ${scope} AND a.id = ${command.beforeId}`)
      if (!cursor.length) throw new ConflictError("History cursor unavailable.")
    }
    const events = await tx.$queryRaw<{ id: string; createdAt: Date; userId: string; action: string; safeState: unknown }[]>(Prisma.sql`SELECT a.id, a."createdAt", a."userId", a.action,
      jsonb_build_object('revision', a.changes->'revision', 'decision', a.changes->'decision', 'application', a.changes->'application', 'target', a.changes->'target') AS "safeState"
      FROM audit_logs a WHERE ${scope}
      ${command.beforeId ? Prisma.sql`AND (a."createdAt", a.id) < (SELECT p."createdAt", p.id FROM audit_logs p WHERE p."organizationId" = ${ctx.orgId} AND p.id = ${command.beforeId})` : Prisma.empty}
      ORDER BY a."createdAt" DESC, a.id DESC LIMIT 26`)
    return { entries: events.slice(0, 25).map(entry => {
      const state = accessRequestEvent.safeParse(entry.safeState)
      return { id: entry.id, at: entry.createdAt.toISOString(), actorId: entry.userId, action: entry.action, state: state.success ? state.data : null }
    }), nextCursor: events.length > 25 ? events[24]!.id : null }
  })
}

export async function applyAccessRequest(ctx: Actor, input: unknown, session: Session) {
  const command = requestRevisionInput.parse(input)
  if (!applicationEnabled()) throw new BusinessRuleError("Access application is currently unavailable.")
  await moduleAvailable(ctx)
  try {
    return await transaction(ctx, async (tx, grants) => {
      const row = await readRow(tx, ctx, command.id, grants)
      reviewer(ctx, grants, row)
      if (row.reviewerId !== ctx.userId || row.decision !== "APPROVED") throw new ForbiddenError()
      if (row.application === "APPLIED") return view(row, ctx, grants)
      if (row.revision !== command.revision || !row.memberRevision || !row.applicationCommandId) throw new ConflictError("Reload the approved request.")
      const receipt = await changeMemberAccessInTx(tx, { organizationId: ctx.orgId, actorId: ctx.userId, targetUserId: row.requesterId, session,
        command: { requestId: row.applicationCommandId, expectedRevision: row.memberRevision, roleIds: row.selectedRoleIds, operation: "roles", reason: `Access request ${row.id}` } })
      const member = await tx.user.findFirst({ where: { id: row.requesterId, organizationId: ctx.orgId }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: ctx.orgId }, select: { permissions: true } } } })
      if (!member || !isUsableAccount(member, new Date()) || !hasAllRbacPermissions(member.roles.flatMap(role => role.permissions), [...accessTargets.items.permissions])) throw new BusinessRuleError("Effective permission verification failed.")
      const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE access_requests SET application = 'APPLIED', "appliedAt" = CURRENT_TIMESTAMP, "grantAuditId" = ${receipt.auditId}, "applicationError" = NULL,
        revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ${row.id} AND "organizationId" = ${ctx.orgId} AND revision = ${row.revision} RETURNING *`)
      if (!rows[0]) throw new ConflictError("Reload this request.")
      await event(tx, ctx, rows[0], "ACCESS_REQUEST_APPLIED")
      return view(rows[0], ctx, grants)
    })
  } catch (error) {
    // The grant and APPLIED receipt above commit together. Failure recording is
    // fenced by the original revision, so a lost response cannot overwrite success.
    try {
      await transaction(ctx, async (tx, grants) => {
        reviewer(ctx, grants)
        const row = await readRow(tx, ctx, command.id, grants)
        if (row.reviewerId !== ctx.userId || row.decision !== "APPROVED" || row.application === "APPLIED" || row.revision !== command.revision) return
        const code = error instanceof ApplicationError ? (error.code === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "REVIEW_REQUIRED") : "RETRY_REQUIRED"
        const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE access_requests SET application = 'FAILED', "applicationError" = ${code}, revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = ${row.id} AND "organizationId" = ${ctx.orgId} AND revision = ${row.revision} RETURNING *`)
        if (rows[0]) await event(tx, ctx, rows[0], "ACCESS_REQUEST_APPLICATION_FAILED")
      })
    } catch { /* Preserve the original failure; never invent a recorded outcome. */ }
    throw error
  }
}

export async function accessRequestReturnPath(ctx: Actor, id: string) {
  requestRevisionInput.shape.id.parse(id)
  await moduleAvailable(ctx)
  return transaction(ctx, async (tx, grants) => {
    const row = await readRow(tx, ctx, id, grants)
    if (row.requesterId !== ctx.userId || row.decision !== "APPROVED" || row.application !== "APPLIED" || !hasAllRbacPermissions(grants, [...accessTargets.items.permissions])) throw new ForbiddenError()
    return accessTargets.items.path
  })
}
