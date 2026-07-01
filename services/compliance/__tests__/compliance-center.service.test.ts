jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    fiscalDocument: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    complianceSubmission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    complianceAdapterConfig: {
      findMany: jest.fn(),
    },
  },
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
  getTenantOperatingSnapshotFromRelated: jest.fn(),
}))

import { ComplianceSubmissionStatus, FiscalDocumentStatus } from "@prisma/client"

import { db } from "@/prisma/db"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

import { getComplianceCenterKernelSnapshot } from "../compliance-center.service"

const mockDb = db as unknown as {
  fiscalDocument: {
    count: jest.Mock
    findMany: jest.Mock
  }
  complianceSubmission: {
    count: jest.Mock
    findMany: jest.Mock
  }
  complianceAdapterConfig: {
    findMany: jest.Mock
  }
}

const mockGetCloseReadinessSnapshot = getCloseReadinessSnapshot as jest.Mock
const mockGetInventoryCashSnapshot = getInventoryCashSnapshot as jest.Mock
const mockGetPaymentTruthSnapshot = getPaymentTruthSnapshot as jest.Mock
const mockGetTenantOperatingSnapshotFromRelated = getTenantOperatingSnapshotFromRelated as jest.Mock

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("compliance center service", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockDb.fiscalDocument.count.mockResolvedValue(0)
    mockDb.complianceSubmission.count.mockResolvedValue(0)
    mockDb.fiscalDocument.findMany.mockResolvedValue([])
    mockDb.complianceSubmission.findMany.mockResolvedValue([])
    mockDb.complianceAdapterConfig.findMany.mockResolvedValue([
      {
        id: "adapter-config-1",
        countryCode: "CM",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        adapterKey: "CM_DGI_SANDBOX",
        environment: "SANDBOX",
        status: "ACTIVE",
        countryPackVersion: "CM-2026.1",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        credentialReference: "vault://org-1/cm-dgi-sandbox",
      },
    ])
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValue(tenantSnapshot())
  })

  it("redacts adapter credential references from dashboard snapshots", async () => {
    const snapshot = await getComplianceCenterKernelSnapshot({ organizationId: "org-1" })

    expect(snapshot.documentCounts).toHaveProperty(FiscalDocumentStatus.DRAFT, 0)
    expect(snapshot.submissionCounts).toHaveProperty(ComplianceSubmissionStatus.PENDING, 0)
    expect(snapshot.adapterConfigs).toEqual([
      {
        id: "adapter-config-1",
        countryCode: "CM",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        adapterKey: "CM_DGI_SANDBOX",
        environment: "SANDBOX",
        status: "ACTIVE",
        countryPackVersion: "CM-2026.1",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        credentialReferencePresent: true,
      },
    ])
    expect(snapshot.payrollForecastReadiness).toMatchObject({
      state: "READY",
      authoritative: true,
      upcomingStatutoryLiabilityAmount: 90000,
      action: { href: "/dashboard/payroll/register", requiredPermission: "payroll.runs.review" },
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(JSON.stringify(snapshot)).not.toContain("vault://")
    expect(JSON.stringify(snapshot)).not.toContain("cm-dgi-sandbox")
  })

  it("surfaces blocked payroll forecast proof with payroll-specific blockers", async () => {
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
    mockGetTenantOperatingSnapshotFromRelated.mockResolvedValueOnce(tenant)

    const snapshot = await getComplianceCenterKernelSnapshot({ organizationId: "org-1" })

    expect(snapshot.payrollForecastReadiness).toMatchObject({
      state: "BLOCKED",
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      upcomingStatutoryLiabilityAmount: 0,
      totalUpcomingAmount: 0,
      blockerCodes: ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING"],
      action: { href: "/dashboard/payroll/payments", requiredPermission: "payroll.payments.reconcile" },
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(snapshot.payrollForecastReadiness.blockers).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ gate: "close_readiness" })]),
    )
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
    sourceModules: ["dashboard", "payroll", "accounting", "finance"],
    metrics: {
      activeLocationCount: 1,
      completedSalesCount: 12,
      completedSalesRevenue: 250000,
      cashCollected: 180000,
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
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "reconciled",
    freshness: freshness(),
    sourceHash: "payment-hash",
    generatedAt,
    sourceModules: ["payments", "finance", "accounting"],
    metrics: paymentMetrics(overrides),
    blockers: [],
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

function paymentMetrics(overrides: Partial<PaymentTruthMetrics> = {}): PaymentTruthMetrics {
  return {
    providerAccountCount: 1,
    activeProviderAccountCount: 1,
    recentRunCount: 1,
    readyForSignoffCount: 0,
    signedRunCount: 0,
    openExceptionCount: 0,
    criticalExceptionCount: 0,
    openSuspenseCount: 0,
    openSuspenseAmount: 0,
    pendingTransactionCount: 0,
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
    zeroStockLevelCount: 0,
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
    openFindingCount: 0,
    criticalOpenFindingCount: 0,
    unavailableEvidenceCount: 0,
    ...overrides,
  }
}