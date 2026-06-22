import "server-only"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { InventoryCashMetrics, SnapshotResult, SnapshotScopeInput } from "./snapshot-contracts"
import { blocker, buildSnapshotResult, maxDate, normalizeSnapshotScope, toNumber } from "./snapshot-utils"

export async function getInventoryCashSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<InventoryCashMetrics>> {
  const scope = normalizeSnapshotScope(input)
  const locationFilter = scope.locationId ? { locationId: scope.locationId } : {}
  const itemScope = {
    organizationId: scope.organizationId,
    deletedAt: null,
    trackInventory: true,
  }
  const inventoryLevelScope = {
    ...locationFilter,
    item: itemScope,
  }
  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd }

  const [
    trackedItemCount,
    inventoryLevelCount,
    inventoryTotals,
    zeroStockLevelCount,
    negativeStockLevelCount,
    periodTransactionCount,
    periodAdjustmentCount,
    periodTransferCount,
    latestItem,
    latestInventoryLevel,
    latestTransaction,
    latestAdjustment,
    latestTransfer,
  ] = await Promise.all([
    db.item.count({ where: itemScope }),
    db.inventoryLevel.count({ where: inventoryLevelScope }),
    db.inventoryLevel.aggregate({
      where: inventoryLevelScope,
      _sum: {
        quantityOnHand: true,
        quantityAvailable: true,
        quantityReserved: true,
        quantityInTransit: true,
        quantityOnOrder: true,
        totalValue: true,
      },
    }),
    db.inventoryLevel.count({
      where: {
        ...inventoryLevelScope,
        quantityAvailable: { lte: 0 },
      },
    }),
    db.inventoryLevel.count({
      where: {
        ...inventoryLevelScope,
        quantityAvailable: { lt: 0 },
      },
    }),
    db.inventoryTransaction.count({
      where: {
        organizationId: scope.organizationId,
        createdAt: periodWhere,
        ...locationFilter,
      },
    }),
    db.stockAdjustment.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        adjustmentDate: periodWhere,
        ...locationFilter,
      },
    }),
    db.stockTransfer.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        transferDate: periodWhere,
        ...(scope.locationId
          ? {
              OR: [{ fromLocationId: scope.locationId }, { toLocationId: scope.locationId }],
            }
          : {}),
      },
    }),
    db.item.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.inventoryLevel.findFirst({
      where: inventoryLevelScope,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.inventoryTransaction.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.stockAdjustment.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.stockTransfer.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const metrics: InventoryCashMetrics = {
    trackedItemCount,
    inventoryLevelCount,
    quantityOnHand: toNumber(inventoryTotals._sum.quantityOnHand),
    quantityAvailable: toNumber(inventoryTotals._sum.quantityAvailable),
    quantityReserved: toNumber(inventoryTotals._sum.quantityReserved),
    quantityInTransit: toNumber(inventoryTotals._sum.quantityInTransit),
    quantityOnOrder: toNumber(inventoryTotals._sum.quantityOnOrder),
    inventoryValue: toNumber(inventoryTotals._sum.totalValue),
    zeroStockLevelCount,
    negativeStockLevelCount,
    periodTransactionCount,
    periodAdjustmentCount,
    periodTransferCount,
  }

  const blockers = [
    ...(negativeStockLevelCount > 0
      ? [
          blocker({
            id: "inventory-negative-stock",
            severity: "high",
            gate: "inventory_cash",
            title: "Negative stock exists",
            detail: `${negativeStockLevelCount} inventory level(s) are below zero and can distort stock-to-cash truth.`,
            sourceTables: ["inventory_levels"],
            nextAction: "Review stock movements, count variances, and POS oversell controls.",
          }),
        ]
      : []),
    ...(trackedItemCount > 0 && inventoryLevelCount === 0
      ? [
          blocker({
            id: "inventory-levels-missing",
            severity: "medium",
            gate: "inventory_cash",
            title: "Tracked items have no stock levels",
            detail: "Items are configured for stock tracking, but no inventory level rows are available for the selected scope.",
            sourceTables: ["items", "inventory_levels"],
            nextAction: "Initialize stock levels for tracked items and locations.",
          }),
        ]
      : []),
  ]

  return buildSnapshotResult({
    kind: "inventory.cash",
    scope,
    status: trackedItemCount === 0 ? "empty" : blockers.length > 0 ? "partial" : "fresh",
    evidenceGrade: inventoryEvidenceGrade(metrics),
    sourceModules: ["inventory", "purchasing", "pos", "accounting"],
    metrics,
    blockers,
    sourceMaxUpdatedAt: maxDate([
      latestItem?.updatedAt,
      latestInventoryLevel?.updatedAt,
      latestTransaction?.createdAt,
      latestAdjustment?.updatedAt,
      latestTransfer?.updatedAt,
    ]),
  })
}

function inventoryEvidenceGrade(metrics: InventoryCashMetrics): EvidenceGrade {
  if (metrics.negativeStockLevelCount > 0) return "blocked"
  if (metrics.periodTransactionCount > 0 || metrics.periodAdjustmentCount > 0 || metrics.periodTransferCount > 0) {
    return "operational"
  }
  return metrics.inventoryLevelCount > 0 ? "raw" : "raw"
}

