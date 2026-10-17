jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    organization: { findFirst: jest.fn() },
    location: { count: jest.fn(), findFirst: jest.fn() },
    salesOrder: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: { aggregate: jest.fn(), findFirst: jest.fn() },
    purchaseOrder: { count: jest.fn(), findFirst: jest.fn() },
    payrollPeriod: { findMany: jest.fn() },
    businessEvent: { findMany: jest.fn().mockResolvedValue([]) },
    payrollRun: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    payrollEmployeeBalanceCase: {
      groupBy: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
    payrollEmployeeBalanceEvent: {
      groupBy: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
    journalEntry: { count: jest.fn(), findFirst: jest.fn() },
    accountingSourceLink: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
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
import {
  getTenantOperatingSnapshot,
  getTenantOperatingSnapshotFromRelated,
} from "../tenant-operating-snapshot.service"

const mockDb = db as unknown as {
  organization: { findFirst: jest.Mock }
  location: { count: jest.Mock; findFirst: jest.Mock }
  salesOrder: { aggregate: jest.Mock; count: jest.Mock; findFirst: jest.Mock }
  payment: { aggregate: jest.Mock; findFirst: jest.Mock }
  purchaseOrder: { count: jest.Mock; findFirst: jest.Mock }
  payrollPeriod: { findMany: jest.Mock }
  businessEvent: { findMany: jest.Mock }
  payrollRun: { count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  payrollEmployeeBalanceCase: {
    groupBy: jest.Mock
    count: jest.Mock
    aggregate: jest.Mock
    findFirst: jest.Mock
  }
  payrollEmployeeBalanceEvent: {
    groupBy: jest.Mock
    count: jest.Mock
    aggregate: jest.Mock
    findFirst: jest.Mock
  }
  journalEntry: { count: jest.Mock; findFirst: jest.Mock }
  accountingSourceLink: {
    count: jest.Mock
    findFirst: jest.Mock
    findMany: jest.Mock
  }
  workflowAssuranceIncident: { count: jest.Mock; findFirst: jest.Mock }
}
const mockPaymentTruth = getPaymentTruthSnapshot as jest.Mock
const mockInventoryCash = getInventoryCashSnapshot as jest.Mock
const mockCloseReadiness = getCloseReadinessSnapshot as jest.Mock

describe("tenant operating snapshot service", () => {
  it("does not combine employee balances or settlements across currencies", async () => {
    setupTenantData(); setupChildSnapshots()
    mockDb.organization.findFirst.mockResolvedValue({ currency: "XAF" })
    mockDb.payrollEmployeeBalanceCase.groupBy.mockResolvedValue([
      { currency: "USD", _sum: { outstandingAmount: 500 }, _count: { _all: 1 } },
      { currency: "XAF", _sum: { outstandingAmount: 500 }, _count: { _all: 1 } },
    ])
    mockDb.payrollEmployeeBalanceEvent.groupBy.mockResolvedValue([
      { currency: "USD", _sum: { amount: 500 }, _count: { _all: 1 } },
      { currency: "XAF", _sum: { amount: 500 }, _count: { _all: 1 } },
    ])
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", now: "2026-06-21T10:00:00Z" })
    expect(result.metrics.employeeBalanceOutstandingAmount).toBeNull()
    expect(result.metrics.periodEmployeeBalanceSettlementAmount).toBeNull()
    expect(result.metrics.employeeBalanceCurrencyCode).toBe("XAF")
    expect(result.metrics.employeeBalanceOutstandingByCurrency).toEqual([
      { currencyCode: "USD", amount: 500, count: 1 },
      { currencyCode: "XAF", amount: 500, count: 1 },
    ])
    expect(result.metrics.periodEmployeeBalanceSettlementByCurrency).toEqual(result.metrics.employeeBalanceOutstandingByCurrency)
    expect(result.evidenceGrade).toBe("blocked")
    expect(result.blockers.map(item => item.id)).toEqual(expect.arrayContaining([
      "tenant-payroll-balance-currency-mismatch", "tenant-payroll-settlement-currency-mismatch",
    ]))
    expect(mockDb.organization.findFirst).toHaveBeenCalledWith({ where: { id: "org-1" }, select: { currency: true } })
    expect(mockDb.payrollEmployeeBalanceCase.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ["currency"], where: { organizationId: "org-1", status: { in: ["OPEN", "PARTIALLY_SETTLED"] } },
    }))
    mockDb.payrollEmployeeBalanceEvent.groupBy.mockResolvedValue([{ currency: "USD", _sum: { amount: 501 }, _count: { _all: 1 } }])
    const changed = await getTenantOperatingSnapshot({ organizationId: "org-1", now: "2026-06-21T10:00:00Z" })
    expect(changed.sourceHash).not.toBe(result.sourceHash)
  })
  it("distinguishes a successful empty query from a failed currency aggregation", async () => {
    setupTenantData(); setupChildSnapshots()
    const input = { organizationId: "org-1", now: "2026-06-21T10:00:00Z" }
    const empty = await getTenantOperatingSnapshot(input)
    expect(empty.metrics).toMatchObject({ employeeBalanceOutstandingAmount: 0, periodEmployeeBalanceSettlementAmount: 0, employeeBalanceOutstandingByCurrency: [], periodEmployeeBalanceSettlementByCurrency: [] })
    mockDb.payrollEmployeeBalanceEvent.groupBy.mockRejectedValueOnce(new Error("source unavailable"))
    await expect(getTenantOperatingSnapshot(input)).rejects.toThrow("source unavailable")
    mockDb.organization.findFirst.mockResolvedValueOnce(null)
    await expect(getTenantOperatingSnapshot(input)).rejects.toThrow("Organization is unavailable")
  })
  it("does not relabel a single foreign-currency balance or settlement as organization currency", async () => {
    setupTenantData(); setupChildSnapshots()
    mockDb.payrollEmployeeBalanceCase.groupBy.mockResolvedValue([{ currency: "USD", _sum: { outstandingAmount: 125 }, _count: { _all: 1 } }])
    mockDb.payrollEmployeeBalanceEvent.groupBy.mockResolvedValue([{ currency: "USD", _sum: { amount: 75 }, _count: { _all: 1 } }])
    const input = { organizationId: "org-1", now: "2026-06-21T10:00:00Z" }
    expect((await getTenantOperatingSnapshot(input)).metrics).toMatchObject({ employeeBalanceOutstandingAmount: null, periodEmployeeBalanceSettlementAmount: null })
    mockDb.organization.findFirst.mockResolvedValue({ currency: "USD" })
    expect((await getTenantOperatingSnapshot(input)).metrics).toMatchObject({ employeeBalanceOutstandingAmount: 125, periodEmployeeBalanceSettlementAmount: 75, employeeBalanceCurrencyCode: "USD" })
  })
  it("counts overdue pending orders at the supplied snapshot time within the tenant", async () => {
    setupTenantData(); setupChildSnapshots()
    const now = new Date("2026-06-21T10:00:00.000Z")
    mockDb.purchaseOrder.count.mockImplementation(({ where }) => Promise.resolve(where.expectedDeliveryDate ? 2 : 7))
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", now })
    expect(mockDb.purchaseOrder.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", deletedAt: null, status: { in: ["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"] }, expectedDeliveryDate: { lt: now } } })
    expect(result.metrics).toMatchObject({ pendingPurchaseOrderCount: 7, overduePurchaseOrderCount: 2 })
  })
  beforeEach(() => {
    mockDb.businessEvent.findMany.mockResolvedValue([])
    jest.clearAllMocks()
  })

  it("blocks a location scope before child snapshots or tenant reads", async () => {
    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      locationId: "location-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(mockPaymentTruth).not.toHaveBeenCalled()
    expect(mockInventoryCash).not.toHaveBeenCalled()
    expect(mockCloseReadiness).not.toHaveBeenCalled()
    expectNoTenantOperatingDatabaseReads()
    expectLocationScopeBlockedResult(result)
  })

  it("blocks a related location scope before tenant reads", async () => {
    const result = await getTenantOperatingSnapshotFromRelated(
      {
        organizationId: "org-1",
        locationId: "location-1",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        now: "2026-06-21T10:00:00.000Z",
      },
      {} as Parameters<typeof getTenantOperatingSnapshotFromRelated>[1],
    )

    expectNoTenantOperatingDatabaseReads()
    expectLocationScopeBlockedResult(result)
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
          status: {
            in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"],
          },
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
    mockDb.payrollEmployeeBalanceCase.groupBy.mockResolvedValue([{ currency: "XAF", _sum: { outstandingAmount: 27500 }, _count: { _all: 2 } }])
    mockDb.payrollEmployeeBalanceEvent.count.mockResolvedValue(3)
    mockDb.payrollEmployeeBalanceEvent.groupBy.mockResolvedValue([{ currency: "XAF", _sum: { amount: 12500 }, _count: { _all: 3 } }])
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
    expect(mockDb.payrollEmployeeBalanceEvent.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          eventType: {
            in: [
              "SETTLE_CASH",
              "SETTLE_BANK",
              "SETTLE_MOBILE_MONEY",
              "SETTLE_DEDUCTION",
              "REFUND_PAYMENT",
            ],
          },
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
  it.each(["payment", "declaration"])("withholds a foreign-currency %s forecast even when other proof is present", async source => {
    setupChildSnapshots(); setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod(source === "payment"
      ? { run: { paymentBatches: [forecastPaymentBatch({ currency: "USD" })] } }
      : { declarations: [forecastDeclaration({ currency: "USD" })] })])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00Z" })
    expect(result.metrics.payrollFinanceForecast).toMatchObject({ authoritative: false, upcomingNetPayAmount: null, upcomingStatutoryLiabilityAmount: null, totalUpcomingAmount: null, blockerCodes: ["PAYROLL_FORECAST_CURRENCY_MISMATCH"] })
    expect(result.metrics.payrollFinanceForecast.sourceCurrencies).toEqual(["USD", "XAF"])
    expect(result.blockers).toContainEqual(expect.objectContaining({ title: "Payroll forecast currencies cannot be combined", detail: "Forecast source currencies: USD; XAF. No conversion evidence establishes a total in XAF." }))
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod(source === "payment"
      ? { run: { paymentBatches: [forecastPaymentBatch({ currency: "USD", amount: 350001 })] } }
      : { declarations: [forecastDeclaration({ currency: "USD", amount: 90001 })] })])
    const changed = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00Z" })
    expect(changed.sourceHash).not.toBe(result.sourceHash)
  })

  it("sums compatible forecast amounts with decimal precision", async () => {
    setupChildSnapshots(); setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod({ run: { paymentBatches: [forecastPaymentBatch({ amount: 0.1 })] }, declarations: [forecastDeclaration({ amount: 0.2 })] })])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00Z" })
    expect(result.metrics.payrollFinanceForecast).toMatchObject({ authoritative: true, upcomingNetPayAmount: 0.1, upcomingStatutoryLiabilityAmount: 0.2, totalUpcomingAmount: 0.3 })
    expect(mockDb.payrollPeriod.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({ runs: expect.objectContaining({ include: expect.objectContaining({ paymentBatches: expect.objectContaining({ select: expect.objectContaining({ currency: true }) }), declarations: expect.objectContaining({ select: expect.objectContaining({ currency: true }) }) }) }) }) }))
  })

  it("exposes authoritative aggregate payroll finance forecasts from source-linked evidence", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod()])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(
      forecastSourceLinks(),
    )

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
          payDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    )
    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "AUTHORITATIVE",
      authoritative: true,
      upcomingNetPayAmount: 350000,
      upcomingStatutoryLiabilityAmount: 90000,
      totalUpcomingAmount: 440000,
      currencyCode: "XAF",
      sourceCurrencies: ["XAF"],
      paymentBatchCount: 1,
      declarationCount: 1,
      sourceLinkCount: 2,
      certifiedInputRunCount: 1,
      certifiedInputProofHashCount: 4,
      registerToLedgerRunCount: 1,
      personLevelAmountsRedacted: true,
      blockerCodes: [],
    })
    expect(mockDb.accountingSourceLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    )
  })

  it("does not forecast settled payroll cash again or retain its pay date", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod({
      run: { paymentBatches: [forecastPaymentBatch({ status: "SETTLED" })] },
    })])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00.000Z" })
    expect(result.metrics.payrollFinanceForecast).toMatchObject({ authoritative: true, upcomingNetPayAmount: 0, upcomingStatutoryLiabilityAmount: 90000, totalUpcomingAmount: 90000, nextPayDate: null })
  })

  it("withholds a partially settled payroll forecast whose remaining balance is not established", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod({
      run: { paymentBatches: [forecastPaymentBatch({ status: "PARTIALLY_SETTLED" })] },
    })])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00.000Z" })
    expect(result.metrics.payrollFinanceForecast).toMatchObject({ authoritative: false, upcomingNetPayAmount: null, totalUpcomingAmount: null, blockerCodes: ["PAYROLL_FORECAST_SETTLEMENT_BALANCE_UNVERIFIED"] })
  })

  it("counts only released obligations in a mixed settled/released scope", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod({
      run: { paymentBatches: [forecastPaymentBatch({ status: "SETTLED", id: "settled" }), forecastPaymentBatch({ paymentDate: new Date("2026-07-02T00:00:00Z") })] },
    })])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue([...forecastSourceLinks(), { ...forecastSourceLinks()[1], id: "settled-link", sourceId: "settled" }])
    const result = await getTenantOperatingSnapshot({ organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-07-31", now: "2026-06-21T10:00:00.000Z" })
    expect(result.metrics.payrollFinanceForecast).toMatchObject({ authoritative: true, upcomingNetPayAmount: 350000, totalUpcomingAmount: 440000, nextPayDate: "2026-07-02T00:00:00.000Z" })
  })

  it("forecasts the verified remainder after each settlement and propagates query failure", async () => {
    setupChildSnapshots(); setupTenantData()
    const batch = forecastPaymentBatch({status:'PARTIALLY_SETTLED'})
    mockDb.payrollPeriod.findMany.mockResolvedValue([forecastPeriod({run:{paymentBatches:[batch]}})])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(forecastSourceLinks())
    const first = {id:'settlement-1', organizationId:'org-1', sourceId:batch.id, status:'APPLIED', processedAt:new Date('2026-06-21T09:00:00Z'), payload:{payrollPaymentBatchId:batch.id, nextStatus:'PARTIALLY_SETTLED', settlementBalance:{version:1,sequence:1,previousEventId:null,currency:'XAF',batchAmount:'350000.00',settlementAmount:'100000.00',cumulativeSettledAmount:'100000.00',remainingAmount:'250000.00'}}}
    mockDb.businessEvent.findMany.mockResolvedValue([first])
    const input={organizationId:'org-1',periodStart:'2026-06-01',periodEnd:'2026-07-31',now:'2026-06-21T10:00:00.000Z'}
    const result=await getTenantOperatingSnapshot(input)
    expect(result.metrics.payrollFinanceForecast).toMatchObject({authoritative:true,upcomingNetPayAmount:250000,totalUpcomingAmount:340000})
    expect(mockDb.businessEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:'org-1',sourceId:{in:[batch.id]}})}))
    mockDb.businessEvent.findMany.mockResolvedValue([first,{...first,id:'settlement-2',payload:{...first.payload,settlementBalance:{...first.payload.settlementBalance,sequence:2,previousEventId:first.id,settlementAmount:'50000.00',cumulativeSettledAmount:'150000.00',remainingAmount:'200000.00'}}}])
    expect((await getTenantOperatingSnapshot(input)).metrics.payrollFinanceForecast).toMatchObject({authoritative:true,upcomingNetPayAmount:200000,totalUpcomingAmount:290000})
    mockDb.businessEvent.findMany.mockRejectedValueOnce(new Error('Owned settlement query unavailable'))
    await expect(getTenantOperatingSnapshot(input)).rejects.toThrow('Owned settlement query unavailable')
  })

  it("fails closed when explicit certified HRIS readiness proof is missing", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([
      forecastPeriod({
        run: {
          metadata: {
            payrollInputReadinessHash: "sha256:payroll-input-readiness",
            payrollEngineInputHashes: [
              "sha256:payroll-engine-input-employee-1",
            ],
            payrollEngineInputSnapshotHash:
              "sha256:payroll-engine-input-snapshot",
            componentRegisterProofHash: "sha256:component-register",
            componentRegisterProofStatus: "MATCHED",
          },
        },
      }),
    ])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(
      forecastSourceLinks(),
    )

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-07-31",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      certifiedInputRunCount: 0,
      blockerCodes: ["PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING"],
    })
  })

  it("fails closed when the payroll register does not tie to posted ledger proof", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([
      forecastPeriod({
        run: {
          metadata: certifiedRunMetadata({
            componentRegisterProofStatus: "MISSING",
          }),
        },
      }),
    ])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(
      forecastSourceLinks(),
    )

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-07-31",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      registerToLedgerRunCount: 0,
      blockerCodes: ["PAYROLL_FORECAST_REGISTER_LEDGER_TIEOUT_MISSING"],
    })
  })

  it("fails closed when payroll declaration proof is missing", async () => {
    setupChildSnapshots()
    setupTenantData()
    mockDb.payrollPeriod.findMany.mockResolvedValue([
      forecastPeriod({
        declarations: [
          forecastDeclaration({ evidenceItems: [], payloadHash: null }),
        ],
      }),
    ])
    mockDb.payrollRun.findMany.mockResolvedValue([])
    mockDb.accountingSourceLink.findMany.mockResolvedValue(
      forecastSourceLinks(),
    )

    const result = await getTenantOperatingSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-07-31",
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(result.metrics.payrollFinanceForecast).toMatchObject({
      status: "NON_AUTHORITATIVE",
      authoritative: false,
      upcomingNetPayAmount: null,
      upcomingStatutoryLiabilityAmount: null,
      totalUpcomingAmount: null,
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

function expectNoTenantOperatingDatabaseReads() {
  for (const model of Object.values(mockDb)) {
    for (const operation of Object.values(model) as jest.Mock[]) {
      expect(operation).not.toHaveBeenCalled()
    }
  }
}

function expectLocationScopeBlockedResult(
  result: Awaited<ReturnType<typeof getTenantOperatingSnapshot>>,
) {
  expect(result).toEqual(
    expect.objectContaining({
      kind: "tenant.operating",
      organizationId: "org-1",
      locationId: "location-1",
      status: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        activeLocationCount: 0,
        completedSalesCount: 0,
        completedSalesRevenue: 0,
        cashCollected: 0,
        pendingPurchaseOrderCount: 0,
        overduePurchaseOrderCount: null,
        approvedOrPaidPayrollRunCount: 0,
        activeEmployeeBalanceCaseCount: 0,
        openEmployeeBalanceCaseCount: 0,
        partiallySettledEmployeeBalanceCaseCount: 0,
        employeeBalanceOutstandingAmount: 0,
        periodEmployeeBalanceSettlementCount: 0,
        periodEmployeeBalanceSettlementAmount: 0,
        postedJournalEntryCount: 0,
        sourceLinkCount: 0,
        payrollFinanceForecast: expect.objectContaining({
          status: "NON_AUTHORITATIVE",
          authoritative: false,
          reasonCode: "TENANT_OPERATING_LOCATION_SCOPE_UNSUPPORTED",
          upcomingNetPayAmount: null,
          upcomingStatutoryLiabilityAmount: null,
          totalUpcomingAmount: null,
          personLevelAmountsRedacted: true,
          blockerCodes: ["TENANT_OPERATING_LOCATION_SCOPE_UNSUPPORTED"],
        }),
        paymentTruth: {
          providerAccountCount: 0,
          activeProviderAccountCount: 0,
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
          accountingPeriodCount: 0,
          openPeriodCount: 0,
          recentCloseRunCount: 0,
          certifiedCloseRunCount: 0,
          blockedCloseRunCount: 0,
          averageReadinessScore: null,
          openFindingCount: 0,
          criticalOpenFindingCount: 0,
          unavailableEvidenceCount: 0,
        },
      },
    }),
  )
  expect(result.blockers).toContainEqual(
    expect.objectContaining({
      id: "tenant-operating-location-scope-unsupported",
      severity: "high",
      gate: "tenant_operating_scope",
      sourceTables: expect.arrayContaining([
        "sales_orders",
        "payments",
        "payroll_runs",
        "journal_entries",
      ]),
    }),
  )
}

function forecastPeriod(overrides: Record<string, unknown> = {}) {
  const declarations = (overrides.declarations as unknown[]) ?? [
    forecastDeclaration(),
  ]
  const runOverrides = (overrides.run as Record<string, unknown>) ?? {}
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
        metadata: certifiedRunMetadata(),
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
        ...runOverrides,
      },
    ],
    ...overrides,
  }
}

function certifiedRunMetadata(overrides: Record<string, unknown> = {}) {
  return {
    hrisPayrollReadinessHash: "sha256:hris-payroll-readiness",
    payrollInputReadinessHash: "sha256:payroll-input-readiness",
    payrollEngineInputHashes: ["sha256:payroll-engine-input-employee-1"],
    payrollEngineInputSnapshotHash: "sha256:payroll-engine-input-snapshot",
    componentRegisterProofHash: "sha256:component-register",
    componentRegisterProofStatus: "MATCHED",
    ...overrides,
  }
}

function forecastPaymentBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-batch-forecast-1",
    status: "RELEASED",
    amount: 350000,
    currency: "XAF",
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
    currency: "XAF",
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
  mockDb.organization.findFirst.mockResolvedValue({ currency: "XAF" })
  mockDb.payrollEmployeeBalanceCase.groupBy.mockResolvedValue([])
  mockDb.payrollEmployeeBalanceEvent.groupBy.mockResolvedValue([])
  mockDb.location.count.mockResolvedValue(1)
  mockDb.salesOrder.aggregate.mockResolvedValue({ _sum: { total: 25000 } })
  mockDb.salesOrder.count.mockResolvedValue(4)
  mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount: 18000 } })
  mockDb.purchaseOrder.count.mockResolvedValue(1)
  mockDb.payrollPeriod.findMany.mockResolvedValue([])
  mockDb.payrollRun.count.mockResolvedValue(1)
  mockDb.payrollRun.findMany.mockResolvedValue([])
  mockDb.payrollEmployeeBalanceCase.count.mockResolvedValue(0)
  mockDb.payrollEmployeeBalanceCase.aggregate.mockResolvedValue({
    _sum: { outstandingAmount: 0 },
  })
  mockDb.payrollEmployeeBalanceEvent.count.mockResolvedValue(0)
  mockDb.payrollEmployeeBalanceEvent.aggregate.mockResolvedValue({
    _sum: { amount: 0 },
  })
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
