import { PaymentMethod } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
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

import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import {
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve"

import {
  approveAndPostPayrollRun,
  preparePayrollDeclarations,
  releasePayrollPaymentBatch,
} from "../payroll-control.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock
const mockedRecordCloseInvalidations = recordCloseCertificationInvalidationsForSourceInTx as jest.Mock
const mockedEvaluateSensitiveAction = evaluateSensitiveAction as jest.Mock
const mockedAuditSensitiveActionDecision = auditSensitiveActionDecision as jest.Mock
const mockedResolveRegulatoryParameter = resolveRegulatoryParameter as jest.Mock

function buildTenantBoundaryTx() {
  return {
    payrollRun: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    payrollPaymentBatch: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollDeclaration: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payrollPaymentAllocation: {
      findMany: jest.fn(),
    },
    payrollPayslip: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

function useTransaction(tx: ReturnType<typeof buildTenantBoundaryTx>) {
  mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
}

describe("payroll tenant-boundary guards", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks approving a payroll run outside the caller organization", async () => {
    const tx = buildTenantBoundaryTx()
    useTransaction(tx)

    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "run-other-org",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        idempotencyKey: "approve-other-org",
      }),
    ).rejects.toThrow("Payroll run not found")

    expect(tx.payrollRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run-other-org",
          organizationId: "org-1",
          deletedAt: null,
        },
      }),
    )
    expect(mockedEvaluateSensitiveAction).not.toHaveBeenCalled()
    expect(mockedAuditSensitiveActionDecision).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(mockedRecordCloseInvalidations).not.toHaveBeenCalled()
    expect(tx.payrollPayslip.create).not.toHaveBeenCalled()
    expect(tx.payrollRun.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("blocks releasing payments for a payroll run outside the caller organization", async () => {
    const tx = buildTenantBoundaryTx()
    useTransaction(tx)

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "run-other-org",
        requestedById: "payroll-1",
        approvedById: "treasury-1",
        releasedById: "treasury-release-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-06-30",
        idempotencyKey: "payment-other-org",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        allocations: [{ payslipId: "payslip-1", employeeId: "employee-1", amount: "95800.00" }],
      }),
    ).rejects.toThrow("Payroll run not found")

    expect(tx.payrollPaymentBatch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          idempotencyKey: "payment-other-org",
        },
      }),
    )
    expect(tx.payrollRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run-other-org",
          organizationId: "org-1",
          deletedAt: null,
        },
      }),
    )
    expect(mockedEvaluateSensitiveAction).not.toHaveBeenCalled()
    expect(mockedAuditSensitiveActionDecision).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled()
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled()
    expect(tx.payrollRun.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("blocks preparing declarations for a payroll run outside the caller organization", async () => {
    const tx = buildTenantBoundaryTx()
    useTransaction(tx)

    await expect(
      preparePayrollDeclarations({
        organizationId: "org-1",
        payrollRunId: "run-other-org",
        preparedById: "payroll-1",
      }),
    ).rejects.toThrow("Payroll run not found")

    expect(tx.payrollRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run-other-org",
          organizationId: "org-1",
          deletedAt: null,
        },
      }),
    )
    expect(mockedResolveRegulatoryParameter).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(mockedMarkBusinessEventAppliedInTx).not.toHaveBeenCalled()
    expect(tx.payrollDeclaration.findFirst).not.toHaveBeenCalled()
    expect(tx.payrollDeclaration.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
})
