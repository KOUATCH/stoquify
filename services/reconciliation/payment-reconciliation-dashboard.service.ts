import { getPaymentReconciliationSummary, type PaymentReconciliationSummary } from "./payment-reconciliation-summary.service"
import { getSuspenseWorkQueue } from "./payment-suspense-read.service"
import { readLatestReconciliationAlertScan, type ReconciliationAlertScan } from "./payment-reconciliation-alert-scan.service"
import {
  PaymentReconciliationInboxSource,
  PaymentExceptionStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { getPendingManualMatchProposals } from "./payment-reconciliation-manual-read.service"
import { getManualMatchCandidates, type ManualMatchCandidate, type ManualCandidateReadModel } from "./payment-reconciliation-manual-candidates.service"

export type PaymentReconciliationDashboardData = {
  alertScan?: ReconciliationAlertScan | null
  source: {
    mode: "DURABLE_EVIDENCE_KERNEL"
    certificationStatus: "NO_EVIDENCE" | "READY_FOR_RUN" | "NEEDS_REVIEW" | "READY_FOR_SIGNOFF" | "SIGNED"
    asOf: string
    organizationScoped: true
    providerEvidenceAvailable: boolean
    statementEvidenceAvailable: boolean
  }
  summary: PaymentReconciliationSummary["summary"] & { recentRunCount: number }
  providerAccounts: Array<{
    id: string
    displayName: string
    providerCode: string
    status: string
    currencyCode: string
    railName: string
    railType: string
  }>
  statementFiles: Array<{
    id: string
    providerAccountId: string
    providerAccountName: string
    fileName: string | null
    sourceType: string
    status: string
    periodStart: string
    periodEnd: string
    importedAt: string
    lineCount: number
  }>
  manualMatchCandidates: ManualMatchCandidate[]
  manualMatchPreparation: Omit<ManualCandidateReadModel, "candidates">
  manualMatchProposals: Array<{
    evidenceRevision: string | null
    evidenceSummary: { internalAmount: string; externalAmount: string; direction: string; externalSource: string } | null
    id: string
    providerAccountId: string | null
    providerAccountName: string | null
    paymentTransactionId: string | null
    providerEventId: string | null
    statementLineId: string | null
    amountMatched: string | null
    currencyCode: string
    matchedById: string | null
    createdAt: string
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
    evidenceRevision: string
    postingDate: string | null
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
    suspenseAccount?: { id: string; code: string; nameEn: string; nameFr: string | null } | null
    journal?: { id: string; number: string; status: string } | null
    ledgerPostingBatchId: string | null
    resolutionNotes: string | null
    proposedById: string | null
    correctionProposalId?: string | null
    postingCycle?: number
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
        dedupeKey: run.id,
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
  const reviewedAt = new Date()
  await deliverOperationalNotifications(organizationId)

  const [
    providerAccounts,
    statementFiles,
    manualMatchReadModel,
    manualMatchProposals,
    recentRuns,
    suspenseItems,
    overview,
    inboxItems,
    alertScan,
  ] = await Promise.all([
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
    db.statementFile.findMany({
      where: { organizationId },
      orderBy: { importedAt: "desc" },
      take: 10,
      select: {
        id: true,
        providerAccountId: true,
        fileName: true,
        sourceType: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        importedAt: true,
        providerAccount: { select: { displayName: true } },
        _count: { select: { lines: true } },
      },
    }),
    getManualMatchCandidates(organizationId),
    getPendingManualMatchProposals(organizationId),
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
    getSuspenseWorkQueue(organizationId, reviewedAt),
    getPaymentReconciliationSummary(organizationId),
    db.paymentReconciliationInboxItem.findMany({
      where: {
        organizationId,
        payloadSummary: { path: ["notification", "category"], equals: "reconciliation" },
        source: {
          in: [PaymentReconciliationInboxSource.RECONCILIATION_RUN, PaymentReconciliationInboxSource.SUSPENSE_POST],
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
      select: {
        id: true,
        source: true,
        status: true,
        payloadSummary: true,
        createdAt: true,
      },
    }),
    readLatestReconciliationAlertScan(organizationId),
  ])

  return {
    alertScan,
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      certificationStatus: overview.certificationStatus,
      asOf: overview.asOf,
      organizationScoped: true,
      providerEvidenceAvailable: overview.providerEvents > 0,
      statementEvidenceAvailable: overview.statementLines > 0,
    },
    summary: { ...overview.summary, recentRunCount: recentRuns.length },
    providerAccounts: providerAccounts.map((account) => ({
      id: account.id,
      displayName: account.displayName,
      providerCode: account.providerCode,
      status: account.status,
      currencyCode: account.currencyCode,
      railName: account.paymentRail.name,
      railType: account.paymentRail.type,
    })),
    statementFiles: statementFiles.map((file) => ({
      id: file.id,
      providerAccountId: file.providerAccountId,
      providerAccountName: file.providerAccount.displayName,
      fileName: file.fileName,
      sourceType: file.sourceType,
      status: file.status,
      periodStart: file.periodStart.toISOString(),
      periodEnd: file.periodEnd.toISOString(),
      importedAt: file.importedAt.toISOString(),
      lineCount: file._count.lines,
    })),
    manualMatchCandidates: manualMatchReadModel.candidates,
    manualMatchPreparation: { checkedAt: manualMatchReadModel.checkedAt, hasMore: manualMatchReadModel.hasMore, limit: manualMatchReadModel.limit, writeAllowed: manualMatchReadModel.writeAllowed },
    manualMatchProposals,
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
    suspenseQueue: suspenseItems,
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
    exceptionGroups: overview.exceptionGroups,
    controls: {
      certifiedModeEnabled: true,
      providerIngestionKillSwitch: false,
      signoffRequiresFreshAuth: true,
      manualMatchMakerChecker: true,
      suspensePostingGatewayOnly: true,
    },
  }
}
