jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    location: { count: jest.fn(), findFirst: jest.fn() },
    salesOrder: { aggregate: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    payment: { aggregate: jest.fn(), findFirst: jest.fn() },
    purchaseOrder: { count: jest.fn(), findFirst: jest.fn() },
    payrollPeriod: { findMany: jest.fn() },
    payrollRun: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    payrollEmployeeBalanceCase: { count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
    payrollEmployeeBalanceEvent: { count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
    journalEntry: { count: jest.fn(), findFirst: jest.fn() },
    accountingSourceLink: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    workflowAssuranceIncident: { count: jest.fn(), findFirst: jest.fn() },
  },
}))

jest.mock("../payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))

jest.mock("../inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))

jest.mock("../close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))

import { db } from "@/prisma/db"

import { getCloseReadinessSnapshot } from "../close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "../inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "../payment-truth-snapshot.service"
import { getTenantOperatingSnapshot } from "../tenant-operating-snapshot.service"

const mockDb = db as unknown as {
  location: { count: jest.Mock; findFirst: jest.Mock }
  salesOrder: { aggregate: jest.Mock; count: jest.Mock; findFirst: jest.Mock }
  payment: { aggregate: jest.Mock; findFirst: jest.Mock }
  purchaseOrder: { count: jest.Mock; findFirst: jest.Mock }
  payrollPeriod: { findMany: jest.Mock }
  payrollRun: { count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  payrollEmployeeBalanceCase: { count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock }
  payrollEmployeeBalanceEvent: { count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock }
  journalEntry: { count: jest.Mock; findFirst: jest.Mock }
  accountingSourceLink: { count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  workflowAssuranceIncident: { count: jest.Mock; findFirst: jest.Mock }
}
const mockPaymentTruth = getPaymentTruthSnapshot as jest.Mock
const mockInventoryCash = getInventoryCashSnapshot as jest.Mock
const mockCloseReadiness = getCloseReadinessSnapshot as jest.Mock

describe("tenant operating snapshot service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks operating BI when unresolved ledger assurance incidents exist", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.workflowAssuranceIncident.count.mockResolvedValue(1)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue({
      id: "incident-ledger-1",
      checkKey: "ledger.journal_entry.balanced",
      title: "Posted journal entries are not balanced",
      severity: "BLOCKING",
      status: "OPEN",
      actionRoute: "/dashboard/accounting/reports/trial-balance",
      updatedAt: new Date("2026-06-21T09:00:00.000Z"),
    })

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(mockDb.workflowAssuranceIncident.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: { in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"] },
          severity: { in: ["HIGH", "BLOCKING", "COMPLIANCE_CRITICAL"] },
          workflow: { in: ["LEDGER", "BUSINESS_EVENT", "COMPLIANCE"] },
        }),
      }),
    )
    expect(result.status).toBe("blocked")
    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tenant-ledger-trust-assurance-incidents",
          severity: "critical",
          gate: "workflow_assurance",
        }),
      ]),
    )
  })

  it("exposes employee balance recovery metrics and blocks tenant truth while active cases remain", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollEmployeeBalanceCase.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
    mockDb.payrollEmployeeBalanceCase.aggregate.mockResolvedValue({ _sum: { outstandingAmount: 27500 } })
    mockDb.payrollEmployeeBalanceEvent.count.mockResolvedValue(3)
    mockDb.payrollEmployeeBalanceEvent.aggregate.mockResolvedValue({ _sum: { amount: 12500 } })
    mockDb.payrollEmployeeBalanceCase.findFirst.mockResolvedValue({
      updatedAt: new Date("2026-06-21T08:30:00.000Z"),
    })
    mockDb.payrollEmployeeBalanceEvent.findFirst.mockResolvedValue({
      createdAt: new Date("2026-06-21T08:45:00.000Z"),
    })

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(mockDb.payrollEmployeeBalanceCase.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: { in: ["OPEN", "PARTIALLY_SETTLED"] },
        }),
      }),
    )
    expect(mockDb.payrollEmployeeBalanceEvent.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          eventType: { in: ["SETTLE_CASH", "SETTLE_BANK", "SETTLE_MOBILE_MONEY", "SETTLE_DEDUCTION", "REFUND_PAYMENT"] },
        }),
        _sum: { amount: true },
      }),
    )
    expect(result.metrics).toMatchObject({
      activeEmployeeBalanceCaseCount: 2,
      openEmployeeBalanceCaseCount: 1,
      partiallySettledEmployeeBalanceCaseCount: 1,
      employeeBalanceOutstandingAmount: 27500,
      periodEmployeeBalanceSettlementCount: 3,
      periodEmployeeBalanceSettlementAmount: 12500,
    })
    expect(result.status).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tenant-payroll-employee-balance-open",
          severity: "high",
          gate: "payroll_employee_balance",
        }),
      ]),
    )
  })
  it("exposes authoritative aggregate payroll finance forecasts from source-linked evidence", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod()])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-07-31",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(mockDb.payrollPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          payDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      }),
    )
    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "AUTHORITATIVE",
      authoritative: true,
      upcomingNetPayAmount: 350000,
      upcomingStatutoryLiabilityAmount: 90000,
      totalUpcomingAmount: 440000,
      paymentBatchCount: 1,
      declarationCount: 1,
      sourceLinkCount: 2,
      personLevelAmountsRedacted: true,
      blockerCodes: [],
    })
  })

  it("fails closed when payroll declaration proof is missing", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([
      forecastPeriod({
        declarations: [forecastDeclaration({ evidenceItems: [], payloadHash: null })],
      }),
    ])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-07-31",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      upcomingNetPayAmount: 0,
      upcomingStatutoryLiabilityAmount: 0,
      totalUpcomingAmount: 0,
      blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
      personLevelAmountsRedacted: true,
    })
    expect(result.status).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gate: "payroll_finance_forecast",
          title: "Payroll declaration proof is missing",
        }),
      ]),
    )
  })
})

function forecastPeriod(overrides: Record<string, unknown> = {}) {
  const declarations = (overrides.declarations as unknown[]) ?? [forecastDeclaration()]
  return {
    id: "period-forecast-1",
    payDate: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-20T08:00:00.000Z"),
    runs: [
      {
        id: "run-forecast-1",
        ledgerPostingBatchId: "ledger-run-1",
        postedBusinessEventId: "event-run-1",
        netPayableAmount: 350000,
        employerChargeAmount: 90000,
        updatedAt: new Date("2026-06-20T08:05:00.000Z"),
        payrollPeriod: {
          id: "period-forecast-1",
          name: "June 2026",
          periodStart: new Date("2026-06-01T00:00:00.000Z"),
          periodEnd: new Date("2026-06-30T23:59:59.999Z"),
          payDate: new Date("2026-06-30T00:00:00.000Z"),
          updatedAt: new Date("2026-06-20T08:00:00.000Z"),
        },
        paymentBatches: [forecastPaymentBatch()],
        declarations,
      },
    ],
    ...overrides,
  }
}

function forecastPaymentBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-batch-forecast-1",
    status: "RELEASED",
    amount: 350000,
    paymentDate: new Date("2026-06-30T00:00:00.000Z"),
    evidenceHash: "sha256:payment-evidence",
    bankFileHash: "sha256:bank-file",
    documentHash: "sha256:payment-document",
    ledgerPostingBatchId: "ledger-payment-1",
    postedBusinessEventId: "event-payment-1",
    updatedAt: new Date("2026-06-20T08:10:00.000Z"),
    ...overrides,
  }
}

function forecastDeclaration(overrides: Record<string, unknown> = {}) {
  return {
    id: "declaration-forecast-1",
    status: "PAYMENT_DUE",
    amount: 90000,
    dueDate: new Date("2026-07-15T00:00:00.000Z"),
    payloadHash: "sha256:declaration-payload",
    countryPackResolutionHash: "sha256:country-pack",
    updatedAt: new Date("2026-06-20T08:15:00.000Z"),
    evidenceItems: [
      {
        evidenceHash: "sha256:declaration-evidence",
        sourceRegisterHash: "sha256:register",
        countryPackResolutionHash: "sha256:country-pack",
        authorityResponseHash: "sha256:authority-response",
        portalReceiptHash: "sha256:portal-receipt",
        supportingFileHash: "sha256:supporting-file",
        createdAt: new Date("2026-06-20T08:20:00.000Z"),
      },
    ],
    ...overrides,
  }
}

function forecastSourceLinks() {
  return [
    {
      id: "source-link-run-1",
      sourceType: "PAYROLL_RUN",
      sourceId: "run-forecast-1",
      createdAt: new Date("2026-06-20T08:25:00.000Z"),
      postingBatch: { status: "POSTED" },
    },
    {
      id: "source-link-payment-1",
      sourceType: "PAYROLL_PAYMENT",
      sourceId: "payment-batch-forecast-1",
      createdAt: new Date("2026-06-20T08:30:00.000Z"),
      postingBatch: { status: "POSTED" },
    },
  ]
}
function setupChildSnapshots() {
  mockPaymentTruth.mockResolvedValue({
    status: "fresh",
    evidenceGrade: "reconciled",
    metrics: {
      providerAccountCount: 1,
      activeProviderAccountCount: 1,
      recentRunCount: 1,
      readyForSignoffCount: 0,
      signedRunCount: 1,
      openExceptionCount: 0,
      criticalExceptionCount: 0,
      openSuspenseCount: 0,
      openSuspenseAmount: 0,
      pendingTransactionCount: 0,
    },
    blockers: [],
    redactions: [],
    freshness: { sourceMaxUpdatedAt: null },
    sourceHash: "sha256:payment-truth",
  })
  mockInventoryCash.mockResolvedValue({
    status: "fresh",
    evidenceGrade: "operational",
    metrics: {
      trackedItemCount: 3,
      inventoryLevelCount: 3,
      quantityOnHand: 12,
      quantityAvailable: 10,
      quantityReserved: 1,
      quantityInTransit: 0,
      quantityOnOrder: 2,
      inventoryValue: 5000,
      zeroStockLevelCount: 0,
      negativeStockLevelCount: 0,
      periodTransactionCount: 4,
      periodAdjustmentCount: 0,
      periodTransferCount: 0,
    },
    blockers: [],
    redactions: [],
    freshness: { sourceMaxUpdatedAt: null },
    sourceHash: "sha256:inventory-cash",
  })
  mockCloseReadiness.mockResolvedValue({
    status: "fresh",
    evidenceGrade: "posted",
    metrics: {
      accountingPeriodCount: 1,
      openPeriodCount: 1,
      lockedOrClosedPeriodCount: 0,
      recentCloseRunCount: 0,
      blockedCloseRunCount: 0,
      unresolvedCloseFindingCount: 0,
      highCloseFindingCount: 0,
      pendingReviewCount: 0,
      recentExportCount: 0,
    },
    blockers: [],
    redactions: [],
    freshness: { sourceMaxUpdatedAt: null },
    sourceHash: "sha256:close-readiness",
  })
}

function setupTenantData() {
  mockDb.location.count.mockResolvedValue(1)
  mockDb.salesOrder.aggregate.mockResolvedValue({ _sum: { total: 25000 } })
  mockDb.salesOrder.count.mockResolvedValue(4)
  mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount: 18000 } })
  mockDb.purchaseOrder.count.mockResolvedValue(1)
  mockDb.payrollPeriod.findMany.mockResolvedValue([])
  mockDb.payrollRun.count.mockResolvedValue(1)
  mockDb.payrollRun.findMany.mockResolvedValue([])
  mockDb.payrollEmployeeBalanceCase.count.mockResolvedValue(0)
  mockDb.payrollEmployeeBalanceCase.aggregate.mockResolvedValue({ _sum: { outstandingAmount: 0 } })
  mockDb.payrollEmployeeBalanceEvent.count.mockResolvedValue(0)
  mockDb.payrollEmployeeBalanceEvent.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
  mockDb.journalEntry.count.mockResolvedValue(2)
  mockDb.accountingSourceLink.count.mockResolvedValue(2)
  mockDb.location.findFirst.mockResolvedValue(null)
  mockDb.salesOrder.findFirst.mockResolvedValue(null)
  mockDb.payment.findFirst.mockResolvedValue(null)
  mockDb.purchaseOrder.findFirst.mockResolvedValue(null)
  mockDb.payrollRun.findFirst.mockResolvedValue(null)
  mockDb.payrollEmployeeBalanceCase.findFirst.mockResolvedValue(null)
  mockDb.payrollEmployeeBalanceEvent.findFirst.mockResolvedValue(null)
  mockDb.journalEntry.findFirst.mockResolvedValue(null)
  mockDb.accountingSourceLink.findFirst.mockResolvedValue(null)
  mockDb.accountingSourceLink.findMany.mockResolvedValue([])
  mockDb.workflowAssuranceIncident.count.mockResolvedValue(0)
  mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)
}
