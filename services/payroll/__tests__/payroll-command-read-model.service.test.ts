import {
  CloseRunStatus,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { ForbiddenError } from "@/services/_shared/action-errors"
import { getPayrollEmployeeSourceData } from "../employee.service"
import { getPaymentEvidenceReadiness } from "../payment-evidence.service"
import { getPayrollWorkbenchData } from "../payroll-control.service"
import { getPayrollCommandReadModel } from "../command-read-model.service"

jest.mock("../employee.service", () => ({
  getPayrollEmployeeSourceData: jest.fn(),
}))

jest.mock("../payment-evidence.service", () => ({
  getPaymentEvidenceReadiness: jest.fn(),
}))

jest.mock("../payroll-control.service", () => ({
  getPayrollWorkbenchData: jest.fn(),
}))

const mockGetPayrollEmployeeSourceData = getPayrollEmployeeSourceData as jest.Mock
const mockGetPaymentEvidenceReadiness = getPaymentEvidenceReadiness as jest.Mock
const mockGetPayrollWorkbenchData = getPayrollWorkbenchData as jest.Mock

const asOf = new Date("2026-06-26T08:00:00.000Z")
const periodStart = new Date("2026-06-01T00:00:00.000Z")
const periodEnd = new Date("2026-06-30T23:59:59.000Z")
const updatedAt = new Date("2026-06-26T07:00:00.000Z")

function workbenchData() {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T07:30:00.000Z",
    counts: {
      openPeriods: 1,
      calculatedRuns: 1,
      postedRuns: 0,
      releasedPaymentBatches: 0,
      openDeclarations: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
    },
    queues: {
      recentRuns: [],
      paymentBatches: [],
      declarations: [],
      ledgerBlockers: [],
    },
  }
}

function buildClient() {
  return {
    payrollPeriod: {
      findFirst: jest.fn().mockResolvedValue({
        id: "period-1",
        organizationId: "org-1",
        accountingPeriodId: "acct-period-1",
        name: "June 2026",
        status: PayrollPeriodStatus.INPUTS_LOCKED,
        periodStart,
        periodEnd,
        payDate: new Date("2026-06-30T00:00:00.000Z"),
        inputLockedAt: new Date("2026-06-25T12:00:00.000Z"),
        countryCode: "CM",
        countryPackVersion: "cm-payroll-2026.1",
        countryPackResolutionHash: "sha256:country-pack",
        countryPackCapabilityStatus: "EXPERT_REVIEW_REQUIRED",
        updatedAt,
      }),
    },
    payrollEmployee: {
      count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
    },
    payrollContract: { count: jest.fn().mockResolvedValue(1) },
    payrollEmployeeRubriqueAssignment: { count: jest.fn().mockResolvedValue(3) },
    payrollSalaryChangeRequest: {
      count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
    },
    payrollPaymentDestinationChangeRequest: { count: jest.fn().mockResolvedValue(1) },
    payrollRun: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "run-1",
          runNumber: "PR-2026-06",
          status: PayrollRunStatus.CALCULATED,
          documentHash: "sha256:run-doc",
          evidenceHash: "sha256:run-evidence",
          calculationHash: "sha256:calc",
          attendanceSnapshotHash: "sha256:attendance",
          countryPackResolutionHash: "sha256:country-pack",
          ledgerPostingBatchId: null,
          postedBusinessEventId: null,
          updatedAt,
          _count: { lines: 2, payslips: 2, paymentBatches: 1, declarations: 1 },
        },
      ]),
    },
    payrollPaymentBatch: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "batch-1",
          batchNumber: "PB-2026-06",
          status: PayrollPaymentBatchStatus.DRAFT,
          documentHash: "sha256:batch-doc",
          evidenceHash: null,
          bankFileHash: null,
          ledgerPostingBatchId: null,
          postedBusinessEventId: null,
          reconciliationStatus: null,
          updatedAt,
        },
      ]),
    },
    payrollDeclaration: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "decl-1",
          authority: "CNPS",
          declarationType: "SOCIAL_SECURITY",
          status: PayrollDeclarationStatus.REJECTED,
          payloadHash: "sha256:decl-payload",
          countryPackResolutionHash: "sha256:country-pack",
          dueDate: new Date("2026-07-10T00:00:00.000Z"),
          updatedAt,
        },
      ]),
    },
    closeRun: {
      findFirst: jest.fn().mockResolvedValue({
        id: "close-1",
        status: CloseRunStatus.READY_TO_CLOSE,
        readinessScore: 72,
        criticalBlockerCount: 1,
        highBlockerCount: 2,
        evidenceCoveragePct: new Prisma.Decimal("87.50"),
        asOf: updatedAt,
      }),
    },
    payrollAttendanceSnapshot: { count: jest.fn().mockResolvedValue(1) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetPayrollWorkbenchData.mockResolvedValue(workbenchData())
  mockGetPayrollEmployeeSourceData.mockResolvedValue({
    organizationId: "org-1",
    asOf: "2026-06-26T07:20:00.000Z",
    employees: [{ id: "employee-1" }, { id: "employee-2" }],
    summary: {},
    redaction: { salaryDecision: { allowed: false, mode: "redact", reasonCode: "MISSING_PERMISSION", policy: "kontava-payroll-person-redaction-policy" } },
  })
  mockGetPaymentEvidenceReadiness.mockResolvedValue({
    organizationId: "org-1",
    asOf: "2026-06-26T07:25:00.000Z",
    employees: [{ id: "employee-1" }, { id: "employee-2" }],
    summary: {
      employeeCount: 2,
      approvedPaymentDestinationCount: 1,
      pendingPaymentDestinationCount: 1,
      missingPaymentDestinationCount: 0,
      attendanceReadyCount: 1,
      attendanceDriftCount: 1,
      blockerCount: 2,
    },
  })
})

describe("payroll command read model service", () => {
  it("composes trusted command data with blockers, role scope, redaction, evidence, and audit", async () => {
    const client = buildClient()

    const result = await getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      limit: 25,
      asOf,
    }, client as never)

    expect(mockGetPayrollWorkbenchData).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(mockGetPayrollEmployeeSourceData).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(mockGetPaymentEvidenceReadiness).toHaveBeenCalledWith(expect.objectContaining({
      periodStart,
      periodEnd,
      actorPermissions: ["payroll.command.read"],
    }), client)
    expect(result.currentPeriod?.selection).toBe("calendar-match")
    expect(result.roleScope.canReadCommand).toBe(true)
    expect(result.roleScope.canReadSalaryAmounts).toBe(false)
    expect(result.redaction.payrollAmounts.mode).toBe("redact")
    expect(result.trustedCounts).toEqual(expect.objectContaining({
      activeEmployees: 2,
      linkedEmployees: 1,
      activeContracts: 1,
      frozenAttendanceSnapshots: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
    }))
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
      "PAYROLL_EMPLOYEE_USER_MAPPING_GAP",
      "PAYROLL_ACTIVE_CONTRACT_GAP",
      "PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP",
      "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN",
      "PAYROLL_DECLARATION_ACTION_REQUIRED",
      "PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN",
    ]))
    expect(result.nextActions.map((action) => action.id)).toEqual(expect.arrayContaining([
      "map-payroll-employees",
      "clear-payment-destination-evidence",
      "clear-payroll-ledger-blockers",
    ]))
    expect(result.evidence.latestRun).toEqual(expect.objectContaining({
      id: "run-1",
      documentHash: "sha256:run-doc",
      lineCount: 2,
    }))
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        entityType: "PayrollCommandReadModel",
        action: "PAYROLL_COMMAND_READ_MODEL_READ",
        userId: "command-reader-1",
      }),
    }))
    expect(JSON.stringify(result)).not.toContain("bankAccountNumber")
  })

  it("blocks command reads without explicit command permission", async () => {
    await expect(getPayrollCommandReadModel({
      organizationId: "org-1",
      actorId: "viewer-1",
      actorPermissions: ["payroll.read"],
      asOf,
    }, buildClient() as never)).rejects.toBeInstanceOf(ForbiddenError)
  })
})