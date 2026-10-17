import {
  AccountingPostingPurpose,
  AccountingSourceType,
  PaymentExceptionStatus,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  Prisma,
  SuspenseStatus,
  SuspenseType,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { assertPaymentSuspenseLedgerTruthInTx, postPaymentSuspenseToLedger } from "./payment-suspense-ledger.service"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash, suspenseEvidenceRevision, suspensePostingSourceHash, suspenseMetadata, suspenseApprovalKey, suspensePostingDate, suspensePostingCycle } from "./payment-suspense-evidence"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"

import { buildSuspensePostingRequest } from "./payment-suspense-posting.gateway"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx, withReconciliationCloseRetry } from "./reconciliation-close-order.service"

type ControlContext = {
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }

export type AssignPaymentSuspenseItemInput = {
  organizationId: string
  suspenseItemId: string
  assignedById: string
  assignedToId?: string | null
  control: ControlContext
  correlationId?: string
}

export type AssignPaymentSuspenseItemResult = {
  suspenseItemId: string
  assignedToId: string
  exceptionCount: number
  correlationId: string
}

export type ProposeSuspenseReclassificationInput = {
  expectedEvidenceRevision: string
  idempotencyKey: string
  organizationId: string
  suspenseItemId: string
  proposedById: string
  targetType: SuspenseType
  reason: string
  suspenseLedgerAccountId?: string | null
  control: ControlContext
  correlationId?: string
}

export type ProposeSuspenseReclassificationResult = {
  replayed: boolean
  evidenceRevision: string
  suspenseItemId: string
  status: SuspenseStatus
  proposedById: string
  correlationId: string
}

export type ApproveSuspensePostingInput = {
  expectedEvidenceRevision: string
  organizationId: string
  suspenseItemId: string
  approvedById: string
  control: ControlContext
  correlationId?: string
}

export type ApproveSuspensePostingResult = {
  replayed: boolean
  approvedById: string
  suspenseItemId: string
  status: SuspenseStatus
  ledgerPostingBatchId: string
  inboxItemId: string
  correlationId: string
  postingRequest: {
    sourceType: AccountingSourceType
    postingPurpose: AccountingPostingPurpose
    amount: string
    currencyCode: string
  }
}

const openExceptionStatuses: PaymentExceptionStatus[] = [
  PaymentExceptionStatus.OPEN,
  PaymentExceptionStatus.ASSIGNED,
  PaymentExceptionStatus.ACKNOWLEDGED,
  PaymentExceptionStatus.ESCALATED,
  PaymentExceptionStatus.RESOLUTION_PROPOSED,
  PaymentExceptionStatus.REOPENED,
]

const assignableSuspenseStatuses: SuspenseStatus[] = [
  SuspenseStatus.OPEN,
  SuspenseStatus.ASSIGNED,
  SuspenseStatus.IN_REVIEW,
  SuspenseStatus.RESOLUTION_PROPOSED,
  SuspenseStatus.REOPENED,
]

function asJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

function metadataObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}
}

function reclassificationMetadata(value: Prisma.JsonValue | null | undefined) {
  const metadata = metadataObject(value)
  const raw = metadata.reclassification
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
}

function proposedByIdFromMetadata(value: Prisma.JsonValue | null | undefined) {
  const reclassification = reclassificationMetadata(value)
  return typeof reclassification?.proposedById === "string" ? reclassification.proposedById : null
}

function requireReviewedRevision(value: string) {
  if (!/^sha256:[a-f0-9]{64}$/.test(value ?? "")) {
    throw new BusinessRuleError("Refresh and review the suspense evidence before submitting.")
  }
}

async function lockSuspense(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM suspense_items WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`
}

async function auditSuspenseWorkflow(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    suspenseItemId: string
    message: string
    metadata: Prisma.InputJsonValue
    postingBatchId?: string | null
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "SuspenseItem",
      resourceId: params.suspenseItemId,
      postingBatchId: params.postingBatchId ?? null,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

async function assertSuspenseLedgerAccount(
  tx: Prisma.TransactionClient,
  organizationId: string,
  accountId: string,
) {
  const account = await tx.chartOfAccount.findFirst({
    where: { id: accountId, organizationId, deletedAt: null, isActive: true },
    include: { _count: { select: { children: true } } },
  })

  if (!account) throw new BusinessRuleError("Suspense ledger account was not found or is inactive.")
  if (account._count.children > 0) throw new BusinessRuleError("Suspense ledger account must be a leaf account.")
}

export async function assignPaymentSuspenseItem(
  input: AssignPaymentSuspenseItemInput,
): Promise<AssignPaymentSuspenseItemResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const assignedToId = input.assignedToId ?? input.assignedById

  const result = await db.$transaction(async (tx): Promise<ControlledResult<AssignPaymentSuspenseItemResult>> => {
    await lockSuspense(tx, input.organizationId, input.suspenseItemId)
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true } },
        reconciliationRun: { select: { id: true } },
        paymentExceptions: { select: { id: true, status: true, metadata: true, updatedAt: true } },
      },
    })

    if (!suspense) throw new NotFoundError("Suspense item not found")
    if (!assignableSuspenseStatuses.includes(suspense.status)) {
      throw new BusinessRuleError("Only open suspense items can be assigned.")
    }

    const decision = evaluateSensitiveAction({
      action: "payment.reconciliation.exception.assign",
      actorId: input.assignedById,
      organizationId: input.organizationId,
      actorPermissions: input.control.actorPermissions,
      resourceType: "SuspenseItem",
      resourceId: suspense.id,
      subjectActorId: suspense.ownerId,
      lastAuthAt: input.control.lastAuthAt,
      now: input.control.now,
      amount: suspense.amount,
      currency: suspense.currencyCode,
      metadata: { assignedToId, currentStatus: suspense.status },
    })
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }

    const assignee = await tx.user.findFirst({
      where: { id: assignedToId, organizationId: input.organizationId, isActive: true },
      select: { id: true },
    })
    if (!assignee) throw new BusinessRuleError("Suspense assignee is unavailable in this organization.")

    await tx.suspenseItem.update({
      where: { id: suspense.id },
      data: {
        ownerId: assignedToId,
        status: SuspenseStatus.ASSIGNED,
        metadata: asJsonObject({
          ...metadataObject(suspense.metadata),
          assignedById: input.assignedById,
          assignedAt: new Date().toISOString(),
          assignedCorrelationId: correlationId,
        }),
      },
    })

    let exceptionCount = 0
    for (const exception of suspense.paymentExceptions) {
      if (!openExceptionStatuses.includes(exception.status)) continue
      const updated = await tx.paymentException.updateMany({
        where: {
          id: exception.id,
          organizationId: input.organizationId,
          suspenseItemId: suspense.id,
          updatedAt: exception.updatedAt,
          status: { in: openExceptionStatuses },
        },
        data: {
          ownerId: assignedToId,
          status: PaymentExceptionStatus.ASSIGNED,
          metadata: asJsonObject({
            ...metadataObject(exception.metadata),
            assignedById: input.assignedById,
            assignedAt: new Date().toISOString(),
            assignedCorrelationId: correlationId,
          }),
        },
      })
      if (updated.count !== 1) throw new ConflictError("Exception evidence changed. Refresh before assigning the suspense item.")
      exceptionCount += updated.count
    }

    const assignmentAudit = await auditSuspenseWorkflow(tx, {
      organizationId: input.organizationId,
      actorId: input.assignedById,
      action: "PAYMENT_RECONCILIATION_SUSPENSE_ASSIGN",
      suspenseItemId: suspense.id,
      message: `Payment suspense item ${suspense.id} assigned`,
      metadata: asJsonObject({ assignedToId, exceptionCount, correlationId }),
    })

    await publishPaymentReconciliationNotification({
      type: "payment-reconciliation.exception.assigned",
      organizationId: input.organizationId,
      providerAccountId: suspense.providerAccountId,
      paymentRailId: suspense.providerAccount?.paymentRailId,
      severity: suspense.severity,
      amount: suspense.amount.toFixed(2),
      currency: suspense.currencyCode,
      ownerId: assignedToId,
      dueAt: suspense.slaDeadline,
      evidenceRef: {
        reconciliationRunId: suspense.reconciliationRunId,
        suspenseItemId: suspense.id,
        exceptionId: suspense.paymentExceptions[0]?.id,
      },
      correlationId,
      dedupeKey: `${suspense.id}:assigned:${assignmentAudit.id}`,
    }, tx)

    return {
      value: {
        suspenseItemId: suspense.id,
        assignedToId,
        exceptionCount,
        correlationId,
      },
    }
  })

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}

export async function proposeSuspenseReclassification(
  input: ProposeSuspenseReclassificationInput,
): Promise<ProposeSuspenseReclassificationResult> {
  const correlationId = input.correlationId ?? randomUUID()
  requireReviewedRevision(input.expectedEvidenceRevision)
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey ?? "")) throw new BusinessRuleError("A stable suspense proposal request reference is required.")
  const reason = input.reason.trim()
  if (!reason) throw new BusinessRuleError("Suspense reclassification requires a reason.")

  const result = await db.$transaction(async (tx): Promise<ControlledResult<ProposeSuspenseReclassificationResult>> => {
    await lockSuspense(tx, input.organizationId, input.suspenseItemId)
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true, suspenseLedgerAccountId: true } },
        reconciliationRun: { select: { businessDate: true } },
        paymentExceptions: { select: { id: true } },
      },
    })

    if (!suspense) throw new NotFoundError("Suspense item not found")
    if (!assignableSuspenseStatuses.includes(suspense.status)) {
      throw new BusinessRuleError("Only open suspense items can be proposed for reclassification.")
    }

    const decision = evaluateSensitiveAction({
      action: "payment.reconciliation.suspense.propose",
      actorId: input.proposedById,
      organizationId: input.organizationId,
      actorPermissions: input.control.actorPermissions,
      resourceType: "SuspenseItem",
      resourceId: suspense.id,
      lastAuthAt: input.control.lastAuthAt,
      now: input.control.now,
      amount: suspense.amount,
      currency: suspense.currencyCode,
      metadata: { targetType: input.targetType, reason },
    })
    if (!decision.allowed) {
      await auditSensitiveActionDecision(tx, decision)
      return { denied: decision }
    }
    const now = input.control.now ? new Date(input.control.now) : new Date()
    const requestedAccount = input.suspenseLedgerAccountId ?? suspense.suspenseLedgerAccountId ?? suspense.providerAccount?.suspenseLedgerAccountId ?? null
    const requestHash = suspenseEvidenceHash({ key: input.idempotencyKey, sourceRevision: input.expectedEvidenceRevision, actor: input.proposedById, targetType: input.targetType, reason, account: requestedAccount })
    const metadata = metadataObject(suspense.metadata)
    const previous = suspenseMetadata(metadata.reclassification)
    if (previous.requestId === input.idempotencyKey) {
      if (previous.requestHash !== requestHash) throw new IdempotencyConflictError()
      if (suspense.status !== SuspenseStatus.RESOLUTION_PROPOSED) throw new ConflictError("The proposal has moved on. Refresh its current evidence.")
      return { value: { suspenseItemId: suspense.id, status: suspense.status, proposedById: input.proposedById, correlationId, replayed: true, evidenceRevision: suspenseEvidenceRevision(suspense, now) } }
    }
    if (suspenseEvidenceRevision(suspense, now) !== input.expectedEvidenceRevision) throw new ConflictError("Suspense evidence changed. Refresh and review before proposing.")
    if (!requestedAccount) throw new BusinessRuleError("Configure the suspense ledger account before proposing reclassification.")
    await assertSuspenseLedgerAccount(tx, input.organizationId, requestedAccount)
    await auditSensitiveActionDecision(tx, decision)
    const updated = await tx.suspenseItem.update({
      where: { id: suspense.id },
      data: {
        type: input.targetType,
        status: SuspenseStatus.RESOLUTION_PROPOSED,
        suspenseLedgerAccountId: requestedAccount,
        resolutionNotes: reason,
        metadata: asJsonObject({
          ...metadata,
          reclassification: {
            requestId: input.idempotencyKey,
            requestHash,
            sourceRevision: input.expectedEvidenceRevision,
            proposedById: input.proposedById,
            proposedAt: new Date().toISOString(),
            targetType: input.targetType,
            suspenseLedgerAccountId: requestedAccount,
            reason,
            correlationId,
          },
        }),
      },
    })

    await tx.paymentException.updateMany({
      where: {
        organizationId: input.organizationId,
        suspenseItemId: suspense.id,
        status: { in: openExceptionStatuses },
      },
      data: {
        status: PaymentExceptionStatus.RESOLUTION_PROPOSED,
        resolutionNotes: reason,
      },
    })

    await auditSuspenseWorkflow(tx, {
      organizationId: input.organizationId,
      actorId: input.proposedById,
      action: "PAYMENT_RECONCILIATION_SUSPENSE_RECLASSIFICATION_PROPOSE",
      suspenseItemId: suspense.id,
      message: `Payment suspense item ${suspense.id} proposed for reclassification`,
      metadata: asJsonObject({ targetType: input.targetType, reason, correlationId }),
    })

    await publishPaymentReconciliationNotification({
      type: "payment-reconciliation.suspense.reclassification-proposed",
      organizationId: input.organizationId,
      providerAccountId: suspense.providerAccountId,
      paymentRailId: suspense.providerAccount?.paymentRailId,
      severity: suspense.severity,
      amount: suspense.amount.toFixed(2),
      currency: suspense.currencyCode,
      ownerId: suspense.ownerId,
      dueAt: suspense.slaDeadline,
      evidenceRef: {
        suspenseItemId: suspense.id,
        exceptionId: suspense.paymentExceptions[0]?.id,
      },
      correlationId,
      dedupeKey: `${suspense.id}:reclassification-proposed:${input.idempotencyKey}`,
    }, tx)

    return {
      value: {
        suspenseItemId: updated.id,
        status: updated.status,
        proposedById: input.proposedById,
        correlationId,
        replayed: false,
        evidenceRevision: suspenseEvidenceRevision({ ...updated, providerAccount: suspense.providerAccount, reconciliationRun: suspense.reconciliationRun }, now),
      },
    }
  })

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}

export async function approveSuspensePosting(
  input: ApproveSuspensePostingInput,
): Promise<ApproveSuspensePostingResult> {
  const correlationId = input.correlationId ?? randomUUID()
  requireReviewedRevision(input.expectedEvidenceRevision)
  const startedAt = Date.now(), suppliedNow = input.control.now ? new Date(input.control.now).getTime() : startedAt
  const controlNow = () => new Date(suppliedNow + Math.max(0, Date.now() - startedAt))

  const result = await withReconciliationCloseRetry(() => db.$transaction(async (tx): Promise<ControlledResult<ApproveSuspensePostingResult>> => {
    await lockReconciliationCloseCatalogInTx(tx, input.organizationId)
    const beforeLock = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: { reconciliationRun: { select: { businessDate: true } } },
    })
    if (!beforeLock) throw new NotFoundError("Suspense item not found")
    // Posting-period locks precede assessment and source locks. A retained
    // approval remains replayable after its posting period has closed.
    const period = beforeLock.status === SuspenseStatus.RESOLUTION_PROPOSED
      ? await getOpenPeriodForDate(input.organizationId, suspensePostingDate(beforeLock, controlNow()), tx)
      : null
    // A retained replay has no new Close effect. Taking assessment locks here
    // would invert source correction's locks while it verifies that same item.
    const affectedPeriodIds = beforeLock.status === SuspenseStatus.POSTED_TO_SUSPENSE
      ? [] : await lockReconciliationClosePeriodsInTx(tx, input.organizationId)
    await lockSuspense(tx, input.organizationId, input.suspenseItemId)
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true, suspenseLedgerAccountId: true } },
        reconciliationRun: { select: { id: true, businessDate: true } },
        paymentExceptions: { select: { id: true } },
      },
    })

    if (!suspense) throw new NotFoundError("Suspense item not found")
    if (suspense.status !== SuspenseStatus.RESOLUTION_PROPOSED && suspense.status !== SuspenseStatus.POSTED_TO_SUSPENSE) {
      throw new BusinessRuleError("Suspense posting approval requires a proposed reclassification.")
    }

    const proposedById = proposedByIdFromMetadata(suspense.metadata)
    if (!proposedById) {
      throw new BusinessRuleError("Suspense posting approval requires maker proposal evidence.")
    }

    const suspenseLedgerAccountId =
      suspense.suspenseLedgerAccountId ?? suspense.providerAccount?.suspenseLedgerAccountId ?? null
    if (!suspenseLedgerAccountId) {
      throw new BusinessRuleError("A suspense ledger account must be configured before posting approval.")
    }

    let now = controlNow()
    const authorization = () => evaluateSensitiveAction({
      action: "payment.reconciliation.suspense.post",
      actorId: input.approvedById,
      organizationId: input.organizationId,
      actorPermissions: input.control.actorPermissions,
      resourceType: "SuspenseItem",
      resourceId: suspense.id,
      subjectActorId: proposedById,
      lastAuthAt: input.control.lastAuthAt,
      now,
      amount: suspense.amount,
      currency: suspense.currencyCode,
      metadata: {
        proposedById,
        suspenseLedgerAccountId,
        currentStatus: suspense.status,
      },
    })
    const decision = authorization()
    if (!decision.allowed) {
      await auditSensitiveActionDecision(tx, decision)
      return { denied: decision }
    }
    if (suspense.status === SuspenseStatus.POSTED_TO_SUSPENSE) {
      const saved = suspenseMetadata(suspenseMetadata(suspense.metadata).postingApproval)
      if (saved.reviewedRevision !== input.expectedEvidenceRevision) throw new ConflictError("This approval does not match the reviewed proposal. Open the retained posting evidence.")
      const approvedAt = typeof saved.approvedAt === "string" ? new Date(saved.approvedAt) : null
      if (!approvedAt || !Number.isFinite(approvedAt.getTime()) || !suspense.postedAt || suspense.postedAt.getTime() !== approvedAt.getTime()
        || typeof saved.approvedById !== "string" || saved.approvedById === proposedById || saved.proposedById !== proposedById
        || !suspense.ledgerPostingBatchId || saved.ledgerPostingBatchId !== suspense.ledgerPostingBatchId || typeof saved.inboxItemId !== "string"
        || saved.sourceHash !== suspensePostingSourceHash(suspense, approvedAt)
        || saved.proposalHash !== suspenseEvidenceHash(reclassificationMetadata(suspense.metadata))) {
        throw new ConflictError("Retained suspense approval evidence requires review.")
      }
      await assertPaymentSuspenseLedgerTruthInTx(tx, { organizationId: input.organizationId, suspenseItemId: suspense.id })
      const inbox = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: saved.inboxItemId, organizationId: input.organizationId, source: PaymentReconciliationInboxSource.SUSPENSE_POST, idempotencyKey: suspenseApprovalKey(suspense), externalId: suspense.ledgerPostingBatchId, status: PaymentReconciliationInboxStatus.PROCESSED } })
      const retained = suspenseMetadata(inbox?.payloadSummary)
      const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId: input.organizationId, resourceId: suspense.id, action: "PAYMENT_RECONCILIATION_SUSPENSE_POST_APPROVE", actorId: saved.approvedById, postingBatchId: suspense.ledgerPostingBatchId } })
      if (!inbox || !audit || inbox.payloadHash !== suspenseEvidenceHash(inbox.payloadSummary).slice(7) || retained.reviewedRevision !== input.expectedEvidenceRevision || retained.approvedById !== saved.approvedById || retained.requestedById !== proposedById || retained.suspenseItemId !== suspense.id || retained.ledgerPostingBatchId !== suspense.ledgerPostingBatchId) throw new ConflictError("Retained suspense approval receipt requires review.")
      return { value: { suspenseItemId: suspense.id, status: suspense.status, ledgerPostingBatchId: suspense.ledgerPostingBatchId, inboxItemId: inbox.id, correlationId, replayed: true, approvedById: saved.approvedById, postingRequest: { sourceType: AccountingSourceType.PAYMENT_SUSPENSE, postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION, amount: suspense.amount.toFixed(2), currencyCode: suspense.currencyCode } } }
    }
    if (suspenseEvidenceRevision(suspense, now) !== input.expectedEvidenceRevision) throw new ConflictError("Suspense evidence changed. Refresh and review before approval.")
    await assertSuspenseLedgerAccount(tx, input.organizationId, suspenseLedgerAccountId)
    await auditSensitiveActionDecision(tx, decision)
    const periodDate = suspensePostingDate(suspense, now)
    if (!period || periodDate < period.startDate || periodDate > period.endDate) {
      throw new ConflictError("Suspense posting period changed. Refresh and review before approval.")
    }

    const postingRequest = buildSuspensePostingRequest({
      organizationId: input.organizationId,
      suspenseItemId: suspense.id,
      amount: suspense.amount,
      currencyCode: suspense.currencyCode,
      requestedById: proposedById,
      correlationId,
    })

    const ledgerPosting = await postPaymentSuspenseToLedger(
      {
        organizationId: input.organizationId,
        suspenseItemId: suspense.id,
        suspenseLedgerAccountId,
        periodId: period.id,
        postingDate: periodDate,
        actorId: input.approvedById,
        correlationId,
      },
      tx,
    )
    const batch = ledgerPosting.ledgerBatch
    // Account/rule/sequence waits inside the ledger writer must not extend
    // authentication. Throw on late denial so all financial effects roll back.
    now = controlNow()
    assertSensitiveActionAllowed(authorization())

    const inboxPayload = asJsonObject({
      reviewedRevision: input.expectedEvidenceRevision,
      suspenseItemId: suspense.id,
      ledgerPostingBatchId: batch.id,
      sourceType: postingRequest.sourceType,
      postingPurpose: postingRequest.postingPurpose,
      amount: postingRequest.amount.toFixed(2),
      currencyCode: postingRequest.currencyCode,
      requestedById: proposedById,
      approvedById: input.approvedById,
      suspenseLedgerAccountId,
      correlationId,
    })
    const payloadHash = suspenseEvidenceHash(inboxPayload).slice(7)
    // A completed approval is immutable. Normal retries resolve the retained
    // receipt above; a conflicting pre-existing key must never be overwritten.
    const inbox = await tx.paymentReconciliationInboxItem.create({
      data: {
        organizationId: input.organizationId,
        providerAccountId: suspense.providerAccountId,
        source: PaymentReconciliationInboxSource.SUSPENSE_POST,
        status: PaymentReconciliationInboxStatus.PROCESSED,
        idempotencyKey: suspenseApprovalKey(suspense),
        externalId: batch.id,
        payloadHash,
        payloadSummary: inboxPayload,
        processedAt: now,
        correlationId,
      },
      select: { id: true },
    })

    await tx.suspenseItem.update({
      where: { id: suspense.id },
      data: {
        status: SuspenseStatus.POSTED_TO_SUSPENSE,
        postedAt: now,
        ledgerPostingBatchId: batch.id,
        suspenseLedgerAccountId,
        metadata: asJsonObject({
          ...metadataObject(suspense.metadata),
          postingApproval: {
            reviewedRevision: input.expectedEvidenceRevision,
            sourceHash: suspensePostingSourceHash(suspense, now),
            proposalHash: suspenseEvidenceHash(reclassificationMetadata(suspense.metadata)),
            proposedById,
            approvedById: input.approvedById,
            approvedAt: now.toISOString(),
            ledgerPostingBatchId: batch.id,
            inboxItemId: inbox.id,
            correlationId,
          },
        }),
      },
    })

    await auditSuspenseWorkflow(tx, {
      organizationId: input.organizationId,
      actorId: input.approvedById,
      action: "PAYMENT_RECONCILIATION_SUSPENSE_POST_APPROVE",
      suspenseItemId: suspense.id,
      postingBatchId: batch.id,
      message: `Payment suspense item ${suspense.id} approved for suspense posting`,
      metadata: asJsonObject({ proposedById, inboxItemId: inbox.id, correlationId }),
    })

    await publishPaymentReconciliationNotification({
      type: "payment-reconciliation.suspense.reclassification-approved",
      organizationId: input.organizationId,
      providerAccountId: suspense.providerAccountId,
      paymentRailId: suspense.providerAccount?.paymentRailId,
      severity: suspense.severity,
      amount: suspense.amount.toFixed(2),
      currency: suspense.currencyCode,
      ownerId: suspense.ownerId,
      dueAt: suspense.slaDeadline,
      evidenceRef: {
        reconciliationRunId: suspense.reconciliationRunId,
        suspenseItemId: suspense.id,
        exceptionId: suspense.paymentExceptions[0]?.id,
      },
      correlationId,
      dedupeKey: `${suspense.id}:reclassification-approved:${input.approvedById}${suspensePostingCycle(suspense) ? `:cycle:${suspensePostingCycle(suspense)!.number}` : ""}`,
    }, tx)

    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_SUSPENSE_POSTING",
      sourceId: suspense.id,
      periodIds: affectedPeriodIds,
      staleReason: "Payment suspense posting changed certified close evidence.",
      newEvidenceHash: payloadHash,
      correlationId,
    }, {
      actorId: input.approvedById,
      now,
    })

    return {
      value: {
        suspenseItemId: suspense.id,
        status: SuspenseStatus.POSTED_TO_SUSPENSE,
        replayed: false,
        approvedById: input.approvedById,
        ledgerPostingBatchId: batch.id,
        inboxItemId: inbox.id,
        correlationId,
        postingRequest: {
          sourceType: postingRequest.sourceType,
          postingPurpose: postingRequest.postingPurpose,
          amount: postingRequest.amount.toFixed(2),
          currencyCode: postingRequest.currencyCode,
        },
      },
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034"
      || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))) {
      throw new ConflictError("Suspense posting or accounting setup changed concurrently. Refresh and review before retrying.")
    }
    throw error
  })

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}
