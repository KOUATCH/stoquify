import "server-only"
import { Prisma, type AccountantAccessGrant } from "@prisma/client"
import { db } from "@/prisma/db"
import { ConflictError, ForbiddenError, IdempotencyConflictError, BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { lockFirmManagementAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { accountantScopeKeys } from "./managed-accountant-access.service"
import { firmEngagementCommandSchema, firmEngagementReadSchema } from "./firm-engagement.schemas"

export type FirmEngagementActor = { homeOrganizationId: string; actorId: string; session: { id: string; token: string } }
export type FirmEngagementCommandResult = { engagementId: string; version: number; status: string; assignmentId?: string; grantId?: string }

function requireGrant(grants: AccountantAccessGrant[], clientId: string, userId: string, at: Date) {
  const rows = grants.filter(g => g.accountantUserId === userId && g.organizationId === clientId &&
    accountantScopeKeys(clientId, userId).includes(g.activeScopeKey ?? "") && g.status === "ACTIVE" &&
    !g.revokedAt && !g.revokedById && g.effectiveFrom <= at && g.expiresAt > at)
  if (rows.length !== 1) throw new ForbiddenError("An active named client mandate is required.")
  return rows[0]
}

/** Home identity/session are supplied by protect, never parsed from form data. */
export async function executeFirmEngagementCommand(actor: FirmEngagementActor, raw: unknown): Promise<FirmEngagementCommandResult> {
  const input = firmEngagementCommandSchema.parse(raw)
  try {
    return await db.$transaction(async tx => {
      const key = `firm-engagement:${input.idempotencyKey}`
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor.homeOrganizationId + ":" + key}, 0))::text`)
      const previous = input.command === "CREATE" ? null : await tx.firmEngagement.findFirst({ where: { id: input.engagementId, firmOrganizationId: actor.homeOrganizationId } })
      if (input.command !== "CREATE" && !previous) throw new ForbiddenError()
      const clientId = input.command === "CREATE" ? input.clientOrganizationId : previous!.clientOrganizationId
      if (clientId === actor.homeOrganizationId) throw new ForbiddenError()
      const restrictOnly = input.command === "REMOVE_ASSIGNMENT" || (input.command === "TRANSITION" && input.status !== "ACTIVE")
      const authority = await lockFirmManagementAuthorityInTx(tx, { ...actor, organizationId: clientId, restrictOnly })
      const enrollmentCandidate = input.command === "ENROLL"
        ? await tx.accountantAccessGrant.findFirst({ where: { id: input.grantId, organizationId: clientId }, select: { accountantUserId: true } }) : null
      if (input.command === "ENROLL" && !enrollmentCandidate) throw new ForbiddenError()
      // Staff rows are SHARE locked; no user/role updates occur in this transaction.
      const staffIds = [...new Set([actor.actorId, ...(input.command === "CREATE" ? [input.ownerUserId] : []),
        ...("accountantUserId" in input ? [input.accountantUserId] : []),
        ...(enrollmentCandidate ? [enrollmentCandidate.accountantUserId] : [])])].sort()
      await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id IN (${Prisma.join(staffIds)}) ORDER BY id FOR SHARE`)
      const staff = await tx.user.findMany({ where: { id: { in: staffIds }, organizationId: actor.homeOrganizationId } })
      const checkStaff = (at: Date) => {
        if (staff.length !== staffIds.length || staff.some(u => !isUsableAccount(u, at))) throw new ForbiddenError("Current firm staff are required.")
      }
      // One client's mandate rows, before any engagement row. Never a portfolio transaction.
      const grants = await tx.$queryRaw<AccountantAccessGrant[]>(Prisma.sql`SELECT g.* FROM accountant_access_grants g JOIN users u ON u.id=g."accountantUserId"
        WHERE g."organizationId"=${clientId} AND u."organizationId"=${actor.homeOrganizationId} ORDER BY g.id FOR UPDATE OF g`)
      if (previous) await tx.$queryRaw(Prisma.sql`SELECT id FROM firm_engagements WHERE id=${previous.id} FOR UPDATE`)
      const current = previous ? await tx.firmEngagement.findUniqueOrThrow({ where: { id: previous.id } }) : null
      await authority.revalidate()
      checkStaff(new Date())
      const commandHash = hashBusinessPayload({ actorId: actor.actorId, input })
      const replay = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: {
        organizationId: actor.homeOrganizationId, eventSource: "INTERNAL", idempotencyKey: key,
      } } })
      if (replay) {
        const payload = replay.payload as { commandHash?: string; result?: FirmEngagementCommandResult }
        if (payload.commandHash !== commandHash || !payload.result) throw new IdempotencyConflictError()
        return payload.result
      }
      if (current && input.command !== "CREATE" && current.version !== input.expectedVersion) throw new ConflictError("Engagement version changed. Reload and retry.")
      if (current?.status === "ENDED") throw new BusinessRuleError("An ended engagement is retained and cannot be changed.")
      const at = new Date()
      let engagement = current
      let assignmentId: string | undefined, grantId: string | undefined
      // Rechecked immediately before commit as validity can expire during waits.
      const requiredGrants: AccountantAccessGrant[] = []
      const mandate = (userId: string) => {
        const grant = requireGrant(grants, clientId, userId, new Date()); requiredGrants.push(grant); return grant
      }
      if (input.command === "CREATE") {
        mandate(actor.actorId)
        if (input.effectiveFrom >= input.expiresAt || input.expiresAt <= at) throw new BusinessRuleError("A valid engagement window is required.")
        engagement = await tx.firmEngagement.create({ data: { firmOrganizationId: actor.homeOrganizationId,
          clientOrganizationId: clientId, ownerUserId: input.ownerUserId, createdById: actor.actorId,
          scope: input.scope, effectiveFrom: input.effectiveFrom, expiresAt: input.expiresAt } })
      } else if (input.command === "TRANSITION") {
        const allowed = { DRAFT: ["ACTIVE", "ENDED"], ACTIVE: ["SUSPENDED", "ENDED"], SUSPENDED: ["ACTIVE", "ENDED"], ENDED: [] }
        if (!(allowed[current!.status] as string[]).includes(input.status)) throw new BusinessRuleError("Invalid engagement transition.")
        if (input.status === "ACTIVE") {
          if (current!.effectiveFrom > at || current!.expiresAt <= at) throw new ForbiddenError("The engagement is outside its effective window.")
          const links = await tx.firmEngagementGrantLink.findMany({ where: { engagementId: current!.id } })
          const assignments = await tx.firmEngagementAssignment.findMany({ where: { engagementId: current!.id, endedAt: null, effectiveFrom: { lte: at }, expiresAt: { gt: at } } })
          if (!assignments.some(a => links.some(l => l.accountantUserId === a.accountantUserId && grants.some(g =>
            g.id === l.grantId && g.status === "ACTIVE" && !g.revokedAt && !g.revokedById && g.effectiveFrom <= at && g.expiresAt > at)))) throw new ForbiddenError("Activation requires an assigned, explicitly enrolled mandate.")
        }
        const transition = await tx.firmEngagementTransition.create({ data: { engagementId: current!.id,
          firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: clientId, actorId: actor.actorId,
          fromStatus: current!.status, toStatus: input.status, version: current!.version + 1,
          reason: input.reason, idempotencyKey: input.idempotencyKey } })
        engagement = await tx.firmEngagement.update({ where: { id: current!.id }, data: { status: input.status, version: transition.version, lastTransitionId: transition.id } })
      } else if (input.command === "ENROLL") {
        const selected = grants.find(g => g.id === input.grantId)
        if (!selected || selected.accountantUserId !== enrollmentCandidate!.accountantUserId || mandate(selected.accountantUserId).id !== selected.id) throw new ForbiddenError()
        const person = await tx.user.findFirst({ where: { id: selected.accountantUserId, organizationId: actor.homeOrganizationId } })
        if (!person || !isUsableAccount(person, at)) throw new ForbiddenError()
        const assignment = await tx.firmEngagementAssignment.findFirst({ where: { engagementId: current!.id, accountantUserId: selected.accountantUserId, endedAt: null } })
        if (!assignment) throw new ForbiddenError("Assign the named accountant before explicit enrollment.")
        const linked = await tx.firmEngagementGrantLink.findUnique({ where: { grantId: selected.id } })
        if (linked) throw new ConflictError("The mandate is already enrolled; retry with its original command key.")
        await tx.firmEngagementGrantLink.create({ data: { engagementId: current!.id, firmOrganizationId: actor.homeOrganizationId,
          clientOrganizationId: clientId, accountantUserId: selected.accountantUserId, grantId: selected.id, enrolledById: actor.actorId } })
        grantId = selected.id
      } else {
        if (input.command === "REMOVE_ASSIGNMENT" || input.command === "HANDOVER") {
          const old = await tx.firmEngagementAssignment.findFirst({ where: { id: input.assignmentId, engagementId: current!.id } })
          if (!old) throw new ForbiddenError()
          if (old.endedAt || old.version !== input.expectedAssignmentVersion) throw new ConflictError("Assignment version changed.")
          if (input.command === "HANDOVER" && input.accountantUserId === old.accountantUserId) throw new BusinessRuleError("A handover requires different named staff.")
          await tx.firmEngagementAssignment.update({ where: { id: old.id }, data: { endedAt: at, endedById: actor.actorId, endReason: input.reason } })
          assignmentId = old.id
        }
        if (input.command === "ASSIGN" || input.command === "HANDOVER") {
          const grant = mandate(input.accountantUserId)
          const last = await tx.firmEngagementAssignment.findFirst({ where: { engagementId: current!.id, accountantUserId: input.accountantUserId }, orderBy: { version: "desc" } })
          const expected = input.command === "HANDOVER" ? input.expectedNewAssignmentVersion : input.expectedAssignmentVersion
          if ((last?.version ?? 0) !== expected || (last && !last.endedAt)) throw new ConflictError("Assignment version changed or a current assignment already exists.")
          if (input.effectiveFrom < current!.effectiveFrom || input.expiresAt > current!.expiresAt ||
            input.effectiveFrom < grant.effectiveFrom || input.expiresAt > grant.expiresAt ||
            input.effectiveFrom >= input.expiresAt || input.expiresAt <= at ||
            (input.scope !== "READ_ONLY" && (current!.scope === "READ_ONLY" || grant.role === "READ_ONLY"))) throw new BusinessRuleError("Assignment exceeds engagement or mandate terms.")
          const assignment = await tx.firmEngagementAssignment.create({ data: { engagementId: current!.id,
            firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: clientId, accountantUserId: input.accountantUserId,
            createdById: actor.actorId, version: expected + 1, scope: input.scope, effectiveFrom: input.effectiveFrom, expiresAt: input.expiresAt } })
          assignmentId = assignment.id
        }
      }
      const result: FirmEngagementCommandResult = { engagementId: engagement!.id, version: engagement!.version, status: engagement!.status,
        ...(assignmentId ? { assignmentId } : {}), ...(grantId ? { grantId } : {}) }
      await recordBusinessEventInTx(tx, { organizationId: actor.homeOrganizationId, actorId: actor.actorId,
        eventType: "FIRM_ENGAGEMENT_" + input.command, eventSource: "INTERNAL", idempotencyKey: key,
        sourceEntityType: "FirmEngagement", sourceId: engagement!.id, payload: { commandHash, result },
        outboxMessages: [{ channel: "NOTIFICATION", eventName: "firm-engagement.changed", payload: { engagementId: engagement!.id, command: input.command } }] })
      const commitAt = new Date()
      await authority.revalidate(commitAt); checkStaff(commitAt)
      requiredGrants.forEach(g => requireGrant([g], clientId, g.accountantUserId, commitAt))
      if (input.command === "TRANSITION" && input.status === "ACTIVE" && engagement!.expiresAt <= commitAt) {
        throw new ForbiddenError("The engagement expired before activation completed.")
      }
      return result
    }, { isolationLevel: "ReadCommitted", timeout: 30000 })
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new ConflictError("A competing engagement command already created this record. Reload and retry.")
    throw error
  }
}

/** Retained management metadata only; never a financial-data permission. */
export async function getFirmEngagement(actor: FirmEngagementActor, raw: unknown) {
  const input = firmEngagementReadSchema.parse(raw)
  return db.$transaction(async tx => {
    const authority = await lockFirmManagementAuthorityInTx(tx, { ...actor, organizationId: actor.homeOrganizationId, restrictOnly: true }, true)
    const result = await tx.firmEngagement.findFirst({ where: { id: input.engagementId, firmOrganizationId: actor.homeOrganizationId },
      include: { assignments: true, grantLinks: true, transitions: { orderBy: { version: "asc" } } } })
    if (!result) throw new ForbiddenError()
    await authority.revalidate()
    return result
  }, { isolationLevel: "ReadCommitted" })
}
