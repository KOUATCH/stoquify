import {
  CustomerReceivableDocumentStatus,
  Prisma,
} from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION,
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
  loadCustomerReceivableWithLatestState,
  receivableJson,
  receivableMoney,
} from "./customer-receivable-document.service"

export type ReceivableLifecycleInput = {
  organizationId: string
  documentId: string
  actorId: string
  status: CustomerReceivableDocumentStatus
  paidAmount: Prisma.Decimal.Value
  unpaidAmount: Prisma.Decimal.Value
  effectiveAt: Date | string
  sourceType: string
  sourceId: string
  reason?: string | null
  evidenceHash?: string | null
  metadata?: Record<string, unknown>
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function normalizedDate(value: Date | string, label: string) {
  const result = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(result.getTime())) {
    throw new BusinessRuleError(label + " is invalid")
  }
  return result
}

function isSha256(value: string | null | undefined) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value)
}

function assertTransition(
  from: CustomerReceivableDocumentStatus,
  to: CustomerReceivableDocumentStatus,
) {
  const allowed: Record<
    CustomerReceivableDocumentStatus,
    CustomerReceivableDocumentStatus[]
  > = {
    DRAFT: [
      CustomerReceivableDocumentStatus.ISSUED,
      CustomerReceivableDocumentStatus.VOIDED,
    ],
    ISSUED: [
      CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      CustomerReceivableDocumentStatus.PAID,
      CustomerReceivableDocumentStatus.CANCELLED,
      CustomerReceivableDocumentStatus.VOIDED,
    ],
    PARTIALLY_PAID: [
      CustomerReceivableDocumentStatus.ISSUED,
      CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      CustomerReceivableDocumentStatus.PAID,
      CustomerReceivableDocumentStatus.CANCELLED,
      CustomerReceivableDocumentStatus.VOIDED,
    ],
    PAID: [
      CustomerReceivableDocumentStatus.ISSUED,
      CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      CustomerReceivableDocumentStatus.CANCELLED,
      CustomerReceivableDocumentStatus.VOIDED,
    ],
    CANCELLED: [],
    VOIDED: [],
  }
  if (!allowed[from].includes(to)) {
    throw new BusinessRuleError(
      "Customer receivable cannot transition from " + from + " to " + to,
    )
  }
}

export async function appendCustomerReceivableLifecycleStateInTx(
  tx: Prisma.TransactionClient,
  input: ReceivableLifecycleInput,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const documentId = requiredText(input.documentId, "Receivable document")
  const actorId = requiredText(input.actorId, "Actor")
  const sourceType = requiredText(input.sourceType, "Lifecycle source type")
  const sourceId = requiredText(input.sourceId, "Lifecycle source")
  const effectiveAt = normalizedDate(
    input.effectiveAt,
    "Lifecycle effective date",
  )
  const paidAmount = receivableMoney(
    input.paidAmount,
    "Receivable paid amount",
  )
  const unpaidAmount = receivableMoney(
    input.unpaidAmount,
    "Receivable unpaid amount",
  )
  const reason = input.reason?.trim() || null
  const terminal =
    input.status === CustomerReceivableDocumentStatus.CANCELLED ||
    input.status === CustomerReceivableDocumentStatus.VOIDED

  if (
    terminal &&
    (!reason || reason.length < 3 || reason.length > 500)
  ) {
    throw new BusinessRuleError(
      "Cancelled or voided receivables require a bounded reason",
    )
  }

  const replay = await tx.customerReceivableDocumentState.findFirst({
    where: { organizationId, documentId, sourceType, sourceId },
  })
  if (replay) {
    if (
      replay.status !== input.status ||
      !replay.paidAmount.eq(paidAmount) ||
      !replay.unpaidAmount.eq(unpaidAmount)
    ) {
      throw new ConflictError(
        "Receivable lifecycle source was reused with different evidence",
      )
    }
    return { state: replay, replayed: true }
  }

  const { document, latestState } =
    await loadCustomerReceivableWithLatestState(
      tx,
      organizationId,
      documentId,
    )
  assertTransition(latestState.status, input.status)

  if (
    !terminal &&
    !paidAmount.plus(unpaidAmount).eq(document.totalAmount)
  ) {
    throw new BusinessRuleError(
      "Receivable lifecycle paid and unpaid amounts must conserve the document total",
    )
  }
  if (
    paidAmount.lt(0) ||
    unpaidAmount.lt(0) ||
    paidAmount.gt(document.totalAmount) ||
    unpaidAmount.gt(document.totalAmount)
  ) {
    throw new BusinessRuleError(
      "Receivable lifecycle monetary state is outside the document total",
    )
  }

  const version = latestState.version + 1
  const evidenceHash =
    input.evidenceHash?.trim().toLowerCase() ||
    hashBusinessPayload({
      sourceType,
      sourceId,
      documentId,
      version,
      status: input.status,
      paidAmount: paidAmount.toFixed(2),
      unpaidAmount: unpaidAmount.toFixed(2),
      effectiveAt: effectiveAt.toISOString(),
      reason,
    })
  if (!isSha256(evidenceHash)) {
    throw new BusinessRuleError(
      "Receivable lifecycle evidence hash must be a lowercase SHA-256 digest",
    )
  }
  const stateHash = hashBusinessPayload({
    organizationId,
    documentId,
    version,
    status: input.status,
    paidAmount: paidAmount.toFixed(2),
    unpaidAmount: unpaidAmount.toFixed(2),
    effectiveAt: effectiveAt.toISOString(),
    sourceType,
    sourceId,
    reason,
    previousStateHash: latestState.stateHash,
    documentHash: document.documentHash,
    evidenceHash,
  })

  const event = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "customer.receivable.lifecycle.changed",
    eventSource: "INTERNAL",
    schemaVersion: CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION,
    idempotencyKey:
      "customer-receivable:" + documentId + ":state:" + stateHash,
    payload: {
      customerReceivableDocumentId: documentId,
      documentNumber: document.documentNumber,
      stateVersion: version,
      previousStatus: latestState.status,
      status: input.status,
      paidAmount: paidAmount.toFixed(2),
      unpaidAmount: unpaidAmount.toFixed(2),
      sourceType,
      sourceId,
      evidenceHash,
      stateHash,
    },
    occurredAt: effectiveAt,
    actorId,
    sourceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
    sourceId: documentId,
    documentHash: document.documentHash,
    metadata: {
      gate: "phase-5-slice-438-receivable-lifecycle",
      previousStateHash: latestState.stateHash,
    },
    outboxMessages: [],
  })

  const state = await tx.customerReceivableDocumentState.create({
    data: {
      organizationId,
      documentId,
      version,
      status: input.status,
      paidAmount,
      unpaidAmount,
      effectiveAt,
      actorId,
      sourceType,
      sourceId,
      reason,
      previousStateHash: latestState.stateHash,
      stateHash,
      businessEventId: event.event.id,
      evidenceHash,
      metadata: receivableJson({
        gate: "phase-5-slice-438-receivable-lifecycle",
        documentHash: document.documentHash,
        ...(input.metadata ?? {}),
      }),
    },
  })
  await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerReceivableDocument",
      entityId: documentId,
      action: "CUSTOMER_RECEIVABLE_LIFECYCLE_APPENDED",
      userId: actorId,
      changes: receivableJson({
        before: {
          version: latestState.version,
          status: latestState.status,
          paidAmount: latestState.paidAmount.toFixed(2),
          unpaidAmount: latestState.unpaidAmount.toFixed(2),
          stateHash: latestState.stateHash,
        },
        after: {
          version,
          status: input.status,
          paidAmount: paidAmount.toFixed(2),
          unpaidAmount: unpaidAmount.toFixed(2),
          stateHash,
          evidenceHash,
          sourceType,
          sourceId,
          businessEventId: event.event.id,
        },
      }),
    },
  })
  return { state, replayed: false }
}

export async function recordCustomerReceivableSettlementAppliedInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    documentId: string
    actorId: string
    settlementAllocationId: string
    amount: Prisma.Decimal.Value
    effectiveAt: Date | string
    evidenceHash: string
  },
) {
  const { document, latestState } =
    await loadCustomerReceivableWithLatestState(
      tx,
      input.organizationId,
      input.documentId,
    )
  const amount = receivableMoney(
    input.amount,
    "Settlement application amount",
  )
  const paidAmount = latestState.paidAmount.plus(amount).toDecimalPlaces(2)
  const unpaidAmount = latestState.unpaidAmount.minus(amount).toDecimalPlaces(2)
  if (unpaidAmount.lt(0)) {
    throw new BusinessRuleError(
      "Settlement application exceeds posted receivable unpaid amount",
    )
  }
  if (!paidAmount.plus(unpaidAmount).eq(document.totalAmount)) {
    throw new ConflictError(
      "Settlement application would break posted receivable conservation",
    )
  }
  return appendCustomerReceivableLifecycleStateInTx(tx, {
    organizationId: input.organizationId,
    documentId: input.documentId,
    actorId: input.actorId,
    status: unpaidAmount.eq(0)
      ? CustomerReceivableDocumentStatus.PAID
      : CustomerReceivableDocumentStatus.PARTIALLY_PAID,
    paidAmount,
    unpaidAmount,
    effectiveAt: input.effectiveAt,
    sourceType: "CUSTOMER_SETTLEMENT_ALLOCATION",
    sourceId: input.settlementAllocationId,
    evidenceHash: input.evidenceHash,
  })
}

export async function recordCustomerReceivableSettlementReversedInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    documentId: string
    actorId: string
    settlementAllocationId: string
    amount: Prisma.Decimal.Value
    effectiveAt: Date | string
    evidenceHash: string
  },
) {
  const { document, latestState } =
    await loadCustomerReceivableWithLatestState(
      tx,
      input.organizationId,
      input.documentId,
    )
  const amount = receivableMoney(input.amount, "Settlement reversal amount")
  const paidAmount = latestState.paidAmount.minus(amount).toDecimalPlaces(2)
  const unpaidAmount = latestState.unpaidAmount.plus(amount).toDecimalPlaces(2)
  if (
    paidAmount.lt(0) ||
    unpaidAmount.gt(document.totalAmount) ||
    !paidAmount.plus(unpaidAmount).eq(document.totalAmount)
  ) {
    throw new ConflictError(
      "Settlement reversal would break posted receivable conservation",
    )
  }
  return appendCustomerReceivableLifecycleStateInTx(tx, {
    organizationId: input.organizationId,
    documentId: input.documentId,
    actorId: input.actorId,
    status: paidAmount.eq(0)
      ? CustomerReceivableDocumentStatus.ISSUED
      : CustomerReceivableDocumentStatus.PARTIALLY_PAID,
    paidAmount,
    unpaidAmount,
    effectiveAt: input.effectiveAt,
    sourceType: "CUSTOMER_SETTLEMENT_REVERSAL",
    sourceId: input.settlementAllocationId,
    evidenceHash: input.evidenceHash,
  })
}

export async function voidCustomerReceivableDocumentInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    documentId: string
    actorId: string
    salesOrderId: string
    effectiveAt: Date | string
    reason: string
    evidenceHash?: string | null
  },
) {
  const { latestState } =
    await loadCustomerReceivableWithLatestState(
      tx,
      input.organizationId,
      input.documentId,
    )
  return appendCustomerReceivableLifecycleStateInTx(tx, {
    organizationId: input.organizationId,
    documentId: input.documentId,
    actorId: input.actorId,
    status: CustomerReceivableDocumentStatus.VOIDED,
    paidAmount: latestState.paidAmount,
    unpaidAmount: 0,
    effectiveAt: input.effectiveAt,
    sourceType: "POS_VOID",
    sourceId: input.salesOrderId,
    reason: input.reason,
    evidenceHash: input.evidenceHash,
  })
}
