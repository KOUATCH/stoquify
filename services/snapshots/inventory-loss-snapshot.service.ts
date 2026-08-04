import "server-only";

import {
  readInventoryLossSummary,
  type InventoryLossCategory,
} from "@/services/inventory/inventory-loss-read.service";
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts";
import type {
  InventoryLossMetrics,
  SnapshotResult,
  SnapshotScopeInput,
  SnapshotStatus,
} from "./snapshot-contracts";
import {
  blocker,
  buildSnapshotResult,
  normalizeSnapshotScope,
  toNumber,
} from "./snapshot-utils";

type InventoryLossSummary = Awaited<
  ReturnType<typeof readInventoryLossSummary>
>;

export async function getInventoryLossSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<InventoryLossMetrics>> {
  const scope = normalizeSnapshotScope(input);
  const exclusivePeriodEnd = new Date(scope.periodEnd.getTime() + 1);
  const source = await readInventoryLossSummary(
    {
      organizationId: scope.organizationId,
      from: scope.periodStart,
      to: exclusivePeriodEnd,
      ...(scope.locationId ? { locationId: scope.locationId } : {}),
      detailLimit: 0,
      groupLimit: 50,
    },
    { now: () => new Date(scope.now) },
  );
  const metrics = inventoryLossMetrics(source);
  const blockers = inventoryLossBlockers(metrics);

  return buildSnapshotResult({
    kind: "inventory.loss",
    scope,
    status: inventoryLossStatus(source),
    evidenceGrade: inventoryLossEvidenceGrade(source),
    sourceModules: ["inventory"],
    metrics,
    blockers,
    redactions: [
      {
        id: "inventory-loss-evidence-hashes-redacted",
        field: "records.evidence.*Hash",
        reason:
          "Source evidence hashes remain server-side; the snapshot exposes coverage only.",
        policy: "INVENTORY_LOSS_EVIDENCE_REDACTION",
      },
    ],
    sourceHashParts: {
      categories: source.groups.byCategory
        .map((group) => ({
          key: group.key,
          lineCount: group.lineCount,
          adjustmentCount: group.adjustmentCount,
          lossValue: group.lossValue,
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
      completeness: source.completeness.sources.map((item) => ({
        source: item.source,
        state: item.state,
        reason: item.reason ?? null,
      })),
    },
  });
}

function inventoryLossMetrics(
  source: InventoryLossSummary,
): InventoryLossMetrics {
  return {
    lossLineCount: source.summary.lossLineCount,
    adjustmentCount: source.summary.adjustmentCount,
    totalLossValue: toNumber(source.summary.totalLossValue),
    currency: source.summary.currency,
    countVarianceLineCount: categoryLineCount(source, "COUNT_VARIANCE"),
    damagedLineCount: categoryLineCount(source, "DAMAGED"),
    expiredLineCount: categoryLineCount(source, "EXPIRED"),
    recordedTheftCategoryLineCount: categoryLineCount(source, "RECORDED_THEFT"),
    writeOffLineCount: categoryLineCount(source, "WRITE_OFF"),
    evidenceCoveredLineCount: source.coverage.evidence.covered,
    evidenceCoveragePercent: source.coverage.evidence.percent,
    valuationCoveredLineCount: source.coverage.valuation.covered,
    valuationCoveragePercent: source.coverage.valuation.percent,
    approvalAttributedLineCount: source.coverage.approvingActor.covered,
    approvalCoveragePercent: source.coverage.approvingActor.percent,
    missingEvidenceLineCount:
      source.coverage.evidence.total - source.coverage.evidence.covered,
    missingValuationLineCount:
      source.coverage.valuation.total - source.coverage.valuation.covered,
    missingApprovalAttributionLineCount:
      source.coverage.approvingActor.total -
      source.coverage.approvingActor.covered,
    sourceTruncated: source.snapshot.truncated,
  };
}

function categoryLineCount(
  source: InventoryLossSummary,
  category: InventoryLossCategory,
) {
  return (
    source.groups.byCategory.find((group) => group.key === category)
      ?.lineCount ?? 0
  );
}

function inventoryLossStatus(source: InventoryLossSummary): SnapshotStatus {
  if (source.summary.lossLineCount === 0) return "empty";
  return source.completeness.state === "partial" ? "partial" : "fresh";
}

function inventoryLossEvidenceGrade(
  source: InventoryLossSummary,
): EvidenceGrade {
  if (source.snapshot.truncated) return "blocked";
  if (source.summary.lossLineCount === 0) return "raw";
  return source.completeness.state === "complete" ? "operational" : "raw";
}

function inventoryLossBlockers(metrics: InventoryLossMetrics) {
  return [
    ...(metrics.sourceTruncated
      ? [
          blocker({
            id: "inventory-loss-source-truncated",
            severity: "high",
            gate: "inventory_loss_source",
            title: "Inventory loss source is truncated",
            detail:
              "The source line cap was reached, so recorded loss totals are incomplete.",
            sourceTables: ["stock_adjustments", "stock_adjustment_lines"],
            nextAction:
              "Narrow the reporting period or location scope before using the totals.",
          }),
        ]
      : []),
    ...(metrics.missingEvidenceLineCount > 0
      ? [
          blocker({
            id: "inventory-loss-evidence-missing",
            severity: "medium",
            gate: "inventory_loss_evidence",
            title: "Inventory loss evidence is incomplete",
            detail: `${metrics.missingEvidenceLineCount} recorded loss line(s) lack source evidence. This gap does not establish causation.`,
            sourceTables: ["stock_adjustments", "stock_adjustment_lines"],
            nextAction: "Attach or verify the missing adjustment evidence.",
          }),
        ]
      : []),
    ...(metrics.missingValuationLineCount > 0
      ? [
          blocker({
            id: "inventory-loss-valuation-missing",
            severity: "medium",
            gate: "inventory_loss_valuation",
            title: "Inventory loss valuation is incomplete",
            detail: `${metrics.missingValuationLineCount} recorded loss line(s) lack valuation evidence.`,
            sourceTables: ["stock_adjustment_lines"],
            nextAction: "Review recorded unit cost and total cost evidence.",
          }),
        ]
      : []),
    ...(metrics.missingApprovalAttributionLineCount > 0
      ? [
          blocker({
            id: "inventory-loss-approval-attribution-missing",
            severity: "medium",
            gate: "inventory_loss_approval",
            title: "Inventory loss approval attribution is incomplete",
            detail: `${metrics.missingApprovalAttributionLineCount} recorded loss line(s) lack an approving actor. Approval records authorization, not causation.`,
            sourceTables: ["stock_adjustments"],
            nextAction: "Review the adjustment approval trail.",
          }),
        ]
      : []),
  ];
}
