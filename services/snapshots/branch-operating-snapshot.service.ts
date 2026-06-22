import "server-only"

import { JournalEntryStatus, PaymentStatus, PurchaseOrderStatus, SalesOrderStatus } from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { BranchOperatingMetrics, SnapshotResult, SnapshotScopeInput } from "./snapshot-contracts"
import { blocker, buildSnapshotResult, maxDate, normalizeSnapshotScope, toNumber } from "./snapshot-utils"

const COMPLETED_SALES_STATUSES = [SalesOrderStatus.COMPLETED, SalesOrderStatus.DELIVERED]
const CASH_COLLECTED_STATUSES = [PaymentStatus.PAID, PaymentStatus.PARTIAL]
const PENDING_PURCHASE_STATUSES = [
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]

export async function getBranchOperatingSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<BranchOperatingMetrics>> {
  const scope = normalizeSnapshotScope(input)

  if (!scope.locationId) {
    return buildSnapshotResult({
      kind: "branch.operating",
      scope,
      status: "blocked",
      evidenceGrade: "blocked",
      sourceModules: ["dashboard", "sales", "inventory", "purchasing", "accounting"],
      metrics: emptyBranchMetrics(false),
      blockers: [
        blocker({
          id: "branch-location-required",
          severity: "high",
          gate: "branch_operating_snapshot",
          title: "Branch snapshot requires a location",
          detail: "A branch operating snapshot cannot be generated without a tenant-scoped locationId.",
          sourceTables: ["locations"],
          nextAction: "Select a branch or warehouse before requesting a branch snapshot.",
        }),
      ],
    })
  }

  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd }

  const [
    location,
    salesTotals,
    completedSalesCount,
    cashCollected,
    inventoryValue,
    inventoryTransactionCount,
    pendingPurchaseOrderCount,
    openTransferCount,
    postedJournalLineCount,
    latestSale,
    latestPayment,
    latestInventoryLevel,
    latestInventoryTransaction,
    latestPurchaseOrder,
  ] = await Promise.all([
    db.location.findFirst({
      where: {
        id: scope.locationId,
        organizationId: scope.organizationId,
        deletedAt: null,
      },
      select: { id: true, isActive: true, updatedAt: true },
    }),
    db.salesOrder.aggregate({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        deletedAt: null,
        status: { in: COMPLETED_SALES_STATUSES },
        orderDate: periodWhere,
      },
      _sum: { total: true },
    }),
    db.salesOrder.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        deletedAt: null,
        status: { in: COMPLETED_SALES_STATUSES },
        orderDate: periodWhere,
      },
    }),
    db.payment.aggregate({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: CASH_COLLECTED_STATUSES },
        createdAt: periodWhere,
        salesOrder: { locationId: scope.locationId },
      },
      _sum: { amount: true },
    }),
    db.inventoryLevel.aggregate({
      where: {
        locationId: scope.locationId,
        item: { organizationId: scope.organizationId, deletedAt: null },
      },
      _sum: { totalValue: true },
    }),
    db.inventoryTransaction.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        createdAt: periodWhere,
      },
    }),
    db.purchaseOrder.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        deletedAt: null,
        status: { in: PENDING_PURCHASE_STATUSES },
      },
    }),
    db.stockTransfer.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        OR: [{ fromLocationId: scope.locationId }, { toLocationId: scope.locationId }],
      },
    }),
    db.journalEntryLine.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        journalEntry: {
          status: JournalEntryStatus.POSTED,
          entryDate: periodWhere,
        },
      },
    }),
    db.salesOrder.findFirst({
      where: { organizationId: scope.organizationId, locationId: scope.locationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payment.findFirst({
      where: {
        organizationId: scope.organizationId,
        salesOrder: { locationId: scope.locationId },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.inventoryLevel.findFirst({
      where: {
        locationId: scope.locationId,
        item: { organizationId: scope.organizationId },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.inventoryTransaction.findFirst({
      where: { organizationId: scope.organizationId, locationId: scope.locationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.purchaseOrder.findFirst({
      where: { organizationId: scope.organizationId, locationId: scope.locationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const metrics: BranchOperatingMetrics = {
    locationActive: Boolean(location?.isActive),
    completedSalesCount,
    completedSalesRevenue: toNumber(salesTotals._sum.total),
    cashCollected: toNumber(cashCollected._sum.amount),
    inventoryValue: toNumber(inventoryValue._sum.totalValue),
    inventoryTransactionCount,
    pendingPurchaseOrderCount,
    openTransferCount,
    postedJournalLineCount,
  }

  const blockers = [
    ...(!location
      ? [
          blocker({
            id: "branch-location-not-found",
            severity: "critical",
            gate: "tenant_isolation",
            title: "Location is unavailable for this tenant",
            detail: "The requested location was not found inside the authenticated tenant scope.",
            sourceTables: ["locations"],
            nextAction: "Select a valid tenant location.",
          }),
        ]
      : []),
    ...(location && !location.isActive
      ? [
          blocker({
            id: "branch-location-inactive",
            severity: "medium",
            gate: "branch_operating_snapshot",
            title: "Location is inactive",
            detail: "The location exists but is inactive, so operating metrics may be partial.",
            sourceTables: ["locations"],
            nextAction: "Reactivate the location or choose another branch.",
          }),
        ]
      : []),
  ]

  return buildSnapshotResult({
    kind: "branch.operating",
    scope,
    status: !location ? "blocked" : completedSalesCount === 0 && inventoryTransactionCount === 0 ? "empty" : blockers.length > 0 ? "partial" : "fresh",
    evidenceGrade: branchEvidenceGrade(metrics),
    sourceModules: ["dashboard", "sales", "inventory", "purchasing", "accounting"],
    metrics,
    blockers,
    sourceMaxUpdatedAt: maxDate([
      location?.updatedAt,
      latestSale?.updatedAt,
      latestPayment?.updatedAt,
      latestInventoryLevel?.updatedAt,
      latestInventoryTransaction?.createdAt,
      latestPurchaseOrder?.updatedAt,
    ]),
  })
}

function emptyBranchMetrics(locationActive: boolean): BranchOperatingMetrics {
  return {
    locationActive,
    completedSalesCount: 0,
    completedSalesRevenue: 0,
    cashCollected: 0,
    inventoryValue: 0,
    inventoryTransactionCount: 0,
    pendingPurchaseOrderCount: 0,
    openTransferCount: 0,
    postedJournalLineCount: 0,
  }
}

function branchEvidenceGrade(metrics: BranchOperatingMetrics): EvidenceGrade {
  if (!metrics.locationActive) return "raw"
  if (metrics.postedJournalLineCount > 0) return "posted"
  if (metrics.completedSalesCount > 0 || metrics.inventoryTransactionCount > 0) return "operational"
  return "raw"
}

