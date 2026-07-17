import {
  AccountingPostingPurpose,
  AccountingSourceType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {},
}))

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}))

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}))

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}))

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}))

jest.mock("@/services/controls/sensitive-action.service", () => ({
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
  evaluateSensitiveAction: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

jest.mock("@/services/regulatory/country-packs/resolve", () => ({
  resolveRegulatoryParameter: jest.fn(),
}))

import { getPayrollWorkbenchData } from "../payroll-control.service"

function buildPayrollWorkbenchClient() {
  return {
    payrollPeriod: {
      count: jest.fn().mockResolvedValue(1),
    },
    payrollRun: {
      count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "run-1",
          runNumber: "PAY-2026-06",
          status: PayrollRunStatus.POSTED,
          netPayableAmount: new Prisma.Decimal("95800.00"),
          currency: "XAF",
          payrollPeriod: {
            name: "June 2026",
            payDate: new Date("2026-06-30T00:00:00.000Z"),
          },
          ledgerPostingBatchId: "batch-ledger-1",
          postedBusinessEventId: "event-1",
          countryPackVersion: "CM-2026.1",
          countryPackResolutionHash: "country-pack-hash",
          _count: {
            payslips: 1,
            paymentBatches: 1,
            declarations: 1,
          },
        },
      ]),
    },
    payrollPaymentBatch: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "payment-batch-1",
          batchNumber: "PAY-BATCH-2026-06",
          payrollRunId: "run-1",
          payrollRun: { runNumber: "PAY-2026-06" },
          status: PayrollPaymentBatchStatus.RELEASED,
          amount: new Prisma.Decimal("95800.00"),
          currency: "XAF",
          method: PaymentMethod.BANK_TRANSFER,
          paymentDate: new Date("2026-06-30T00:00:00.000Z"),
          ledgerPostingBatchId: "payment-ledger-1",
          postedBusinessEventId: "event-payment-1",
          paymentTransactionId: "payment-transaction-1",
          paymentExceptionId: null,
          reconciliationStatus: "MATCHED",
          metadata: {
            ledgerStatus: "POSTED",
          },
        },
      ]),
    },
    payrollDeclaration: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "declaration-1",
          payrollRunId: "run-1",
          payrollRun: { runNumber: "PAY-2026-06" },
          authority: "CNPS",
          declarationType: "SOCIAL_CONTRIBUTION",
          status: PayrollDeclarationStatus.PREPARED,
          amount: new Prisma.Decimal("4200.00"),
          currency: "XAF",
          dueDate: new Date("2026-07-15T00:00:00.000Z"),
          countryPackVersion: "CM-2026.1",
          countryPackResolutionHash: "country-pack-hash",
          metadata: { expertReviewRequired: true },
        },
      ]),
    },
    ledgerPostingBatch: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "ledger-blocker-1",
          sourceType: AccountingSourceType.PAYROLL_RUN,
          sourceId: "run-1",
          postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
          status: LedgerPostingBatchStatus.FAILED,
          errorMessage: "Missing posting rule",
          createdAt: new Date("2026-06-30T00:00:00.000Z"),
        },
      ]),
    },
    paymentException: {
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

function payrollModuleDeniedDecision() {
  return {
    organizationId: "org-1",
    userId: "payroll-admin-1",
    moduleSlug: "payroll",
    surfaceType: "page",
    surface: "/dashboard/payroll",
    accessIntent: "read",
    mode: "enforce",
    result: "deny",
    allowed: false,
    wouldBlock: true,
    reason: "Tenant is not entitled to this module.",
    entitlement: null,
    missingDependencies: [],
    rbacWildcardPresent: true,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-06-25T00:00:00.000Z",
  }
}

describe("payroll privacy read model", () => {
  it("audits salary-bearing payroll workbench reads with actor context", async () => {
    const client = buildPayrollWorkbenchClient()

    const result = await getPayrollWorkbenchData(
      {
        organizationId: "org-1",
        limit: 10,
        actorId: "payroll-reader-1",
        actorPermissions: ["PAYROLL_READ"],
      },
      client as any,
    )

    expect(result.queues.recentRuns[0].netPayableAmount).toBe("95800.00")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollWorkbench",
          entityId: "org-1",
          action: "PAYROLL_WORKBENCH_SALARY_READ",
          userId: "payroll-reader-1",
          organizationId: "org-1",
          changes: expect.objectContaining({
            amountAccess: expect.objectContaining({
              allowed: true,
              mode: "allow",
              reasonCode: "ALLOWED",
              policy: "kontava-payroll-person-redaction-policy",
            }),
            returnedRecordCounts: {
              recentRuns: 1,
              paymentBatches: 1,
              declarations: 1,
            },
          }),
        }),
      }),
    )
  })

  it("redacts payroll workbench amounts when the payroll module is not entitled", async () => {
    const client = buildPayrollWorkbenchClient()

    const result = await getPayrollWorkbenchData(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["*", "payroll.payslips.read"],
        moduleDecision: payrollModuleDeniedDecision() as any,
      },
      client as any,
    )

    expect(result.queues.recentRuns[0].netPayableAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.queues.paymentBatches[0].amount).toBe("[REDACTED:PAYROLL]")
    expect(result.queues.declarations[0].amount).toBe("[REDACTED:PAYROLL]")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "payroll-admin-1",
          changes: expect.objectContaining({
            amountAccess: expect.objectContaining({
              allowed: false,
              mode: "redact",
              reasonCode: "MODULE_NOT_ENTITLED",
              policy: "kontava-payroll-person-redaction-policy",
            }),
          }),
        }),
      }),
    )
  })

  it("redacts payroll workbench amounts when salary permissions are absent", async () => {
    const client = buildPayrollWorkbenchClient()

    const result = await getPayrollWorkbenchData(
      {
        organizationId: "org-1",
        actorId: "limited-reader-1",
        actorPermissions: [],
      },
      client as any,
    )

    expect(result.queues.recentRuns[0].netPayableAmount).toBe("[REDACTED:PAYROLL]")
    expect(result.queues.paymentBatches[0].amount).toBe("[REDACTED:PAYROLL]")
    expect(result.queues.declarations[0].amount).toBe("[REDACTED:PAYROLL]")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "limited-reader-1",
          changes: expect.objectContaining({
            amountAccess: expect.objectContaining({
              allowed: false,
              mode: "redact",
              reasonCode: "MISSING_PERMISSION",
              policy: "kontava-payroll-person-redaction-policy",
            }),
          }),
        }),
      }),
    )
  })
})
