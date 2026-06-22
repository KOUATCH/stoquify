jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    location: { count: jest.fn(), findFirst: jest.fn() },
    salesOrder: { aggregate: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    payment: { aggregate: jest.fn(), findFirst: jest.fn() },
    purchaseOrder: { count: jest.fn(), findFirst: jest.fn() },
    payrollRun: { count: jest.fn(), findFirst: jest.fn() },
    journalEntry: { count: jest.fn(), findFirst: jest.fn() },
    accountingSourceLink: { count: jest.fn(), findFirst: jest.fn() },
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
  payrollRun: { count: jest.Mock; findFirst: jest.Mock }
  journalEntry: { count: jest.Mock; findFirst: jest.Mock }
  accountingSourceLink: { count: jest.Mock; findFirst: jest.Mock }
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
})

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
  mockDb.payrollRun.count.mockResolvedValue(1)
  mockDb.journalEntry.count.mockResolvedValue(2)
  mockDb.accountingSourceLink.count.mockResolvedValue(2)
  mockDb.location.findFirst.mockResolvedValue(null)
  mockDb.salesOrder.findFirst.mockResolvedValue(null)
  mockDb.payment.findFirst.mockResolvedValue(null)
  mockDb.purchaseOrder.findFirst.mockResolvedValue(null)
  mockDb.payrollRun.findFirst.mockResolvedValue(null)
  mockDb.journalEntry.findFirst.mockResolvedValue(null)
  mockDb.accountingSourceLink.findFirst.mockResolvedValue(null)
}
