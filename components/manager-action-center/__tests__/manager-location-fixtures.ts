import type { ManagerLocationActionCenterData } from "@/services/manager-action-center/manager-location-action-center-contracts"
import type { BranchOperatingMetrics, SnapshotResult } from "@/services/snapshots/snapshot-contracts"
const generatedAt = "2026-06-20T10:00:00.000Z"
export function buildLocationData(): ManagerLocationActionCenterData {
  return {
    organizationId: "org-1",
    actorId: "manager-1",
    generatedAt,
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    },
    scope: {
      kind: "LOCATIONS",
      locationIds: ["location-central", "location-coastal"],
    },
    bundles: [
      {
        location: { id: "location-central", name: "Central Store", code: "BR-01" },
        snapshot: branchSnapshot("location-central", "blocked", "blocked", 11),
        actionQueue: {
          organizationId: "org-1",
          generatedAt,
          signals: [],
          filteredOutCount: 1,
          summary: queueSummary(1),
          actionItems: [
            {
              id: "action-central",
              organizationId: "org-1",
              signalId: "signal-central",
              signalType: "cash_drawer_variance",
              title: "Review cash variance",
              nextStep: "Open the reconciliation evidence and resolve the branch exception.",
              actionPath: "/dashboard/finance/payments/reconciliation",
              requiredPermission: "payments.reconciliation.read",
              status: "open",
              severity: "critical",
              severityScore: 98,
              assignedRole: "manager",
              assigneeId: null,
              createdAt: generatedAt,
              updatedAt: generatedAt,
              dueAt: "2026-06-20T12:00:00.000Z",
              resolvedAt: null,
              dismissedAt: null,
              evidenceGrade: "blocked",
              blockers: [],
              redactions: [],
            },
          ],
        },
      },
      {
        location: { id: "location-coastal", name: "Coastal Outlet", code: "BR-02" },
        snapshot: branchSnapshot("location-coastal", "fresh", "fresh", 29),
        actionQueue: {
          organizationId: "org-1",
          generatedAt,
          signals: [],
          actionItems: [],
          filteredOutCount: 0,
          summary: queueSummary(0),
        },
      },
    ],
  }
}

function branchSnapshot(
  locationId: string,
  status: "blocked" | "fresh",
  uiState: "blocked" | "fresh",
  completedSalesCount: number,
): SnapshotResult<BranchOperatingMetrics> {
  const blocked = status === "blocked"
  return {
    kind: "branch.operating",
    organizationId: "org-1",
    locationId,
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status,
    uiState,
    evidenceGrade: blocked ? "blocked" : "operational",
    freshness: {
      generatedAt,
      sourceMaxUpdatedAt: blocked ? "2026-06-19T08:00:00.000Z" : generatedAt,
      maxAgeMinutes: 1440,
      stale: blocked,
      staleReason: blocked ? "Provider refresh is overdue." : null,
    },
    sourceHash: `source-${locationId}`,
    generatedAt,
    sourceModules: ["pos", "inventory", "payroll"],
    metrics: branchMetrics(completedSalesCount),
    blockers: blocked
      ? [
          {
            id: "blocker-central",
            severity: "critical",
            gate: "pos-shift-close",
            title: "POS shift evidence is incomplete",
            detail: "The current shift does not have complete close evidence.",
            sourceTables: ["POSShift"],
            nextAction: "Close or investigate the affected shift.",
          },
        ]
      : [],
    redactions: blocked
      ? [
          {
            id: "redaction-central",
            field: "metrics.payrollNetPayAmount",
            reason: "Payroll amount is restricted for this role.",
            policy: "payroll.manager.redaction",
          },
        ]
      : [],
  }
}

function branchMetrics(completedSalesCount: number): BranchOperatingMetrics {
  return {
    locationActive: true,
    completedSalesCount,
    completedSalesRevenue: completedSalesCount * 100,
    cashCollected: completedSalesCount * 80,
    inventoryValue: 4500,
    inventoryTransactionCount: 17,
    pendingPurchaseOrderCount: 2,
    openTransferCount: 1,
    postedJournalLineCount: 14,
    posShiftCount: 3,
    closedPosShiftCount: 2,
    payrollEmployeeAtLocationCount: 8,
    frozenAttendanceSnapshotCount: 1,
    approvedPayrollRunLineCount: 7,
    unallocatedPayrollRunLineCount: 1,
    payrollGrossAmount: 1200,
    payrollEmployerChargeAmount: 240,
    payrollNetPayAmount: 960,
    payrollAllocatedCostAmount: 1440,
    payrollProfitContribution: null,
  }
}

function queueSummary(total: number) {
  return {
    total,
    open: total,
    assigned: 0,
    stale: 0,
    expired: 0,
    redacted: 0,
    bySeverity: {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: total,
    },
    byRole: total ? { manager: total } : {},
  }
}
