import "server-only"

import {
  AccountingPeriodStatus,
  CloseFindingSeverity,
  CloseFindingStatus,
  CloseRunStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { CloseReadinessMetrics, SnapshotResult, SnapshotScopeInput } from "./snapshot-contracts"
import { blocker, buildSnapshotResult, maxDate, normalizeSnapshotScope, toNumber } from "./snapshot-utils"

const OPEN_FINDING_STATUSES = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
]

export async function getCloseReadinessSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<CloseReadinessMetrics>> {
  const scope = normalizeSnapshotScope(input)
  const periodOverlap = {
    startDate: { lte: scope.periodEnd },
    endDate: { gte: scope.periodStart },
  }
  const closePeriodWhere = {
    organizationId: scope.organizationId,
    period: periodOverlap,
    voidedAt: null,
  }

  const [
    accountingPeriodCount,
    openPeriodCount,
    recentCloseRunCount,
    certifiedCloseRunCount,
    blockedCloseRunCount,
    readinessAggregate,
    openFindingCount,
    criticalOpenFindingCount,
    unavailableEvidenceCount,
    latestPeriod,
    latestCloseRun,
    latestFinding,
    latestEvidence,
  ] = await Promise.all([
    db.accountingPeriod.count({
      where: {
        organizationId: scope.organizationId,
        ...periodOverlap,
      },
    }),
    db.accountingPeriod.count({
      where: {
        organizationId: scope.organizationId,
        status: AccountingPeriodStatus.OPEN,
        ...periodOverlap,
      },
    }),
    db.closeRun.count({ where: closePeriodWhere }),
    db.closeRun.count({
      where: {
        ...closePeriodWhere,
        status: CloseRunStatus.CERTIFIED,
      },
    }),
    db.closeRun.count({
      where: {
        ...closePeriodWhere,
        status: CloseRunStatus.BLOCKED,
      },
    }),
    db.closeRun.aggregate({
      where: closePeriodWhere,
      _avg: { readinessScore: true },
    }),
    db.closeAssuranceFinding.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_FINDING_STATUSES },
      },
    }),
    db.closeAssuranceFinding.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_FINDING_STATUSES },
        severity: CloseFindingSeverity.CRITICAL,
      },
    }),
    db.closeEvidenceItem.count({
      where: {
        organizationId: scope.organizationId,
        available: false,
      },
    }),
    db.accountingPeriod.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.closeRun.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.closeAssuranceFinding.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.closeEvidenceItem.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const metrics: CloseReadinessMetrics = {
    accountingPeriodCount,
    openPeriodCount,
    recentCloseRunCount,
    certifiedCloseRunCount,
    blockedCloseRunCount,
    averageReadinessScore:
      readinessAggregate._avg.readinessScore === null || readinessAggregate._avg.readinessScore === undefined
        ? null
        : Math.round(toNumber(readinessAggregate._avg.readinessScore)),
    openFindingCount,
    criticalOpenFindingCount,
    unavailableEvidenceCount,
  }

  const blockers = [
    ...(criticalOpenFindingCount > 0
      ? [
          blocker({
            id: "close-critical-findings-open",
            severity: "critical",
            gate: "close_readiness",
            title: "Critical close findings are open",
            detail: `${criticalOpenFindingCount} critical close finding(s) block certification-grade readiness.`,
            sourceTables: ["close_assurance_findings"],
            nextAction: "Resolve, assign, or formally waive critical close findings.",
          }),
        ]
      : []),
    ...(blockedCloseRunCount > 0
      ? [
          blocker({
            id: "close-runs-blocked",
            severity: "high",
            gate: "close_readiness",
            title: "Close runs are blocked",
            detail: `${blockedCloseRunCount} close run(s) are blocked in the selected period.`,
            sourceTables: ["close_runs"],
            nextAction: "Use Close Assurance to clear blockers before certification.",
          }),
        ]
      : []),
    ...(accountingPeriodCount === 0
      ? [
          blocker({
            id: "close-periods-missing",
            severity: "medium",
            gate: "close_readiness",
            title: "No accounting period covers this snapshot",
            detail: "Close readiness is partial until accounting periods exist for the selected date range.",
            sourceTables: ["accounting_periods"],
            nextAction: "Create fiscal year and accounting periods.",
          }),
        ]
      : []),
  ]

  return buildSnapshotResult({
    kind: "close.readiness",
    scope,
    status: accountingPeriodCount === 0 ? "empty" : blockers.length > 0 ? "partial" : "fresh",
    evidenceGrade: closeEvidenceGrade(metrics),
    sourceModules: ["accounting", "close", "compliance"],
    metrics,
    blockers,
    sourceMaxUpdatedAt: maxDate([
      latestPeriod?.updatedAt,
      latestCloseRun?.updatedAt,
      latestFinding?.updatedAt,
      latestEvidence?.updatedAt,
    ]),
  })
}

function closeEvidenceGrade(metrics: CloseReadinessMetrics): EvidenceGrade {
  if (metrics.criticalOpenFindingCount > 0 || metrics.blockedCloseRunCount > 0) return "blocked"
  if (metrics.certifiedCloseRunCount > 0) return "certified"
  if (metrics.recentCloseRunCount > 0) return "operational"
  return "raw"
}

