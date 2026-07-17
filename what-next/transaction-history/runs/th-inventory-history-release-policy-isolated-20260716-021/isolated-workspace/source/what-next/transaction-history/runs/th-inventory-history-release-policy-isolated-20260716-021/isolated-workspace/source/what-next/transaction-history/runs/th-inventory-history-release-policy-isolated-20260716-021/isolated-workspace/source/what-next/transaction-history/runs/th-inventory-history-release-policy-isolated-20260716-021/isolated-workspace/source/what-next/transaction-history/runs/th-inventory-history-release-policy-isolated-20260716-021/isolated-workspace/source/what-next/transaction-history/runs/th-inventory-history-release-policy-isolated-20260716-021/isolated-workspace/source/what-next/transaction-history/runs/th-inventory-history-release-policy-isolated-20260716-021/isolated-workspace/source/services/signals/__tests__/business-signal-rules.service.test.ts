import type {
  BranchOperatingMetrics,
  CloseReadinessMetrics,
  PaymentTruthMetrics,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts";

import {
  buildBusinessSignalsFromFacts,
  buildBusinessSignalsFromSnapshots,
} from "../business-signal-rules.service";

describe("Kontava business signal rules", () => {
  it("dedupes repeated facts by stable key and keeps the strongest signal", () => {
    const signals = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "open_payment_suspense",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "payment.suspense",
          subjectId: "suspense-1",
          severity: "medium",
          payload: { amount: 250_000 },
        },
        {
          organizationId: "org-1",
          signalType: "open_payment_suspense",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "payment.suspense",
          subjectId: "suspense-1",
          severity: "critical",
          payload: { amount: 1_500_000 },
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    );

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      severity: "critical",
      requiredPermission: "payments.reconciliation.read",
      assignedRole: "finance",
    });
  });

  it("redacts sensitive payload fields before returning signal payloads", () => {
    const [signal] = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "duplicate_provider_reference",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "provider.transaction",
          subjectId: "txn-1",
          payload: {
            providerReference: "MTN-MOMO-SECRET-123456",
            count: 2,
          },
          redactions: [
            {
              id: "provider-reference-redaction",
              field: "providerReference",
              reason:
                "Provider reference is masked unless reconciliation permission passes.",
              policy: "kontava-payment-provider-reference-mask-policy",
            },
          ],
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    );

    expect(signal.payload.providerReference).toBe("[REDACTED:SIGNAL]");
    expect(JSON.stringify(signal)).not.toContain("MTN-MOMO-SECRET-123456");
    expect(signal.redactions).toHaveLength(1);
  });

  it("creates actionable payment and close signals from snapshot metrics", () => {
    const paymentSnapshot: SnapshotResult<PaymentTruthMetrics> = {
      kind: "payment.truth",
      organizationId: "org-1",
      locationId: null,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T00:00:00.000Z",
      status: "partial",
      uiState: "partial",
      evidenceGrade: "reconciled",
      freshness: {
        generatedAt: "2026-06-20T08:00:00.000Z",
        sourceMaxUpdatedAt: "2026-06-20T07:30:00.000Z",
        maxAgeMinutes: 1440,
        stale: false,
        staleReason: null,
      },
      sourceHash: "hash-payment",
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceModules: ["payments"],
      metrics: {
        providerAccountCount: 1,
        activeProviderAccountCount: 1,
        recentRunCount: 1,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 2,
        criticalExceptionCount: 1,
        openSuspenseCount: 3,
        openSuspenseAmount: 750_000,
        pendingTransactionCount: 4,
      },
      blockers: [],
      redactions: [],
    };
    const closeSnapshot: SnapshotResult<CloseReadinessMetrics> = {
      ...paymentSnapshot,
      kind: "close.readiness",
      uiState: "blocked",
      evidenceGrade: "blocked",
      sourceHash: "hash-close",
      sourceModules: ["close", "accounting"],
      metrics: {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 1,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 1,
        averageReadinessScore: 62,
        openFindingCount: 4,
        criticalOpenFindingCount: 1,
        unavailableEvidenceCount: 2,
      },
    };

    const signals = buildBusinessSignalsFromSnapshots({
      organizationId: "org-1",
      snapshots: [paymentSnapshot, closeSnapshot],
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: "open_payment_suspense",
          evidenceGrade: "reconciled",
          requiredPermission: "payments.reconciliation.read",
        }),
        expect.objectContaining({
          signalType: "close_blocker",
          severity: "critical",
          requiredPermission: "accounting.close.read",
        }),
      ]),
    );
  });

  it("creates redacted payroll exposure signals for active employee balance recovery", () => {
    const tenantSnapshot: SnapshotResult<TenantOperatingMetrics> = {
      kind: "tenant.operating",
      organizationId: "org-1",
      locationId: null,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T00:00:00.000Z",
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      freshness: {
        generatedAt: "2026-06-20T08:00:00.000Z",
        sourceMaxUpdatedAt: "2026-06-20T07:30:00.000Z",
        maxAgeMinutes: 1440,
        stale: false,
        staleReason: null,
      },
      sourceHash: "hash-tenant",
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceModules: ["dashboard", "payroll", "accounting", "finance"],
      metrics: {
        activeLocationCount: 1,
        completedSalesCount: 0,
        completedSalesRevenue: 0,
        cashCollected: 0,
        pendingPurchaseOrderCount: 0,
        approvedOrPaidPayrollRunCount: 0,
        activeEmployeeBalanceCaseCount: 3,
        openEmployeeBalanceCaseCount: 2,
        partiallySettledEmployeeBalanceCaseCount: 1,
        employeeBalanceOutstandingAmount: 600000,
        periodEmployeeBalanceSettlementCount: 2,
        periodEmployeeBalanceSettlementAmount: 100000,
        postedJournalEntryCount: 1,
        sourceLinkCount: 1,
        paymentTruth: {
          providerAccountCount: 1,
          activeProviderAccountCount: 1,
          recentRunCount: 0,
          readyForSignoffCount: 0,
          signedRunCount: 0,
          openExceptionCount: 0,
          criticalExceptionCount: 0,
          openSuspenseCount: 0,
          openSuspenseAmount: 0,
          pendingTransactionCount: 0,
        },
        inventoryCash: {
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
        },
        closeReadiness: {
          accountingPeriodCount: 1,
          openPeriodCount: 1,
          recentCloseRunCount: 0,
          certifiedCloseRunCount: 0,
          blockedCloseRunCount: 0,
          averageReadinessScore: 80,
          openFindingCount: 0,
          criticalOpenFindingCount: 0,
          unavailableEvidenceCount: 0,
        },
        payrollFinanceForecast: payrollForecastMetrics(),
      },
      blockers: [],
      redactions: [],
    };

    const [signal] = buildBusinessSignalsFromSnapshots({
      organizationId: "org-1",
      snapshots: [tenantSnapshot],
      now: "2026-06-20T08:00:00.000Z",
    });

    expect(signal).toMatchObject({
      signalType: "payroll_exposure",
      subjectType: "payroll.employee_balance",
      subjectId: "active-employee-balance",
      severity: "high",
      actionPath: "/dashboard/payroll/payments",
      requiredPermission: "payroll.payments.reconcile",
      payload: expect.objectContaining({
        activeEmployeeBalanceCaseCount: 3,
        employeeBalanceOutstandingAmount: 600000,
        personLevelAmounts: "[REDACTED:SIGNAL]",
      }),
    });
  });

  it("creates payroll forecast proof signals with payroll-specific blockers and redacted payloads", () => {
    const tenantSnapshot = tenantOperatingSnapshot(
      {
        approvedOrPaidPayrollRunCount: 0,
        payrollFinanceForecast: payrollForecastMetrics({
          status: "NON_AUTHORITATIVE",
          authoritative: false,
          reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
          message:
            "Upcoming payroll finance forecasts are withheld because payroll proof is incomplete.",
          upcomingNetPayAmount: 0,
          upcomingStatutoryLiabilityAmount: 0,
          totalUpcomingAmount: 0,
          blockerCodes: ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING"],
        }),
      },
      {
        status: "blocked",
        uiState: "blocked",
        evidenceGrade: "blocked",
        blockers: [
          {
            id: "tenant-payroll-finance-forecast-payment-evidence-missing",
            severity: "high",
            gate: "payroll_finance_forecast",
            title: "Payroll payment proof is missing",
            detail:
              "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.",
            sourceTables: ["payroll_runs", "payroll_payment_batches"],
          },
          {
            id: "tenant-unrelated-close-blocker",
            severity: "high",
            gate: "close_readiness",
            title: "Close blocker",
            detail: "Close is blocked.",
            sourceTables: ["close_runs"],
          },
        ],
      },
    );

    const [signal] = buildBusinessSignalsFromSnapshots({
      organizationId: "org-1",
      snapshots: [tenantSnapshot],
      now: "2026-06-20T08:00:00.000Z",
    });

    expect(signal).toMatchObject({
      signalType: "payroll_exposure",
      title: "Payroll forecast proof is blocked",
      subjectType: "payroll.forecast",
      subjectId: "payroll-finance-forecast",
      severity: "high",
      evidenceGrade: "blocked",
      actionPath: "/dashboard/payroll/payments",
      requiredPermission: "payroll.payments.reconcile",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      payload: expect.objectContaining({
        blockerCodes: ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING"],
        totalUpcomingAmount: 0,
        personLevelAmounts: "[REDACTED:SIGNAL]",
      }),
    });
    expect(signal.blockers).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ gate: "close_readiness" }),
      ]),
    );
  });

  it("creates redacted branch payroll allocation signals from branch operating snapshots", () => {
    const branchSnapshot = branchOperatingSnapshot(
      {
        completedSalesCount: 8,
        completedSalesRevenue: 500000,
        posShiftCount: 5,
        closedPosShiftCount: 4,
        payrollEmployeeAtLocationCount: 3,
        frozenAttendanceSnapshotCount: 0,
        approvedPayrollRunLineCount: 2,
        unallocatedPayrollRunLineCount: 1,
        payrollGrossAmount: 180000,
        payrollEmployerChargeAmount: 40000,
        payrollNetPayAmount: 140000,
        payrollAllocatedCostAmount: 220000,
        payrollProfitContribution: 280000,
      },
      {
        status: "partial",
        uiState: "partial",
        blockers: [
          {
            id: "branch-payroll-attendance-proof-missing",
            severity: "medium",
            gate: "branch_payroll_inputs",
            title: "POS shift evidence is not frozen for payroll",
            detail:
              "POS sessions exist, but payroll attendance proof is missing.",
            sourceTables: ["pos_sessions", "payroll_attendance_snapshots"],
          },
        ],
      },
    );

    const signals = buildBusinessSignalsFromSnapshots({
      organizationId: "org-1",
      snapshots: [branchSnapshot],
      now: "2026-06-20T08:00:00.000Z",
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: "payroll_exposure",
          title: "Branch payroll allocation proof needs review",
          subjectType: "payroll.branch_allocation",
          subjectId: "loc-1:payroll-allocation",
          actionPath: "/dashboard/payroll/runs",
          requiredPermission: "payroll.runs.review",
          blockers: [
            expect.objectContaining({ gate: "branch_payroll_inputs" }),
          ],
          payload: expect.objectContaining({
            payrollAllocatedCostAmount: 220000,
            payrollProfitContribution: 280000,
            personLevelAmounts: "[REDACTED:SIGNAL]",
          }),
        }),
      ]),
    );
  });
});

function branchOperatingSnapshot(
  metricOverrides: Partial<BranchOperatingMetrics> = {},
  snapshotOverrides: Partial<SnapshotResult<BranchOperatingMetrics>> = {},
): SnapshotResult<BranchOperatingMetrics> {
  return {
    kind: "branch.operating",
    organizationId: "org-1",
    locationId: "loc-1",
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T00:00:00.000Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: {
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-20T07:30:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "hash-branch",
    generatedAt: "2026-06-20T08:00:00.000Z",
    sourceModules: ["dashboard", "sales", "pos", "payroll", "accounting"],
    metrics: {
      locationActive: true,
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
      ...metricOverrides,
    },
    blockers: [],
    redactions: [],
    ...snapshotOverrides,
  };
}
function tenantOperatingSnapshot(
  metricOverrides: Partial<TenantOperatingMetrics> = {},
  snapshotOverrides: Partial<SnapshotResult<TenantOperatingMetrics>> = {},
): SnapshotResult<TenantOperatingMetrics> {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T00:00:00.000Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: {
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-20T07:30:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "hash-tenant",
    generatedAt: "2026-06-20T08:00:00.000Z",
    sourceModules: ["dashboard", "payroll", "accounting", "finance"],
    metrics: {
      activeLocationCount: 1,
      completedSalesCount: 0,
      completedSalesRevenue: 0,
      cashCollected: 0,
      pendingPurchaseOrderCount: 0,
      approvedOrPaidPayrollRunCount: 1,
      activeEmployeeBalanceCaseCount: 0,
      openEmployeeBalanceCaseCount: 0,
      partiallySettledEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      periodEmployeeBalanceSettlementCount: 0,
      periodEmployeeBalanceSettlementAmount: 0,
      postedJournalEntryCount: 1,
      sourceLinkCount: 1,
      paymentTruth: {
        providerAccountCount: 1,
        activeProviderAccountCount: 1,
        recentRunCount: 0,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 0,
        criticalExceptionCount: 0,
        openSuspenseCount: 0,
        openSuspenseAmount: 0,
        pendingTransactionCount: 0,
      },
      inventoryCash: {
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
      },
      closeReadiness: {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 0,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: 80,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      },
      payrollFinanceForecast: payrollForecastMetrics(),
      ...metricOverrides,
    },
    blockers: [],
    redactions: [],
    ...snapshotOverrides,
  };
}

function payrollForecastMetrics(
  overrides: Partial<TenantOperatingMetrics["payrollFinanceForecast"]> = {},
): TenantOperatingMetrics["payrollFinanceForecast"] {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message: "Forecast is source linked.",
    horizonStart: "2026-06-20T00:00:00.000Z",
    horizonEnd: "2026-07-20T23:59:59.999Z",
    upcomingNetPayAmount: 350000,
    upcomingStatutoryLiabilityAmount: 90000,
    totalUpcomingAmount: 440000,
    payrollPeriodCount: 1,
    payrollRunCount: 1,
    paymentBatchCount: 1,
    declarationCount: 1,
    sourceLinkCount: 2,
    evidenceHashCount: 4,
    nextPayDate: "2026-06-30T00:00:00.000Z",
    nextDeclarationDueDate: "2026-07-15T00:00:00.000Z",
    personLevelAmountsRedacted: true,
    blockerCodes: [],
    ...overrides,
  };
}
