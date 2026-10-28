import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  InventoryLossMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { db } from "@/prisma/db"
import { auditRbacDecision } from "@/lib/security/rbac"
import {
  getModuleControlCenterData,
  observeModuleAccess,
} from "@/services/modules/module-entitlement.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"

jest.mock("@/lib/security/rbac", () => ({
  auditRbacDecision: jest.fn().mockResolvedValue(undefined),
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
}))

jest.mock("@/prisma/db", () => ({
  db: {
    journalEntry: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn() },
    closeRun: { findFirst: jest.fn() },
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  getModuleControlCenterData: jest.fn(),
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/signals/action-queue.service", () => ({
  buildActionQueue: jest.fn(),
}))

jest.mock("@/services/signals/business-signal-rules.service", () => ({
  ...jest.requireActual("@/services/signals/business-signal-rules.service"),
  buildBusinessSignalsFromSnapshots: jest.fn(),
}))

jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/inventory-loss-snapshot.service", () => ({
  getInventoryLossSnapshot: jest.fn(),
}))


jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshotFromRelated: jest.fn(),
}))

import {
  composeOwnerWarRoomData,
  getOwnerWarRoomData,
} from "../owner-war-room.service"

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("owner war room service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it("composes eight read-only cards with evidence, redaction, proof, and module observe state", () => {
    const data = composeOwnerWarRoomData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue(),
      moduleControl: moduleControl({ wouldBlockCount: 2, dependencyGapCount: 1 }),
      proofSubjectIds: {
        "journal.entry": "je-1",
        "reconciliation.run": "rr-1",
        "close.run": "cr-1",
      },
    })

    expect(data.cards).toHaveLength(8)
    expect(data.cards.map((card) => card.id)).toEqual([
      "cash_at_risk",
      "reconciliation_exceptions",
      "stock_cash_exposure",
      "supplier_commitments",
      "payroll_exposure",
      "close_readiness",
      "action_queue",
      "module_observe",
    ])
    expect(data.cards.find((card) => card.id === "payroll_exposure")).toMatchObject({
      state: "redacted",
      requiredPermission: "payroll.read",
      value: 440000,
      unit: "value",
    })
    expect(data.cards.find((card) => card.id === "module_observe")).toMatchObject({
      state: "upgrade_request",
      value: 2,
    })
    expect(data.proofSubjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subjectType: "journal.entry", subjectId: "je-1", enabled: true }),
        expect.objectContaining({ subjectType: "reconciliation.run", subjectId: "rr-1", enabled: true }),
        expect.objectContaining({ subjectType: "close.run", subjectId: "cr-1", enabled: true }),
      ]),
    )
    expect(data.summary).toMatchObject({
      criticalCount: 1,
      highCount: 1,
      upgradePromptCount: 1,
    })
    expect(data.morningBrief.headlineMetrics).toMatchObject({
      cashAtRisk: 125000,
      payrollForecastTotal: 440000,
      blockedCloseItems: 1,
      staleEvidenceItems: 0,
      proofLinkedActionCount: 1,
    })
    expect(data.morningBrief.commandBrief).toMatchObject({
      title: "Owner morning brief",
      state: "blocked",
      primaryAction: expect.objectContaining({ href: "/dashboard/finance/payments" }),
    })
    expect(data.morningBrief.priorityActions).toEqual([
      expect.objectContaining({ title: "Resolve payment suspense", evidenceGrade: "blocked" }),
    ])
    expect(data.morningBrief.risks.map((risk) => risk.title)).toEqual([
      "Cash at risk",
      "Blocked close items",
      "Stock-to-cash exposure",
    ])
    expect(data.morningBrief.zones.map((zone) => zone.title)).toEqual([
      "Cash truth",
      "Payroll finance forecast",
      "Stock-to-cash truth",
      "Close readiness",
      "Payment and reconciliation truth",
    ])
  })

  it("shows employee balance recovery cases as redacted payroll exposure", () => {
    const data = composeOwnerWarRoomData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot({
          approvedOrPaidPayrollRunCount: 0,
          activeEmployeeBalanceCaseCount: 2,
          openEmployeeBalanceCaseCount: 1,
          partiallySettledEmployeeBalanceCaseCount: 1,
          employeeBalanceOutstandingAmount: 27500,
        }),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0 }),
      moduleControl: moduleControl({ wouldBlockCount: 0, dependencyGapCount: 0 }),
      proofSubjectIds: {},
    })

    expect(data.cards.find((card) => card.id === "payroll_exposure")).toMatchObject({
      value: 2,
      unit: "cases",
      tone: "danger",
      href: "/dashboard/payroll/payments",
      state: "redacted",
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
  })

  it("surfaces blocked payroll forecast proof as owner risk without unrelated tenant blockers", () => {
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

    const data = composeOwnerWarRoomData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      snapshots: {
        tenantOperating: tenant,
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      actionQueue: actionQueue({ total: 0 }),
      moduleControl: moduleControl({ wouldBlockCount: 0, dependencyGapCount: 0 }),
      proofSubjectIds: {},
    })

    const card = data.cards.find((item) => item.id === "payroll_exposure")

    expect(card).toMatchObject({
      state: "blocked",
      tone: "danger",
      value: 0,
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(card?.blockers).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ gate: "close_readiness" })]),
    )
    expect(data.morningBrief.risks.map((risk) => risk.title)).toEqual(
      expect.arrayContaining(["Payroll forecast proof"]),
    )
  })

  it("keeps proof buttons disabled when no latest supported records are available", () => {
    const data = composeOwnerWarRoomData({
      organizationId: "org-1",
      organizationName: null,
      generatedAt,
      snapshots: {
        tenantOperating: tenantSnapshot({ postedJournalEntryCount: 0 }),
        paymentTruth: paymentSnapshot({ recentRunCount: 0 }),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot({ recentCloseRunCount: 0 }),
      },
      actionQueue: actionQueue({ total: 0, filteredOutCount: 1 }),
      moduleControl: moduleControl({ wouldBlockCount: 0, dependencyGapCount: 0 }),
      proofSubjectIds: {},
    })

    expect(data.proofSubjects.every((subject) => !subject.enabled)).toBe(true)
    expect(data.cards.find((card) => card.id === "action_queue")).toMatchObject({
      state: "permission_denied",
    })
    expect(data.cards.find((card) => card.id === "module_observe")).toMatchObject({
      state: "ready",
    })
    expect(data.morningBrief.priorityActions).toHaveLength(0)
    expect(data.morningBrief.proofSubjects.every((subject) => !subject.available)).toBe(true)
  })
  it("loads one tenant Inventory Loss action for an entitled administrator", async () => {
    mockOwnerWarRoomSources()
    const actorPermissions = ["dashboard.read", "inventory.levels.read"]

    const result = await getOwnerWarRoomData({
      organizationId: "org-1",
      actorId: "admin-1",
      actorPermissions,
      actorRoleCodes: [" Administrator "],
      isSuperUser: false,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-20",
      maxAgeMinutes: 45,
      now: generatedAt,
    })

    expect(observeModuleAccess).toHaveBeenCalledTimes(1)
    expect(observeModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "admin-1",
      actorPermissions,
      moduleSlug: "inventory",
      surfaceType: "report",
      surface: "owner-war-room.inventory-loss",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
      now: generatedAt,
    })
    expect(getInventoryLossSnapshot).toHaveBeenCalledTimes(1)
    expect(getInventoryLossSnapshot).toHaveBeenCalledWith({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-20",
      maxAgeMinutes: 45,
      now: generatedAt,
    })
    expect(result.actionQueue.actionItems).toEqual([
      expect.objectContaining({
        signalType: "inventory_loss_review",
        actionPath: "/dashboard/inventory/losses",
        requiredPermission: "inventory.levels.read",
      }),
    ])
    expect(result.actionQueue.signals[0]).toMatchObject({
      signalType: "inventory_loss_review",
      sourceSnapshotKind: "inventory.loss",
      sourceHash: "inventory-loss-hash",
    })
    expect(result.actionQueue.signals[0]?.detail).toContain(
      "does not identify who caused the loss",
    )
    expect(result.cards).toHaveLength(8)
    expect(result).not.toHaveProperty("inventoryLoss")
  })

  it("keeps the tenant-wide command center available for a super user", async () => {
    mockOwnerWarRoomSources()

    const result = await getOwnerWarRoomData({
      organizationId: "org-1",
      actorId: "super-1",
      actorPermissions: ["dashboard.read"],
      actorRoleCodes: ["viewer"],
      isSuperUser: true,
      now: generatedAt,
    })

    expect(auditRbacDecision).not.toHaveBeenCalled()
    expect(getPaymentTruthSnapshot).toHaveBeenCalledTimes(1)
    expect(getInventoryCashSnapshot).toHaveBeenCalledTimes(1)
    expect(getCloseReadinessSnapshot).toHaveBeenCalledTimes(1)
    expect(getModuleControlCenterData).toHaveBeenCalledTimes(1)
    expect(getTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
    expect(observeModuleAccess).not.toHaveBeenCalled()
    expect(getInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.cards).toHaveLength(8)
  })

  it.each([
    [
      "actor identity is missing",
      {
        organizationId: "org-1",
        actorId: null,
        actorPermissions: ["dashboard.read", "inventory.levels.read"],
        actorRoleCodes: ["admin"],
        isSuperUser: false,
        now: generatedAt,
      },
      "Missing actor identity",
      null,
    ],
    [
      "dashboard permission is missing",
      {
        organizationId: "org-1",
        actorId: "admin-1",
        actorPermissions: ["inventory.levels.read"],
        actorRoleCodes: ["admin"],
        isSuperUser: false,
        now: generatedAt,
      },
      "Missing permission",
      { userId: "admin-1", orgId: "org-1" },
    ],
    [
      "the actor has location-responsibility authority only",
      {
        organizationId: "org-1",
        actorId: "manager-1",
        actorPermissions: ["dashboard.read", "inventory.levels.read"],
        actorRoleCodes: ["manager"],
        isSuperUser: false,
        now: generatedAt,
      },
      "Tenant-wide operating authority required",
      { userId: "manager-1", orgId: "org-1" },
    ],
    [
      "an owner audience label lacks established tenant-wide authority",
      {
        organizationId: "org-1",
        actorId: "owner-1",
        actorPermissions: ["dashboard.read", "inventory.levels.read"],
        actorRoleCodes: ["owner"],
        isSuperUser: false,
        now: generatedAt,
      },
      "Tenant-wide operating authority required",
      { userId: "owner-1", orgId: "org-1" },
    ],
    [
      "an org_admin audience alias lacks established tenant-wide authority",
      {
        organizationId: "org-1",
        actorId: "org-admin-1",
        actorPermissions: ["dashboard.read", "inventory.levels.read"],
        actorRoleCodes: ["org_admin"],
        isSuperUser: false,
        now: generatedAt,
      },
      "Tenant-wide operating authority required",
      { userId: "org-admin-1", orgId: "org-1" },
    ],
  ] as const)(
    "denies the tenant-wide command center before source reads when %s",
    async (_label, input, reason, ctx) => {
      mockOwnerWarRoomSources()

      await expect(getOwnerWarRoomData(input)).rejects.toMatchObject({
        name: "RbacError",
        code: "FORBIDDEN",
        status: 403,
      })

      expect(auditRbacDecision).toHaveBeenCalledTimes(1)
      expect(auditRbacDecision).toHaveBeenCalledWith({
        ctx,
        permission: "dashboard.read",
        result: "denied",
        resource: "KontavaOwnerWarRoom",
        reason,
      })
      expect(getPaymentTruthSnapshot).not.toHaveBeenCalled()
      expect(getInventoryCashSnapshot).not.toHaveBeenCalled()
      expect(getCloseReadinessSnapshot).not.toHaveBeenCalled()
      expect(getModuleControlCenterData).not.toHaveBeenCalled()
      expect(getTenantOperatingSnapshotFromRelated).not.toHaveBeenCalled()
      expect(observeModuleAccess).not.toHaveBeenCalled()
      expect(getInventoryLossSnapshot).not.toHaveBeenCalled()
      expect(buildBusinessSignalsFromSnapshots).not.toHaveBeenCalled()
      expect(buildActionQueue).not.toHaveBeenCalled()
      expect(db.journalEntry.findFirst).not.toHaveBeenCalled()
      expect(db.reconciliationRun.findFirst).not.toHaveBeenCalled()
      expect(db.closeRun.findFirst).not.toHaveBeenCalled()
    },
  )

  it("suppresses only Inventory Loss when its inherited permission is missing", async () => {
    mockOwnerWarRoomSources()

    const result = await getOwnerWarRoomData({
      organizationId: "org-1",
      actorId: "admin-1",
      actorPermissions: ["dashboard.read"],
      actorRoleCodes: ["admin"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(auditRbacDecision).not.toHaveBeenCalled()
    expect(getPaymentTruthSnapshot).toHaveBeenCalledTimes(1)
    expect(getInventoryCashSnapshot).toHaveBeenCalledTimes(1)
    expect(getCloseReadinessSnapshot).toHaveBeenCalledTimes(1)
    expect(getModuleControlCenterData).toHaveBeenCalledTimes(1)
    expect(getTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
    expect(observeModuleAccess).not.toHaveBeenCalled()
    expect(getInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.actionQueue.signals).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalType: "inventory_loss_review" }),
      ]),
    )
    expect(result.cards).toHaveLength(8)
  })

  it("keeps the existing Owner War Room available when inventory entitlement denies", async () => {
    mockOwnerWarRoomSources()
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })

    const result = await getOwnerWarRoomData({
      organizationId: "org-1",
      actorId: "admin-1",
      actorPermissions: ["dashboard.read", "inventory.levels.read"],
      actorRoleCodes: ["admin"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(observeModuleAccess).toHaveBeenCalledTimes(1)
    expect(getInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.actionQueue.signals).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalType: "inventory_loss_review" }),
      ]),
    )
    expect(result.cards).toHaveLength(8)
  })
})

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
    status: "partial",
    uiState: "partial",
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
    redactions: [
      {
        id: "provider-id-redacted",
        field: "providerAccount.externalAccountHash",
        reason: "Provider identifiers remain server-side.",
        policy: "KONTAVA_SENSITIVE_PAYMENT_EVIDENCE",
      },
    ],
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
    status: "partial",
    uiState: "partial",
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

function actionQueue(input: { total?: number; filteredOutCount?: number } = {}): ActionQueueResult {
  const total = input.total ?? 2
  return {
    organizationId: "org-1",
    generatedAt,
    signals:
      total > 0
        ? [
            {
              id: "sig-1",
              organizationId: "org-1",
              moduleSlug: "payment_reconciliation",
              sourceModule: "payments",
              sourceSnapshotKind: "payment.truth",
              sourceHash: "payment-hash",
              signalType: "open_payment_suspense",
              title: "Resolve payment suspense",
              detail: "Suspense remains open.",
              businessImpact: "Unresolved suspense weakens cash truth.",
              subjectType: "payment.suspense",
              subjectId: "open-suspense",
              evidenceGrade: "blocked",
              severity: "critical",
              severityScore: 98,
              status: "active",
              dedupeKey: "org-1:open_payment_suspense",
              generatedAt,
              expiresAt: generatedAt,
              freshness: freshness(),
              suggestedAction: "Classify or match suspense items.",
              actionPath: "/dashboard/finance/payments",
              requiredPermission: "payments.reconciliation.read",
              assignedRole: "finance",
              assigneeId: null,
              blockers: [],
              redactions: [],
              payload: { openSuspenseAmount: 125000 },
              proofLink: { subjectType: "reconciliation.run", subjectId: "rr-1" },
            },
            ...(total > 1
              ? [
                  {
                    id: "sig-2",
                    organizationId: "org-1",
                    moduleSlug: "purchasing",
                    sourceModule: "purchasing",
                    sourceSnapshotKind: "tenant.operating",
                    sourceHash: "tenant-hash",
                    signalType: "purchase_order_receiving_delay",
                    title: "Review supplier commitment",
                    detail: "Receiving is delayed.",
                    businessImpact: "Receiving delays can hide supplier risk.",
                    subjectType: "purchase.order",
                    subjectId: "pending-receiving",
                    evidenceGrade: "operational",
                    severity: "high",
                    severityScore: 78,
                    status: "active",
                    dedupeKey: "org-1:purchase_order_receiving_delay",
                    generatedAt,
                    expiresAt: generatedAt,
                    freshness: freshness(),
                    suggestedAction: "Check delayed receiving.",
                    actionPath: "/dashboard/purchase-orders",
                    requiredPermission: "purchases.orders.read",
                    assignedRole: "purchasing",
                    assigneeId: null,
                    blockers: [],
                    redactions: [],
                    payload: { pendingPurchaseOrderCount: 3 },
                    proofLink: null,
                  },
                ]
              : []),
          ]
        : [],
    actionItems:
      total > 0
        ? [
            {
              id: "act-1",
              organizationId: "org-1",
              signalId: "sig-1",
              signalType: "open_payment_suspense",
              title: "Resolve payment suspense",
              nextStep: "Classify or match suspense items.",
              actionPath: "/dashboard/finance/payments",
              requiredPermission: "payments.reconciliation.read",
              status: "open",
              severity: "critical",
              severityScore: 98,
              assignedRole: "finance",
              assigneeId: null,
              createdAt: generatedAt,
              updatedAt: generatedAt,
              dueAt: generatedAt,
              resolvedAt: null,
              dismissedAt: null,
              evidenceGrade: "blocked",
              redactions: [],
              blockers: [],
            },
            {
              id: "act-2",
              organizationId: "org-1",
              signalId: "sig-2",
              signalType: "purchase_order_receiving_delay",
              title: "Review supplier commitment",
              nextStep: "Check delayed receiving.",
              actionPath: "/dashboard/purchase-orders",
              requiredPermission: "purchases.orders.read",
              status: "open",
              severity: "high",
              severityScore: 78,
              assignedRole: "purchasing",
              assigneeId: null,
              createdAt: generatedAt,
              updatedAt: generatedAt,
              dueAt: generatedAt,
              resolvedAt: null,
              dismissedAt: null,
              evidenceGrade: "operational",
              redactions: [],
              blockers: [],
            },
          ]
        : [],
    filteredOutCount: input.filteredOutCount ?? 0,
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

function moduleControl(input: {
  wouldBlockCount: number
  dependencyGapCount: number
}): ModuleControlCenterData {
  return {
    organizationId: "org-1",
    organizationName: "Kontava Demo",
    mode: "observe",
    hardEnforcementEnabled: false,
    requestedModules: ["inventory", "pos"],
    normalizedRequestedModules: ["inventory", "pos"],
    unknownRequestedModules: [],
    generatedAt,
    summary: {
      catalogCount: 20,
      entitledCount: 8,
      trialCount: 0,
      readOnlyCount: 0,
      suspendedCount: 0,
      wouldBlockCount: input.wouldBlockCount,
      dependencyGapCount: input.dependencyGapCount,
    },
    items: [],
  }
}
function mockOwnerWarRoomSources() {
  const actualSignalRules = jest.requireActual(
    "@/services/signals/business-signal-rules.service",
  ) as typeof import("@/services/signals/business-signal-rules.service")
  const actualActionQueue = jest.requireActual(
    "@/services/signals/action-queue.service",
  ) as typeof import("@/services/signals/action-queue.service")

  ;(getPaymentTruthSnapshot as jest.Mock).mockResolvedValue(
    paymentSnapshot({
      openExceptionCount: 0,
      criticalExceptionCount: 0,
      openSuspenseCount: 0,
      openSuspenseAmount: 0,
      pendingTransactionCount: 0,
    }),
  )
  ;(getInventoryCashSnapshot as jest.Mock).mockResolvedValue(
    inventorySnapshot({
      inventoryValue: 0,
      zeroStockLevelCount: 0,
      negativeStockLevelCount: 0,
    }),
  )
  ;(getCloseReadinessSnapshot as jest.Mock).mockResolvedValue(
    closeSnapshot({
      blockedCloseRunCount: 0,
      openFindingCount: 0,
      criticalOpenFindingCount: 0,
      unavailableEvidenceCount: 0,
    }),
  )
  ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockResolvedValue(
    tenantSnapshot({ pendingPurchaseOrderCount: 0 }),
  )
  ;(getModuleControlCenterData as jest.Mock).mockResolvedValue(
    moduleControl({ wouldBlockCount: 0, dependencyGapCount: 0 }),
  )
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(getInventoryLossSnapshot as jest.Mock).mockResolvedValue(
    inventoryLossSnapshot(),
  )
  ;(buildBusinessSignalsFromSnapshots as jest.Mock).mockImplementation(
    actualSignalRules.buildBusinessSignalsFromSnapshots,
  )
  ;(buildActionQueue as jest.Mock).mockImplementation(
    actualActionQueue.buildActionQueue,
  )
  ;(db.journalEntry.findFirst as jest.Mock).mockResolvedValue(null)
  ;(db.reconciliationRun.findFirst as jest.Mock).mockResolvedValue(null)
  ;(db.closeRun.findFirst as jest.Mock).mockResolvedValue(null)
}

function inventoryLossSnapshot(
  overrides: Partial<InventoryLossMetrics> = {},
): SnapshotResult<InventoryLossMetrics> {
  return {
    kind: "inventory.loss",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "fresh",
    uiState: "redacted",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "inventory-loss-hash",
    generatedAt,
    sourceModules: ["inventory"],
    metrics: {
      lossLineCount: 2,
      adjustmentCount: 1,
      totalLossValue: 45000,
      currency: "XAF",
      countVarianceLineCount: 0,
      damagedLineCount: 2,
      expiredLineCount: 0,
      recordedTheftCategoryLineCount: 0,
      writeOffLineCount: 0,
      evidenceCoveredLineCount: 2,
      evidenceCoveragePercent: 100,
      valuationCoveredLineCount: 2,
      valuationCoveragePercent: 100,
      approvalAttributedLineCount: 2,
      approvalCoveragePercent: 100,
      missingEvidenceLineCount: 0,
      missingValuationLineCount: 0,
      missingApprovalAttributionLineCount: 0,
      sourceTruncated: false,
      ...overrides,
    },
    blockers: [],
    redactions: [
      {
        id: "inventory-loss-evidence-hashes-redacted",
        field: "records.evidence.*Hash",
        reason: "Source evidence hashes remain server-side.",
        policy: "INVENTORY_LOSS_EVIDENCE_REDACTION",
      },
    ],
  }
}
