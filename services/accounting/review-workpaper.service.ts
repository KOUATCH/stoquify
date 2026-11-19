import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { balanceSheetHash, balanceSheetInputSchema } from "./balance-sheet-contract"
import { readBalanceSheetClose } from "./balance-sheet-close.service"
import { readBalanceSheetPopulation } from "./balance-sheet-sources.service"
import { createCloseControlScope } from "./close-control-scope"
import { lockCloseAssessmentPeriodsInTx, readCloseAssessmentOrderInTx, readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import { lockCloseSourceRevisionInTx } from "./close-source-revision.service"
import { lockAccountantExportAuthorityInTx, lockWorkpaperAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { renderReviewWorkpaperExport, type RetainedWorkpaper } from "./review-workpaper-export"
import {
  WORKPAPER_KINDS, WORKPAPER_LIMIT, WORKPAPER_LIMITATIONS, workpaperScopeSchema, workpaperDecisionSchema,
  workpaperRollForwardSchema, workpaperExportSchema, type ReviewWorkpaperBinder, type WorkpaperAccount, type WorkpaperDecision,
} from "./review-workpaper.contract"

export type WorkpaperActor = {
  homeOrganizationId: string; actorId: string; actorPermissions: string[]
  session: { id: string; token: string }; lastAuthAt?: Date
}
const namespace = "review-workpaper-v1"
const txOptions = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000, maxWait: 10000 }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const metadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

async function lockSources(tx: Prisma.TransactionClient, organizationId: string) {
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId }, select: { id: true }, orderBy: { id: "asc" } })
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periods.map(row => row.id))
  return lockCloseSourceRevisionInTx(tx, organizationId)
}

/** Source locks are held through decisions/rendering and delivery authorization.
 * No persisted workpaper balances: every read uses the existing ledger control. */
async function readBinder(tx: Prisma.TransactionClient, organizationId: string, periodId: string, sourceRevision: string): Promise<ReviewWorkpaperBinder> {
  const period = await tx.accountingPeriod.findFirst({ where: { id: periodId, organizationId } })
  if (!period) throw new NotFoundError("The accounting period is unavailable.")
  const order = await readCloseAssessmentOrderInTx(tx, organizationId, periodId)
  if (!order.latest || order.ambiguous || order.latest.voidedAt || ["VOIDED", "RUNNING", "DRAFT"].includes(order.latest.status)) {
    throw new BusinessRuleError("Run a completed, unambiguous Close assessment before opening workpapers.")
  }
  const observedAt = await readCloseAssessmentPublicationTimeInTx(tx)
  if (period.endDate >= observedAt) throw new BusinessRuleError("Workpapers require a completed accounting period.")
  const population = await readBalanceSheetPopulation(tx, organizationId, period, observedAt)
  if (population.length > WORKPAPER_LIMIT) throw new BusinessRuleError(`This pilot supports at most ${WORKPAPER_LIMIT} account/currency schedules. Use the existing Close pack for a larger population.`)
  const close = await readBalanceSheetClose(tx, createCloseControlScope(organizationId, period, observedAt))
  const evidence = await tx.balanceSheetEvidence.findMany({ where: { organizationId, periodId, id: { in: close.accounts.flatMap(row => row.evidenceId ? [row.evidenceId] : []) } }, select: { id: true, input: true } })
  const accounts: WorkpaperAccount[] = close.accounts.map(row => {
    const input = balanceSheetInputSchema.safeParse(evidence.find(item => item.id === row.evidenceId)?.input)
    const kind = input.success && WORKPAPER_KINDS.includes(input.data.scheduleKind as typeof WORKPAPER_KINDS[number])
      ? input.data.scheduleKind as typeof WORKPAPER_KINDS[number] : null
    // A failed control may carry a diagnostic snapshot; never display its amounts.
    const snapshot = row.status === "RECONCILED" ? row.snapshot : null
    return { ledgerAccountId: row.ledgerAccountId, accountCode: row.accountCode, currency: row.currency, kind,
      availability: snapshot ? "RECONCILED" : "UNAVAILABLE", reason: snapshot ? null : "Current independently approved supporting evidence is missing, invalid or changed.",
      sourceRevision: snapshot?.sourceRevision ?? null, sourceHash: snapshot?.sourceHash ?? null,
      evidenceId: row.evidenceId, evidenceHash: row.evidenceHash, approvedById: row.approvedById, approvedAt: row.approvedAt,
      balances: snapshot && kind ? { ledger: snapshot.balances.ledger, schedule: snapshot.balances.schedule, differences: snapshot.balances.differences } : null }
  })
  const scope = { version: 1 as const, organizationId, periodId, periodStart: period.startDate.toISOString(), periodEnd: period.endDate.toISOString(),
    closeRunId: order.latest.id, sourceRevision }
  const sourceHash = balanceSheetHash({ ...scope, accounts })
  const rows = await tx.accountantReview.findMany({ where: { organizationId, periodId, metadata: { path: ["kind"], equals: namespace } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 })
  if (rows.length > 100) throw new BusinessRuleError("Workpaper review history exceeds this pilot's 100-decision limit. Use retained Close records for investigation.")
  const decisions: WorkpaperDecision[] = rows.map((row, index) => {
    const m = metadata(row.metadata)
    if (typeof m.sourceHash !== "string" || !["PREPARED", "REVIEWED", "CHANGES_REQUESTED"].includes(String(m.decision)) ||
      !row.reviewerId || !row.decisionNotes) throw new ConflictError("Workpaper decision metadata is invalid.")
    return { id: row.id, actorId: row.reviewerId, at: row.createdAt.toISOString(), sourceHash: m.sourceHash,
      decision: m.decision as WorkpaperDecision["decision"], preparationId: typeof m.preparationId === "string" ? m.preparationId : null,
      conclusion: row.decisionNotes, current: index === 0 && m.sourceHash === sourceHash }
  })
  const latest = decisions[0]
  const reviewHash = balanceSheetHash(decisions)
  const previousPeriods = await tx.accountingPeriod.findMany({ where: { organizationId, endDate: { lt: period.startDate } },
    orderBy: [{ endDate: "desc" }, { id: "desc" }], take: 10, select: { id: true, name: true } })
  const template = await tx.accountantComment.findFirst({ where: { organizationId, periodId, metadata: { path: ["kind"], equals: `${namespace}-structure` } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
  const from = metadata(template?.metadata).fromPeriodId
  return { ...scope, observedAt: observedAt.toISOString(), sourceHash, reviewHash, classification: "DRAFT_WORKPAPERS_NOT_CERTIFIED",
    schedules: WORKPAPER_KINDS.map(kind => { const selected = accounts.filter(row => row.kind === kind); return {
      kind, availability: selected.length > 0 && selected.every(row => row.availability === "RECONCILED") ? "RECONCILED" : "UNAVAILABLE", accounts: selected,
    } }), unclassifiedAccounts: accounts.filter(row => !row.kind), decisions,
    reviewState: latest ? latest.current ? latest.decision : "STALE" : "UNPREPARED",
    previousPeriods, rolledForwardFrom: typeof from === "string" ? from : null }
}

/** Internal reuse boundary. Caller must hold live workpaper authority in this
 * transaction. Keeps advisory observations on the exact AF08 source snapshot. */
export async function readReviewWorkpaperBinderInTx(tx: Prisma.TransactionClient, organizationId: string, periodId: string) {
  const revision = await lockSources(tx, organizationId)
  return readBinder(tx, organizationId, periodId, revision.revision)
}

export async function getReviewWorkpaperBinder(actor: WorkpaperActor, raw: unknown) {
  const input = workpaperScopeSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-read")
    const revision = await lockSources(tx, organizationId)
    const binder = await readBinder(tx, organizationId, input.periodId, revision.revision)
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return binder
  }, txOptions)
}

export async function recordWorkpaperDecision(actor: WorkpaperActor, raw: unknown) {
  const input = workpaperDecisionSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, input.decision === "PREPARED" ? "workpaper-prepare" : "workpaper-review")
    const revision = await lockSources(tx, organizationId)
    const binder = await readBinder(tx, organizationId, input.periodId, revision.revision)
    if (binder.sourceHash !== input.expectedSourceHash) throw new ConflictError("Sources changed. Refresh and prepare the workpapers again.")
    const commandHash = balanceSheetHash({ actorId: actor.actorId, organizationId, input })
    const replay = await tx.accountantReview.findFirst({ where: { organizationId, periodId: input.periodId,
      metadata: { path: ["idempotencyKey"], equals: input.idempotencyKey } } })
    if (replay) {
      if (metadata(replay.metadata).commandHash !== commandHash) throw new IdempotencyConflictError()
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: replay.id, replayed: true }
    }
    if (binder.decisions.length >= 100) {
      throw new BusinessRuleError("This period has reached the pilot's 100-decision limit. Existing workpapers remain readable and exportable.")
    }
    if (input.decision !== "PREPARED") {
      const preparation = binder.decisions[0]
      if (!preparation || preparation.id !== input.preparationId || preparation.decision !== "PREPARED" || !preparation.current) {
        throw new ConflictError("Review the latest current preparation before recording a decision.")
      }
      if (preparation.actorId === actor.actorId) throw new BusinessRuleError("A different accountant must review the preparation.", "SOD_VIOLATION")
      if (input.decision === "REVIEWED" && binder.schedules.some(row => row.availability !== "RECONCILED")) {
        throw new BusinessRuleError("All four pilot schedules require current reconciled support before a positive review.")
      }
    }
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    await authority.revalidate(at)
    const row = await tx.accountantReview.create({ data: { organizationId, periodId: input.periodId, closeRunId: binder.closeRunId,
      // A workpaper review never sets APPROVED_FOR_CLOSE or certifies the run.
      status: "OPEN", reviewerId: actor.actorId, openedById: actor.actorId, reviewedAt: at, createdAt: at,
      decisionNotes: input.conclusion, metadata: json({ kind: namespace, sourceHash: binder.sourceHash, decision: input.decision,
        preparationId: input.preparationId ?? null, idempotencyKey: input.idempotencyKey, commandHash }) } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "AccountantReview", entityId: row.id,
      action: "WORKPAPER_DECISION", changes: json({ sourceHash: binder.sourceHash, decision: input.decision, commandHash }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: row.id, replayed: false }
  }, txOptions)
}

export async function rollForwardWorkpaperStructure(actor: WorkpaperActor, raw: unknown) {
  const input = workpaperRollForwardSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-prepare")
    const revision = await lockSources(tx, organizationId)
    const target = await readBinder(tx, organizationId, input.periodId, revision.revision)
    const source = await tx.accountingPeriod.findFirst({ where: { id: input.fromPeriodId, organizationId, endDate: { lt: new Date(target.periodStart) } } })
    if (!source) throw new NotFoundError("Choose an earlier period for this client.")
    const prior = await tx.accountantReview.findFirst({ where: { organizationId, periodId: source.id, metadata: { path: ["kind"], equals: namespace } } })
    if (!prior) throw new BusinessRuleError("The earlier period has no retained workpaper preparation.")
    const commandHash = balanceSheetHash({ actorId: actor.actorId, organizationId, input })
    const replay = await tx.accountantComment.findFirst({ where: { organizationId, periodId: input.periodId,
      metadata: { path: ["idempotencyKey"], equals: input.idempotencyKey } } })
    if (replay && metadata(replay.metadata).commandHash !== commandHash) throw new IdempotencyConflictError()
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    if (replay) return { id: replay.id, replayed: true }
    const row = await tx.accountantComment.create({ data: { organizationId, periodId: input.periodId, closeRunId: target.closeRunId,
      authorId: actor.actorId, body: "Four pilot workpaper headings rolled forward. Obtain new period support and decisions.",
      metadata: json({ kind: `${namespace}-structure`, fromPeriodId: source.id, headings: WORKPAPER_KINDS,
        idempotencyKey: input.idempotencyKey, commandHash }) } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "AccountantComment", entityId: row.id,
      action: "WORKPAPER_STRUCTURE_ROLLED_FORWARD", changes: json({ fromPeriodId: source.id, periodId: input.periodId, commandHash }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: row.id, replayed: false }
  }, txOptions)
}

export async function exportReviewWorkpapers(actor: WorkpaperActor, raw: unknown) {
  const input = workpaperExportSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockAccountantExportAuthorityInTx(tx, { ...actor, organizationId, requireCloseRead: true })
    const revision = await lockSources(tx, organizationId)
    const binder = await readBinder(tx, organizationId, input.periodId, revision.revision)
    if (binder.sourceHash !== input.expectedSourceHash || binder.reviewHash !== input.expectedReviewHash) throw new ConflictError("Sources or review decisions changed. Refresh before exporting.")
    // One idempotent canonical publication can supply all three render formats.
    const commandHash = balanceSheetHash({ actorId: actor.actorId, organizationId, ...input, format: undefined })
    const replay = await tx.closePackExport.findFirst({ where: { organizationId, periodId: input.periodId,
      metadata: { path: ["idempotencyKey"], equals: input.idempotencyKey } } })
    if (replay && metadata(replay.metadata).commandHash !== commandHash) throw new IdempotencyConflictError()
    const rowCount = binder.schedules.reduce((sum, row) => sum + Math.max(1, row.accounts.length), 0) + binder.unclassifiedAccounts.length
    const watermarkId = replay?.watermarkId ?? buildExportWatermark({ organizationId, actorId: actor.actorId, scope: namespace,
      filtersHash: binder.sourceHash, rowCount, fileType: "json", sensitivity: "financial", issuedAt: binder.observedAt })
    const safety = evaluateExportSafety({ action: "accounting.export", organizationId, actorId: actor.actorId,
      actorPermissions: actor.actorPermissions, lastAuthAt: actor.lastAuthAt?.getTime(), now: new Date(),
      resourceType: "ReviewWorkpaper", resourceId: binder.closeRunId,
      exportContext: { scope: namespace, filtersHash: binder.sourceHash, rowCount, fileType: input.format, sensitivity: "financial", watermarkId } })
    if (!safety.allowed) throw new BusinessRuleError(safety.safeMessage, safety.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION")
    const canonical: RetainedWorkpaper = replay ? metadata(replay.metadata).canonical as RetainedWorkpaper : {
      ...binder, previousPeriods: [], decisions: binder.decisions.map(row => ({ ...row, conclusion: "[REDACTED]", conclusionHash: balanceSheetHash(row.conclusion) })),
      exportedById: actor.actorId, watermarkId, limitations: WORKPAPER_LIMITATIONS,
    }
    if (!canonical || canonical.sourceHash !== binder.sourceHash || canonical.reviewHash !== binder.reviewHash ||
      (replay && balanceSheetHash(canonical) !== replay.contentHash)) throw new ConflictError("Retained workpaper integrity is invalid.")
    const contentHash = balanceSheetHash(canonical)
    // Render before persistence/delivery. Renderer failure rolls back all writes.
    const artifact = renderReviewWorkpaperExport(canonical, input.format, contentHash)
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    const retained = replay ?? await tx.closePackExport.create({ data: { organizationId, periodId: input.periodId, closeRunId: binder.closeRunId,
      fileType: "workpaper-json", watermarkId, contentHash, rowCount, isCertified: false, exportedById: actor.actorId,
      metadata: json({ kind: namespace, idempotencyKey: input.idempotencyKey, commandHash, canonical }) } })
    await auditExportSafetyDecision(tx, safety)
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "ClosePackExport", entityId: retained.id,
      action: "WORKPAPER_EXPORT", changes: json({ contentHash, artifactHash: artifact.artifactHash, format: input.format, watermarkId, replayed: !!replay }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { ...artifact, contentHash, watermarkId, exportId: retained.id, replayed: !!replay }
  }, txOptions)
}
