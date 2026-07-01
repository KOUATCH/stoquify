jest.mock("@/prisma/db", () => ({
  db: {
    organization: { findFirst: jest.fn() },
    location: { findMany: jest.fn() },
    salesOrder: { findMany: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
    paymentRefund: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    supplier: { findMany: jest.fn() },
    cashDrawer: { findMany: jest.fn() },
  },
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

import { db } from "@/prisma/db"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

import { getFinanceDashboard } from "../finance-dashboard.service"

const mockDb = db as any
const mockGetTenantOperatingSnapshot = getTenantOperatingSnapshot as jest.Mock

function resetFinanceMocks() {
  mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", name: "Demo OHADA SMB", currency: "XAF" })
  mockDb.location.findMany.mockResolvedValue([{ id: "loc-1", name: "Main", code: "MAIN" }])
  mockDb.salesOrder.findMany.mockResolvedValue([])
  mockDb.purchaseOrder.findMany.mockResolvedValue([])
  mockDb.expense.findMany.mockResolvedValue([])
  mockDb.payment.findMany.mockResolvedValue([])
  mockDb.paymentRefund.findMany.mockResolvedValue([])
  mockDb.customer.findMany.mockResolvedValue([])
  mockDb.supplier.findMany.mockResolvedValue([])
  mockDb.cashDrawer.findMany.mockResolvedValue([])
  mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot())
}

function payrollForecastMetrics(overrides: Record<string, unknown> = {}) {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message: "Upcoming payroll obligations are backed by payroll, payment, declaration, and ledger proof.",
    horizonStart: "2026-06-01T00:00:00.000Z",
    horizonEnd: "2026-06-30T23:59:59.999Z",
    upcomingNetPayAmount: 125000,
    upcomingStatutoryLiabilityAmount: 45000,
    totalUpcomingAmount: 170000,
    payrollPeriodCount: 1,
    payrollRunCount: 1,
    paymentBatchCount: 1,
    declarationCount: 1,
    sourceLinkCount: 2,
    evidenceHashCount: 4,
    nextPayDate: "2026-06-25T00:00:00.000Z",
    nextDeclarationDueDate: "2026-06-28T00:00:00.000Z",
    personLevelAmountsRedacted: true,
    blockerCodes: [],
    ...overrides,
  }
}

function tenantOperatingSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "posted",
    freshness: {
      generatedAt: "2026-06-15T12:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-15T11:00:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "sha256:tenant-payroll-forecast",
    generatedAt: "2026-06-15T12:00:00.000Z",
    sourceModules: ["payroll", "payments", "accounting", "finance"],
    metrics: {
      payrollFinanceForecast: payrollForecastMetrics(),
    },
    blockers: [],
    redactions: [],
    ...overrides,
  }
}

describe("finance dashboard payroll forecast proof", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetFinanceMocks()
  })

  it("surfaces authoritative aggregate payroll forecast proof for finance cash planning", async () => {
    const result = await getFinanceDashboard({ organizationId: "org-1", view: "cash-flow", period: "mtd" })

    expect(result.payrollForecast).toMatchObject({
      status: "AUTHORITATIVE",
      authoritative: true,
      scope: "TENANT_AGGREGATE",
      locationAllocated: false,
      totalUpcomingAmount: 170000,
      sourceHash: "sha256:tenant-payroll-forecast",
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
      personLevelAmountsRedacted: true,
    })
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_FORECAST_PROOF",
          severity: "info",
          amount: 170000,
          actionHref: "/dashboard/payroll/payments",
          redactionCount: 1,
        }),
      ]),
    )
    expect(mockGetTenantOperatingSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1" }),
    )
  })

  it("keeps blocked declaration proof specific and routes finance action to payroll declarations", async () => {
    mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot({
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        payrollFinanceForecast: payrollForecastMetrics({
          status: "NON_AUTHORITATIVE",
          authoritative: false,
          reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
          message: "Upcoming payroll obligations are withheld because declaration proof is incomplete.",
          upcomingNetPayAmount: 0,
          upcomingStatutoryLiabilityAmount: 0,
          totalUpcomingAmount: 0,
          blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
        }),
      },
      blockers: [
        {
          id: "tenant-payroll-finance-forecast-declaration-proof-missing",
          severity: "high",
          gate: "payroll_finance_forecast",
          title: "Payroll declaration proof is missing",
          detail: "Upcoming statutory liability is withheld until declaration evidence is complete.",
          sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
          nextAction: "Open payroll declarations and attach source-register-backed declaration evidence.",
        },
      ],
    }))

    const result = await getFinanceDashboard({ organizationId: "org-1", view: "cash-flow", period: "mtd" })

    expect(result.payrollForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
      actionHref: "/dashboard/payroll/declarations",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
    })
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_FORECAST_PROOF",
          severity: "warning",
          actionHref: "/dashboard/payroll/declarations",
          blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
        }),
      ]),
    )
  })

  it("withholds payroll forecast proof before snapshot reads when payroll module is not entitled", async () => {
    const result = await getFinanceDashboard({
      organizationId: "org-1",
      view: "cash-flow",
      period: "mtd",
      payrollModuleDecision: { wouldBlock: true } as any,
    })

    expect(result.payrollForecast).toMatchObject({
      status: "REDACTED",
      redacted: true,
      reasonCode: "PAYROLL_MODULE_NOT_ENTITLED",
      totalUpcomingAmount: 0,
      blockerCodes: ["PAYROLL_FORECAST_MODULE_NOT_ENTITLED"],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(mockGetTenantOperatingSnapshot).not.toHaveBeenCalled()
  })
})
