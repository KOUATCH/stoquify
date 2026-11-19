import "server-only"
import { Prisma, type FirmAdvisoryRevision } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { balanceSheetHash } from "./balance-sheet-contract"
import { readReviewWorkpaperBinderInTx, type WorkpaperActor } from "./review-workpaper.service"
import { lockAccountantExportAuthorityInTx, lockCloseEvidenceRecipientInTx, lockCloseEvidenceWorkAuthorityInTx,
  lockFirmManagementAuthorityInTx, lockWorkpaperAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import { readCloseEvidenceRequestTrackingInTx } from "./close-evidence-request-tracking"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { advisoryCommandSchema, advisoryExportSchema, advisoryListSchema, advisoryMetricsSchema, advisoryScopeSchema,
  ADVISORY_LIMITATIONS, durationMetric, type AdvisoryDocument, type AdvisoryRevisionView, type AdvisoryState } from "./advisory-outcomes.contract"
import { renderAdvisoryExport } from "./advisory-outcomes-export"

const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30000, maxWait: 10000 }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
type Scope = { clientOrganizationId?: string; periodId: string; engagementId: string }

/** Live mandate + assignment authority is acquired before these engagement/source
 * locks. An engagement label alone never grants client access. */
async function engagementInTx(tx: Prisma.TransactionClient, actor: WorkpaperActor, scope: Scope) {
  const clientOrganizationId = scope.clientOrganizationId ?? actor.homeOrganizationId
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "firm_engagements" WHERE "id" = ${scope.engagementId} FOR SHARE`)
  const row = await tx.firmEngagement.findFirst({ where: { id: scope.engagementId, clientOrganizationId } })
  const at = await readCloseAssessmentPublicationTimeInTx(tx)
  if (!row || row.status !== "ACTIVE" || row.effectiveFrom > at || row.expiresAt <= at ||
    ![row.firmOrganizationId, row.clientOrganizationId].includes(actor.homeOrganizationId)) throw new ForbiddenError("An active authorized engagement is required.")
  if (actor.homeOrganizationId === row.firmOrganizationId && !await tx.firmEngagementGrantLink.findFirst({
    where: { engagementId: row.id, accountantUserId: actor.actorId, clientOrganizationId, firmOrganizationId: actor.homeOrganizationId }, select: { id: true },
  })) throw new ForbiddenError("The named client mandate must be enrolled in this engagement.")
  return { row, firmView: actor.homeOrganizationId === row.firmOrganizationId,
    revalidate: (time: Date) => { if (row.effectiveFrom > time || row.expiresAt <= time) throw new ForbiddenError("The engagement has expired.") } }
}
function publicRevision(row: FirmAdvisoryRevision, sourceHash: string, reviewHash: string): AdvisoryRevisionView {
  const document = row.document as unknown as AdvisoryDocument
  if (balanceSheetHash(document) !== row.contentHash || document.sourceHash !== row.sourceHash || document.reviewHash !== row.reviewHash)
    throw new ConflictError("Retained advisory integrity is invalid.")
  return { id: row.id, version: row.version, state: row.state as AdvisoryState, actorId: row.actorId, createdAt: row.createdAt.toISOString(),
    document, contentHash: row.contentHash, freshness: row.sourceHash === sourceHash && row.reviewHash === reviewHash ? "CURRENT" : "REVIEW_REQUIRED" }
}
async function history(tx: Prisma.TransactionClient, scope: Scope, organizationId: string) {
  const rows = await tx.firmAdvisoryRevision.findMany({ where: { engagementId: scope.engagementId, periodId: scope.periodId, clientOrganizationId: organizationId },
    orderBy: { version: "desc" }, take: 101 })
  if (rows.length > 100) throw new BusinessRuleError("Advisory history exceeds the 100-revision pilot limit.")
  return rows
}
/** Retained deliveries remain investigable while a new assessment is incomplete
 * or exceeds the current pilot population. Unavailable proof is never current. */
async function advisoryReadSources(tx: Prisma.TransactionClient, organizationId: string, periodId: string) {
  try { return await readReviewWorkpaperBinderInTx(tx, organizationId, periodId) }
  catch (error) { if (error instanceof BusinessRuleError) return null; throw error }
}

export async function listAdvisoryEngagements(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryListSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-read")
    if (!await tx.accountingPeriod.findFirst({ where: { id: input.periodId, organizationId }, select: { id: true } })) throw new NotFoundError()
    const at = await readCloseAssessmentPublicationTimeInTx(tx), firmView = actor.homeOrganizationId !== organizationId
    const rows = await tx.firmEngagement.findMany({ where: { clientOrganizationId: organizationId, status: "ACTIVE", effectiveFrom: { lte: at }, expiresAt: { gt: at },
      ...(firmView ? { firmOrganizationId: actor.homeOrganizationId, grantLinks: { some: { accountantUserId: actor.actorId } } } : {}) },
      select: { id: true, firm: { select: { name: true } } }, orderBy: { id: "asc" }, take: 21 })
    if (rows.length > 20) throw new BusinessRuleError("More than 20 active engagements require a narrower workspace.")
    await authority.revalidate()
    return { firmView, engagements: rows.map(row => ({ id: row.id, label: row.firm.name })) }
  }, options)
}

export async function getAdvisoryDesk(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryScopeSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-read")
    const engagement = await engagementInTx(tx, actor, input)
    const binder = await advisoryReadSources(tx, organizationId, input.periodId)
    const rows = await history(tx, input, organizationId)
    const owners = await tx.user.findMany({ where: { organizationId, isActive: true, isLocked: false },
      select: { id: true, name: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true,
        roles: { select: { organizationId: true, permissions: true } } }, orderBy: { id: "asc" }, take: 101 })
    if (owners.length > 100) throw new BusinessRuleError("This pilot supports at most 100 client action owners.")
    await authority.revalidate(); engagement.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { sourceHash: binder?.sourceHash ?? "UNAVAILABLE", reviewHash: binder?.reviewHash ?? "UNAVAILABLE", workpaperState: binder?.reviewState ?? "UNAVAILABLE",
      latestVersion: rows[0]?.version ?? 0, firmView: engagement.firmView, owners: owners.filter(row => {
        const permissions = expandPermissions(row.roles.filter(role => role.organizationId === organizationId).flatMap(role => role.permissions))
        return isUsableAccount(row, new Date()) && ["accounting.close.read", "accounting.close.finding.comment"].every(p => hasRbacPermission(permissions, p))
      }).map(row => ({ id: row.id, name: row.name ?? row.id })),
      revisions: rows.filter(row => engagement.firmView || ["REVIEWED", "CLIENT_AGREED", "DELIVERED"].includes(row.state))
        .map(row => publicRevision(row, binder?.sourceHash ?? "UNAVAILABLE", binder?.reviewHash ?? "UNAVAILABLE")) }
  }, options)
}

/** Private notes have their own permission boundary and are never in a client DTO,
 * public document, canonical export, audit payload or metrics response. */
export async function getAdvisoryPrivateNotes(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryScopeSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-prepare")
    const engagement = await engagementInTx(tx, actor, input)
    if (!engagement.firmView) throw new ForbiddenError()
    const rows = await history(tx, input, organizationId)
    await authority.revalidate(); engagement.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { privateNote: rows[0]?.privateNote ?? "" }
  }, options)
}

export async function executeAdvisoryCommand(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryCommandSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = input.command === "DELIVER" ? await lockAccountantExportAuthorityInTx(tx, { ...actor, organizationId, requireCloseRead: true })
      : input.command === "AGREE" ? await lockCloseEvidenceWorkAuthorityInTx(tx, { ...actor, organizationId, requireCloseRead: true, operation: "respond" })
      : await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, input.command === "DRAFT" ? "workpaper-prepare" : "workpaper-review")
    const engagement = await engagementInTx(tx, actor, input)
    if (input.command === "AGREE" ? engagement.firmView : !engagement.firmView) throw new ForbiddenError("Client agreement and firm preparation/review/delivery use separate actors.")
    const binder = await readReviewWorkpaperBinderInTx(tx, organizationId, input.periodId)
    const rows = await history(tx, input, organizationId), latest = rows[0]
    const commandHash = balanceSheetHash({ actorId: actor.actorId, organizationId, input })
    const replay = rows.find(row => row.idempotencyKey === input.idempotencyKey)
    if (replay) {
      if (replay.commandHash !== commandHash) throw new IdempotencyConflictError()
      await authority.revalidate(); engagement.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: replay.id, version: replay.version, replayed: true, freshness: publicRevision(replay, binder.sourceHash, binder.reviewHash).freshness }
    }
    if (rows.length >= 100) throw new BusinessRuleError("The 100-revision limit is reached; retained deliveries remain readable.")
    if ((latest?.version ?? 0) !== input.expectedVersion || binder.sourceHash !== input.expectedSourceHash || binder.reviewHash !== input.expectedReviewHash)
      throw new ConflictError("Sources or advisory decisions changed. Refresh before proceeding.")
    if (binder.reviewState !== "REVIEWED") throw new BusinessRuleError("Obtain a current independent workpaper review first.")
    if (input.command !== "DRAFT" && (input.narrative !== undefined || input.privateNote !== undefined)) throw new BusinessRuleError("Revise narrative and private notes through a new draft.")
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    let document: AdvisoryDocument, state: AdvisoryState
    if (input.command === "DRAFT") {
      if (!input.narrative) throw new BusinessRuleError("Conclusions and follow-up actions are required.")
      const kinds = new Set(input.narrative.conclusions.map(row => row.kind))
      if (input.narrative.actions.some(row => !kinds.has(row.kind))) throw new BusinessRuleError("Each action must refer to an included conclusion.")
      document = { version: 1, engagementId: input.engagementId, organizationId, periodId: input.periodId,
        periodStart: binder.periodStart, periodEnd: binder.periodEnd, closeRunId: binder.closeRunId, sourceHash: binder.sourceHash,
        reviewHash: binder.reviewHash, sourceRevision: binder.sourceRevision, observedAt: binder.observedAt,
        confidence: "REVIEWED_SUPPORT_NOT_AUDIT_OPINION", limitations: ADVISORY_LIMITATIONS,
        observations: binder.schedules.filter(row => kinds.has(row.kind)), narrative: input.narrative,
        preparedById: actor.actorId, preparedAt: at.toISOString(), reviewedById: null, reviewedAt: null,
        agreedById: null, agreedAt: null, deliveredById: null, deliveredAt: null }
      state = "DRAFT"
    } else {
      if (!latest || publicRevision(latest, binder.sourceHash, binder.reviewHash).freshness !== "CURRENT") throw new ConflictError("Prepare a new draft against the current sources.")
      document = { ...latest.document as unknown as AdvisoryDocument }
      if (input.command === "REVIEW" || input.command === "CHANGES_REQUESTED") {
        if (latest.state !== "DRAFT") throw new ConflictError("Only the latest draft can be reviewed.")
        if (document.preparedById === actor.actorId) throw new BusinessRuleError("A different accountant must review the advisory narrative.", "SOD_VIOLATION")
        state = input.command === "REVIEW" ? "REVIEWED" : "CHANGES_REQUESTED"
        document.reviewedById = actor.actorId; document.reviewedAt = at.toISOString()
      } else if (input.command === "AGREE") {
        if (latest.state !== "REVIEWED") throw new ConflictError("Client agreement requires the latest independently reviewed version.")
        state = "CLIENT_AGREED"; document.agreedById = actor.actorId; document.agreedAt = at.toISOString()
      } else {
        if (latest.state !== "CLIENT_AGREED") throw new ConflictError("Delivery requires client agreement on this reviewed version.")
        state = "DELIVERED"; document.deliveredById = actor.actorId; document.deliveredAt = at.toISOString()
      }
    }
    const owners = []
    for (const ownerId of [...new Set(document.narrative.actions.map(row => row.ownerId))].sort())
      owners.push(await lockCloseEvidenceRecipientInTx(tx, { organizationId, recipientId: ownerId }))
    const contentHash = balanceSheetHash(document)
    const row = await tx.firmAdvisoryRevision.create({ data: { engagementId: input.engagementId, firmOrganizationId: engagement.row.firmOrganizationId,
      clientOrganizationId: organizationId, periodId: input.periodId, version: input.expectedVersion + 1, state,
      sourceHash: binder.sourceHash, reviewHash: binder.reviewHash, document: json(document), contentHash,
      privateNote: input.command === "DRAFT" ? input.privateNote ?? "" : latest.privateNote,
      actorId: actor.actorId, reason: input.reason, idempotencyKey: input.idempotencyKey, commandHash, createdAt: at } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "FirmAdvisoryRevision", entityId: row.id,
      action: `ADVISORY_${input.command}`, changes: json({ engagementId: input.engagementId, version: row.version, state, contentHash }) } })
    const finalAt = await readCloseAssessmentPublicationTimeInTx(tx)
    for (const owner of owners) owner.revalidate(finalAt)
    await authority.revalidate(finalAt); engagement.revalidate(finalAt)
    return { id: row.id, version: row.version, replayed: false, freshness: "CURRENT" as const }
  }, options)
}

export async function exportAdvisoryPack(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryExportSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockAccountantExportAuthorityInTx(tx, { ...actor, organizationId, requireCloseRead: true })
    const engagement = await engagementInTx(tx, actor, input)
    const binder = await advisoryReadSources(tx, organizationId, input.periodId)
    const row = await tx.firmAdvisoryRevision.findFirst({ where: { id: input.revisionId, engagementId: input.engagementId, periodId: input.periodId, clientOrganizationId: organizationId, state: "DELIVERED" } })
    if (!row) throw new NotFoundError("Select a delivered advisory version.")
    const view = publicRevision(row, binder?.sourceHash ?? "UNAVAILABLE", binder?.reviewHash ?? "UNAVAILABLE")
    // Export freshness is a current wrapper, never a mutation of historical delivery.
    const canonical = { document: view.document, revisionId: row.id, version: row.version, deliveryHash: row.contentHash, freshness: view.freshness }
    const contentHash = balanceSheetHash(canonical), rowCount = view.document.observations.reduce((sum, item) => sum + item.accounts.length, 0)
    const watermarkId = buildExportWatermark({ organizationId, actorId: actor.actorId, scope: "firm-advisory-v1", filtersHash: contentHash,
      rowCount, fileType: "json", sensitivity: "financial", issuedAt: row.createdAt.toISOString() })
    const safety = evaluateExportSafety({ action: "accounting.export", organizationId, actorId: actor.actorId, actorPermissions: actor.actorPermissions,
      lastAuthAt: actor.lastAuthAt?.getTime(), now: new Date(), resourceType: "FirmAdvisoryRevision", resourceId: row.id,
      exportContext: { scope: "firm-advisory-v1", filtersHash: contentHash, rowCount, fileType: input.format, sensitivity: "financial", watermarkId } })
    if (!safety.allowed) throw new BusinessRuleError(safety.safeMessage, safety.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION")
    const artifact = renderAdvisoryExport(canonical, input.format, contentHash, watermarkId)
    const retained = await tx.closePackExport.findFirst({ where: { organizationId, closeRunId: view.document.closeRunId, contentHash } }) ??
      await tx.closePackExport.create({ data: { organizationId, periodId: input.periodId, closeRunId: view.document.closeRunId, fileType: "advisory-json", watermarkId,
        contentHash, rowCount, isCertified: false, exportedById: actor.actorId, metadata: json({ kind: "firm-advisory-v1", canonical }) } })
    await auditExportSafetyDecision(tx, safety)
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "ClosePackExport", entityId: retained.id,
      action: "ADVISORY_EXPORT", changes: json({ revisionId: row.id, contentHash, artifactHash: artifact.artifactHash, freshness: view.freshness, format: input.format }) } })
    await authority.revalidate(); engagement.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { ...artifact, contentHash, deliveryHash: row.contentHash, freshness: view.freshness, exportId: retained.id }
  }, options)
}

export async function getAdvisoryOutcomes(actor: WorkpaperActor, raw: unknown) {
  const input = advisoryMetricsSchema.parse(raw)
  const keys = input.cohort.map(row => `${row.engagementId}:${row.periodId}`)
  if (new Set(keys).size !== keys.length) throw new BusinessRuleError("Select each engagement and period once.")
  const clientPeriods = input.cohort.map(row => `${row.clientOrganizationId ?? actor.homeOrganizationId}:${row.periodId}`)
  if (new Set(clientPeriods).size !== clientPeriods.length) throw new BusinessRuleError("A client period cannot be attributed to multiple engagements in one report.")
  if (new Date(input.to) > new Date()) throw new BusinessRuleError("The observation window cannot end in the future.")
  // One transaction locks the entire explicitly selected cohort; any denial fails
  // the report rather than silently changing its denominator.
  return db.$transaction(async tx => {
    const management = await lockFirmManagementAuthorityInTx(tx, { ...actor, organizationId: actor.homeOrganizationId }, true)
    const authorities = [], engagements = [], cohorts = []
    for (const scope of [...input.cohort].sort((a, b) => `${a.clientOrganizationId}:${a.engagementId}`.localeCompare(`${b.clientOrganizationId}:${b.engagementId}`))) {
      const organizationId = scope.clientOrganizationId ?? actor.homeOrganizationId
      const authority = await lockCloseEvidenceWorkAuthorityInTx(tx, { ...actor, organizationId, operation: "request", requireCloseRead: true, requireFindingAssignment: true })
      authorities.push(authority)
      const engagement = await engagementInTx(tx, actor, scope)
      if (!engagement.firmView) throw new ForbiddenError("Firm outcomes require named client mandates and firm management permission.")
      engagements.push(engagement)
      const period = await tx.accountingPeriod.findFirst({ where: { id: scope.periodId, organizationId } })
      if (!period) throw new NotFoundError()
      const requests = []
      for (const supervise of [false, true]) {
        let cursor: string | undefined
        do {
          const page = await readCloseEvidenceRequestTrackingInTx(tx, { organizationId, actorId: actor.actorId }, scope.periodId, cursor, supervise)
          if (page.evidenceIssue) throw new ConflictError("Request evidence cannot support a complete outcome report.")
          requests.push(...page.items); cursor = page.nextCursor ?? undefined
          if (requests.length > 1000 || (requests.length === 1000 && cursor)) throw new BusinessRuleError("Request source limit reached; narrow the cohort.")
        } while (cursor)
      }
      const from = Date.parse(input.from), to = Date.parse(input.to)
      const within = (date: string | Date) => new Date(date).getTime() >= from && new Date(date).getTime() < to
      const selected = requests.filter(row => within(row.createdAt)), eligible = selected.filter(row => !["SUPERSEDED", "REVIEW_REQUIRED"].includes(row.state))
      const observed = (date: string | null) => date && Date.parse(date) < to ? date : null
      const decisions = await tx.accountantReview.findMany({ where: { organizationId, periodId: scope.periodId, createdAt: { gte: new Date(input.from), lt: new Date(input.to) },
        metadata: { path: ["kind"], equals: "review-workpaper-v1" } }, select: { metadata: true }, take: 101 })
      if (decisions.length > 100) throw new BusinessRuleError("Review source limit reached; narrow the observation window.")
      const validReviews = decisions.filter(row => ["REVIEWED", "CHANGES_REQUESTED"].includes(String(object(row.metadata).decision)))
      const firstRun = await tx.closeRun.findFirst({ where: { organizationId, periodId: scope.periodId, voidedAt: null, startedAt: { not: null } }, orderBy: { startedAt: "asc" }, select: { startedAt: true } })
      const firstActive = await tx.firmEngagementTransition.findFirst({ where: { engagementId: scope.engagementId, toStatus: "ACTIVE" }, orderBy: { version: "asc" }, select: { createdAt: true } })
      cohorts.push({ engagementId: scope.engagementId, clientOrganizationId: organizationId, periodId: scope.periodId,
        requestScope: "AUTHORIZED_CLIENT_PERIOD_ALL_REQUESTERS" as const,
        requestTouches: { value: selected.length, eligible: selected.length, definition: "Durable requests created in window; reminders and page visits are not counted." },
        excludedRequests: selected.length - eligible.length,
        clientWaiting: durationMetric(eligible.map(row => [row.createdAt, observed(row.respondedAt)])),
        responseToResolution: durationMetric(eligible.map(row => [observed(row.respondedAt), observed(row.acceptedAt)])),
        reviewerRework: { changesRequested: validReviews.filter(row => object(row.metadata).decision === "CHANGES_REQUESTED").length,
          reviewedDecisions: validReviews.length, rate: validReviews.length ? validReviews.filter(row => object(row.metadata).decision === "CHANGES_REQUESTED").length / validReviews.length : null },
        closeDuration: durationMetric([[firstRun?.startedAt?.toISOString() ?? null, period.status === "CLOSED" && period.closedAt && within(period.closedAt) ? period.closedAt.toISOString() : null]]),
        activation: durationMetric([[engagement.row.createdAt.toISOString(), firstActive && within(firstActive.createdAt) ? firstActive.createdAt.toISOString() : null]]) })
    }
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    await management.revalidate(at); for (const authority of authorities) await authority.revalidate(at); for (const engagement of engagements) engagement.revalidate(at)
    return { version: 1, fromInclusive: input.from, toExclusive: input.to, observedAt: at.toISOString(), cohortCount: cohorts.length,
      coverage: "COMPLETE_FOR_EXPLICIT_AUTHORIZED_COHORT" as const, cohorts, activeWorkTimeMs: null, improvement: null, baseline: "NOT_ESTABLISHED" as const,
      limitations: "Elapsed durations are means of valid timestamp pairs, not active work time. Client waiting and reviewer elapsed time must not be subtracted from overlapping close intervals. Missing pairs are disclosed. Activation means first recorded engagement activation. No financial sums or retention endpoint are used." }
  }, { ...options, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
