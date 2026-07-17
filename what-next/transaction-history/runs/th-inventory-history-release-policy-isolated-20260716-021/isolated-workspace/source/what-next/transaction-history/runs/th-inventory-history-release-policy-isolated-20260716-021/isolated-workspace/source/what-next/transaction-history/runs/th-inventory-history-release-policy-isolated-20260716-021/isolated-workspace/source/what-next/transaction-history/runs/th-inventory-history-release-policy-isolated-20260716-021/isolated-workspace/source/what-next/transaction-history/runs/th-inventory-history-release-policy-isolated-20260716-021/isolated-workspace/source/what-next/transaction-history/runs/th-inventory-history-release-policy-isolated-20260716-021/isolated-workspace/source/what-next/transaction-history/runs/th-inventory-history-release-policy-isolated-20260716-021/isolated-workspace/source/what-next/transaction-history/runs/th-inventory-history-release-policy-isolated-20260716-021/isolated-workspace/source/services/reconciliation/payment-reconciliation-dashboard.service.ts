import {
  ExceptionSeverity,
  PaymentReconciliationInboxSource,
  PaymentExceptionStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

export type PaymentReconciliationDashboardData = {
  source: {
    mode: "DURABLE_EVIDENCE_KERNEL"
    certificationStatus: "NO_EVIDENCE" | "READY_FOR_RUN" | "NEEDS_REVIEW" | "READY_FOR_SIGNOFF" | "SIGNED"
    asOf: string
    organizationScoped: true
    providerEvidenceAvailable: boolean
    statementEvidenceAvailable: boolean
  }
  summary: {
    providerAccountCount: number
    activeProviderAccountCount: number
    recentRunCount: number
    readyForSignoffCount: number
    signedRunCount: number
    openExceptionCount: number
    criticalExceptionCount: number
    openSuspenseCount: number
    openSuspenseAmount: number
    closeBlockerCount: number
  }
  providerAccounts: Array<{
    id: string
    displayName: string
    providerCode: string
    status: string
    currencyCode: string
    railName: string
    railType: string
  }>
  recentRuns: Array<{
    id: string
    providerAccountId: string
    businessDate: string
    status: string
    matchCount: number
    exceptionCount: number
    suspenseAmount: number
    signedAt: string | null
    certificateHash: string | null
  }>
  suspenseQueue: Array<{
    id: string
    providerAccountId: string | null
    status: string
    severity: string
    type: string
    amount: number
    currencyCode: string
    slaDeadline: string | null
    correlationId: string | null
    ownerId: string | null
    exceptionId: string | null
    suspenseLedgerAccountId: string | null
    ledgerPostingBatchId: string | null
    resolutionNotes: string | null
    proposedById: string | null
    postedAt: string | null
  }>
  notificationQueue: Array<{
    id: string
    type: string
    severity: string | null
    ownerId: string | null
    dueAt: string | null
    amount: string | null
    currency: string | null
    status: string
    source: string
    createdAt: string
    evidenceRef: {
      providerEventId?: string | null
      statementLineId?: string | null
      paymentTransactionId?: string | null
      reconciliationRunId?: string | null
      suspenseItemId?: string | null
      exceptionId?: string | null
    }
  }>
  exceptionGroups: Array<{
    key: string
    type: string
    severity: string
    count: number
  }>
  controls: {
    certifiedModeEnabled: boolean
    providerIngestionKillSwitch: boolean
    signoffRequiresFreshAuth: true
    manualMatchMakerChecker: true
    suspensePostingGatewayOnly: true
  }
}

function decimalNumber(value: { toNumber: () => number } | number | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : value.toNumber()
}

function openExceptionStatuses(): PaymentExceptionStatus[] {
  return [
    PaymentExceptionStatus.OPEN,
    PaymentExceptionStatus.ASSIGNED,
    PaymentExceptionStatus.ACKNOWLEDGED,
    PaymentExceptionStatus.ESCALATED,
    PaymentExceptionStatus.RESOLUTION_PROPOSED,
    PaymentExceptionStatus.REOPENED,
  ]
}

function openSuspenseStatuses(): SuspenseStatus[] {
  return [
    SuspenseStatus.OPEN,
    SuspenseStatus.ASSIGNED,
    SuspenseStatus.IN_REVIEW,
    SuspenseStatus.POSTED_TO_SUSPENSE,
    SuspenseStatus.RESOLUTION_PROPOSED,
    SuspenseStatus.REOPENED,
  ]
}

function startOfUtcDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function endOfUtcDay(date: Date) {
  const next = startOfUtcDay(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}
}

function proposedById(value: unknown) {
  const raw = metadataObject(value).reclassification
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const proposed = (raw as Record<string, unknown>).proposedById
  return typeof proposed === "string" ? proposed : null
}

function notificationPayload(value: unknown) {
  const payload = metadataObject(value)
  const notification = metadataObject(payload.notification)
  if (typeof notification.type !== "string") return null
  const rawEvidenceRef = metadataObject(payload.evidenceRef)
  const evidenceRef = {
    providerEventId: typeof rawEvidenceRef.providerEventId === "string" ? rawEvidenceRef.providerEventId : null,
    statementLineId: typeof rawEvidenceRef.statementLineId === "string" ? rawEvidenceRef.statementLineId : null,
    paymentTransactionId: typeof rawEvidenceRef.paymentTransactionId === "string" ? rawEvidenceRef.paymentTransactionId : null,
    reconciliationRunId: typeof rawEvidenceRef.reconciliationRunId === "string" ? rawEvidenceRef.reconciliationRunId : null,
    suspenseItemId: typeof rawEvidenceRef.suspenseItemId === "string" ? rawEvidenceRef.suspenseItemId : null,
    exceptionId: typeof rawEvidenceRef.exceptionId === "string" ? rawEvidenceRef.exceptionId : null,
  }

  return {
    type: notification.type,
    severity: typeof notification.severity === "string" ? notification.severity : null,
    ownerId: typeof notification.ownerId === "string" ? notification.ownerId : null,
    dueAt: typeof notification.dueAt === "string" ? notification.dueAt : null,
    status: typeof notification.status === "string" ? notification.status : "UNREAD",
    amount: typeof payload.amount === "string" ? payload.amount : null,
    currency: typeof payload.currency === "string" ? payload.currency : null,
    evidenceRef,
  }
}

async function deliverOperationalNotifications(organizationId: string) {
  const now = new Date()
  const warningCutoff = new Date(now)
  warningCutoff.setUTCDate(warningCutoff.getUTCDate() + 1)
  const dayKey = startOfUtcDay(now).toISOString().slice(0, 10)

  const [suspenseAtRisk, readyRuns, openExceptionCount, openSuspenseCount, unsignedRunCount] = await Promise.all([
    db.suspenseItem.findMany({
      where: {
        organizationId,
        status: { in: openSuspenseStatuses() },
        slaDeadline: { lte: warningCutoff },
      },
      take: 50,
      select: {
        id: true,
        providerAccountId: true,
        reconciliationRunId: true,
        severity: true,
        amount: true,
        currencyCode: true,
        slaDeadline: true,
        ownerId: true,
        correlationId: true,
      },
    }),
    db.reconciliationRun.findMany({
      where: { organizationId, status: ReconciliationRunStatus.READY_FOR_SIGNOFF },
      take: 25,
      select: { id: true, providerAccountId: true, paymentRailId: true, correlationId: true },
    }),
    db.paymentException.count({
      where: { organizationId, status: { in: openExceptionStatuses() } },
    }),
    db.suspenseItem.count({
      where: { organizationId, status: { in: openSuspenseStatuses() } },
    }),
    db.reconciliationRun.count({
      where: { organizationId, status: { notIn: [ReconciliationRunStatus.SIGNED, ReconciliationRunStatus.VOIDED] } },
    }),
  ])

  await Promise.all([
    ...suspenseAtRisk.map((item) => {
      const breached = item.slaDeadline ? item.slaDeadline <= now : false
      return publishPaymentReconciliationNotification({
        type: breached
          ? "payment-reconciliation.suspense.sla-breached"
          : "payment-reconciliation.suspense.sla-warning",
        organizationId,
        providerAccountId: item.providerAccountId,
        severity: item.severity,
        amount: item.amount.toFixed(2),
        currency: item.currencyCode,
        ownerId: item.ownerId,
        dueAt: item.slaDeadline,
        evidenceRef: {
          reconciliationRunId: item.reconciliationRunId,
          suspenseItemId: item.id,
        },
        correlationId: item.correlationId ?? `${item.id}:${dayKey}`,
        dedupeKey: `${item.id}:${breached ? "sla-breached" : "sla-warning"}:${dayKey}`,
      })
    }),
    ...readyRuns.map((run) =>
      publishPaymentReconciliationNotification({
        type: "payment-reconciliation.run.ready-for-signoff",
        organizationId,
        providerAccountId: run.providerAccountId,
        paymentRailId: run.paymentRailId,
        evidenceRef: { reconciliationRunId: run.id },
        correlationId: run.correlationId ?? `${run.id}:ready-for-signoff`,
        dedupeKey: `${run.id}:ready-for-signoff`,
      }),
    ),
    openExceptionCount + openSuspenseCount + unsignedRunCount > 0
      ? publishPaymentReconciliationNotification({
          type: "payment-reconciliation.period-close.blocked",
          organizationId,
          severity: openExceptionCount + openSuspenseCount > 0 ? "HIGH" : "MEDIUM",
          dueAt: endOfUtcDay(now),
          evidenceRef: {},
          correlationId: `period-close-blocker:${dayKey}`,
          dedupeKey: `period-close-blocker:${dayKey}`,
        })
      : Promise.resolve(),
  ])
}

export async function getPaymentReconciliationDashboardData(organizationId: string): Promise<PaymentReconciliationDashboardData> {
  await deliverOperationalNotifications(organizationId)

  const [providerAccounts, recentRuns, suspenseItems, exceptions, providerEventCount, statementLineCount, inboxItems] = await Promise.all([
    db.providerAccount.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
      take: 25,
      select: {
        id: true,
        displayName: true,
        providerCode: true,
        status: true,
        currencyCode: true,
        paymentRail: { select: { name: true, type: true } },
      },
    }),
    db.reconciliationRun.findMany({
      where: { organizationId },
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        providerAccountId: true,
        businessDate: true,
        status: true,
        matchCount: true,
        exceptionCount: true,
        suspenseAmount: true,
        signedAt: true,
        certificateHash: true,
      },
    }),
    db.suspenseItem.findMany({
      where: {
        organizationId,
        status: { in: openSuspenseStatuses() },
      },
      orderBy: [{ severity: "desc" }, { slaDeadline: "asc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        providerAccountId: true,
        status: true,
        severity: true,
        type: true,
        amount: true,
        currencyCode: true,
        slaDeadline: true,
        correlationId: true,
        ownerId: true,
        suspenseLedgerAccountId: true,
        ledgerPostingBatchId: true,
        resolutionNotes: true,
        postedAt: true,
        metadata: true,
        paymentExceptions: {
          select: { id: true },
          take: 1,
        },
      },
    }),
    db.paymentException.findMany({
      where: {
        organizationId,
        status: { in: openExceptionStatuses() },
      },
      select: { type: true, severity: true },
    }),
    db.providerEvent.count({ where: { organizationId } }),
    db.statementLine.count({ where: { organizationId } }),
    db.paymentReconciliationInboxItem.findMany({
      where: {
        organizationId,
        source: {
          in: [PaymentReconciliationInboxSource.RECONCILIATION_RUN, PaymentReconciliationInboxSource.SUSPENSE_POST],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        source: true,
        status: true,
        payloadSummary: true,
        createdAt: true,
      },
    }),
  ])

  const openSuspenseAmount = suspenseItems.reduce((sum, item) => sum + decimalNumber(item.amount), 0)
  const criticalExceptionCount = exceptions.filter((exception) => exception.severity === ExceptionSeverity.CRITICAL).length
  const readyForSignoffCount = recentRuns.filter((run) => run.status === ReconciliationRunStatus.READY_FOR_SIGNOFF).length
  const signedRunCount = recentRuns.filter((run) => run.status === ReconciliationRunStatus.SIGNED).length
  const needsReview = recentRuns.some((run) => run.status === ReconciliationRunStatus.NEEDS_REVIEW || run.status === ReconciliationRunStatus.BLOCKED)

  const certificationStatus =
    signedRunCount > 0
      ? "SIGNED"
      : readyForSignoffCount > 0
        ? "READY_FOR_SIGNOFF"
        : needsReview || criticalExceptionCount > 0 || suspenseItems.length > 0
          ? "NEEDS_REVIEW"
          : providerEventCount > 0 || statementLineCount > 0
            ? "READY_FOR_RUN"
            : "NO_EVIDENCE"

  const exceptionGroups = Array.from(
    exceptions.reduce((groups, exception) => {
      const groupKey = `${exception.type}:${exception.severity}`
      const current = groups.get(groupKey) ?? {
        key: groupKey,
        type: exception.type,
        severity: exception.severity,
        count: 0,
      }
      current.count += 1
      groups.set(groupKey, current)
      return groups
    }, new Map<string, { key: string; type: string; severity: string; count: number }>()),
  ).map(([, group]) => group)

  return {
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      certificationStatus,
      asOf: new Date().toISOString(),
      organizationScoped: true,
      providerEvidenceAvailable: providerEventCount > 0,
      statementEvidenceAvailable: statementLineCount > 0,
    },
    summary: {
      providerAccountCount: providerAccounts.length,
      activeProviderAccountCount: providerAccounts.filter((account) => account.status === "ACTIVE").length,
      recentRunCount: recentRuns.length,
      readyForSignoffCount,
      signedRunCount,
      openExceptionCount: exceptions.length,
      criticalExceptionCount,
      openSuspenseCount: suspenseItems.length,
      openSuspenseAmount,
      closeBlockerCount: criticalExceptionCount + suspenseItems.length,
    },
    providerAccounts: providerAccounts.map((account) => ({
      id: account.id,
      displayName: account.displayName,
      providerCode: account.providerCode,
      status: account.status,
      currencyCode: account.currencyCode,
      railName: account.paymentRail.name,
      railType: account.paymentRail.type,
    })),
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      providerAccountId: run.providerAccountId,
      businessDate: run.businessDate.toISOString(),
      status: run.status,
      matchCount: run.matchCount,
      exceptionCount: run.exceptionCount,
      suspenseAmount: decimalNumber(run.suspenseAmount),
      signedAt: run.signedAt?.toISOString() ?? null,
      certificateHash: run.certificateHash,
    })),
    suspenseQueue: suspenseItems.map((item) => ({
      id: item.id,
      providerAccountId: item.providerAccountId,
      status: item.status,
      severity: item.severity,
      type: item.type,
      amount: decimalNumber(item.amount),
      currencyCode: item.currencyCode,
      slaDeadline: item.slaDeadline?.toISOString() ?? null,
      correlationId: item.correlationId,
      ownerId: item.ownerId,
      exceptionId: item.paymentExceptions[0]?.id ?? null,
      suspenseLedgerAccountId: item.suspenseLedgerAccountId,
      ledgerPostingBatchId: item.ledgerPostingBatchId,
      resolutionNotes: item.resolutionNotes,
      proposedById: proposedById(item.metadata),
      postedAt: item.postedAt?.toISOString() ?? null,
    })),
    notificationQueue: inboxItems
      .flatMap((item) => {
        const payload = notificationPayload(item.payloadSummary)
        if (!payload) return []
        return [
          {
            id: item.id,
            type: payload.type,
            severity: payload.severity,
            ownerId: payload.ownerId,
            dueAt: payload.dueAt,
            amount: payload.amount,
            currency: payload.currency,
            status: payload.status,
            source: item.source,
            createdAt: item.createdAt.toISOString(),
            evidenceRef: payload.evidenceRef,
          },
        ]
      })
      .slice(0, 25),
    exceptionGroups,
    controls: {
      certifiedModeEnabled: true,
      providerIngestionKillSwitch: false,
      signoffRequiresFreshAuth: true,
      manualMatchMakerChecker: true,
      suspensePostingGatewayOnly: true,
    },
  }
}
