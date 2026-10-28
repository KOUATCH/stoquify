import "server-only";

import {
  JournalEntryStatus,
  PaymentStatus,
  PayrollAttendanceSnapshotStatus,
  PayrollEmployeeStatus,
  PayrollRunStatus,
  POSSessionStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
} from "@prisma/client";

import { db } from "@/prisma/db";
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts";
import type {
  BranchOperatingMetrics,
  SnapshotResult,
  SnapshotScopeInput,
} from "./snapshot-contracts";
import {
  blocker,
  buildSnapshotResult,
  maxDate,
  normalizeSnapshotScope,
  toNumber,
} from "./snapshot-utils";

const COMPLETED_SALES_STATUSES = [
  SalesOrderStatus.COMPLETED,
  SalesOrderStatus.DELIVERED,
];
const CASH_COLLECTED_STATUSES = [PaymentStatus.PAID, PaymentStatus.PARTIAL];
const PENDING_PURCHASE_STATUSES = [
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];
const POS_SHIFT_PROOF_STATUSES: POSSessionStatus[] = [
  POSSessionStatus.CLOSED,
  POSSessionStatus.RECONCILED,
];
const PAYROLL_PROFITABILITY_RUN_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.POSTED,
  PayrollRunStatus.ARCHIVED,
];
const PAYROLL_ATTENDANCE_PROOF_STATUSES: PayrollAttendanceSnapshotStatus[] = [
  PayrollAttendanceSnapshotStatus.FROZEN,
  PayrollAttendanceSnapshotStatus.CORRECTED,
];

export async function getBranchOperatingSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<BranchOperatingMetrics>> {
  const scope = normalizeSnapshotScope(input);

  if (!scope.locationId) {
    return buildSnapshotResult({
      kind: "branch.operating",
      scope,
      status: "blocked",
      evidenceGrade: "blocked",
      sourceModules: [
        "dashboard",
        "sales",
        "inventory",
        "purchasing",
        "accounting",
      ],
      metrics: emptyBranchMetrics(false),
      blockers: [
        blocker({
          id: "branch-location-required",
          severity: "high",
          gate: "branch_operating_snapshot",
          title: "Branch snapshot requires a location",
          detail:
            "A branch operating snapshot cannot be generated without a tenant-scoped locationId.",
          sourceTables: ["locations"],
          nextAction:
            "Select a branch or warehouse before requesting a branch snapshot.",
        }),
      ],
    });
  }

  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd };
  const payrollPeriodOverlap = {
    periodStart: { lte: scope.periodEnd },
    periodEnd: { gte: scope.periodStart },
  };
  const payrollAttendanceOverlap = {
    periodStart: { lte: scope.periodEnd },
    periodEnd: { gte: scope.periodStart },
  };
  const approvedPayrollLineWhere = {
    organizationId: scope.organizationId,
    payrollRun: {
      status: { in: PAYROLL_PROFITABILITY_RUN_STATUSES },
      deletedAt: null,
      payrollPeriod: payrollPeriodOverlap,
    },
    employee: {
      locationId: scope.locationId,
      deletedAt: null,
    },
  };
  const unallocatedPayrollLineWhere = {
    organizationId: scope.organizationId,
    payrollRun: {
      status: { in: PAYROLL_PROFITABILITY_RUN_STATUSES },
      deletedAt: null,
      payrollPeriod: payrollPeriodOverlap,
    },
    employee: {
      locationId: null,
      deletedAt: null,
    },
  };

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
    posShiftCount,
    closedPosShiftCount,
    payrollEmployeeAtLocationCount,
    frozenAttendanceSnapshotCount,
    approvedPayrollRunLineCount,
    payrollRunLineTotals,
    unallocatedPayrollRunLineCount,
    latestPosSession,
    latestPayrollAttendanceSnapshot,
    latestPayrollRunLine,
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
        OR: [
          { fromLocationId: scope.locationId },
          { toLocationId: scope.locationId },
        ],
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
    db.pOSSession.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        startTime: periodWhere,
      },
    }),
    db.pOSSession.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        status: { in: POS_SHIFT_PROOF_STATUSES },
        startTime: periodWhere,
      },
    }),
    db.payrollEmployee.count({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        status: PayrollEmployeeStatus.ACTIVE,
        deletedAt: null,
      },
    }),
    db.payrollAttendanceSnapshot.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: PAYROLL_ATTENDANCE_PROOF_STATUSES },
        ...payrollAttendanceOverlap,
        employee: {
          locationId: scope.locationId,
          deletedAt: null,
        },
      },
    }),
    db.payrollRunLine.count({ where: approvedPayrollLineWhere }),
    db.payrollRunLine.aggregate({
      where: approvedPayrollLineWhere,
      _sum: {
        grossAmount: true,
        employerChargeAmount: true,
        netPayableAmount: true,
      },
    }),
    db.payrollRunLine.count({ where: unallocatedPayrollLineWhere }),
    db.pOSSession.findFirst({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payrollAttendanceSnapshot.findFirst({
      where: {
        organizationId: scope.organizationId,
        employee: {
          locationId: scope.locationId,
          deletedAt: null,
        },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payrollRunLine.findFirst({
      where: approvedPayrollLineWhere,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.salesOrder.findFirst({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
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
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.purchaseOrder.findFirst({
      where: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const payrollGrossAmount = toNumber(payrollRunLineTotals._sum?.grossAmount);
  const payrollEmployerChargeAmount = toNumber(
    payrollRunLineTotals._sum?.employerChargeAmount,
  );
  const payrollAllocatedCostAmount =
    payrollGrossAmount + payrollEmployerChargeAmount;
  const completedSalesRevenue = toNumber(salesTotals._sum.total);
  const metrics: BranchOperatingMetrics = {
    locationActive: Boolean(location?.isActive),
    completedSalesCount,
    completedSalesRevenue,
    cashCollected: toNumber(cashCollected._sum.amount),
    inventoryValue: toNumber(inventoryValue._sum.totalValue),
    inventoryTransactionCount,
    pendingPurchaseOrderCount,
    openTransferCount,
    postedJournalLineCount,
    posShiftCount,
    closedPosShiftCount,
    payrollEmployeeAtLocationCount,
    frozenAttendanceSnapshotCount,
    approvedPayrollRunLineCount,
    unallocatedPayrollRunLineCount,
    payrollGrossAmount,
    payrollEmployerChargeAmount,
    payrollNetPayAmount: toNumber(payrollRunLineTotals._sum?.netPayableAmount),
    payrollAllocatedCostAmount,
    payrollProfitContribution:
      completedSalesCount > 0 || payrollAllocatedCostAmount > 0
        ? completedSalesRevenue - payrollAllocatedCostAmount
        : null,
  };

  const blockers = [
    ...(!location
      ? [
          blocker({
            id: "branch-location-not-found",
            severity: "critical",
            gate: "tenant_isolation",
            title: "Location is unavailable for this tenant",
            detail:
              "The requested location was not found inside the authenticated tenant scope.",
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
            detail:
              "The location exists but is inactive, so operating metrics may be partial.",
            sourceTables: ["locations"],
            nextAction: "Reactivate the location or choose another branch.",
          }),
        ]
      : []),
    ...(location &&
    metrics.completedSalesCount > 0 &&
    metrics.approvedPayrollRunLineCount === 0
      ? [
          blocker({
            id: "branch-payroll-profitability-missing",
            severity: "medium",
            gate: "branch_payroll_profitability",
            title: "Branch payroll cost allocation is missing",
            detail:
              "This branch has completed sales but no approved payroll run lines allocated to the branch, so branch profitability should not claim payroll-complete margin.",
            sourceTables: [
              "payroll_run_lines",
              "payroll_runs",
              "payroll_employees",
              "sales_orders",
            ],
            nextAction:
              "Assign payroll employees to branches and approve the payroll run before relying on branch profitability.",
          }),
        ]
      : []),
    ...(location &&
    metrics.posShiftCount > 0 &&
    metrics.frozenAttendanceSnapshotCount === 0
      ? [
          blocker({
            id: "branch-payroll-attendance-proof-missing",
            severity: "medium",
            gate: "branch_payroll_inputs",
            title: "POS shift evidence is not frozen for payroll",
            detail:
              "POS sessions exist for this branch, but no frozen payroll attendance snapshots are available for the same period.",
            sourceTables: ["pos_sessions", "payroll_attendance_snapshots"],
            nextAction:
              "Review POS shifts and freeze payroll attendance snapshots before calculating labor-sensitive payroll inputs.",
          }),
        ]
      : []),
    ...(location && metrics.unallocatedPayrollRunLineCount > 0
      ? [
          blocker({
            id: "branch-payroll-unallocated-lines-present",
            severity: "medium",
            gate: "branch_payroll_allocation",
            title: "Payroll run lines lack branch allocation",
            detail:
              "Approved payroll run lines exist without employee branch allocation, so branch profitability may be incomplete.",
            sourceTables: ["payroll_run_lines", "payroll_employees"],
            nextAction:
              "Assign employee branch locations or reviewed cost centers before branch BI uses payroll cost allocation.",
          }),
        ]
      : []),
  ];

  const redactions =
    metrics.payrollEmployeeAtLocationCount > 0 ||
    metrics.approvedPayrollRunLineCount > 0 ||
    metrics.unallocatedPayrollRunLineCount > 0
      ? [
          {
            id: "branch-payroll-person-level-redacted",
            field: "payroll.personLevelAmounts",
            reason:
              "Branch operating snapshots expose aggregate payroll allocation and profitability only; person-level payroll values stay inside payroll.",
            policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
          },
        ]
      : [];

  return buildSnapshotResult({
    kind: "branch.operating",
    scope,
    status: !location
      ? "blocked"
      : completedSalesCount === 0 &&
          inventoryTransactionCount === 0 &&
          metrics.posShiftCount === 0 &&
          metrics.approvedPayrollRunLineCount === 0
        ? "empty"
        : blockers.length > 0
          ? "partial"
          : "fresh",
    evidenceGrade: branchEvidenceGrade(metrics),
    sourceModules: [
      "dashboard",
      "sales",
      "pos",
      "inventory",
      "purchasing",
      "payroll",
      "accounting",
    ],
    metrics,
    blockers,
    redactions,
    sourceMaxUpdatedAt: maxDate([
      location?.updatedAt,
      latestSale?.updatedAt,
      latestPayment?.updatedAt,
      latestInventoryLevel?.updatedAt,
      latestInventoryTransaction?.createdAt,
      latestPurchaseOrder?.updatedAt,
      latestPosSession?.updatedAt,
      latestPayrollAttendanceSnapshot?.updatedAt,
      latestPayrollRunLine?.updatedAt,
    ]),
  });
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

function branchEvidenceGrade(metrics: BranchOperatingMetrics): EvidenceGrade {
  if (!metrics.locationActive) return "raw";
  if (metrics.postedJournalLineCount > 0) return "posted";
  if (
    metrics.completedSalesCount > 0 ||
    metrics.inventoryTransactionCount > 0 ||
    metrics.posShiftCount > 0 ||
    metrics.approvedPayrollRunLineCount > 0
  ) {
    return "operational";
  }
  return "raw";
}
