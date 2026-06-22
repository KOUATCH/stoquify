import type { ActionQueueResult, BusinessSignal } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

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

jest.mock("@/services/assurance/assurance-control-tower.service", () => ({
  getAssuranceControlTowerData: jest.fn(),
}))

import { composeManagerActionCenterData } from "../manager-action-center.service"

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("manager action center service", () => {
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

    expect(data.kpis).toHaveLength(4)
    expect(data.kpis.map((card) => card.id)).toEqual([
      "manager-open-actions",
      "manager-critical-actions",
      "manager-stock-work",
      "manager-hidden-actions",
    ])
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
    expect(data.insights).toEqual([])
    expect(data.kpis.find((card) => card.id === "manager-open-actions")).toMatchObject({
      state: "empty",
      value: 0,
    })
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
