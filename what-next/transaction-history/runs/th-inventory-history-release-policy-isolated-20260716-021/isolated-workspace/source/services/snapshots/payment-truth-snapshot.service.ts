import "server-only"

import {
  ExceptionSeverity,
  PaymentExceptionStatus,
  PaymentTransactionState,
  ProviderAccountStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { PaymentTruthMetrics, SnapshotResult, SnapshotScopeInput } from "./snapshot-contracts"
import {
  blocker,
  buildSnapshotResult,
  maxDate,
  normalizeSnapshotScope,
  toNumber,
} from "./snapshot-utils"

const OPEN_EXCEPTION_STATUSES = [
  PaymentExceptionStatus.OPEN,
  PaymentExceptionStatus.ASSIGNED,
  PaymentExceptionStatus.ACKNOWLEDGED,
  PaymentExceptionStatus.ESCALATED,
  PaymentExceptionStatus.RESOLUTION_PROPOSED,
  PaymentExceptionStatus.REOPENED,
]

const OPEN_SUSPENSE_STATUSES = [
  SuspenseStatus.OPEN,
  SuspenseStatus.ASSIGNED,
  SuspenseStatus.IN_REVIEW,
  SuspenseStatus.POSTED_TO_SUSPENSE,
  SuspenseStatus.RESOLUTION_PROPOSED,
  SuspenseStatus.REOPENED,
]

const PENDING_PAYMENT_STATES = [
  PaymentTransactionState.PENDING,
  PaymentTransactionState.PROCESSING,
  PaymentTransactionState.SUSPENSE,
  PaymentTransactionState.DISPUTED,
]

export async function getPaymentTruthSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<PaymentTruthMetrics>> {
  const scope = normalizeSnapshotScope(input)
  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd }

  const [
    providerAccountCount,
    activeProviderAccountCount,
    recentRunCount,
    readyForSignoffCount,
    signedRunCount,
    openExceptionCount,
    criticalExceptionCount,
    openSuspenseCount,
    openSuspenseAmount,
    pendingTransactionCount,
    latestProvider,
    latestRun,
    latestException,
    latestSuspense,
    latestTransaction,
  ] = await Promise.all([
    db.providerAccount.count({ where: { organizationId: scope.organizationId, archivedAt: null } }),
    db.providerAccount.count({
      where: {
        organizationId: scope.organizationId,
        archivedAt: null,
        status: ProviderAccountStatus.ACTIVE,
      },
    }),
    db.reconciliationRun.count({
      where: {
        organizationId: scope.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
      },
    }),
    db.reconciliationRun.count({
      where: {
        organizationId: scope.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
        status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
      },
    }),
    db.reconciliationRun.count({
      where: {
        organizationId: scope.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
        status: ReconciliationRunStatus.SIGNED,
      },
    }),
    db.paymentException.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_EXCEPTION_STATUSES },
      },
    }),
    db.paymentException.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_EXCEPTION_STATUSES },
        severity: ExceptionSeverity.CRITICAL,
      },
    }),
    db.suspenseItem.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_SUSPENSE_STATUSES },
      },
    }),
    db.suspenseItem.aggregate({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_SUSPENSE_STATUSES },
      },
      _sum: { amount: true },
    }),
    db.paymentTransaction.count({
      where: {
        organizationId: scope.organizationId,
        occurredAt: periodWhere,
        state: { in: PENDING_PAYMENT_STATES },
      },
    }),
    db.providerAccount.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.reconciliationRun.findFirst({
      where: { organizationId: scope.organizationId, voidedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.paymentException.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.suspenseItem.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.paymentTransaction.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const metrics: PaymentTruthMetrics = {
    providerAccountCount,
    activeProviderAccountCount,
    recentRunCount,
    readyForSignoffCount,
    signedRunCount,
    openExceptionCount,
    criticalExceptionCount,
    openSuspenseCount,
    openSuspenseAmount: toNumber(openSuspenseAmount._sum.amount),
    pendingTransactionCount,
  }

  const blockers = [
    ...(criticalExceptionCount > 0
      ? [
          blocker({
            id: "payment-critical-exceptions-open",
            severity: "critical",
            gate: "payment_truth",
            title: "Critical payment exceptions are open",
            detail: `${criticalExceptionCount} critical payment exception(s) must be resolved before cash truth can be trusted.`,
            sourceTables: ["payment_exceptions"],
            nextAction: "Resolve or formally dismiss critical payment exceptions.",
          }),
        ]
      : []),
    ...(openSuspenseCount > 0
      ? [
          blocker({
            id: "payment-suspense-open",
            severity: "high",
            gate: "payment_truth",
            title: "Payment suspense queue is not empty",
            detail: `${openSuspenseCount} suspense item(s) remain open with ${metrics.openSuspenseAmount.toFixed(2)} in unresolved value.`,
            sourceTables: ["suspense_items"],
            nextAction: "Classify, match, post, or resolve suspense items.",
          }),
        ]
      : []),
    ...(activeProviderAccountCount === 0
      ? [
          blocker({
            id: "payment-provider-account-missing",
            severity: "medium",
            gate: "payment_truth",
            title: "No active provider account",
            detail: "Payment truth is partial until at least one bank, cash, or mobile-money provider account is active.",
            sourceTables: ["provider_accounts"],
            nextAction: "Activate a provider account and connect statement/provider evidence.",
          }),
        ]
      : []),
    ...(activeProviderAccountCount > 0 && recentRunCount === 0
      ? [
          blocker({
            id: "payment-reconciliation-run-missing",
            severity: "medium",
            gate: "payment_truth",
            title: "No reconciliation run in period",
            detail: "Provider accounts exist, but this period has no reconciliation run yet.",
            sourceTables: ["reconciliation_runs"],
            nextAction: "Run payment reconciliation for the selected period.",
          }),
        ]
      : []),
  ]

  return buildSnapshotResult({
    kind: "payment.truth",
    scope,
    status: activeProviderAccountCount === 0 && recentRunCount === 0 ? "empty" : blockers.length > 0 ? "partial" : "fresh",
    evidenceGrade: paymentEvidenceGrade(metrics),
    sourceModules: ["payments", "finance", "accounting"],
    metrics,
    blockers,
    redactions: [
      {
        id: "payment-provider-identifiers-redacted",
        field: "providerAccount.externalAccountHash",
        reason: "Payment provider account identifiers remain server-side only in snapshot read models.",
        policy: "KONTAVA_SENSITIVE_PAYMENT_EVIDENCE",
      },
    ],
    sourceMaxUpdatedAt: maxDate([
      latestProvider?.updatedAt,
      latestRun?.updatedAt,
      latestException?.updatedAt,
      latestSuspense?.updatedAt,
      latestTransaction?.updatedAt,
    ]),
  })
}

function paymentEvidenceGrade(metrics: PaymentTruthMetrics): EvidenceGrade {
  if (metrics.criticalExceptionCount > 0 || metrics.openSuspenseCount > 0) return "blocked"
  if (metrics.signedRunCount > 0) return "reconciled"
  if (metrics.recentRunCount > 0) return "operational"
  return metrics.activeProviderAccountCount > 0 ? "raw" : "raw"
}

