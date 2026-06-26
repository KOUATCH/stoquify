import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

jest.mock("@/prisma/db", () => ({
  db: {
    journalEntry: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn() },
    closeRun: { findFirst: jest.fn() },
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  getModuleControlCenterData: jest.fn(),
}))

jest.mock("@/services/signals/action-queue.service", () => ({
  buildActionQueue: jest.fn(),
}))

jest.mock("@/services/signals/business-signal-rules.service", () => ({
  buildBusinessSignalsFromSnapshots: jest.fn(),
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
}))

import { composeOwnerWarRoomData } from "../owner-war-room.service"

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("owner war room service", () => {
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
      "Stock-to-cash truth",
      "Close readiness",
      "Payment and reconciliation truth",
    ])
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
      postedJournalEntryCount: 1,
      sourceLinkCount: 1,
      paymentTruth: paymentMetrics(),
      inventoryCash: inventoryMetrics(),
      closeReadiness: closeMetrics(),
      ...overrides,
    },
    blockers: [],
    redactions: [],
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
