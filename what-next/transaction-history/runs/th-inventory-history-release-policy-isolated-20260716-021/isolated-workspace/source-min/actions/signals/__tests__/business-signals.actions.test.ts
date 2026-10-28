jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __signalProtectOptions?: Array<Record<string, unknown>>;
    };
    store.__signalProtectOptions = store.__signalProtectOptions ?? [];
    store.__signalProtectOptions.push(options);
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: [
          "dashboard.read",
          "payments.reconciliation.read",
          "inventory.read",
          "accounting.close.read",
        ],
        isSuperUser: false,
      });

      return { success: true, data, error: null, status: 200 };
    };
  }),
}));

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}));

jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}));

jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}));

jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}));

import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service";
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service";
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service";
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service";

import { getOwnerActionQueueAction } from "../business-signals.actions";

const mockTenant = getTenantOperatingSnapshot as jest.Mock;
const mockPayment = getPaymentTruthSnapshot as jest.Mock;
const mockInventory = getInventoryCashSnapshot as jest.Mock;
const mockClose = getCloseReadinessSnapshot as jest.Mock;

function snapshot(kind: string, metrics: Record<string, unknown>) {
  return {
    kind,
    organizationId: "org-session",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T00:00:00.000Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: {
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceMaxUpdatedAt: null,
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: `hash-${kind}`,
    generatedAt: "2026-06-20T08:00:00.000Z",
    sourceModules: ["dashboard"],
    metrics,
    blockers: [],
    redactions: [],
  };
}

describe("business signals actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTenant.mockResolvedValue(
      snapshot("tenant.operating", {
        activeLocationCount: 1,
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
        payrollFinanceForecast: {
          status: "AUTHORITATIVE",
          authoritative: true,
          reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
          message: "Forecast is source linked.",
          horizonStart: "2026-06-01T00:00:00.000Z",
          horizonEnd: "2026-06-30T23:59:59.999Z",
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
          blockerCodes: [],
        },
        paymentTruth: {},
        inventoryCash: {},
        closeReadiness: {},
      }),
    );
    mockPayment.mockResolvedValue(
      snapshot("payment.truth", {
        providerAccountCount: 1,
        activeProviderAccountCount: 1,
        recentRunCount: 1,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 1,
        criticalExceptionCount: 0,
        openSuspenseCount: 2,
        openSuspenseAmount: 400_000,
        pendingTransactionCount: 1,
      }),
    );
    mockInventory.mockResolvedValue(
      snapshot("inventory.cash", {
        trackedItemCount: 1,
        inventoryLevelCount: 1,
        quantityOnHand: 0,
        quantityAvailable: 0,
        quantityReserved: 0,
        quantityInTransit: 0,
        quantityOnOrder: 0,
        inventoryValue: 0,
        zeroStockLevelCount: 1,
        negativeStockLevelCount: 0,
        periodTransactionCount: 1,
        periodAdjustmentCount: 0,
        periodTransferCount: 0,
      }),
    );
    mockClose.mockResolvedValue(
      snapshot("close.readiness", {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 1,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: 80,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      }),
    );
  });

  it("derives tenant from RBAC context and returns permission-filtered owner action queue", async () => {
    const result = await getOwnerActionQueueAction({
      organizationId: "attacker-org",
      periodStart: "2026-06-01",
    });

    expect(result.success).toBe(true);
    expect(mockPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
      }),
    );
    expect(result.data?.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalType: "open_payment_suspense" }),
        expect.objectContaining({ signalType: "stockout_risk" }),
      ]),
    );
  });

  it("registers the owner action queue behind dashboard.read", async () => {
    await getOwnerActionQueueAction({});

    const store = globalThis as typeof globalThis & {
      __signalProtectOptions?: Array<Record<string, unknown>>;
    };
    expect(store.__signalProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "dashboard.read",
          auditResource: "KontavaOwnerActionQueue",
          auditAllowed: true,
        }),
      ]),
    );
  });
});
