import { PaymentReconciliationInboxSource, PaymentReconciliationInboxStatus, Prisma } from "@prisma/client"
import { createHash } from "node:crypto"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"

export type PaymentReconciliationNotificationType =
  | "payment-reconciliation.exception.created"
  | "payment-reconciliation.exception.assigned"
  | "payment-reconciliation.exception.escalated"
  | "payment-reconciliation.suspense.created"
  | "payment-reconciliation.suspense.sla-warning"
  | "payment-reconciliation.suspense.sla-breached"
  | "payment-reconciliation.manual-match.proposed"
  | "payment-reconciliation.manual-match.approved"
  | "payment-reconciliation.manual-match.rejected"
  | "payment-reconciliation.run.failed"
  | "payment-reconciliation.run.ready-for-signoff"
  | "payment-reconciliation.period-close.blocked"
  | "payment-reconciliation.suspense.reclassification-proposed"
  | "payment-reconciliation.suspense.reclassification-approved"

export type PaymentReconciliationNotificationEvent = {
  type: PaymentReconciliationNotificationType
  organizationId: string
  providerAccountId?: string | null
  paymentRailId?: string | null
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  amount?: string | null
  currency?: string | null
  ownerId?: string | null
  dueAt?: Date | null
  evidenceRef?: {
    providerEventId?: string | null
    statementLineId?: string | null
    paymentTransactionId?: string | null
    reconciliationRunId?: string | null
    suspenseItemId?: string | null
    exceptionId?: string | null
  }
  correlationId: string
  dedupeKey?: string
}

type NotificationClient = Pick<Prisma.TransactionClient, "paymentReconciliationInboxItem"> | Pick<typeof db, "paymentReconciliationInboxItem">

function notificationSource(type: PaymentReconciliationNotificationType) {
  if (type.startsWith("payment-reconciliation.suspense.")) {
    return PaymentReconciliationInboxSource.SUSPENSE_POST
  }

  return PaymentReconciliationInboxSource.RECONCILIATION_RUN
}

function primaryEvidenceKey(event: PaymentReconciliationNotificationEvent) {
  return [
    event.evidenceRef?.reconciliationRunId,
    event.evidenceRef?.suspenseItemId,
    event.evidenceRef?.exceptionId,
    event.evidenceRef?.providerEventId,
    event.evidenceRef?.statementLineId,
    event.evidenceRef?.paymentTransactionId,
    event.ownerId,
    event.providerAccountId,
    event.paymentRailId,
  ].find(Boolean)
}

function notificationIdempotencyKey(event: PaymentReconciliationNotificationEvent) {
  const scope = event.dedupeKey ?? primaryEvidenceKey(event) ?? event.correlationId
  return `${event.type}:${scope}`
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function asJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

export async function publishPaymentReconciliationNotification(
  event: PaymentReconciliationNotificationEvent,
  client: NotificationClient = db,
) {
  const source = notificationSource(event.type)
  const idempotencyKey = notificationIdempotencyKey(event)
  const payloadSummary = asJsonObject({
    notification: {
      type: event.type,
      category: "reconciliation",
      delivery: "in-app",
      status: "UNREAD",
      ownerId: event.ownerId ?? null,
      dueAt: event.dueAt?.toISOString() ?? null,
      severity: event.severity ?? null,
    },
    amount: event.amount ?? null,
    currency: event.currency ?? null,
    evidenceRef: event.evidenceRef ?? {},
  })
  const payloadHash = sha256(JSON.stringify(payloadSummary))

  await client.paymentReconciliationInboxItem.upsert({
    where: {
      organizationId_source_idempotencyKey: {
        organizationId: event.organizationId,
        source,
        idempotencyKey,
      },
    },
    create: {
      organizationId: event.organizationId,
      providerAccountId: event.providerAccountId ?? null,
      source,
      status: PaymentReconciliationInboxStatus.PROCESSED,
      idempotencyKey,
      externalId: primaryEvidenceKey(event) ?? null,
      payloadHash,
      payloadSummary,
      processedAt: new Date(),
      correlationId: event.correlationId,
    },
    update: {
      attempts: { increment: 1 },
      status: PaymentReconciliationInboxStatus.PROCESSED,
      payloadHash,
      payloadSummary,
      processedAt: new Date(),
      correlationId: event.correlationId,
    },
  })

  logger.info("payment-reconciliation.notification", {
    ...event,
    dueAt: event.dueAt?.toISOString() ?? null,
    source,
    idempotencyKey,
  })
}
