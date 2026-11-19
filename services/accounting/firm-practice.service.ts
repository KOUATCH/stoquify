import "server-only"
import { Prisma, type FirmPracticeRevision } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { lockAccountantExportAuthorityInTx, lockFirmManagementAuthorityInTx, lockWorkpaperAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import type { WorkpaperActor } from "./review-workpaper.service"
import { balanceSheetHash } from "./balance-sheet-contract"
import { practiceCommandSchema, practicePayloadSchema, practiceReadSchema, summarizePractice,
  currentPracticeRecords, type PracticeRecord } from "./firm-practice.contract"

const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30000, maxWait: 10000 }
type Scope = { clientOrganizationId?: string; periodId: string; engagementId: string }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const key = (actor: WorkpaperActor, scope: Scope) => `firm-practice:${actor.homeOrganizationId}:${scope.engagementId}:${scope.periodId}`
function view(row: FirmPracticeRevision): PracticeRecord {
  const payload = practicePayloadSchema.parse(row.payload)
  if (row.kind !== payload.kind || balanceSheetHash({ payload, subjectUserId: row.subjectUserId, recordedById: row.recordedById }) !== row.contentHash)
    throw new ConflictError("Practice revision integrity is invalid.")
  return { id: row.id, recordKey: row.recordKey, version: row.version, payload, subjectUserId: row.subjectUserId,
    recordedById: row.recordedById, actorId: row.actorId, reviewedById: row.reviewedById,
    operation: row.operation, reason: row.reason, createdAt: row.createdAt.toISOString() }
}
async function authority(tx: Prisma.TransactionClient, actor: WorkpaperActor, scope: Scope,
  manager: boolean, economics: boolean, operation: "read" | "write" | "review" | "export") {
  const clientId = scope.clientOrganizationId
  if (!clientId || clientId === actor.homeOrganizationId) throw new ForbiddenError("This is a firm-owned workspace.")
  const management = manager ? await lockFirmManagementAuthorityInTx(tx,
    { ...actor, organizationId: clientId, restrictOnly: true }, operation === "read" || operation === "export") : null
  const work = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId: clientId },
    operation === "read" || operation === "export" ? "workpaper-read" : operation === "review" ? "workpaper-review" : "workpaper-prepare")
  const exportAccess = operation === "export" ? await lockAccountantExportAuthorityInTx(tx, { ...actor, organizationId: clientId, requireCloseRead: true }) : null
  // The reusable authority has SHARE-locked the current actor, memberships and roles.
  const user = await tx.user.findUniqueOrThrow({ where: { id: actor.actorId }, select: { roles: { select: { organizationId: true, permissions: true } } } })
  const permissions = expandPermissions(user.roles.filter(row => row.organizationId === actor.homeOrganizationId).flatMap(row => row.permissions))
  const canManage = hasRbacPermission(permissions, "accounting.close.accountant.invite")
  const canReadEconomics = canManage && hasRbacPermission(permissions, "finance.profitability.read")
  if (economics && (!manager || !canReadEconomics)) throw new ForbiddenError("Current firm management and profitability permission are required.")
  const engagement = await tx.firmEngagement.findFirst({ where: { id: scope.engagementId,
    firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: clientId, status: "ACTIVE",
    grantLinks: { some: { accountantUserId: actor.actorId } } } })
  if (!engagement) throw new ForbiddenError("The named mandate must be enrolled in this engagement.")
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "accounting_periods" WHERE "id"=${scope.periodId} AND "organizationId"=${clientId} FOR SHARE`)
  const period = await tx.accountingPeriod.findFirst({ where: { id: scope.periodId, organizationId: clientId } })
  if (!period) throw new ForbiddenError()
  async function revalidate() {
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    await work.revalidate(at); if (management) await management.revalidate(at); if (exportAccess) await exportAccess.revalidate(at)
    if (engagement!.effectiveFrom > at || engagement!.expiresAt <= at) throw new ForbiddenError("The engagement has expired.")
  }
  await revalidate()
  return { revalidate, period, canManage, canReadEconomics, permissions }
}
async function history(tx: Prisma.TransactionClient, actor: WorkpaperActor, scope: Scope, manager: boolean, economics: boolean) {
  const rows = await tx.firmPracticeRevision.findMany({ where: { firmOrganizationId: actor.homeOrganizationId,
    clientOrganizationId: scope.clientOrganizationId, engagementId: scope.engagementId, periodId: scope.periodId,
    ...(!economics ? { kind: { not: "FEE" } } : {}), ...(!manager ? { subjectUserId: actor.actorId } : {}) },
    orderBy: [{ recordKey: "asc" }, { version: "desc" }], take: 501 })
  if (rows.length > 500) throw new BusinessRuleError("This engagement period exceeds the 500-revision development limit.")
  return rows
}

async function readFirmPracticeDesk(actor: WorkpaperActor, raw: unknown, exporting: boolean) {
  const input = practiceReadSchema.parse(raw)
  if (input.includeEconomics && input.mode !== "manager") throw new ForbiddenError()
  const periods = input.cohort.map(scope => `${scope.clientOrganizationId}:${scope.periodId}`)
  if (new Set(periods).size !== periods.length) throw new BusinessRuleError("Select each client period once; do not double-attribute it to engagements.")
  return db.$transaction(async tx => {
    const authorities = [], cohorts = []
    for (const scope of [...input.cohort].sort((a, b) => `${a.clientOrganizationId}:${a.engagementId}`.localeCompare(`${b.clientOrganizationId}:${b.engagementId}`))) {
      const access = await authority(tx, actor, scope, input.mode === "manager", input.includeEconomics, exporting ? "export" : "read")
      authorities.push(access)
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock_shared(hashtextextended(${key(actor, scope)}, 0))::text`)
      const rows = (await history(tx, actor, scope, input.mode === "manager", input.includeEconomics)).map(view)
      const at = new Date()
      const assignments = await tx.firmEngagementAssignment.findMany({ where: { engagementId: scope.engagementId,
        firmOrganizationId: actor.homeOrganizationId, endedAt: null, effectiveFrom: { lte: at }, expiresAt: { gt: at },
        ...(input.mode === "own" ? { accountantUserId: actor.actorId } : {}) },
        select: { accountantUserId: true, accountant: { select: { name: true, id: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true } } },
        orderBy: { accountantUserId: "asc" }, take: 101 })
      if (assignments.length > 100) throw new BusinessRuleError("Narrow the engagement: at most 100 assignees are supported.")
      const staff = assignments.filter(row => isUsableAccount(row.accountant, at)).map(row => ({ id: row.accountantUserId, name: row.accountant.name ?? row.accountantUserId }))
      const advisoryReferences = await tx.firmAdvisoryRevision.findMany({ where: { engagementId: scope.engagementId, periodId: scope.periodId,
        firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: scope.clientOrganizationId },
        select: { id: true, version: true, state: true }, orderBy: { version: "desc" }, take: 21 })
      const reviewReferences = await tx.accountantReview.findMany({ where: { organizationId: scope.clientOrganizationId, periodId: scope.periodId },
        select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 21 })
      cohorts.push({ ...scope, clientOrganizationId: scope.clientOrganizationId!, periodName: access.period.name,
        periodStart: access.period.startDate.toISOString(), periodEnd: access.period.endDate.toISOString(),
        staff, records: currentPracticeRecords(rows), history: rows, summary: summarizePractice(rows, staff.map(row => row.id)),
        canManage: access.canManage, canReadEconomics: access.canReadEconomics,
        advisoryReferences: advisoryReferences.slice(0, 20), reviewReferences: reviewReferences.slice(0, 20).map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
        referencesPartial: advisoryReferences.length > 20 || reviewReferences.length > 20 })
    }
    const desk = { observedAt: new Date().toISOString(), actorId: actor.actorId, mode: input.mode,
      coverage: input.mode === "manager" ? "EXPLICIT_ENGAGEMENT_PERIODS" as const : "OWN_ASSIGNMENTS_ONLY" as const,
      cohortCount: cohorts.length, economicsIncluded: input.includeEconomics, cohorts }
    let exportStamp: { contentHash: string; watermarkId: string } | null = null
    if (exporting) {
      const contentHash = balanceSheetHash(desk), rowCount = cohorts.reduce((sum, row) => sum + row.history.length, 0)
      const watermarkId = buildExportWatermark({ organizationId: actor.homeOrganizationId, actorId: actor.actorId, scope: "firm-practice-v1",
        filtersHash: contentHash, rowCount, fileType: "json", sensitivity: "financial", issuedAt: desk.observedAt })
      const safety = evaluateExportSafety({ action: "accounting.export", organizationId: actor.homeOrganizationId, actorId: actor.actorId,
        actorPermissions: authorities[0].permissions, lastAuthAt: actor.lastAuthAt?.getTime(), now: new Date(), resourceType: "FirmPracticeRevision",
        resourceId: contentHash, exportContext: { scope: "firm-practice-v1", filtersHash: contentHash, rowCount, fileType: "json", sensitivity: "financial", watermarkId } })
      if (!safety.allowed) throw new BusinessRuleError(safety.safeMessage, safety.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION")
      await auditExportSafetyDecision(tx, safety)
      exportStamp = { contentHash, watermarkId }
    }
    for (const access of authorities) await access.revalidate()
    return { desk, exportStamp }
  }, options)
}

export async function getFirmPracticeDesk(actor: WorkpaperActor, raw: unknown) {
  return (await readFirmPracticeDesk(actor, raw, false)).desk
}
/** Firm-owned snapshot: never put confidential fees into client ClosePackExport rows. */
export async function exportFirmPracticeSnapshot(actor: WorkpaperActor, raw: unknown) {
  const { desk, exportStamp } = await readFirmPracticeDesk(actor, raw, true)
  const snapshot = { report: desk, ...exportStamp!, notice: "Firm-confidential manual declarations and planning estimates; not a client close deliverable or certified financial report." }
  return { fileName: "firm-practice-snapshot.json", mimeType: "application/json", contentHash: exportStamp!.contentHash,
    contentBase64: Buffer.from(JSON.stringify(snapshot, null, 2)).toString("base64") }
}

export async function executeFirmPracticeCommand(actor: WorkpaperActor, raw: unknown) {
  const input = practiceCommandSchema.parse(raw)
  return db.$transaction(async tx => {
    // The lookup selects policy, never grants access or returns data. Current authority is checked before replay.
    const candidate = await tx.firmPracticeRevision.findFirst({ where: { engagementId: input.engagementId, periodId: input.periodId,
      firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: input.clientOrganizationId, recordKey: input.recordKey }, orderBy: { version: "desc" } })
    const kind = input.command === "SAVE" ? input.payload.kind : candidate?.kind
    if (!kind) throw new ForbiddenError()
    const access = await authority(tx, actor, input, kind !== "EFFORT" || input.command === "REVIEW", kind === "FEE", input.command === "REVIEW" ? "review" : "write")
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key(actor, input)}, 0))::text`)
    const where = { engagementId: input.engagementId, periodId: input.periodId, firmOrganizationId: actor.homeOrganizationId, clientOrganizationId: input.clientOrganizationId }
    const commandHash = balanceSheetHash({ actorId: actor.actorId, input })
    const replay = await tx.firmPracticeRevision.findFirst({ where: { ...where, idempotencyKey: input.idempotencyKey } })
    if (replay) {
      if (replay.commandHash !== commandHash) throw new IdempotencyConflictError()
      await access.revalidate()
      return { id: replay.id, version: replay.version, replayed: true }
    }
    const rows = await history(tx, actor, input, true, true)
    if (rows.length >= 500) throw new BusinessRuleError("The 500-revision development limit has been reached.")
    const previous = rows.find(row => row.recordKey === input.recordKey)
    if ((previous?.version ?? 0) !== input.expectedVersion) throw new ConflictError("Record changed. Refresh before correcting it.")
    if (previous && previous.kind !== kind) throw new ConflictError("A record cannot change kind.")
    const payload = input.command === "SAVE" ? input.payload : view(previous!).payload
    const subjectUserId = payload.kind === "PLAN" ? payload.assigneeId : payload.kind === "EFFORT" ? (previous?.subjectUserId ?? actor.actorId) : null
    if (payload.kind === "PLAN" && input.recordKey !== `plan:${payload.assigneeId ?? "unassigned"}`) throw new BusinessRuleError("Use one plan per assignee, including unassigned work.")
    if (payload.kind === "FEE" && input.recordKey !== `fee:${payload.currency}`) throw new BusinessRuleError("Use one budget per currency.")
    if (payload.kind === "EFFORT" && !input.recordKey.startsWith("effort:")) throw new BusinessRuleError("Invalid effort record key.")
    if (input.command === "SAVE" && payload.kind === "EFFORT" && subjectUserId !== actor.actorId) throw new ForbiddenError("Only the declaring person may correct their effort.")
    if (input.command === "REVIEW" && (!previous || previous.reviewedById || previous.actorId === actor.actorId || previous.recordedById === actor.actorId))
      throw new ForbiddenError("A different manager must review the current unreviewed revision.")
    let revalidateSubject = () => {}
    if (subjectUserId) {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "users" WHERE "id"=${subjectUserId} AND "organizationId"=${actor.homeOrganizationId} FOR SHARE`)
      const person = await tx.user.findFirst({ where: { id: subjectUserId, organizationId: actor.homeOrganizationId } })
      const assignment = await tx.firmEngagementAssignment.findFirst({ where: { engagementId: input.engagementId, accountantUserId: subjectUserId,
        firmOrganizationId: actor.homeOrganizationId, endedAt: null, effectiveFrom: { lte: new Date() }, expiresAt: { gt: new Date() } } })
      revalidateSubject = () => {
        const at = new Date()
        if (!person || !isUsableAccount(person, at) || !assignment || assignment.effectiveFrom > at || assignment.expiresAt <= at)
          throw new ForbiddenError("A current usable firm assignee is required.")
      }
      revalidateSubject()
    }
    if (payload.kind === "EFFORT") {
      const date = new Date(payload.workDate + "T00:00:00.000Z")
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== payload.workDate ||
        payload.workDate < access.period.startDate.toISOString().slice(0, 10) || payload.workDate > access.period.endDate.toISOString().slice(0, 10) ||
        payload.workDate > new Date().toISOString().slice(0, 10)) throw new BusinessRuleError("Work date must be a real, nonfuture date within this period.")
      if (payload.advisoryRevisionId && !await tx.firmAdvisoryRevision.findFirst({ where: { id: payload.advisoryRevisionId, ...where }, select: { id: true } })) throw new ForbiddenError("Advisory reference is outside this engagement period.")
      if (payload.reviewDecisionId && !await tx.accountantReview.findFirst({ where: { id: payload.reviewDecisionId,
        organizationId: input.clientOrganizationId, periodId: input.periodId }, select: { id: true } })) throw new ForbiddenError("Review reference is outside this client period.")
    }
    const recordedById = previous?.recordedById ?? actor.actorId
    const row = await tx.firmPracticeRevision.create({ data: { ...where, clientOrganizationId: input.clientOrganizationId!,
      recordKey: input.recordKey, version: input.expectedVersion + 1, kind, operation: input.command, subjectUserId, recordedById,
      actorId: actor.actorId, reviewedById: input.command === "REVIEW" ? actor.actorId : null, payload: json(payload),
      contentHash: balanceSheetHash({ payload, subjectUserId, recordedById }), reason: input.reason,
      idempotencyKey: input.idempotencyKey, commandHash } })
    await tx.auditLog.create({ data: { organizationId: actor.homeOrganizationId, userId: actor.actorId, action: "FIRM_PRACTICE_" + input.command,
      entityType: "FirmPracticeRevision", entityId: row.id, changes: json({ engagementId: input.engagementId, periodId: input.periodId, version: row.version, kind }) } })
    await access.revalidate(); revalidateSubject()
    return { id: row.id, version: row.version, replayed: false }
  }, options)
}
export type FirmPracticeDesk = Awaited<ReturnType<typeof getFirmPracticeDesk>>
