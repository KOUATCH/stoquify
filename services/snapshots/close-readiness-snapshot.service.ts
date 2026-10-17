import "server-only"

import {
  AccountingPeriodStatus,
  CloseChecklistStatus,
  CloseFindingSeverity,
  CloseFindingStatus,
  CloseRunStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { getVerifiedCloseEvidenceReplacementsInTx } from "@/services/accounting/close-evidence-replacement.service"
import { computeCloseRunEvidenceGrade } from "@/services/evidence/evidence-grade.service"
import type { CloseReadinessMetrics, SnapshotBlocker, SnapshotResult, SnapshotScopeInput } from "./snapshot-contracts"
import { blocker, buildSnapshotResult, maxDate, normalizeSnapshotScope, toNumber, weakestEvidenceGrade } from "./snapshot-utils"

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
  if (scope.locationId) {
    return buildSnapshotResult({
      kind: "close.readiness",
      scope,
      status: "blocked",
      evidenceGrade: "blocked",
      sourceModules: ["accounting", "close", "compliance"],
      metrics: {
        accountingPeriodCount: 0,
        openPeriodCount: 0,
        recentCloseRunCount: 0,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: null,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      },
      blockers: [
        blocker({
          id: "close-location-scope-unsupported",
          severity: "high",
          gate: "close_readiness_scope",
          title: "Location-scoped close readiness is unavailable",
          detail:
            "Close Readiness currently certifies tenant-wide accounting and evidence controls and cannot safely claim location-level results.",
          sourceTables: ["accounting_periods", "close_runs", "close_assurance_findings", "close_evidence_items"],
          nextAction:
            "Use tenant-wide Close Readiness until accounting and close evidence can be allocated and certified by location.",
        }),
      ],
    })
  }
  const periodOverlap = {
    startDate: { lte: scope.periodEnd },
    endDate: { gte: scope.periodStart },
  }
  const closePeriodWhere = {
    organizationId: scope.organizationId,
    period: { organizationId: scope.organizationId, ...periodOverlap },
  }

  // Counts, run status and retained proof must describe one database revision.
  // Invalidation can otherwise commit between the status and evidence reads.
  const source = await db.$transaction(async (tx) => {
    const closeRuns = await tx.closeRun.findMany({
      where: closePeriodWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, periodId: true, status: true, readinessScore: true, metadata: true, createdAt: true, updatedAt: true, voidedAt: true },
    })
    const evidenceWhere = { organizationId: scope.organizationId, closeRun: closePeriodWhere }
    const [
    accountingPeriodCount,
    openPeriodCount,
    openFindingCount,
    criticalOpenFindingCount,
    unavailableEvidenceCount,
    latestPeriod,
    latestCloseRun,
    latestFinding,
    latestEvidence,
    latestChecklist,
    findingGroups,
    checklistGroups,
    unavailableEvidenceGroups,
    certifiedExports,
  ] = await Promise.all([
    tx.accountingPeriod.count({
      where: {
        organizationId: scope.organizationId,
        ...periodOverlap,
      },
    }),
    tx.accountingPeriod.count({
      where: {
        organizationId: scope.organizationId,
        status: AccountingPeriodStatus.OPEN,
        ...periodOverlap,
      },
    }),
    tx.closeAssuranceFinding.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_FINDING_STATUSES },
      },
    }),
    tx.closeAssuranceFinding.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: OPEN_FINDING_STATUSES },
        severity: CloseFindingSeverity.CRITICAL,
      },
    }),
    tx.closeEvidenceItem.count({
      where: {
        organizationId: scope.organizationId,
        available: false,
      },
    }),
    tx.accountingPeriod.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    tx.closeRun.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    tx.closeAssuranceFinding.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    tx.closeEvidenceItem.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    tx.closeChecklistItem.findFirst({
      where: evidenceWhere,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    tx.closeAssuranceFinding.groupBy({
      by: ["closeRunId", "severity"],
      where: { ...evidenceWhere, status: { in: OPEN_FINDING_STATUSES } },
      orderBy: [{ closeRunId: "asc" }, { severity: "asc" }],
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    tx.closeChecklistItem.groupBy({
      by: ["closeRunId", "severity"],
      where: { ...evidenceWhere, status: { in: [CloseChecklistStatus.FAILED, CloseChecklistStatus.UNAVAILABLE] } },
      orderBy: [{ closeRunId: "asc" }, { severity: "asc" }],
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    tx.closeEvidenceItem.groupBy({
      by: ["closeRunId"],
      where: { ...evidenceWhere, available: false },
      orderBy: { closeRunId: "asc" },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    tx.closePackExport.findMany({
      where: { ...evidenceWhere, isCertified: true },
      orderBy: { id: "asc" },
      select: { id: true, closeRunId: true, contentHash: true, metadata: true, updatedAt: true },
    }),
  ])
    const replacements = await getVerifiedCloseEvidenceReplacementsInTx(tx, scope.organizationId)
    return {
      accountingPeriodCount, openPeriodCount, closeRuns, openFindingCount, criticalOpenFindingCount,
      unavailableEvidenceCount: unavailableEvidenceCount - replacements.evidenceIds.length,
      replacements, latestPeriod, latestCloseRun, latestFinding, latestEvidence, latestChecklist,
      findingGroups, checklistGroups, unavailableEvidenceGroups, certifiedExports,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })

  const {
    accountingPeriodCount, openPeriodCount, closeRuns, openFindingCount, criticalOpenFindingCount,
    unavailableEvidenceCount, replacements, latestPeriod, latestCloseRun, latestFinding, latestEvidence, latestChecklist,
    findingGroups, checklistGroups, unavailableEvidenceGroups, certifiedExports,
  } = source
  // Assessment observations can be replaced; findings and missing evidence require
  // their own resolution. Never search backwards for a successful assessment.
  const currentByPeriod = new Map<string, (typeof closeRuns)[number]>()
  const ambiguousPeriods = new Set<string>()
  for (const run of closeRuns) {
    const current = currentByPeriod.get(run.periodId)
    if (!current) currentByPeriod.set(run.periodId, run)
    else if (current.createdAt.getTime() === run.createdAt.getTime()) ambiguousPeriods.add(run.periodId)
  }
  const currentRuns = [...currentByPeriod.values()]
  const findingsByRun = severityCountsByRun(findingGroups)
  const checklistByRun = severityCountsByRun(checklistGroups)
  const unavailableByRun = new Map(unavailableEvidenceGroups.map((group) => [group.closeRunId, group._count._all]))
  const currentExportCounts = new Map<string, number>()
  for (const packExport of certifiedExports) {
    if (!hasStaleCloseEvidence(packExport.metadata)) {
      currentExportCounts.set(packExport.closeRunId, (currentExportCounts.get(packExport.closeRunId) ?? 0) + 1)
    }
  }
  const runEvidence = currentRuns.map((run) => {
    const facts: CloseEvidenceFacts = {
      ambiguousPeriodCount: Number(ambiguousPeriods.has(run.periodId)),
      staleRunCount: Number(hasStaleCloseEvidence(run.metadata)),
      missingExportRunCount: Number(run.status === CloseRunStatus.CERTIFIED && !currentExportCounts.get(run.id)),
      statusBlockedRunCount: Number(run.status === CloseRunStatus.BLOCKED || run.status === CloseRunStatus.VOIDED || !!run.voidedAt),
      findingCount: findingsByRun.get(run.id)?.count ?? 0,
      blockingFindingCount: findingsByRun.get(run.id)?.blocking ?? 0,
      checklistCount: checklistByRun.get(run.id)?.count ?? 0,
      blockingChecklistCount: checklistByRun.get(run.id)?.blocking ?? 0,
      unavailableEvidenceCount: unavailableByRun.get(run.id) ?? 0,
    }
    return {
      facts,
      grade: computeCloseRunEvidenceGrade({
        status: run.status,
        certifiedPackExportCount: currentExportCounts.get(run.id) ?? 0,
        blockers: closeEvidenceBlockers(facts),
      }).grade,
    }
  })
  const evidenceTotals = runEvidence.reduce<CloseEvidenceFacts>((totals, { facts }) => ({
    ambiguousPeriodCount: totals.ambiguousPeriodCount + facts.ambiguousPeriodCount,
    staleRunCount: totals.staleRunCount + facts.staleRunCount,
    missingExportRunCount: totals.missingExportRunCount + facts.missingExportRunCount,
    statusBlockedRunCount: totals.statusBlockedRunCount + facts.statusBlockedRunCount,
    findingCount: totals.findingCount + facts.findingCount,
    blockingFindingCount: totals.blockingFindingCount + facts.blockingFindingCount,
    checklistCount: totals.checklistCount + facts.checklistCount,
    blockingChecklistCount: totals.blockingChecklistCount + facts.blockingChecklistCount,
    unavailableEvidenceCount: totals.unavailableEvidenceCount + facts.unavailableEvidenceCount,
  }), {
    ambiguousPeriodCount: 0, staleRunCount: 0, missingExportRunCount: 0, statusBlockedRunCount: 0, findingCount: 0,
    blockingFindingCount: 0, checklistCount: 0, blockingChecklistCount: 0, unavailableEvidenceCount: 0,
  })
  const retainedFindings = [...findingsByRun.values()].reduce((totals, value) => ({
    count: totals.count + value.count, blocking: totals.blocking + value.blocking,
  }), { count: 0, blocking: 0 })
  const unreviewedPeriodCount = Math.max(0, accountingPeriodCount - new Set(closeRuns.map((run) => run.periodId)).size)

  const metrics: CloseReadinessMetrics = {
    accountingPeriodCount,
    openPeriodCount,
    recentCloseRunCount: currentRuns.length,
    certifiedCloseRunCount: runEvidence.filter(({ grade }) => grade === "certified").length,
    blockedCloseRunCount: runEvidence.filter(({ grade }) => grade === "blocked").length,
    averageReadinessScore:
      currentRuns.length ? Math.round(currentRuns.reduce((total, run) => total + toNumber(run.readinessScore), 0) / currentRuns.length) : null,
    openFindingCount,
    criticalOpenFindingCount,
    unavailableEvidenceCount,
  }

  const blockers = [
    // Retain tenant-wide unresolved obligations, including evidence outside the selected runs.
    ...closeEvidenceBlockers({ ...evidenceTotals, findingCount: retainedFindings.count, blockingFindingCount: retainedFindings.blocking, unavailableEvidenceCount }),
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
    ...(unreviewedPeriodCount > 0
      ? [
          blocker({
            id: "close-periods-unreviewed",
            severity: "medium",
            gate: "close_readiness",
            title: "Accounting periods need close review",
            detail: `${unreviewedPeriodCount} accounting period(s) have no close run in the selected scope.`,
            sourceTables: ["accounting_periods", "close_runs"],
            nextAction: "Run Close Assurance for each uncovered accounting period.",
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
    evidenceGrade: weakestEvidenceGrade([
      ...runEvidence.map(({ grade }) => grade),
      ...(unreviewedPeriodCount > 0 || accountingPeriodCount === 0 ? ["raw" as const] : []),
    ]),
    sourceModules: ["accounting", "close", "compliance"],
    metrics,
    blockers,
    sourceMaxUpdatedAt: maxDate([
      latestPeriod?.updatedAt,
      latestCloseRun?.updatedAt,
      latestFinding?.updatedAt,
      latestEvidence?.updatedAt,
      latestChecklist?.updatedAt,
      ...certifiedExports.map((packExport) => packExport.updatedAt),
    ]),
    // Proof identities bind the hash without exposing private record IDs or invalidation metadata.
    sourceHashParts: {
      selectionPolicy: "latest-created-at-per-period-v1",
      currentRunIds: currentRuns.map((run) => run.id),
      ambiguousPeriodIds: [...ambiguousPeriods],
      closeRuns: closeRuns.map(({ metadata, ...run }) => ({ ...run, stale: hasStaleCloseEvidence(metadata) })),
      certifiedExports: certifiedExports.map(({ metadata, ...packExport }) => ({ ...packExport, stale: hasStaleCloseEvidence(metadata) })),
      findingGroups, checklistGroups, unavailableEvidenceGroups,
      historicalEvidenceReplacements: replacements.sourceBindings,
    },
  })
}

type CloseEvidenceFacts = {
  ambiguousPeriodCount: number
  staleRunCount: number
  missingExportRunCount: number
  statusBlockedRunCount: number
  findingCount: number
  blockingFindingCount: number
  checklistCount: number
  blockingChecklistCount: number
  unavailableEvidenceCount: number
}

function hasStaleCloseEvidence(metadata: Prisma.JsonValue) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false
  const staleState = metadata.staleState
  return !!staleState && typeof staleState === "object" && !Array.isArray(staleState) && staleState.status === "EVIDENCE_STALE"
}

function severityCountsByRun(groups: Array<{ closeRunId: string; severity: CloseFindingSeverity; _count: { _all: number } }>) {
  const counts = new Map<string, { count: number; blocking: number }>()
  for (const group of groups) {
    const current = counts.get(group.closeRunId) ?? { count: 0, blocking: 0 }
    current.count += group._count._all
    if (group.severity === CloseFindingSeverity.HIGH || group.severity === CloseFindingSeverity.CRITICAL) current.blocking += group._count._all
    counts.set(group.closeRunId, current)
  }
  return counts
}

function closeEvidenceBlockers(facts: CloseEvidenceFacts): SnapshotBlocker[] {
  const blockers: SnapshotBlocker[] = []
  if (facts.ambiguousPeriodCount) blockers.push(blocker({
    id: "close-assessment-order-ambiguous", severity: "high", gate: "close_readiness",
    title: "Current close assessment is ambiguous",
    detail: `${facts.ambiguousPeriodCount} accounting period(s) have multiple latest assessments with the same creation time.`,
    sourceTables: ["close_runs"], nextAction: "Review the competing assessments and run Close Assurance again before relying on certification.",
  }))
  if (facts.statusBlockedRunCount) blockers.push(blocker({
    id: "close-runs-blocked", severity: "high", gate: "close_readiness",
    title: "Close runs are blocked",
    detail: `${facts.statusBlockedRunCount} close run(s) are blocked in the selected period.`,
    sourceTables: ["close_runs"], nextAction: "Use Close Assurance to clear blockers before certification.",
  }))
  if (facts.staleRunCount) blockers.push(blocker({
    id: "close-evidence-stale", severity: "high", gate: "close_readiness",
    title: "Close evidence has been invalidated",
    detail: `${facts.staleRunCount} close run(s) require fresh evidence after a source change.`,
    sourceTables: ["close_runs", "close_pack_exports"], nextAction: "Reevaluate Close Assurance and obtain current certification evidence.",
  }))
  if (facts.missingExportRunCount) blockers.push(blocker({
    id: "close-certified-export-missing", severity: "high", gate: "close_readiness",
    title: "Close certification evidence is missing",
    detail: `${facts.missingExportRunCount} certified close run(s) lack a current certified export.`,
    sourceTables: ["close_runs", "close_pack_exports"], nextAction: "Review and retain a current certified close pack before relying on certification.",
  }))
  if (facts.findingCount) blockers.push(blocker({
    id: "close-findings-open", severity: facts.blockingFindingCount ? "high" : "medium", gate: "close_readiness",
    title: "Close findings remain open",
    detail: `${facts.findingCount} finding(s) remain unresolved in the selected close runs.`,
    sourceTables: ["close_assurance_findings"], nextAction: "Resolve or formally waive close findings through Close Assurance.",
  }))
  if (facts.checklistCount) blockers.push(blocker({
    id: "close-checklist-incomplete", severity: facts.blockingChecklistCount ? "high" : "medium", gate: "close_readiness",
    title: "Close controls failed or are unavailable",
    detail: `${facts.checklistCount} checklist control(s) failed or are unavailable in the selected close runs.`,
    sourceTables: ["close_checklist_items"], nextAction: "Review failed controls and restore their evidence before certification.",
  }))
  if (facts.unavailableEvidenceCount) blockers.push(blocker({
    id: "close-evidence-unavailable", severity: "high", gate: "close_readiness",
    title: "Close evidence is unavailable",
    detail: `${facts.unavailableEvidenceCount} close evidence item(s) are unavailable for this organization.`,
    sourceTables: ["close_evidence_items"], nextAction: "Regenerate or attach the missing close evidence.",
  }))
  return blockers
}

