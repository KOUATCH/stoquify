import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { lockAccountingPeriodCatalogInTx } from "./accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx, readCloseAssessmentOrderInTx, readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import { closeSourceRevisionMatches, lockCloseSourceRevisionInTx } from "./close-source-revision.service"

export const closePeriodInputSchema = z.object({ periodId: z.string().trim().min(1).max(200), expectedVersion: z.number().int().min(0) }).strict()
export const reopenPeriodInputSchema = closePeriodInputSchema.extend({
  reason: z.string().trim().min(10).max(2000), idempotencyKey: z.string().trim().min(1).max(200),
}).strict()
type Control = { organizationId: string; actorId: string; actorPermissions: readonly string[]; lastAuthAt: Date }
export function assertPeriodControlAuthority(control: Control, permission: string) {
  const age = Date.now() - control.lastAuthAt?.getTime()
  if (!control.organizationId || !control.actorId || !hasRbacPermission(control.actorPermissions, permission) || !Number.isFinite(age) || age < 0 || age > 300000)
    throw new ForbiddenError("Explicit period permission and fresh authentication are required.")
}

/** Catalog before period rows (posting takes the shared catalog); NO KEY UPDATE
 * blocks posting's SHARE lock but allows evidence's tenant FK checks. Period
 * rows precede source revision, including direct SQL journal writers. */
export async function lockPeriodControlInTx(tx: Prisma.TransactionClient, organizationId: string, periodId: string) {
  await lockAccountingPeriodCatalogInTx(tx, organizationId, "exclusive")
  await tx.$queryRaw(Prisma.sql`SELECT id FROM accounting_periods WHERE id = ${periodId} AND "organizationId" = ${organizationId} FOR NO KEY UPDATE`)
  const period = await tx.accountingPeriod.findFirst({ where: { id: periodId, organizationId } })
  if (!period) throw new NotFoundError("Accounting period not found")
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId }, select: { id: true }, orderBy: { id: "asc" } })
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periods.map(row => row.id))
  const sourceRevision = await lockCloseSourceRevisionInTx(tx, organizationId)
  return { period, sourceRevision }
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const stale = (value: unknown) => record(record(value).staleState).status === "EVIDENCE_STALE"

export async function requirePeriodCloseApprovalInTx(tx: Prisma.TransactionClient, organizationId: string, periodId: string, revision: { version: 1; revision: string }) {
  const order = await readCloseAssessmentOrderInTx(tx, organizationId, periodId)
  if (order.latest && !order.ambiguous) {
    const id = order.latest.id
    // Existing invalidators also lock run before exports. Read approval only
    // after waiting so a committed withdrawal cannot race the seal.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM close_runs WHERE id = ${id} AND "organizationId" = ${organizationId} FOR NO KEY UPDATE`)
    await tx.$queryRaw(Prisma.sql`SELECT id FROM close_pack_exports WHERE "closeRunId" = ${id} AND "organizationId" = ${organizationId} ORDER BY id FOR SHARE`)
  }
  const run = order.latest && !order.ambiguous ? await tx.closeRun.findFirst({ where: { id: order.latest.id, organizationId, periodId }, include: {
    findings: { where: { organizationId, periodId, severity: { in: ["HIGH", "CRITICAL"] }, status: { in: ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"] } } },
    checklistItems: { where: { organizationId, periodId, severity: { in: ["HIGH", "CRITICAL"] }, status: { in: ["FAILED", "UNAVAILABLE"] } } },
    evidenceItems: { where: { organizationId, periodId, available: false } },
  } }) : null
  if (!run || run.voidedAt || !run.completedAt || !["CERTIFIED", "EXPORTED"].includes(run.status) || !run.runById ||
    stale(run.metadata) || !closeSourceRevisionMatches(run.metadata, revision) || run.criticalBlockerCount || run.highBlockerCount || run.findings.length || run.checklistItems.length || run.evidenceItems.length)
    throw new BusinessRuleError("Accounting period requires a current close assurance assessment with independent certified approval and no blocking evidence.")
  const metadata = record(run.metadata)
  if (typeof metadata.certifiedExportId !== "string") throw new BusinessRuleError("A retained certified close approval is required.")
  const pack = await tx.closePackExport.findFirst({ where: { id: metadata.certifiedExportId, organizationId, periodId, closeRunId: run.id, isCertified: true } })
  if (!pack || stale(pack.metadata) || !pack.exportedById || pack.exportedById === run.runById ||
    pack.exportedById !== metadata.certifiedById || pack.contentHash !== metadata.certifiedContentHash || !/^sha256:[a-f0-9]{64}$/.test(pack.contentHash) ||
    pack.exportedAt < run.completedAt || pack.exportedAt > new Date())
    throw new BusinessRuleError("The retained close approval is missing, stale or not independent.")
  return { closeRunId: run.id, certifiedExportId: pack.id, contentHash: pack.contentHash, approvedById: pack.exportedById, preparedById: run.runById, sourceRevision: revision.revision }
}

export async function reopenAccountingPeriod(input: z.input<typeof reopenPeriodInputSchema>, control: Control) {
  assertPeriodControlAuthority(control, "accounting.period.reopen")
  const parsed = reopenPeriodInputSchema.parse(input)
  return db.$transaction(async tx => {
    const { period, sourceRevision } = await lockPeriodControlInTx(tx, control.organizationId, parsed.periodId)
    assertPeriodControlAuthority(control, "accounting.period.reopen")
    const prior = await tx.periodControlEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId: control.organizationId, idempotencyKey: parsed.idempotencyKey } } })
    if (prior) {
      if (prior.operation !== "REOPEN" || prior.periodId !== period.id || prior.actorId !== control.actorId || prior.reason !== parsed.reason || prior.version !== parsed.expectedVersion + 1)
        throw new ConflictError("The period command key has already been used for a different request.")
      return { period, event: prior, replayed: true }
    }
    if (period.controlVersion !== parsed.expectedVersion) throw new ConflictError("The period changed; refresh before reopening.")
    if (!["CLOSED", "LOCKED"].includes(period.status)) throw new BusinessRuleError("Only a closed or locked period can be reopened.")
    const now = await readCloseAssessmentPublicationTimeInTx(tx)
    assertPeriodControlAuthority(control, "accounting.period.reopen")
    const event = await tx.periodControlEvent.create({ data: {
      organizationId: control.organizationId, periodId: period.id, operation: "REOPEN", version: period.controlVersion + 1,
      fromStatus: period.status, toStatus: "OPEN", actorId: control.actorId, reason: parsed.reason, idempotencyKey: parsed.idempotencyKey,
      sourceRevision: sourceRevision.revision, createdAt: now,
      approval: { priorControlEventId: period.lastControlEventId, closedAt: period.closedAt?.toISOString() ?? null, closedById: period.closedById, lockedAt: period.lockedAt?.toISOString() ?? null },
    } })
    const reopened = await tx.accountingPeriod.update({ where: { id: period.id }, data: { status: "OPEN", lockedAt: null, closedAt: null, closedById: null, controlVersion: event.version, lastControlEventId: event.id } })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "ACCOUNTING_PERIOD_REOPEN", resourceType: "AccountingPeriod", resourceId: period.id,
      message: "Accounting period reopened for controlled correction", metadata: { eventId: event.id, reason: parsed.reason, previousStatus: period.status, version: event.version } } })
    return { period: reopened, event, replayed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 })
}
