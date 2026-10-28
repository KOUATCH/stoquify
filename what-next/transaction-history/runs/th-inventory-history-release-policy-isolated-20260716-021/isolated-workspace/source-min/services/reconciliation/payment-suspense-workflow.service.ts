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
import { createHash, randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"

import { buildSuspensePostingRequest } from "./payment-suspense-posting.gateway"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

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
  suspenseItemId: string
  status: SuspenseStatus
  proposedById: string
  correlationId: string
}

export type ApproveSuspensePostingInput = {
  organizationId: string
  suspenseItemId: string
  approvedById: string
  control: ControlContext
  correlationId?: string
}

export type ApproveSuspensePostingResult = {
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

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
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
  await tx.ledgerAuditEvent.create({
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

async function resolveOpenPeriodForSuspense(
  tx: Prisma.TransactionClient,
  organizationId: string,
  businessDate: Date,
) {
  const period = await tx.accountingPeriod.findFirst({
    where: {
      organizationId,
      startDate: { lte: businessDate },
      endDate: { gte: businessDate },
      status: "OPEN",
    },
    select: { id: true },
  })

  if (!period) {
    throw new BusinessRuleError("An open accounting period is required before suspense posting approval.")
  }

  return period
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
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true } },
        reconciliationRun: { select: { id: true } },
        paymentExceptions: { select: { id: true, status: true } },
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

    const exceptionUpdate = await tx.paymentException.updateMany({
      where: {
        organizationId: input.organizationId,
        suspenseItemId: suspense.id,
        status: { in: openExceptionStatuses },
      },
      data: {
        ownerId: assignedToId,
        status: PaymentExceptionStatus.ASSIGNED,
        metadata: asJsonObject({
          assignedById: input.assignedById,
          assignedAt: new Date().toISOString(),
          assignedCorrelationId: correlationId,
        }),
      },
    })

    await auditSuspenseWorkflow(tx, {
      organizationId: input.organizationId,
      actorId: input.assignedById,
      action: "PAYMENT_RECONCILIATION_SUSPENSE_ASSIGN",
      suspenseItemId: suspense.id,
      message: `Payment suspense item ${suspense.id} assigned`,
      metadata: asJsonObject({ assignedToId, exceptionCount: exceptionUpdate.count, correlationId }),
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
      dedupeKey: `${suspense.id}:assigned:${assignedToId}`,
    }, tx)

    return {
      value: {
        suspenseItemId: suspense.id,
        assignedToId,
        exceptionCount: exceptionUpdate.count,
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
  const reason = input.reason.trim()
  if (!reason) throw new BusinessRuleError("Suspense reclassification requires a reason.")

  const result = await db.$transaction(async (tx): Promise<ControlledResult<ProposeSuspenseReclassificationResult>> => {
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true } },
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
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }

    const metadata = metadataObject(suspense.metadata)
    const updated = await tx.suspenseItem.update({
      where: { id: suspense.id },
      data: {
        type: input.targetType,
        status: SuspenseStatus.RESOLUTION_PROPOSED,
        suspenseLedgerAccountId: input.suspenseLedgerAccountId ?? suspense.suspenseLedgerAccountId,
        resolutionNotes: reason,
        metadata: asJsonObject({
          ...metadata,
          reclassification: {
            proposedById: input.proposedById,
            proposedAt: new Date().toISOString(),
            targetType: input.targetType,
            suspenseLedgerAccountId: input.suspenseLedgerAccountId ?? suspense.suspenseLedgerAccountId ?? null,
            reason,
            correlationId,
          },
        }),
      },
      select: { id: true, status: true },
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
      dedupeKey: `${suspense.id}:reclassification-proposed:${input.proposedById}`,
    }, tx)

    return {
      value: {
        suspenseItemId: updated.id,
        status: updated.status,
        proposedById: input.proposedById,
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

export async function approveSuspensePosting(
  input: ApproveSuspensePostingInput,
): Promise<ApproveSuspensePostingResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const now = input.control.now ? new Date(input.control.now) : new Date()

  const result = await db.$transaction(async (tx): Promise<ControlledResult<ApproveSuspensePostingResult>> => {
    const suspense = await tx.suspenseItem.findFirst({
      where: { id: input.suspenseItemId, organizationId: input.organizationId },
      include: {
        providerAccount: { select: { id: true, paymentRailId: true, suspenseLedgerAccountId: true } },
        reconciliationRun: { select: { id: true, businessDate: true } },
        paymentExceptions: { select: { id: true } },
      },
    })

    if (!suspense) throw new NotFoundError("Suspense item not found")
    if (suspense.status !== SuspenseStatus.RESOLUTION_PROPOSED) {
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
    await assertSuspenseLedgerAccount(tx, input.organizationId, suspenseLedgerAccountId)

    const decision = evaluateSensitiveAction({
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
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }

    const periodDate = suspense.reconciliationRun?.businessDate ?? now
    const period = await resolveOpenPeriodForSuspense(tx, input.organizationId, periodDate)

    const postingRequest = buildSuspensePostingRequest({
      organizationId: input.organizationId,
      suspenseItemId: suspense.id,
      amount: suspense.amount,
      currencyCode: suspense.currencyCode,
      requestedById: proposedById,
      correlationId,
    })

    const batch = await createLedgerPostingBatch(
      {
        organizationId: input.organizationId,
        periodId: period.id,
        sourceType: postingRequest.sourceType,
        sourceId: suspense.id,
        postingPurpose: postingRequest.postingPurpose,
        metadata: asJsonObject({
          approvedById: input.approvedById,
          proposedById,
          suspenseLedgerAccountId,
          amount: postingRequest.amount.toFixed(2),
          currencyCode: suspense.currencyCode,
          correlationId,
          approvalStatus: "APPROVED_AWAITING_LEDGER_POSTING",
        }),
      },
      tx,
    )

    const inboxPayload = asJsonObject({
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
    const payloadHash = sha256(JSON.stringify(inboxPayload))
    const inbox = await tx.paymentReconciliationInboxItem.upsert({
      where: {
        organizationId_source_idempotencyKey: {
          organizationId: input.organizationId,
          source: PaymentReconciliationInboxSource.SUSPENSE_POST,
          idempotencyKey: `${suspense.id}:posting-approval`,
        },
      },
      create: {
        organizationId: input.organizationId,
        providerAccountId: suspense.providerAccountId,
        source: PaymentReconciliationInboxSource.SUSPENSE_POST,
        status: PaymentReconciliationInboxStatus.PROCESSED,
        idempotencyKey: `${suspense.id}:posting-approval`,
        externalId: batch.id,
        payloadHash,
        payloadSummary: inboxPayload,
        processedAt: now,
        correlationId,
      },
      update: {
        attempts: { increment: 1 },
        status: PaymentReconciliationInboxStatus.PROCESSED,
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
      dedupeKey: `${suspense.id}:reclassification-approved:${input.approvedById}`,
    }, tx)

    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_SUSPENSE_POSTING",
      sourceId: suspense.id,
      periodId: period.id,
      periodStart: periodDate,
      periodEnd: periodDate,
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
  })

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}
