import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx, withReconciliationCloseRetry } from "./reconciliation-close-order.service"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseMetadata } from "./payment-suspense-evidence"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { loadRunForCertification, validateReconciliationRunEvidenceInTx, type ReconciliationPreparationBlocker } from "./payment-reconciliation-certification.service"
import { preparationHash as hash, preparationJson as json, preparedRunHash, loadRunPreparationReceiptInTx, loadAdditionalSourcesReceiptInTx } from "./reconciliation-run-preparation-evidence"
import { reconciliationPreparationReadSchema, reconciliationPreparationSchema, reconciliationPreparationQuerySchema, type ReconciliationPreparationCommand } from "./reconciliation-run-preparation.contracts"

async function authorize(tx: Prisma.TransactionClient, control: SuspenseCorrectionControl, write = false, readScope: "runs" | "evidence" = "evidence") {
  if (!["payments.reconciliation.read", ...(readScope === "evidence" ? ["accounting.journal.read"] : []), ...(write ? ["payments.reconciliation.run"] : [])]
    .every(p => hasRbacPermission(control.actorPermissions, p))) throw new ForbiddenError("Current reconciliation and accounting authority are required.")
  if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } }))
    throw new ForbiddenError("An active workspace actor is required.")
  const now = (control.now ?? new Date()).getTime(), at = control.lastAuthAt?.getTime()
  if (write && (at === undefined || !Number.isFinite(at) || at > now || now - at > 300_000)) throw new FreshAuthRequiredError()
}
function moduleAccess(tx: Prisma.TransactionClient, control: SuspenseCorrectionControl, accessIntent: "read" | "write") {
  return evaluateModuleAccessInTx(tx, {
    organizationId: control.organizationId, userId: control.actorId, actorPermissions: control.actorPermissions,
    moduleSlug: "payment_reconciliation", surfaceType: "action", surface: "services/reconciliation/reconciliation-run-preparation.service.ts",
    accessIntent, mode: "enforce",
  })
}
async function requireModuleRead(tx: Prisma.TransactionClient, control: SuspenseCorrectionControl) {
  if (!(await moduleAccess(tx, control, "read")).allowed) throw new ForbiddenError("Reconciliation module read access is unavailable.")
}
function assertPreparatable(run: Awaited<ReturnType<typeof loadRunForCertification>>) {
  if (!["NEEDS_REVIEW", "READY_FOR_SIGNOFF"].includes(run.status) || run.signedAt || run.signedById || run.certificateHash || run.certificatePayload)
    throw new BusinessRuleError("Only unsigned reviewed runs can be prepared. Signed evidence must use its source recovery workflow.")
  if (!run.runById?.trim()) throw new BusinessRuleError("A reconciliation maker is required before preparation.")
}
async function previewInTx(tx: Prisma.TransactionClient, run: Awaited<ReturnType<typeof loadRunForCertification>>) {
  assertPreparatable(run)
  const evidence = await validateReconciliationRunEvidenceInTx(tx, run, run.organizationId)
  return { revision: hash({ run, evidence }), evidence }
}
export async function previewReconciliationPreparation(input: unknown, control: SuspenseCorrectionControl) {
  const command = reconciliationPreparationReadSchema.parse(input), asOf = control.now ?? new Date()
  return db.$transaction(async tx => {
    await authorize(tx, control)
    await requireModuleRead(tx, control)
    const writeAccess = await moduleAccess(tx, control, "write")
    const run = await loadRunForCertification(tx, control.organizationId, command.runId, asOf)
    if (!writeAccess.allowed)
      return { runId: run.id, status: run.status, canPrepare: false as const, revision: null, blocker: "MODULE_WRITE_REQUIRED" as const, counts: null, asOf: asOf.toISOString() }
    if (!["NEEDS_REVIEW", "READY_FOR_SIGNOFF"].includes(run.status) || run.signedAt || run.signedById || run.certificateHash || run.certificatePayload || !run.runById?.trim())
      return { runId: run.id, status: run.status, canPrepare: false as const, revision: null, blocker: "RUN_STATE_REQUIRED" as const, counts: null, asOf: asOf.toISOString() }
    try {
      const current = await previewInTx(tx, run)
      return { runId: run.id, status: run.status, canPrepare: true as const, revision: current.revision, blocker: null,
        counts: current.evidence.sourceEvidence.counts, asOf: asOf.toISOString() }
    } catch (error) {
      const blocker = (error as { preparationBlocker?: ReconciliationPreparationBlocker })?.preparationBlocker
      if ((error instanceof BusinessRuleError || error instanceof ConflictError) && blocker)
        return { runId: run.id, status: run.status, canPrepare: false as const, revision: null, blocker, counts: null, asOf: asOf.toISOString() }
      throw error
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function readReconciliationPreparation(input: unknown, control: SuspenseCorrectionControl) {
  const query = reconciliationPreparationQuerySchema.parse(input), asOf = control.now ?? new Date()
  return db.$transaction(async tx => {
    await authorize(tx, control, false, query.kind === "runs" ? "runs" : "evidence")
    await requireModuleRead(tx, control)
    const after = query.cursor ? { OR: [{ createdAt: { lt: new Date(query.cursor.createdAt) } }, { createdAt: new Date(query.cursor.createdAt), id: { lt: query.cursor.id } }] } : {}
    const nextCursor = (rows: Array<{ id: string; createdAt: Date }>) => rows.length > 20 ? { id: rows[19].id, createdAt: rows[19].createdAt.toISOString() } : null
    if (query.kind === "runs") {
      const where: Prisma.ReconciliationRunWhereInput = { organizationId: control.organizationId, providerAccount: { organizationId: control.organizationId },
        paymentRail: { organizationId: control.organizationId }, ...(query.view === "REVIEW" ? { status: { in: ["NEEDS_REVIEW", "READY_FOR_SIGNOFF"] } } : {}),
        ...(query.search ? { OR: [{ id: { contains: query.search, mode: "insensitive" } }, { providerAccount: { displayName: { contains: query.search, mode: "insensitive" } } }] } : {}) }
      const rows = await tx.reconciliationRun.findMany({ where: { AND: [where, after] }, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true, businessDate: true, createdAt: true, providerAccount: { select: { displayName: true, currencyCode: true } } } })
      const total = await tx.reconciliationRun.count({ where })
      return { kind: "runs" as const, asOf: asOf.toISOString(), total, nextCursor: nextCursor(rows),
        runs: rows.slice(0, 20).map(row => ({ id: row.id, status: row.status, businessDate: row.businessDate.toISOString(), providerName: row.providerAccount.displayName, currencyCode: row.providerAccount.currencyCode })) }
    }
    const run = await loadRunForCertification(tx, control.organizationId, query.runId, asOf)
    const where = { organizationId: control.organizationId, source: "RECONCILIATION_RUN" as const, status: "PROCESSED" as const,
      externalId: run.id, OR: [{ idempotencyKey: { startsWith: "reconciliation-run-preparation:" } }, { idempotencyKey: { startsWith: "reconciliation-additional-sources:" } }] }
    const rows = await tx.paymentReconciliationInboxItem.findMany({ where: { AND: [where, after] }, select: { id: true, createdAt: true, idempotencyKey: true },
      take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
    const total = await tx.paymentReconciliationInboxItem.count({ where })
    const records = await Promise.all(rows.slice(0, 20).map(async row => {
      if (row.idempotencyKey.startsWith("reconciliation-additional-sources:")) {
        const { data } = await loadAdditionalSourcesReceiptInTx(tx, control.organizationId, run.id, row.id)
        return { id: row.id, kind: "ADDITIONAL_SOURCES" as const, retainedCertificateHash: data.beforeRun.status === "SIGNED" && typeof data.beforeRun.certificateHash === "string" ? data.beforeRun.certificateHash : null, recordedAt: data.incorporatedAt, actorId: data.actorId, reason: data.reason }
      }
      const { data } = await loadRunPreparationReceiptInTx(tx, control.organizationId, run.id, row.id)
      return { id: row.id, kind: "PREPARATION" as const, retainedCertificateHash: null, recordedAt: data.preparedAt, actorId: data.preparedById, reason: data.reason }
    }))
    return { kind: "history" as const, asOf: asOf.toISOString(), total, nextCursor: nextCursor(rows), records,
      run: { id: run.id, status: run.status, businessDate: run.businessDate.toISOString(), providerName: run.providerAccount.displayName, currencyCode: run.providerAccount.currencyCode } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function prepareReconciliationRun(input: ReconciliationPreparationCommand, control: SuspenseCorrectionControl) {
  const startedAt = Date.now()
  const command = reconciliationPreparationSchema.parse(input), now = control.now ?? new Date()
  const key = "reconciliation-run-preparation:" + command.idempotencyKey
  const requestHash = hash({ command, organizationId: control.organizationId, actorId: control.actorId })
  try {
    const result = await withReconciliationCloseRetry(() => db.$transaction(async tx => {
      await authorize(tx, { ...control, now }, true)
      const decision = await moduleAccess(tx, control, "write")
      if (!decision.allowed) {
        await tx.auditLog.create({ data: {
          organizationId: control.organizationId, userId: control.actorId,
          entityType: "ModuleEntitlementDecision", entityId: "payment_reconciliation:prepare:" + command.runId,
          action: "MODULE_ENTITLEMENT_ENFORCED", changes: {
            moduleSlug: decision.moduleSlug, surface: decision.surface, accessIntent: decision.accessIntent,
            result: decision.result, reason: decision.reason, entitlementStatus: decision.entitlement?.status ?? null,
            missingDependencies: decision.missingDependencies.map(item => item.dependsOnSlug),
            rbacWildcardPresent: decision.rbacWildcardPresent, rbacWildcardBypassedEntitlement: false,
          },
        } })
        return { moduleDenied: true as const }
      }
      const run = await loadRunForCertification(tx, control.organizationId, command.runId, now)
      const prior = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, idempotencyKey: key } })
      if (prior) {
        const saved = await loadRunPreparationReceiptInTx(tx, control.organizationId, run.id, prior.id)
        if (saved.data.requestHash !== requestHash) throw new IdempotencyConflictError()
        // Exact replay reports the retained transition and current status; it never changes readiness again.
        return { runId: run.id, receiptId: prior.id, preparedAt: saved.data.preparedAt, currentStatus: run.status, replayed: true }
      }
      await lockReconciliationCloseCatalogInTx(tx, control.organizationId)
      const current = await previewInTx(tx, run)
      const affectedPeriodIds = await lockReconciliationClosePeriodsInTx(tx, control.organizationId)
      await authorize(tx, { ...control, now: new Date(now.getTime() + Math.max(0, Date.now() - startedAt)) }, true)
      if (command.expectedRevision !== current.revision) throw new ConflictError("The reviewed evidence changed. Refresh the preparation preview.")
      const receiptId = randomUUID()
      const transition = await tx.reconciliationRun.updateMany({ where: { id: run.id, organizationId: control.organizationId,
        status: run.status, updatedAt: run.updatedAt, signedById: null, signedAt: null, certificateHash: null },
        data: { status: "READY_FOR_SIGNOFF", accountingPeriodId: current.evidence.period.id, updatedAt: now,
          metadata: json({ ...suspenseMetadata(run.metadata), preparationReceiptId: receiptId }) } })
      if (transition.count !== 1) throw new ConflictError("The run changed concurrently. Review its current state.")
      const prepared = await loadRunForCertification(tx, control.organizationId, run.id, now)
      const payload = json({ kind: "RECONCILIATION_RUN_PREPARED_V1", organizationId: control.organizationId, runId: run.id,
        preparedById: control.actorId, preparedAt: now.toISOString(), reason: command.reason, requestHash, reviewedRevision: current.revision,
        afterRunHash: preparedRunHash(prepared), sourceHash: current.evidence.sourceEvidence.sourceHash, beforeRun: json(run) })
      await tx.paymentReconciliationInboxItem.create({ data: { id: receiptId, organizationId: control.organizationId, externalId: run.id,
        source: "RECONCILIATION_RUN", status: "PROCESSED", idempotencyKey: key, payloadSummary: payload,
        payloadHash: hash(payload).slice(7), processedAt: now, correlationId: receiptId } })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "RECONCILIATION_RUN_PREPARE",
        resourceType: "ReconciliationRun", resourceId: run.id, message: "Reviewed reconciliation prepared for independent sign-off; no financial posting",
        metadata: json({ receiptId, reviewedRevision: current.revision }) } })
      await recordCloseCertificationInvalidationsForSourceInTx(tx, control.organizationId, {
        sourceCode: "PAYMENT_RECONCILIATION_PREPARED", sourceId: run.id, periodIds: affectedPeriodIds,
        previousEvidenceHash: preparedRunHash(run), newEvidenceHash: preparedRunHash(prepared), correlationId: receiptId,
        staleReason: "Reconciliation preparation changed its reviewed evidence; run Close assessment again.",
      }, { actorId: control.actorId, now })
      await publishPaymentReconciliationNotification({ type: "payment-reconciliation.run.ready-for-signoff", organizationId: control.organizationId,
        evidenceRef: { reconciliationRunId: run.id }, correlationId: receiptId, dedupeKey: receiptId }, tx)
      return { runId: run.id, receiptId, preparedAt: now.toISOString(), currentStatus: prepared.status, replayed: false }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
    if ("moduleDenied" in result) throw new ForbiddenError("Reconciliation module write access is unavailable.")
    return result
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code)
      || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))))
      throw new ConflictError("Run preparation changed concurrently. Refresh or retry the same request.")
    throw error
  }
}
