import "server-only";

import { randomUUID } from "node:crypto";

import type {
  BranchOperatingMetrics,
  CloseReadinessMetrics,
  InventoryCashMetrics,
  NormalizedSnapshotScope,
  PaymentTruthMetrics,
  PayrollFinanceForecastMetrics,
  SnapshotBuildRunMetrics,
  SnapshotBuildRunResult,
  SnapshotKind,
  SnapshotResult,
  SnapshotScopeInput,
  SnapshotStatus,
  TenantOperatingMetrics,
} from "./snapshot-contracts";
import { getBranchOperatingSnapshot } from "./branch-operating-snapshot.service";
import { getCloseReadinessSnapshot } from "./close-readiness-snapshot.service";
import { getInventoryCashSnapshot } from "./inventory-cash-snapshot.service";
import { getPaymentTruthSnapshot } from "./payment-truth-snapshot.service";
import { getTenantOperatingSnapshot } from "./tenant-operating-snapshot.service";
import {
  blocker,
  buildSnapshotResult,
  createSnapshotSourceHash,
  deriveAggregateSnapshotStatus,
  normalizeSnapshotScope,
  weakestEvidenceGrade,
} from "./snapshot-utils";

export type SnapshotBundleInput = SnapshotScopeInput & {
  includeBranch?: boolean;
};

type AnySnapshot = SnapshotBuildRunResult["snapshots"][number];

export async function rebuildSnapshotBundle(
  input: SnapshotBundleInput,
): Promise<SnapshotBuildRunResult> {
  const scope = normalizeSnapshotScope(input);

  const snapshots: SnapshotBuildRunResult["snapshots"] = await Promise.all([
    runSnapshotBuilder(
      "tenant.operating",
      scope,
      () => getTenantOperatingSnapshot(scope),
      emptyTenantMetrics(),
    ),
    runSnapshotBuilder(
      "payment.truth",
      scope,
      () => getPaymentTruthSnapshot(scope),
      emptyPaymentTruthMetrics(),
    ),
    runSnapshotBuilder(
      "inventory.cash",
      scope,
      () => getInventoryCashSnapshot(scope),
      emptyInventoryCashMetrics(),
    ),
    runSnapshotBuilder(
      "close.readiness",
      scope,
      () => getCloseReadinessSnapshot(scope),
      emptyCloseReadinessMetrics(),
    ),
    ...(input.includeBranch || scope.locationId
      ? [
          runSnapshotBuilder(
            "branch.operating",
            scope,
            () => getBranchOperatingSnapshot(scope),
            emptyBranchOperatingMetrics(),
          ),
        ]
      : []),
  ]);

  const statuses = snapshots.map((snapshot) => snapshot.status);
  const metrics = buildRunMetrics(statuses);
  const status = deriveAggregateSnapshotStatus(statuses);
  const blockers = snapshots.flatMap((snapshot) => snapshot.blockers);
  const redactions = snapshots.flatMap((snapshot) => snapshot.redactions);
  const evidenceGrade = weakestEvidenceGrade(
    snapshots.map((snapshot) => snapshot.evidenceGrade),
  );

  return {
    buildId: randomUUID(),
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    periodStart: scope.periodStart.toISOString(),
    periodEnd: scope.periodEnd.toISOString(),
    status,
    evidenceGrade: status === "blocked" ? "blocked" : evidenceGrade,
    sourceHash: createSnapshotSourceHash({
      organizationId: scope.organizationId,
      locationId: scope.locationId,
      periodStart: scope.periodStart.toISOString(),
      periodEnd: scope.periodEnd.toISOString(),
      snapshots: snapshots.map((snapshot) => ({
        kind: snapshot.kind,
        status: snapshot.status,
        evidenceGrade: snapshot.evidenceGrade,
        sourceHash: snapshot.sourceHash,
      })),
    }),
    generatedAt: scope.now.toISOString(),
    metrics,
    snapshots,
    blockers,
    redactions,
  };
}

async function runSnapshotBuilder<TMetrics>(
  kind: SnapshotKind,
  scope: NormalizedSnapshotScope,
  builder: () => Promise<SnapshotResult<TMetrics>>,
  fallbackMetrics: TMetrics,
): Promise<AnySnapshot> {
  try {
    return (await builder()) as AnySnapshot;
  } catch {
    return buildSnapshotResult({
      kind,
      scope,
      status: "failed",
      evidenceGrade: "blocked",
      sourceModules: [],
      metrics: fallbackMetrics,
      blockers: [
        blocker({
          id: `${kind.replace(/\./g, "-")}-rebuild-failed`,
          severity: "high",
          gate: "snapshot_rebuild",
          title: "Snapshot rebuild failed",
          detail:
            "This snapshot could not be generated safely. Other snapshots in the rebuild bundle remain available.",
          sourceTables: [],
          nextAction:
            "Review server logs and retry the snapshot rebuild after the upstream module is healthy.",
        }),
      ],
      sourceHashParts: { failed: true, kind },
    }) as AnySnapshot;
  }
}

function buildRunMetrics(statuses: SnapshotStatus[]): SnapshotBuildRunMetrics {
  return {
    requestedSnapshotCount: statuses.length,
    completedSnapshotCount: statuses.filter(
      (status) => !["failed", "building"].includes(status),
    ).length,
    blockedSnapshotCount: statuses.filter((status) => status === "blocked")
      .length,
    partialSnapshotCount: statuses.filter(
      (status) => status === "partial" || status === "empty",
    ).length,
    staleSnapshotCount: statuses.filter((status) => status === "stale").length,
    failedSnapshotCount: statuses.filter((status) => status === "failed")
      .length,
  };
}

export function snapshotSummary(
  snapshot: SnapshotResult<unknown>,
): Pick<
  SnapshotResult<unknown>,
  "kind" | "status" | "evidenceGrade" | "sourceHash" | "blockers" | "redactions"
> {
  return {
    kind: snapshot.kind,
    status: snapshot.status,
    evidenceGrade: snapshot.evidenceGrade,
    sourceHash: snapshot.sourceHash,
    blockers: snapshot.blockers,
    redactions: snapshot.redactions,
  };
}

function emptyTenantMetrics(): TenantOperatingMetrics {
  return {
    activeLocationCount: 0,
    completedSalesCount: 0,
    completedSalesRevenue: 0,
    cashCollected: 0,
    pendingPurchaseOrderCount: 0,
    approvedOrPaidPayrollRunCount: 0,
    activeEmployeeBalanceCaseCount: 0,
    openEmployeeBalanceCaseCount: 0,
    partiallySettledEmployeeBalanceCaseCount: 0,
    employeeBalanceOutstandingAmount: 0,
    periodEmployeeBalanceSettlementCount: 0,
    periodEmployeeBalanceSettlementAmount: 0,
    postedJournalEntryCount: 0,
    sourceLinkCount: 0,
    payrollFinanceForecast: emptyPayrollFinanceForecastMetrics(),
    paymentTruth: emptyPaymentTruthMetrics(),
    inventoryCash: emptyInventoryCashMetrics(),
    closeReadiness: emptyCloseReadinessMetrics(),
  };
}

function emptyPayrollFinanceForecastMetrics(): PayrollFinanceForecastMetrics {
  const emptyHorizon = "1970-01-01T00:00:00.000Z";

  return {
    status: "NON_AUTHORITATIVE",
    authoritative: false,
    reasonCode: "PAYROLL_FORECAST_NOT_BUILT",
    message:
      "Payroll finance forecast was not built for this fallback snapshot.",
    horizonStart: emptyHorizon,
    horizonEnd: emptyHorizon,
    upcomingNetPayAmount: 0,
    upcomingStatutoryLiabilityAmount: 0,
    totalUpcomingAmount: 0,
    payrollPeriodCount: 0,
    payrollRunCount: 0,
    paymentBatchCount: 0,
    declarationCount: 0,
    sourceLinkCount: 0,
    evidenceHashCount: 0,
    nextPayDate: null,
    nextDeclarationDueDate: null,
    personLevelAmountsRedacted: true,
    blockerCodes: ["PAYROLL_FORECAST_NOT_BUILT"],
  };
}
function emptyPaymentTruthMetrics(): PaymentTruthMetrics {
  return {
    providerAccountCount: 0,
    activeProviderAccountCount: 0,
    recentRunCount: 0,
    readyForSignoffCount: 0,
    signedRunCount: 0,
    openExceptionCount: 0,
    criticalExceptionCount: 0,
    openSuspenseCount: 0,
    openSuspenseAmount: 0,
    pendingTransactionCount: 0,
  };
}

function emptyInventoryCashMetrics(): InventoryCashMetrics {
  return {
    trackedItemCount: 0,
    inventoryLevelCount: 0,
    quantityOnHand: 0,
    quantityAvailable: 0,
    quantityReserved: 0,
    quantityInTransit: 0,
    quantityOnOrder: 0,
    inventoryValue: 0,
    zeroStockLevelCount: 0,
    negativeStockLevelCount: 0,
    periodTransactionCount: 0,
    periodAdjustmentCount: 0,
    periodTransferCount: 0,
  };
}

function emptyCloseReadinessMetrics(): CloseReadinessMetrics {
  return {
    accountingPeriodCount: 0,
    openPeriodCount: 0,
    recentCloseRunCount: 0,
    certifiedCloseRunCount: 0,
    blockedCloseRunCount: 0,
    averageReadinessScore: null,
    openFindingCount: 0,
    criticalOpenFindingCount: 0,
    unavailableEvidenceCount: 0,
  };
}

function emptyBranchOperatingMetrics(): BranchOperatingMetrics {
  return {
    locationActive: false,
    completedSalesCount: 0,
    completedSalesRevenue: 0,
    cashCollected: 0,
    inventoryValue: 0,
    inventoryTransactionCount: 0,
    pendingPurchaseOrderCount: 0,
    openTransferCount: 0,
    postedJournalLineCount: 0,
    posShiftCount: 0,
    closedPosShiftCount: 0,
    payrollEmployeeAtLocationCount: 0,
    frozenAttendanceSnapshotCount: 0,
    approvedPayrollRunLineCount: 0,
    unallocatedPayrollRunLineCount: 0,
    payrollGrossAmount: 0,
    payrollEmployerChargeAmount: 0,
    payrollNetPayAmount: 0,
    payrollAllocatedCostAmount: 0,
    payrollProfitContribution: null,
  };
}
