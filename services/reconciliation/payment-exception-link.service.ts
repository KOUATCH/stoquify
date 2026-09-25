import { loadReconciliationExceptionLinkSourceInTx } from "./payment-exception-source-evidence"
export { loadReconciliationExceptionLinkSourceInTx } from "./payment-exception-source-evidence"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { exceptionLinkReadSchema, exceptionLinkRepairSchema, type ExceptionLinkRepair } from "./payment-exception-link.contracts"

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const hash = (value: unknown) => suspenseEvidenceHash(json(value))
const namespace = "reconciliation-exception-link-repair:"
type Tx = Prisma.TransactionClient

async function authorize(tx: Tx, control: SuspenseCorrectionControl, write = false) {
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read") || (write && !hasRbacPermission(control.actorPermissions, "payments.reconciliation.run"))) throw new ForbiddenError("Reconciliation read and run authority are required for source-link repair.")
  if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("Active workspace actor is required.")
  if (write) {
    const now = (control.now ?? new Date()).getTime(), at = control.lastAuthAt?.getTime()
    if (at === undefined || !Number.isFinite(at) || at > now || now - at > 300_000) throw new FreshAuthRequiredError()
  }
}

export async function readReconciliationExceptionLink(input: { suspenseItemId: string }, control: SuspenseCorrectionControl) {
  const parsed = exceptionLinkReadSchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const current = await loadReconciliationExceptionLinkSourceInTx(tx, control.organizationId, parsed.suspenseItemId)
    return { suspenseItemId: current.item.id, exceptionId: current.exception.id, runId: current.run.id, revision: current.revision,
      state: current.exception.suspenseItemId === current.item.id ? "LINKED" as const : "REPAIRABLE" as const,
      exceptionStatus: current.exception.status, suspenseStatus: current.item.status, runStatus: current.run.status,
      willRequireRunReview: current.exception.suspenseItemId === null, hasCurrentSignOff: !!current.run.signedAt || !!current.run.certificateHash,
      asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function repairReconciliationExceptionLink(input: ExceptionLinkRepair, control: SuspenseCorrectionControl) {
  const command = exceptionLinkRepairSchema.parse(input), key = namespace + command.idempotencyKey, requestHash = hash({ command, actorId: control.actorId, organizationId: control.organizationId })
  try {
    return await db.$transaction(async tx => {
      await authorize(tx, control, true)
      await tx.$queryRaw`SELECT id FROM suspense_items WHERE id = ${command.suspenseItemId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
      const current = await loadReconciliationExceptionLinkSourceInTx(tx, control.organizationId, command.suspenseItemId)
      const prior = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, idempotencyKey: key } })
      if (prior) {
        const saved = suspenseMetadata(prior.payloadSummary)
        if (saved.requestHash !== requestHash) throw new IdempotencyConflictError("This repair request was already used for a different command.")
        if (prior.payloadHash !== hash(prior.payloadSummary).slice(7) || prior.source !== "RECONCILIATION_RUN" || prior.status !== "PROCESSED"
          || prior.externalId !== current.item.id || saved.kind !== "RECONCILIATION_EXCEPTION_LINK_REPAIRED_V1" || saved.exceptionId !== current.exception.id
          || current.exception.suspenseItemId !== current.item.id || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: current.exception.id,
            action: "RECONCILIATION_EXCEPTION_LINK_REPAIR", actorId: control.actorId, metadata: { path: ["receiptId"], equals: prior.id } } })) throw new ConflictError("Retained repair evidence requires review.")
        return { receiptId: prior.id, suspenseItemId: current.item.id, exceptionId: current.exception.id, replayed: true }
      }
      if (command.expectedRevision !== current.revision) throw new ConflictError("Source evidence changed. Refresh and review before repairing the link.")
      if (current.exception.suspenseItemId !== null) throw new ConflictError("The exception is already linked. Refresh its current state.")
      const receiptId = randomUUID(), now = control.now ?? new Date(), run = current.run
      const changed = await tx.paymentException.updateMany({ where: { id: current.exception.id, organizationId: control.organizationId, suspenseItemId: null, updatedAt: current.exception.updatedAt }, data: { suspenseItemId: current.item.id } })
      if (changed.count !== 1) throw new ConflictError("Exception changed concurrently. Refresh its source evidence.")
      const payload = json({ kind: "RECONCILIATION_EXCEPTION_LINK_REPAIRED_V1", requestHash, reviewedRevision: current.revision, reason: command.reason,
        repairedById: control.actorId, repairedAt: now.toISOString(), exceptionId: current.exception.id, suspenseItemId: current.item.id,
        before: { exception: current.exception, suspense: current.item }, after: { suspenseItemId: current.item.id },
        priorRunCertificate: { runId: run.id, status: run.status, signedById: run.signedById, signedAt: run.signedAt, certificateHash: run.certificateHash, certificatePayload: run.certificatePayload } })
      await tx.paymentReconciliationInboxItem.create({ data: { id: receiptId, organizationId: control.organizationId, providerAccountId: current.item.providerAccountId,
        source: "RECONCILIATION_RUN", status: "PROCESSED", externalId: current.item.id, idempotencyKey: key, payloadSummary: payload, payloadHash: hash(payload).slice(7), processedAt: now, correlationId: receiptId } })
      await tx.reconciliationRun.update({ where: { id: run.id, organizationId: control.organizationId }, data: { status: "NEEDS_REVIEW", signedAt: null, signedById: null,
        certificateHash: null, certificatePayload: Prisma.JsonNull, metadata: json({ ...suspenseMetadata(run.metadata), immutableAfterSignoff: false, signedSourceVersionHash: null,
          exceptionLinkInvalidation: { receiptId, suspenseItemId: current.item.id, exceptionId: current.exception.id, at: now.toISOString() } }) } })
      await recordCloseCertificationInvalidationsForSourceInTx(tx, control.organizationId, { sourceCode: "PAYMENT_RECONCILIATION_SOURCE_REPAIRED", sourceId: run.id,
        periodId: run.accountingPeriodId, periodStart: run.periodStart, periodEnd: run.periodEnd, previousEvidenceHash: run.certificateHash, newEvidenceHash: hash(payload), correlationId: receiptId,
        staleReason: "Reconciliation exception linkage changed; review and sign-off are required again." }, { actorId: control.actorId, now })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "RECONCILIATION_EXCEPTION_LINK_REPAIR", resourceType: "PaymentException", resourceId: current.exception.id,
        message: "Original exception/suspense relation restored; financial status unchanged; run review required", metadata: json({ receiptId, suspenseItemId: current.item.id, requestHash, reviewedRevision: current.revision }) } })
      await publishPaymentReconciliationNotification({ type: "payment-reconciliation.exception.link-repaired", organizationId: control.organizationId, providerAccountId: current.item.providerAccountId,
        evidenceRef: { exceptionId: current.exception.id, suspenseItemId: current.item.id, reconciliationRunId: run.id }, correlationId: receiptId, dedupeKey: receiptId }, tx)
      return { receiptId, suspenseItemId: current.item.id, exceptionId: current.exception.id, replayed: false }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code) || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))) throw new ConflictError("Source repair conflicted with another update. Refresh or retry the same request.")
    throw error
  }
}
