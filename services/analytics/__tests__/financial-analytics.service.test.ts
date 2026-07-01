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
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

import { getFinancialMetricsReadModel } from "../financial-analytics.service"

const mockDb = db as any
const mockGetTenantOperatingSnapshot = getTenantOperatingSnapshot as jest.Mock

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function salesOrder(total: string) {
  return {
    total: decimal(total),
    lines: [
      {
        quantity: decimal("1"),
        item: { costPrice: decimal("0") },
      },
    ],
    payments: [],
  }
}

function resetDbMocks() {
  mockDb.salesOrder = { findMany: jest.fn() }
  mockDb.inventoryLevel = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.cashDrawerTransaction = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.payrollRun = { findMany: jest.fn().mockResolvedValue([]) }
  mockDb.accountingSourceLink = { findMany: jest.fn().mockResolvedValue([]) }
}

function mockBaseFinancialReads(currentRevenue = "200000.00") {
  mockDb.salesOrder.findMany
    .mockResolvedValueOnce([salesOrder(currentRevenue)])
    .mockResolvedValueOnce([])
}

const periodInput = {
  organizationId: "org-1",
  locationId: "loc-1",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
}

const completeEffectiveComponentSnapshot = {
  payrollRubriqueGrossAmount: "0.00",
  payrollRubriqueTaxableBaseAmount: "0.00",
  payrollRubriqueSocialBaseAmount: "0.00",
  payrollRubriqueEmployeeDeductionAmount: "0.00",
  payrollRubriqueEmployerChargeAmount: "0.00",
  overtimeMinutes: 0,
  leaveMinutes: 0,
}

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

    expect(result.expenses.salaries).toBe(0)
    expect(result.taxes.payrollTax).toBe(0)
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

  it("omits payroll finance facts when effective component proof is incomplete", async () => {
    mockBaseFinancialReads()
    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        status: PayrollRunStatus.POSTED,
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

    expect(result.expenses.salaries).toBe(0)
    expect(result.taxes.payrollTax).toBe(0)
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
      totalUpcomingAmount: 0,
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

    expect(result.expenses.salaries).toBe(0)
    expect(result.taxes.payrollTax).toBe(0)
    expect(result.payrollEvidence).toMatchObject({
      status: "REDACTED",
      redacted: true,
      reasonCode: "MISSING_PERMISSION",
      blockerCodes: ["PAYROLL_FINANCE_FACTS_REDACTED"],
    })
    expect(mockDb.payrollRun.findMany).not.toHaveBeenCalled()
  })
})
