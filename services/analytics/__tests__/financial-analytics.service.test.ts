jest.mock("server-only", () => ({}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

import {
  AccountingSourceType,
  LedgerPostingBatchStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  PayrollRunTransitionEvidenceStatus,
  PayrollRunTransitionOrigin,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

import { getFinancialMetricsReadModel } from "../financial-analytics.service"
import { getFinancialOrderActivity } from "../financial-order-activity.service"

const mockDb = db as any
const mockGetTenantOperatingSnapshot = getTenantOperatingSnapshot as jest.Mock

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function resetDbMocks() {
  mockDb.$transaction = jest.fn(async work => work(mockDb))
  mockDb.organization = { findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF", timezone: "Africa/Douala" }) }
  mockDb.location = { findFirst: jest.fn().mockResolvedValue({ id: "loc-1" }) }
  mockDb.salesOrder = { aggregate: jest.fn() }
  mockDb.inventoryLevel = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.cashDrawerTransaction = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.payrollRun = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.accountingSourceLink = { findMany: jest.fn().mockResolvedValue([]) }
}

function mockBaseFinancialReads(currentRevenue = "200000.00") {
  mockDb.salesOrder.aggregate
    .mockResolvedValueOnce({ _sum: { total: decimal(currentRevenue) }, _count: { _all: 1 } })
    .mockResolvedValueOnce({ _sum: { total: null }, _count: { _all: 0 } })
}

const periodInput = {
  organizationId: "org-1",
  locationId: "loc-1",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
}

describe("financial analytics source truth", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMocks()
    mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot())
  })

  it("separates exact order value from unavailable financial statements and assumptions", async () => {
    mockBaseFinancialReads("9007199254740991.93")
    const result = await getFinancialMetricsReadModel(periodInput)
    expect(result).toMatchObject({
      schemaVersion: "financial-metrics.v2",
      availability: { status: "PARTIAL" },
      orderActivity: { source: "CONFIRMED_ORDER_TOTALS", current: { value: "9007199254740991.93", count: 1 }, valueGrowthPercent: null },
      payrollBasis: { periodSelection: "OVERLAPPING_PAYROLL_PERIODS", forecastScope: "TENANT_AGGREGATE", financialStatementsCertified: false },
      revenue: { total: null, forecast: null, target: null, recurring: null },
      expenses: { cogs: null, salaries: null, rent: null },
      assets: { fixedAssets: null, cash: null, inventory: null },
      liabilities: { loans: null },
      cashFlow: { investing: null, financing: null, cashOnHand: null },
      taxes: { salesTax: null, incomeTax: null, taxRate: null },
    })
    expect(mockDb.inventoryLevel.findMany).not.toHaveBeenCalled()
    expect(mockDb.cashDrawerTransaction.findMany).not.toHaveBeenCalled()
  })

  it("reports genuine zero order activity without inventing zero financial balances", async () => {
    mockDb.salesOrder.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } })
    const result = await getFinancialMetricsReadModel(periodInput)
    expect(result.orderActivity.current).toMatchObject({ value: "0.00", count: 0 })
    expect(result.orderActivity.valueGrowthPercent).toBeNull()
    expect(result.assets.cash).toBeNull()
    expect(result.taxes.totalTaxLiability).toBeNull()
  })

  it("compares adjacent calendar periods without overlap on a 23-hour day", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", currency: "EUR", timezone: "Europe/Paris" })
    mockDb.salesOrder.aggregate
      .mockResolvedValueOnce({ _sum: { total: decimal("30.00") }, _count: { _all: 2 } })
      .mockResolvedValueOnce({ _sum: { total: decimal("20.00") }, _count: { _all: 1 } })
    const result = await getFinancialOrderActivity({ ...periodInput, startDate: new Date("2026-03-29T00:00:00Z"), endDate: new Date("2026-03-29T00:00:00Z") })
    expect(result.current).toMatchObject({ periodStart: "2026-03-28T23:00:00.000Z", periodEndExclusive: "2026-03-29T22:00:00.000Z" })
    expect(result.previous).toMatchObject({ periodStart: "2026-03-27T23:00:00.000Z", periodEndExclusive: result.current.periodStart })
    expect(result.valueGrowthPercent).toBe("50.00")
    expect(mockDb.salesOrder.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", locationId: "loc-1", orderDate: { gte: new Date(result.current.periodStart), lt: new Date(result.current.periodEndExclusive) } }) }))
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  })

  it("scopes all-location reporting by tenant and validates specific locations", async () => {
    mockBaseFinancialReads()
    const all = await getFinancialOrderActivity({ ...periodInput, locationId: " ALL " })
    expect(all.context.scope).toEqual({ kind: "ORGANIZATION", locationId: null })
    expect(mockDb.salesOrder.aggregate.mock.calls[0][0].where).toMatchObject({ organizationId: "org-1" })
    expect(mockDb.salesOrder.aggregate.mock.calls[0][0].where).not.toHaveProperty("locationId")
    expect(mockDb.location.findFirst).not.toHaveBeenCalled()
    mockDb.salesOrder.aggregate.mockClear()
    mockDb.location.findFirst.mockResolvedValue(null)
    await expect(getFinancialOrderActivity(periodInput)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockDb.location.findFirst).toHaveBeenCalledWith({ where: { id: "loc-1", organizationId: "org-1" }, select: { id: true } })
    expect(mockDb.salesOrder.aggregate).not.toHaveBeenCalled()
  })

  it("rejects a missing organization before any report or payroll read", async () => {
    mockDb.organization.findFirst.mockResolvedValue(null)
    await expect(getFinancialMetricsReadModel(periodInput)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockDb.salesOrder.aggregate).not.toHaveBeenCalled()
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
    expect(mockGetTenantOperatingSnapshot).not.toHaveBeenCalled()
  })

  it.each([
    { locationId: "" },
    { startDate: new Date("invalid") },
    { endDate: new Date("2026-05-01T00:00:00Z") },
  ])("rejects invalid scope before database reads: %s", async invalid => {
    await expect(getFinancialOrderActivity({ ...periodInput, ...invalid })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("preserves query failure and unavailable nonempty aggregates as errors", async () => {
    mockDb.salesOrder.aggregate.mockRejectedValue(new Error("database unavailable"))
    await expect(getFinancialMetricsReadModel(periodInput)).rejects.toThrow("database unavailable")
    mockDb.salesOrder.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 1 } })
    await expect(getFinancialMetricsReadModel(periodInput)).rejects.toThrow("Order value is unavailable")
    expect(mockGetTenantOperatingSnapshot).not.toHaveBeenCalled()
  })
})

const completeEffectiveComponentSnapshot = {
  payrollRubriqueGrossAmount: "0.00",
  payrollRubriqueTaxableBaseAmount: "0.00",
  payrollRubriqueSocialBaseAmount: "0.00",
  payrollRubriqueEmployeeDeductionAmount: "0.00",
  payrollRubriqueEmployerChargeAmount: "0.00",
  overtimeMinutes: 0,
  leaveMinutes: 0,
}

function runtimeTransition(toStatus: PayrollRunStatus, fromVersion: number) {
  return {
    toStatus,
    fromVersion,
    toVersion: fromVersion + 1,
    actorId: "payroll-actor",
    transitionedAt: new Date("2026-06-15T10:00:00.000Z"),
    businessEventId: "event-" + toStatus,
    origin: PayrollRunTransitionOrigin.RUNTIME,
    evidenceStatus: PayrollRunTransitionEvidenceStatus.VERIFIED,
  }
}

const completeRuntimeTransitionEvidence = [
  runtimeTransition(PayrollRunStatus.REVIEWED, 1),
  runtimeTransition(PayrollRunStatus.APPROVED, 2),
  runtimeTransition(PayrollRunStatus.EMITTED, 3),
  runtimeTransition(PayrollRunStatus.POSTED, 4),
]

function payrollForecastMetrics(overrides: Record<string, unknown> = {}) {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message: "Upcoming payroll net-pay and statutory-liability forecasts are sourced from posted payroll evidence.",
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
    periodStart: periodInput.startDate.toISOString(),
    periodEnd: periodInput.endDate.toISOString(),
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
    sourceHash: "sha256:tenant-operating-payroll-forecast",
    generatedAt: "2026-06-15T12:00:00.000Z",
    sourceModules: ["payroll", "payments", "accounting", "finance", "analytics"],
    metrics: {
      payrollFinanceForecast: payrollForecastMetrics(),
    },
    blockers: [],
    redactions: [],
    ...overrides,
  }
}
describe("financial analytics payroll facts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMocks()
    mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot())
  })

  it("does not fall back to revenue-based salary or payroll-tax estimates when payroll evidence is missing", async () => {
    mockBaseFinancialReads("100000.00")
    mockDb.payrollRun.findMany.mockResolvedValue([])

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["EMPLOYEE_SALARY_READ"],
    })

    expect(result.expenses.salaries).toBeNull()
    expect(result.taxes.payrollTax).toBeNull()
    expect(result.payrollEvidence).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      reasonCode: "PAYROLL_REGISTER_FACTS_MISSING",
      blockerCodes: ["PAYROLL_REGISTER_FACTS_MISSING"],
    })
    expect(result.payrollForecast).toMatchObject({
      status: "AUTHORITATIVE",
      authoritative: true,
      scope: "TENANT_AGGREGATE",
      locationAllocated: false,
      totalUpcomingAmount: 170000,
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
      personLevelAmountsRedacted: true,
    })
    expect(mockDb.accountingSourceLink.findMany).not.toHaveBeenCalled()
  })

  it("uses payroll register line amounts only when ledger source links and payment evidence are complete", async () => {
    mockBaseFinancialReads()
    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        status: PayrollRunStatus.POSTED,
        transitions: completeRuntimeTransitionEvidence,
        ledgerPostingBatchId: "ledger-run-1",
        postedBusinessEventId: "event-run-1",
        paymentBatches: [
          {
            id: "payment-batch-1",
            evidenceHash: "hash-payment",
            ledgerPostingBatchId: "ledger-payment-1",
            postedBusinessEventId: "event-payment-1",
          },
        ],
        lines: [
          {
            id: "line-1",
            grossAmount: decimal("150000.00"),
            employerChargeAmount: decimal("18300.00"),
            employeeDeductionAmount: decimal("6300.00"),
            netPayableAmount: decimal("143700.00"),
            calculationSnapshot: completeEffectiveComponentSnapshot,
            employee: { locationId: "loc-1" },
            payslip: {
              id: "payslip-1",
              status: PayrollPayslipStatus.EMITTED,
              documentHash: "hash-payslip",
              grossAmount: decimal("150000.00"),
              employerChargeAmount: decimal("18300.00"),
              employeeDeductionAmount: decimal("6300.00"),
              netPayableAmount: decimal("143700.00"),
              paymentAllocations: [
                {
                  id: "allocation-1",
                  amount: decimal("143700.00"),
                  payrollPaymentBatchId: "payment-batch-1",
                  payrollPaymentBatch: {
                    id: "payment-batch-1",
                    status: PayrollPaymentBatchStatus.RELEASED,
                    evidenceHash: "hash-payment",
                    bankFileHash: "hash-bank-file",
                    ledgerPostingBatchId: "ledger-payment-1",
                    postedBusinessEventId: "event-payment-1",
                  },
                },
              ],
            },
          },
        ],
      },
    ])
    mockDb.accountingSourceLink.findMany.mockResolvedValue([
      {
        id: "link-run-1",
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: "run-1",
        postingBatch: { status: LedgerPostingBatchStatus.POSTED },
      },
      {
        id: "link-payment-1",
        sourceType: AccountingSourceType.PAYROLL_PAYMENT,
        sourceId: "payment-batch-1",
        postingBatch: { status: LedgerPostingBatchStatus.POSTED },
      },
    ])

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["EMPLOYEE_SALARY_READ"],
    })

    expect(result.expenses.salaries).toBe(150000)
    expect(result.taxes.payrollTax).toBe(18300)
    expect(result.payrollEvidence).toMatchObject({
      status: "AUTHORITATIVE",
      authoritative: true,
      reasonCode: "PAYROLL_FINANCE_FACTS_SOURCE_LINKED",
      runCount: 1,
      lineCount: 1,
      paymentBatchCount: 1,
      sourceLinkCount: 2,
      evidenceHashCount: 1,
      blockerCodes: [],
    })
  })

  it.each([
    [
      "missing post-cutover",
      completeRuntimeTransitionEvidence.slice(0, 3),
      "PAYROLL_TRANSITION_PROOF_MISSING",
    ],
    [
      "legacy partial",
      [
        {
          ...runtimeTransition(PayrollRunStatus.POSTED, 4),
          fromVersion: null,
          toVersion: null,
          actorId: null,
          transitionedAt: null,
          businessEventId: null,
          origin: PayrollRunTransitionOrigin.LEGACY_BACKFILL,
          evidenceStatus:
            PayrollRunTransitionEvidenceStatus.LEGACY_PARTIAL_EVIDENCE,
        },
      ],
      "PAYROLL_TRANSITION_LEGACY_PARTIAL_EVIDENCE",
    ],
  ])(
    "omits payroll finance facts when transition evidence is %s",
    async (_case, transitions, expectedBlocker) => {
      mockBaseFinancialReads()
      mockDb.payrollRun.findMany.mockResolvedValue([
        {
          id: "run-transition-proof",
          status: PayrollRunStatus.POSTED,
          transitions,
          ledgerPostingBatchId: "ledger-run-transition-proof",
          postedBusinessEventId: "event-run-transition-proof",
          paymentBatches: [],
          lines: [],
        },
      ])
      mockDb.accountingSourceLink.findMany.mockResolvedValue([
        {
          id: "link-run-transition-proof",
          sourceType: AccountingSourceType.PAYROLL_RUN,
          sourceId: "run-transition-proof",
          postingBatch: { status: LedgerPostingBatchStatus.POSTED },
        },
      ])

      const result = await getFinancialMetricsReadModel({
        ...periodInput,
        actorPermissions: ["EMPLOYEE_SALARY_READ"],
      })

      expect(mockDb.payrollRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
          include: expect.objectContaining({
            transitions: expect.objectContaining({
              select: expect.objectContaining({ businessEventId: true }),
            }),
          }),
        }),
      )
      expect(result.expenses.salaries).toBeNull()
      expect(result.taxes.payrollTax).toBeNull()
      expect(result.payrollEvidence).toMatchObject({
        status: "NON_AUTHORITATIVE",
        authoritative: false,
        reasonCode: "PAYROLL_EVIDENCE_INCOMPLETE",
        blockerCodes: expect.arrayContaining([expectedBlocker]),
      })
    },
  )

  it("omits payroll finance facts when effective component proof is incomplete", async () => {
    mockBaseFinancialReads()
    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        status: PayrollRunStatus.POSTED,
        transitions: completeRuntimeTransitionEvidence,
        ledgerPostingBatchId: "ledger-run-1",
        postedBusinessEventId: "event-run-1",
        paymentBatches: [
          {
            id: "payment-batch-1",
            evidenceHash: "hash-payment",
            ledgerPostingBatchId: "ledger-payment-1",
            postedBusinessEventId: "event-payment-1",
          },
        ],
        lines: [
          {
            id: "line-1",
            grossAmount: decimal("150000.00"),
            employerChargeAmount: decimal("18300.00"),
            employeeDeductionAmount: decimal("6300.00"),
            netPayableAmount: decimal("143700.00"),
            calculationSnapshot: {
              payrollRubriqueGrossAmount: "25000.00",
            },
            employee: { locationId: "loc-1" },
            payslip: {
              id: "payslip-1",
              status: PayrollPayslipStatus.EMITTED,
              documentHash: "hash-payslip",
              grossAmount: decimal("150000.00"),
              employerChargeAmount: decimal("18300.00"),
              employeeDeductionAmount: decimal("6300.00"),
              netPayableAmount: decimal("143700.00"),
              paymentAllocations: [
                {
                  id: "allocation-1",
                  amount: decimal("143700.00"),
                  payrollPaymentBatchId: "payment-batch-1",
                  payrollPaymentBatch: {
                    id: "payment-batch-1",
                    status: PayrollPaymentBatchStatus.RELEASED,
                    evidenceHash: "hash-payment",
                    bankFileHash: "hash-bank-file",
                    ledgerPostingBatchId: "ledger-payment-1",
                    postedBusinessEventId: "event-payment-1",
                  },
                },
              ],
            },
          },
        ],
      },
    ])
    mockDb.accountingSourceLink.findMany.mockResolvedValue([
      {
        id: "link-run-1",
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: "run-1",
        postingBatch: { status: LedgerPostingBatchStatus.POSTED },
      },
      {
        id: "link-payment-1",
        sourceType: AccountingSourceType.PAYROLL_PAYMENT,
        sourceId: "payment-batch-1",
        postingBatch: { status: LedgerPostingBatchStatus.POSTED },
      },
    ])

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["EMPLOYEE_SALARY_READ"],
    })

    expect(result.expenses.salaries).toBeNull()
    expect(result.taxes.payrollTax).toBeNull()
    expect(result.payrollEvidence).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      reasonCode: "PAYROLL_EVIDENCE_INCOMPLETE",
      blockerCodes: ["PAYROLL_EFFECTIVE_COMPONENT_PROOF_MISSING"],
    })
  })

  it("surfaces blocked payroll forecast proof for finance cash planning without payroll row fallback", async () => {
    mockBaseFinancialReads("100000.00")
    mockGetTenantOperatingSnapshot.mockResolvedValue(tenantOperatingSnapshot({
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        payrollFinanceForecast: payrollForecastMetrics({
          status: "NON_AUTHORITATIVE",
          authoritative: false,
          reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
          message: "Upcoming payroll finance forecasts are withheld because declaration proof is incomplete.",
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

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["reports.read"],
    })

    expect(result.payrollForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
      totalUpcomingAmount: 0,
      actionHref: "/dashboard/payroll/declarations",
      blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
  })

  it("withholds payroll forecast cash planning when the payroll module is not entitled", async () => {
    mockBaseFinancialReads("100000.00")

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["reports.read"],
      payrollModuleDecision: {
        moduleSlug: "payroll",
        wouldBlock: true,
        reason: "Payroll module is disabled.",
      } as any,
    })

    expect(result.payrollForecast).toMatchObject({
      status: "REDACTED",
      redacted: true,
      reasonCode: "PAYROLL_MODULE_NOT_ENTITLED",
      totalUpcomingAmount: null,
      blockerCodes: ["PAYROLL_FORECAST_MODULE_NOT_ENTITLED"],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(mockGetTenantOperatingSnapshot).not.toHaveBeenCalled()
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
  })
  it("redacts payroll finance facts before reading payroll rows when the actor lacks payroll amount permission", async () => {
    mockBaseFinancialReads("100000.00")

    const result = await getFinancialMetricsReadModel({
      ...periodInput,
      actorPermissions: ["reports.read"],
    })

    expect(result.expenses.salaries).toBeNull()
    expect(result.taxes.payrollTax).toBeNull()
    expect(result.payrollEvidence).toMatchObject({
      status: "REDACTED",
      redacted: true,
      reasonCode: "MISSING_PERMISSION",
      blockerCodes: ["PAYROLL_FINANCE_FACTS_REDACTED"],
    })
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
  })
})
