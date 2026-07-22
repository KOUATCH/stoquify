import type {
  AllowedOperatingAccessScope,
  OperatingAccessContext,
} from "@/services/operating-access/operating-access-scope-contracts"
import type { ActionQueueResult, BusinessSignal } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import type { PaymentReconciliationSignOffCommandStateResult } from "@/services/reconciliation/payment-reconciliation-sign-off-command-state-contracts"

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}))

jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
  getTenantOperatingSnapshotFromRelated: jest.fn(),
}))

jest.mock("@/services/assurance/assurance-control-tower.service", () => ({
  getAssuranceControlTowerData: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-sign-off-command-state.service", () => ({
  getPaymentReconciliationSignOffCommandState: jest.fn(),
}))

import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"
import { getAssuranceControlTowerData } from "@/services/assurance/assurance-control-tower.service"
import { getPaymentReconciliationSignOffCommandState } from "@/services/reconciliation/payment-reconciliation-sign-off-command-state.service"

import {
  composeManagerActionCenterData,
  getManagerActionCenterData,
  getManagerActionCenterDataFromResolvedAccess,
} from "../manager-action-center.service"

const mockResolveOperatingAccessScope = resolveOperatingAccessScope as jest.Mock
const mockGetCloseReadinessSnapshot = getCloseReadinessSnapshot as jest.Mock
const mockGetInventoryCashSnapshot = getInventoryCashSnapshot as jest.Mock
const mockGetPaymentTruthSnapshot = getPaymentTruthSnapshot as jest.Mock
const mockGetTenantOperatingSnapshotFromRelated = getTenantOperatingSnapshotFromRelated as jest.Mock
const mockGetAssuranceControlTowerData = getAssuranceControlTowerData as jest.Mock
const mockGetPaymentReconciliationSignOffCommandState = getPaymentReconciliationSignOffCommandState as jest.Mock

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("manager action center service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision())
    mockGetPaymentReconciliationSignOffCommandState.mockResolvedValue(emptyReconciliationCommandState())
  })

  it("fails closed on a denied operating scope before downstream reads", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: false,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "LOCATION_ASSIGNMENT" },
      reason: "NO_MANAGED_LOCATIONS",
      scope: null,
    })

    await expect(
      getManagerActionCenterData({ accessContext: context, now: generatedAt }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        code: "FORBIDDEN",
        message: "Manager Action Center is not available for this account.",
      }),
    )

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expectNoManagerActionCenterReads()
  })

  it("fails closed on location responsibility before tenant reads", async () => {
    const context = accessContext({ roles: [] })
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: true,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: "dashboard.read",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
        managedLocations: [{ id: "location-1", name: "Branch One", code: "B1" }],
      },
      scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
    })

    await expect(
      getManagerActionCenterData({ accessContext: context, now: generatedAt }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        code: "FORBIDDEN",
        message:
          "Manager Action Center tenant truth is not available for location-scoped operating access.",
      }),
    )

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expectNoManagerActionCenterReads()
  })

  it("composes BI-backed manager actions from the permission-filtered action queue", () => {
    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue(),
    })

    expect(data.kpis).toHaveLength(5)
    expect(data.kpis.map((card) => card.id)).toEqual([
      "manager-open-actions",
      "manager-critical-actions",
      "manager-stock-work",
      "manager-payroll-forecast-proof",
      "manager-hidden-actions",
    ])
    expect(data.commandBrief).toMatchObject({
      title: "Manager daily run sheet",
      state: "blocked",
      primaryAction: expect.objectContaining({
        href: "/dashboard/finance/payments/reconciliation",
      }),
    })
    expect(data.runSheetGroups.map((group) => group.id)).toEqual([
      "overdue",
      "critical",
      "due_today",
      "blocked",
      "waiting",
      "assigned",
      "routine",
    ])
    expect(data.runSheetGroups.find((group) => group.id === "critical")).toMatchObject({
      count: 2,
      state: "blocked",
    })
    expect(data.summary).toMatchObject({
      total: 2,
      critical: 1,
      high: 1,
      hiddenByPermission: 1,
    })
    expect(data.actionItems[0]).toMatchObject({
      id: "act-1",
      severity: "critical",
      trustState: "blocked",
      actionLink: {
        moduleSlug: "payment_reconciliation",
        href: "/dashboard/finance/payments/reconciliation",
      },
    })
    expect(data.kpis.find((card) => card.id === "manager-hidden-actions")).toMatchObject({
      state: "permission_denied",
      requiredPermission: "users.read",
    })
  })

  it("surfaces payroll forecast proof as aggregate-only manager work", () => {
    const tenant = tenantSnapshot({
      payrollFinanceForecast: payrollForecastMetrics({
        status: "NON_AUTHORITATIVE",
        authoritative: false,
        reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
        message: "Upcoming payroll finance forecasts are withheld because payroll proof is incomplete.",
        upcomingNetPayAmount: 0,
        upcomingStatutoryLiabilityAmount: 0,
        totalUpcomingAmount: 0,
        blockerCodes: ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING"],
      }),
    })
    tenant.status = "blocked"
    tenant.uiState = "blocked"
    tenant.evidenceGrade = "blocked"
    tenant.blockers = [
      {
        id: "tenant-payroll-finance-forecast-payment-evidence-missing",
        severity: "high",
        gate: "payroll_finance_forecast",
        title: "Payroll payment proof is missing",
        detail: "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.",
        sourceTables: ["payroll_runs", "payroll_payment_batches"],
        nextAction: "Open payroll payments and complete payment release evidence.",
      },
      {
        id: "tenant-unrelated-close-blocker",
        severity: "high",
        gate: "close_readiness",
        title: "Close blocker",
        detail: "Close is blocked.",
        sourceTables: ["close_runs"],
      },
    ]

    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenant,
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
    })

    const payroll = data.kpis.find((card) => card.id === "manager-payroll-forecast-proof")

    expect(payroll).toMatchObject({
      value: 0,
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      moduleSlug: "payroll",
      requiredPermission: "payroll.payments.reconcile",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(payroll?.detail).toContain("Open payroll payments")
    expect(payroll?.blockers).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ gate: "close_readiness" })]),
    )
  })

  it("keeps the center empty instead of inventing work when no visible actions exist", () => {
    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
    })

    expect(data.actionItems).toEqual([])
    expect(data.runSheetGroups.every((group) => group.count === 0)).toBe(true)
    expect(data.commandBrief.state).toBe("empty")
    expect(data.insights).toEqual([])
    expect(data.kpis.find((card) => card.id === "manager-open-actions")).toMatchObject({
      state: "empty",
      value: 0,
    })
  })

  it("keeps manager page data available when assurance control tower fails", async () => {
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValue(tenantSnapshot())
    mockGetAssuranceControlTowerData.mockRejectedValue(new Error("assurance timeout"))

    const context = accessContext()
    const data = await getManagerActionCenterData({
      accessContext: context,
      now: generatedAt,
    })

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expect(mockGetAssuranceControlTowerData).toHaveBeenCalled()
    expect(data.assuranceIncidents).toEqual([])
    expect(data.commandBrief.title).toBe("Manager daily run sheet")
    expect(data.runSheetGroups).toHaveLength(7)
  })

  it("builds tenant data from resolved access without resolving again", async () => {
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValue(tenantSnapshot())
    mockGetAssuranceControlTowerData.mockRejectedValue(new Error("assurance timeout"))

    const context = accessContext()
    const data = await getManagerActionCenterDataFromResolvedAccess(
      {
        accessContext: context,
        now: generatedAt,
      },
      tenantAccessDecision(),
    )

    expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled()
    expect(mockGetPaymentTruthSnapshot).toHaveBeenCalled()
    expect(mockGetInventoryCashSnapshot).toHaveBeenCalled()
    expect(mockGetCloseReadinessSnapshot).toHaveBeenCalled()
    expect(mockGetTenantOperatingSnapshotFromRelated).toHaveBeenCalled()
    expect(data.organizationId).toBe("org-1")
  })

  it("adds visible workflow assurance incidents to manager action items", () => {
    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
      assuranceIncidents: [assuranceIncident()],
      assuranceHiddenByPermission: 2,
    })

    expect(data.summary).toMatchObject({
      total: 1,
      critical: 1,
      blocked: 1,
      hiddenByPermission: 2,
    })
    expect(data.runSheetGroups.find((group) => group.id === "overdue")).toMatchObject({
      count: 1,
      state: "blocked",
    })
    expect(data.actionItems[0]).toMatchObject({
      id: "assurance-incident-1",
      title: "Ledger source evidence failed",
      actionPath: "/dashboard/assurance/control-tower/incidents/incident-1",
      assignedRole: "accountant",
      actionLink: {
        href: "/dashboard/assurance/control-tower/incidents/incident-1",
        moduleSlug: "accounting",
      },
    })
  })

  it("composes an available reconciliation descriptor as an executable source command", () => {
    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
      paymentReconciliationSignOff:
        availableReconciliationCommandState(),
    })

    expect(data.summary).toMatchObject({
      total: 1,
      dueToday: 1,
      open: 1,
      high: 1,
      hiddenByPermission: 0,
    })
    expect(data.actionItems).toEqual([
      expect.objectContaining({
        id: "payment-reconciliation-sign:run-ready-1",
        origin: "SOURCE_COMMAND",
        kind: "PAYMENT_RECONCILIATION_SIGN_OFF",
        requiredPermission: "payments.reconciliation.sign",
        sourceCommand: expect.objectContaining({
          commandId: "payment-reconciliation-sign:run-ready-1",
          source: expect.objectContaining({
            id: "run-ready-1",
            status: "READY_FOR_SIGNOFF",
          }),
        }),
        actionLink: expect.objectContaining({
          href: "/dashboard/finance/reconciliation",
          requiredPermission: "payments.reconciliation.read",
        }),
      }),
    ])
    expect(data.runSheetGroups.find((group) => group.id === "critical"))
      .toMatchObject({ count: 1 })
  })

  it("keeps a read-only reconciliation descriptor link-only with no executable payload", () => {
    const data = composeManagerActionCenterData({
      organizationId: "org-1",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
      paymentReconciliationSignOff:
        readOnlyReconciliationCommandState("SIGN_PERMISSION_REQUIRED"),
    })

    expect(data.summary).toMatchObject({
      total: 1,
      blocked: 1,
      hiddenByPermission: 0,
    })
    expect(data.actionItems[0]).toMatchObject({
      origin: "SOURCE_COMMAND",
      kind: "LINK",
      sourceCommand: null,
      requiredPermission: "payments.reconciliation.read",
      state: "permission_denied",
      blockers: [
        expect.objectContaining({
          gate: "payment_reconciliation_sign_off",
        }),
      ],
    })
    expect(data.actionItems).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          kind: "PAYMENT_RECONCILIATION_SIGN_OFF",
        }),
      ]),
    )
  })

  it("does not enumerate empty or hidden reconciliation command states", () => {
    const inputs = [
      emptyReconciliationCommandState(),
      hiddenReconciliationCommandState(),
    ]

    for (const paymentReconciliationSignOff of inputs) {
      const data = composeManagerActionCenterData({
        organizationId: "org-1",
        generatedAt,
        snapshots: {
          tenantOperating: tenantSnapshot(),
          paymentTruth: paymentSnapshot(),
          inventoryCash: inventorySnapshot(),
          closeReadiness: closeSnapshot(),
        },
        actionQueue: actionQueue({ total: 0, filteredOutCount: 0 }),
        paymentReconciliationSignOff,
      })

      expect(data.actionItems).toEqual([])
      expect(data.summary).toMatchObject({
        total: 0,
        hiddenByPermission: 0,
      })
    }
  })

  it("loads the source-owned descriptor for tenant-wide composition", async () => {
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValue(
      tenantSnapshot(),
    )
    mockGetAssuranceControlTowerData.mockRejectedValue(
      new Error("assurance unavailable"),
    )
    mockGetPaymentReconciliationSignOffCommandState.mockResolvedValue(
      availableReconciliationCommandState(),
    )

    const context = accessContext({
      permissions: [
        "dashboard.read",
        "payments.reconciliation.read",
        "payments.reconciliation.sign",
      ],
    })
    const data = await getManagerActionCenterDataFromResolvedAccess(
      {
        accessContext: context,
        now: generatedAt,
      },
      tenantAccessDecision(context),
    )

    expect(mockGetPaymentReconciliationSignOffCommandState)
      .toHaveBeenCalledWith({
        accessContext: context,
        now: generatedAt,
      })
    expect(data.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "PAYMENT_RECONCILIATION_SIGN_OFF",
        }),
      ]),
    )
  })

  it("keeps tenant dashboard data available when command-state evidence fails closed", async () => {
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValue(
      tenantSnapshot(),
    )
    mockGetAssuranceControlTowerData.mockRejectedValue(
      new Error("assurance unavailable"),
    )
    mockGetPaymentReconciliationSignOffCommandState.mockRejectedValue(
      new Error("command evidence inconsistent"),
    )

    const data = await getManagerActionCenterDataFromResolvedAccess(
      {
        accessContext: accessContext(),
        now: generatedAt,
      },
      tenantAccessDecision(),
    )

    expect(data.actionItems).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ origin: "SOURCE_COMMAND" }),
      ]),
    )
    expect(data.summary.hiddenByPermission).toBe(
      actionQueue().filteredOutCount,
    )
  })
})

function accessContext(
  overrides: Partial<OperatingAccessContext> = {},
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    roles: [
      {
        id: "role-admin",
        name: "Administrator",
        code: "admin",
        permissions: ["dashboard.read"],
      },
    ],
    permissions: [
      "dashboard.read",
      "payments.reconciliation.read",
      "inventory.read",
      "purchases.orders.read",
    ],
    isSuperUser: false,
    ...overrides,
  }
}

function tenantAccessDecision(
  context = accessContext(),
): AllowedOperatingAccessScope {
  return {
    allowed: true,
    organizationId: context.orgId,
    actorId: context.userId,
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "admin",
    },
    scope: {
      kind: "TENANT",
      locationIds: null,
    },
  }
}

function expectNoManagerActionCenterReads() {
  expect(mockGetPaymentTruthSnapshot).not.toHaveBeenCalled()
  expect(mockGetInventoryCashSnapshot).not.toHaveBeenCalled()
  expect(mockGetCloseReadinessSnapshot).not.toHaveBeenCalled()
  expect(mockGetAssuranceControlTowerData).not.toHaveBeenCalled()
  expect(mockGetPaymentReconciliationSignOffCommandState).not.toHaveBeenCalled()
  expect(mockGetTenantOperatingSnapshotFromRelated).not.toHaveBeenCalled()
}

function reconciliationCommandStateBase() {
  return {
    kind: "PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE" as const,
    version: 1 as const,
    organizationId: "org-1",
    actorId: "user-1",
    generatedAt,
    authority: {
      kind: "TENANT_WIDE" as const,
      basis: "RBAC_ROLE" as const,
    },
    scope: { kind: "TENANT" as const },
    controls: {
      projectionPurpose:
        "SOURCE_OWNED_SIGN_OFF_COMMAND_STATE_ONLY" as const,
      sourceOfTruth: "ReconciliationRun" as const,
      tenantWideOnly: true as const,
      moduleEntitlementEnforced: true as const,
      makerCheckerRequired: true as const,
      freshAuthRequired: true as const,
      minimumAssurance: "L1" as const,
      sourceRevalidatedAtWrite: true as const,
      clientResolutionAccepted: false as const,
    },
    projectionHash: `sha256:${"f".repeat(64)}`,
  }
}

function reconciliationCommandCandidate() {
  return {
    commandId: "payment-reconciliation-sign:run-ready-1",
    actionPath: "/dashboard/finance/reconciliation" as const,
    requiredPermission: "payments.reconciliation.sign" as const,
    source: {
      type: "ReconciliationRun" as const,
      id: "run-ready-1",
      status: "READY_FOR_SIGNOFF" as const,
      updatedAt: "2026-06-20T09:30:00.000Z",
      versionHash: `sha256:${"a".repeat(64)}`,
    },
    provider: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      currencyCode: "XAF",
    },
    businessDate: "2026-06-20T00:00:00.000Z",
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    makerActorId: "maker-1",
    totals: {
      internalAmount: "10000.00",
      externalAmount: "10000.00",
      matchedAmount: "10000.00",
      suspenseAmount: "0.00",
    },
    matchCount: 1,
    exceptionCount: 0,
  }
}

function availableReconciliationCommandState(): Extract<
  PaymentReconciliationSignOffCommandStateResult,
  { state: "AVAILABLE" }
> {
  return {
    ...reconciliationCommandStateBase(),
    state: "AVAILABLE",
    reason: null,
    commandAllowed: true,
    candidate: reconciliationCommandCandidate(),
  }
}

function readOnlyReconciliationCommandState(
  reason: Extract<
    PaymentReconciliationSignOffCommandStateResult,
    { state: "READ_ONLY" }
  >["reason"],
): Extract<
  PaymentReconciliationSignOffCommandStateResult,
  { state: "READ_ONLY" }
> {
  return {
    ...reconciliationCommandStateBase(),
    state: "READ_ONLY",
    reason,
    commandAllowed: false,
    candidate: reconciliationCommandCandidate(),
  }
}

function emptyReconciliationCommandState(): Extract<
  PaymentReconciliationSignOffCommandStateResult,
  { state: "EMPTY" }
> {
  return {
    ...reconciliationCommandStateBase(),
    state: "EMPTY",
    reason: "NO_READY_RUN",
    commandAllowed: false,
    candidate: null,
  }
}

function hiddenReconciliationCommandState(): Extract<
  PaymentReconciliationSignOffCommandStateResult,
  { state: "HIDDEN" }
> {
  return {
    ...reconciliationCommandStateBase(),
    state: "HIDDEN",
    reason: "READ_PERMISSION_REQUIRED",
    commandAllowed: false,
    candidate: null,
  }
}

function freshness(overrides: Partial<SnapshotFreshness> = {}): SnapshotFreshness {
  return {
    generatedAt,
    sourceMaxUpdatedAt: generatedAt,
    maxAgeMinutes: 1440,
    stale: false,
    staleReason: null,
    ...overrides,
  }
}

function tenantSnapshot(overrides: Partial<TenantOperatingMetrics> = {}): SnapshotResult<TenantOperatingMetrics> {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "tenant-hash",
    generatedAt,
    sourceModules: ["dashboard", "purchasing", "payroll", "accounting"],
    metrics: {
      activeLocationCount: 1,
      completedSalesCount: 12,
      completedSalesRevenue: 250000,
      cashCollected: 180000,
      pendingPurchaseOrderCount: 3,
      approvedOrPaidPayrollRunCount: 1,
      activeEmployeeBalanceCaseCount: 0,
      openEmployeeBalanceCaseCount: 0,
      partiallySettledEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      periodEmployeeBalanceSettlementCount: 0,
      periodEmployeeBalanceSettlementAmount: 0,
      postedJournalEntryCount: 1,
      sourceLinkCount: 1,
      payrollFinanceForecast: payrollForecastMetrics(),
      paymentTruth: paymentMetrics(),
      inventoryCash: inventoryMetrics(),
      closeReadiness: closeMetrics(),
      ...overrides,
    },
    blockers: [],
    redactions: [],
  }
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
  }
}

function paymentSnapshot(overrides: Partial<PaymentTruthMetrics> = {}): SnapshotResult<PaymentTruthMetrics> {
  return {
    kind: "payment.truth",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "partial",
    uiState: "partial",
    evidenceGrade: "blocked",
    freshness: freshness(),
    sourceHash: "payment-hash",
    generatedAt,
    sourceModules: ["payments", "finance", "accounting"],
    metrics: paymentMetrics(overrides),
    blockers: [
      {
        id: "payment-suspense-open",
        severity: "high",
        gate: "payment_truth",
        title: "Payment suspense queue is not empty",
        detail: "Suspense remains open.",
        sourceTables: ["suspense_items"],
      },
    ],
    redactions: [],
  }
}

function inventorySnapshot(overrides: Partial<InventoryCashMetrics> = {}): SnapshotResult<InventoryCashMetrics> {
  return {
    kind: "inventory.cash",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "inventory-hash",
    generatedAt,
    sourceModules: ["inventory", "finance"],
    metrics: inventoryMetrics(overrides),
    blockers: [],
    redactions: [],
  }
}

function closeSnapshot(overrides: Partial<CloseReadinessMetrics> = {}): SnapshotResult<CloseReadinessMetrics> {
  return {
    kind: "close.readiness",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "close-hash",
    generatedAt,
    sourceModules: ["accounting", "close", "compliance"],
    metrics: closeMetrics(overrides),
    blockers: [],
    redactions: [],
  }
}

function actionQueue(input: { total?: number; filteredOutCount?: number } = {}): ActionQueueResult {
  const total = input.total ?? 2
  const signals = total > 0 ? [paymentSignal(), purchasingSignal()] : []
  const actionItems =
    total > 0
      ? [
          {
            id: "act-1",
            organizationId: "org-1",
            signalId: "sig-1",
            signalType: "open_payment_suspense",
            title: "Resolve payment suspense",
            nextStep: "Classify or match suspense items.",
            actionPath: "/dashboard/finance/payments/reconciliation",
            requiredPermission: "payments.reconciliation.read",
            status: "open" as const,
            severity: "critical" as const,
            severityScore: 98,
            assignedRole: "finance" as const,
            assigneeId: null,
            createdAt: generatedAt,
            updatedAt: generatedAt,
            dueAt: "2026-06-20T12:00:00.000Z",
            resolvedAt: null,
            dismissedAt: null,
            evidenceGrade: "blocked" as const,
            redactions: [],
            blockers: [],
          },
          {
            id: "act-2",
            organizationId: "org-1",
            signalId: "sig-2",
            signalType: "purchase_order_receiving_delay",
            title: "Review supplier receiving",
            nextStep: "Check delayed purchase order receiving.",
            actionPath: "/dashboard/purchase-orders",
            requiredPermission: "purchases.orders.read",
            status: "open" as const,
            severity: "high" as const,
            severityScore: 78,
            assignedRole: "purchasing" as const,
            assigneeId: null,
            createdAt: generatedAt,
            updatedAt: generatedAt,
            dueAt: "2026-06-21T10:00:00.000Z",
            resolvedAt: null,
            dismissedAt: null,
            evidenceGrade: "operational" as const,
            redactions: [],
            blockers: [],
          },
        ]
      : []

  return {
    organizationId: "org-1",
    generatedAt,
    signals,
    actionItems,
    filteredOutCount: input.filteredOutCount ?? (total > 0 ? 1 : 0),
    summary: {
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
        high: total > 1 ? 1 : 0,
        critical: total > 0 ? 1 : 0,
      },
      byRole: total > 0 ? { finance: 1, purchasing: total > 1 ? 1 : 0 } : {},
    },
  }
}

function assuranceIncident() {
  return {
    id: "incident-1",
    organizationId: "org-1",
    checkKey: "ledger.posted_source_link.required",
    workflow: "ledger" as const,
    moduleSlug: "accounting",
    sourceType: "journal_entries",
    sourceId: "aggregate",
    sourceLabel: "Posted source-backed journals",
    sourceHash: "source-hash",
    fingerprint: "fingerprint-1",
    title: "Ledger source evidence failed",
    detail: "A posted journal entry is missing source-link evidence.",
    severity: "blocking" as const,
    status: "open" as const,
    evidenceGrade: "blocked" as const,
    actionRoute: "/dashboard/accounting/journals",
    ownerId: null,
    assignedRole: "accountant",
    dueAt: "2026-06-20T09:00:00.000Z",
    occurrenceCount: 1,
    firstDetectedAt: generatedAt,
    lastDetectedAt: generatedAt,
    resolvedAt: null,
    reopenedAt: null,
    suppressedAt: null,
    metadata: {},
    sourceLinks: [],
    proofSubject: null,
    proofSummary: {
      evidenceGrade: "blocked" as const,
      sourceHash: "source-hash",
      freshness: "blocked" as const,
      proofSubject: null,
      blockerReason: "No supported proof trail subject is available for this incident yet.",
      actionRoute: "/dashboard/accounting/journals",
    },
    redactions: [],
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    sourceRoute: "/dashboard/accounting/journals",
    detailRoute: "/dashboard/assurance/control-tower/incidents/incident-1",
    actionLabel: "Open ledger source",
    moduleSlugNormalized: "accounting" as const,
    blockers: [
      {
        id: "assurance-incident-incident-1",
        severity: "critical" as const,
        gate: "ledger.posted_source_link.required",
        title: "Assurance incident requires action",
        detail: "No supported proof trail subject is available for this incident yet.",
        sourceTables: ["journal_entries"],
      },
    ],
  }
}

function paymentSignal(): BusinessSignal {
  return {
    id: "sig-1",
    organizationId: "org-1",
    moduleSlug: "payment_reconciliation",
    sourceModule: "payments",
    sourceSnapshotKind: "payment.truth",
    sourceHash: "payment-hash",
    signalType: "open_payment_suspense",
    title: "Open payment suspense",
    detail: "Suspense needs review.",
    businessImpact: "Cash cannot be trusted until suspense is cleared.",
    subjectType: "payment.suspense",
    subjectId: "suspense-1",
    evidenceGrade: "blocked",
    severity: "critical",
    severityScore: 98,
    status: "active",
    dedupeKey: "org-1:payment-suspense",
    generatedAt,
    expiresAt: "2026-06-21T10:00:00.000Z",
    freshness: freshness(),
    suggestedAction: "Review suspense",
    actionPath: "/dashboard/finance/payments/reconciliation",
    requiredPermission: "payments.reconciliation.read",
    assignedRole: "finance",
    assigneeId: null,
    blockers: [],
    redactions: [],
    payload: {},
    proofLink: null,
  }
}

function purchasingSignal(): BusinessSignal {
  return {
    ...paymentSignal(),
    id: "sig-2",
    moduleSlug: "purchasing",
    sourceModule: "purchasing",
    sourceSnapshotKind: "tenant.operating",
    signalType: "purchase_order_receiving_delay",
    title: "Delayed purchase receiving",
    detail: "A purchase order may be delaying stock availability.",
    businessImpact: "Stock and supplier commitments may be misstated.",
    subjectType: "purchase.order",
    subjectId: "po-1",
    evidenceGrade: "operational",
    severity: "high",
    severityScore: 78,
    dedupeKey: "org-1:po-delay",
    suggestedAction: "Review receiving",
    actionPath: "/dashboard/purchase-orders",
    requiredPermission: "purchases.orders.read",
    assignedRole: "purchasing",
  }
}

function paymentMetrics(overrides: Partial<PaymentTruthMetrics> = {}): PaymentTruthMetrics {
  return {
    providerAccountCount: 2,
    activeProviderAccountCount: 2,
    recentRunCount: 1,
    readyForSignoffCount: 0,
    signedRunCount: 0,
    openExceptionCount: 2,
    criticalExceptionCount: 1,
    openSuspenseCount: 1,
    openSuspenseAmount: 125000,
    pendingTransactionCount: 4,
    ...overrides,
  }
}

function inventoryMetrics(overrides: Partial<InventoryCashMetrics> = {}): InventoryCashMetrics {
  return {
    trackedItemCount: 30,
    inventoryLevelCount: 42,
    quantityOnHand: 100,
    quantityAvailable: 78,
    quantityReserved: 12,
    quantityInTransit: 3,
    quantityOnOrder: 8,
    inventoryValue: 450000,
    zeroStockLevelCount: 2,
    negativeStockLevelCount: 0,
    periodTransactionCount: 24,
    periodAdjustmentCount: 1,
    periodTransferCount: 3,
    ...overrides,
  }
}

function closeMetrics(overrides: Partial<CloseReadinessMetrics> = {}): CloseReadinessMetrics {
  return {
    accountingPeriodCount: 1,
    openPeriodCount: 1,
    recentCloseRunCount: 1,
    certifiedCloseRunCount: 0,
    blockedCloseRunCount: 0,
    averageReadinessScore: 72,
    openFindingCount: 2,
    criticalOpenFindingCount: 0,
    unavailableEvidenceCount: 1,
    ...overrides,
  }
}
