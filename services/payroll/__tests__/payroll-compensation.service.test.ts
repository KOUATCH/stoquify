import {
  PayrollContractStatus,
  PayrollContractType,
  PayrollEmployeeStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
  PayrollSalaryChangeStatus,
  Prisma,
} from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
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
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve"

import {
  applyApprovedSalaryChange,
  approveSalaryChange,
  assignEmployeeRubrique,
  getCompensationWorkflow,
  requestSalaryChange,
  upsertPayrollRubrique,
} from "../compensation.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock
const mockedResolveRegulatoryParameter = resolveRegulatoryParameter as jest.Mock

function buildTx() {
  return {
    organization: { findFirst: jest.fn() },
    payrollRubrique: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollEmployee: { findFirst: jest.fn() },
    payrollEmployeeRubriqueAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollSalaryChangeRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollContract: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    payrollRunLine: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  }
}

function useTransaction(tx: ReturnType<typeof buildTx>) {
  mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback(tx),
  )
}

function employeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    organizationId: "org-1",
    userId: "user-1",
    employeeNumber: "EMP-001",
    displayName: "Alice Ngono",
    legalName: "Alice Ngono",
    status: PayrollEmployeeStatus.ACTIVE,
    hireDate: new Date("2026-01-01T00:00:00.000Z"),
    terminationDate: null,
    countryCode: "CM",
    locationId: null,
    department: "Operations",
    jobTitle: "Manager",
    costCenter: "OPS",
    taxIdentifierMasked: null,
    taxIdentifierHash: null,
    socialIdentifierMasked: null,
    socialIdentifierHash: null,
    paymentMethod: null,
    bankAccountMasked: null,
    bankAccountHash: null,
    mobileMoneyProvider: null,
    mobileMoneyPhoneMasked: null,
    mobileMoneyPhoneHash: null,
    paymentDestinationHash: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function rubriqueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rub-1",
    organizationId: "org-1",
    code: "BASE",
    label: "Base salary",
    description: null,
    kind: PayrollRubriqueKind.EARNING,
    valueType: PayrollRubriqueValueType.FIXED_AMOUNT,
    status: PayrollRubriqueStatus.ACTIVE,
    taxableBase: true,
    socialBase: true,
    employerCharge: false,
    payslipLabel: "Base salary",
    postingDebitAccountCode: null,
    postingCreditAccountCode: null,
    countryCode: "CM",
    statutoryParameterPath: null,
    countryPackVersion: null,
    countryPackSchemaVersion: null,
    countryPackResolutionHash: null,
    countryPackLegalRef: null,
    countryPackVerificationStatus: null,
    countryPackCapabilityStatus: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-06-26T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1",
    organizationId: "org-1",
    employeeId: "emp-1",
    employee: employeeRow(),
    rubriqueId: "rub-1",
    rubrique: rubriqueRow(),
    status: PayrollRubriqueAssignmentStatus.ACTIVE,
    amount: new Prisma.Decimal("10000.00"),
    rateBps: null,
    quantity: null,
    currency: "XAF",
    effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
    effectiveTo: null,
    evidenceDocumentHash: "sha256:assignment-evidence",
    approvalBusinessEventId: "event-1",
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-06-26T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function contractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    organizationId: "org-1",
    employeeId: "emp-1",
    employee: employeeRow(),
    contractNumber: "CTR-001",
    type: PayrollContractType.CDI,
    status: PayrollContractStatus.ACTIVE,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    baseSalary: new Prisma.Decimal("150000.00"),
    currency: "XAF",
    workingHoursPerMonth: new Prisma.Decimal("173.33"),
    classification: "M2",
    echelon: "E1",
    convention: "Retail",
    signedDocumentHash: "sha256:contract",
    activatedBusinessEventId: "event-contract",
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function salaryChangeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "salary-change-1",
    organizationId: "org-1",
    employeeId: "emp-1",
    employee: employeeRow(),
    sourceContractId: "contract-1",
    sourceContract: contractRow(),
    supersedingContractId: null,
    supersedingContract: null,
    status: PayrollSalaryChangeStatus.REQUESTED,
    currentBaseSalary: new Prisma.Decimal("150000.00"),
    proposedBaseSalary: new Prisma.Decimal("180000.00"),
    currency: "XAF",
    effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
    requestedById: "hr-1",
    approvedById: null,
    rejectedById: null,
    appliedById: null,
    requestedAt: new Date("2026-06-26T00:00:00.000Z"),
    approvedAt: null,
    rejectedAt: null,
    appliedAt: null,
    requestReason: "Promotion",
    decisionReason: null,
    evidenceDocumentHash: "sha256:request-evidence",
    approvalEvidenceHash: null,
    requestBusinessEventId: "event-request",
    approvalBusinessEventId: null,
    appliedBusinessEventId: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-06-26T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

describe("payroll compensation approval service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1", status: "APPLIED" })
    mockedResolveRegulatoryParameter.mockReturnValue({
      countryCode: "CM",
      parameterPath: "payroll.cnps.pensionRatesBps",
      value: {},
      packVersion: "cm-2026.v1",
      schemaVersion: "country-pack.v1",
      legalRef: "expert-review-required",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      verifiedOn: "2026-06-25",
      verifiedBy: "legal-owner-required",
      verificationStatus: "REQUIRES_EXPERT_REVIEW",
      layer: "country",
      capabilityStatus: "SUPPORTED",
      resolutionHash: "country-pack-resolution",
    })
  })

  it("reads compensation workflow data with salary amounts redacted without explicit salary permission", async () => {
    const client = {
      payrollRubrique: { findMany: jest.fn().mockResolvedValue([rubriqueRow()]) },
      payrollEmployeeRubriqueAssignment: { findMany: jest.fn().mockResolvedValue([assignmentRow()]) },
      payrollSalaryChangeRequest: { findMany: jest.fn().mockResolvedValue([salaryChangeRow()]) },
      auditLog: { create: jest.fn() },
    }

    const result = await getCompensationWorkflow(
      {
        organizationId: "org-1",
        actorId: "reader-1",
        actorPermissions: ["payroll.compensation.read"],
      },
      client as any,
    )

    expect(result.assignments[0].amount).toBe("[REDACTED:PAYROLL]")
    expect(result.salaryChanges[0].proposedBaseSalary).toBe("[REDACTED:PAYROLL]")
    expect(JSON.stringify(result)).not.toContain("180000")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_COMPENSATION_WORKFLOW_READ",
          organizationId: "org-1",
          userId: "reader-1",
        }),
      }),
    )
  })

  it("creates a statutory rubrique with country-pack provenance and no formula implementation claim", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({
      country: null,
      countryCode: "CM",
      accountingSettings: { countryPack: "cm-2026.v1", taxRegime: "SMB" },
    })
    tx.payrollRubrique.findFirst.mockResolvedValue(null)
    tx.payrollRubrique.create.mockImplementation(async ({ data }: { data: any }) =>
      rubriqueRow({ ...data, id: "rub-1" }),
    )

    const result = await upsertPayrollRubrique({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.compensation.manage"],
      code: "CNPS_EMPLOYEE",
      label: "CNPS employee contribution",
      kind: PayrollRubriqueKind.DEDUCTION,
      valueType: PayrollRubriqueValueType.FORMULA_REFERENCE,
      status: PayrollRubriqueStatus.ACTIVE,
      taxableBase: false,
      socialBase: true,
      statutoryParameterPath: "payroll.cnps.pensionRatesBps",
      effectiveAt: "2026-07-01",
    })

    expect(result).toMatchObject({ created: true, businessEventId: "event-1" })
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.cnps.pensionRatesBps",
      expect.objectContaining({
        countryCode: "CM",
        purpose: "PAYROLL_RUBRIQUE_PROVENANCE",
      }),
    )
    expect(tx.payrollRubrique.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "CNPS_EMPLOYEE",
          countryPackResolutionHash: "sha256:country-pack-resolution",
          countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
        }),
      }),
    )
    expect(JSON.stringify(tx.payrollRubrique.create.mock.calls[0][0].data.metadata)).toContain("statutoryFormulaImplemented")
  })

  it("assigns an employee rubrique only inside the tenant and records event evidence", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue(employeeRow())
    tx.payrollRubrique.findFirst.mockResolvedValue(rubriqueRow())
    tx.payrollEmployeeRubriqueAssignment.create.mockImplementation(async ({ data }: { data: any }) =>
      assignmentRow({ ...data, id: "assignment-1" }),
    )
    tx.payrollEmployeeRubriqueAssignment.update.mockImplementation(async ({ data }: { data: any }) =>
      assignmentRow({ approvalBusinessEventId: data.approvalBusinessEventId }),
    )

    const result = await assignEmployeeRubrique({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.compensation.manage"],
      employeeId: "emp-1",
      rubriqueId: "rub-1",
      status: PayrollRubriqueAssignmentStatus.ACTIVE,
      amount: "10000.00",
      effectiveFrom: "2026-07-01",
      evidenceDocumentHash: "sha256:assignment-evidence",
    })

    expect(result.businessEventId).toBe("event-1")
    expect(result.assignment.amount).toBe("[REDACTED:PAYROLL]")
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.rubrique.assignment.created",
        sourceId: "assignment-1",
        documentHash: "sha256:assignment-evidence",
      }),
    )
  })

  it("requests a salary change without mutating the active contract salary", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow())
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue(null)
    tx.payrollSalaryChangeRequest.create.mockImplementation(async ({ data }: { data: any }) =>
      salaryChangeRow({ ...data, id: "salary-change-1" }),
    )
    tx.payrollSalaryChangeRequest.update.mockImplementation(async ({ data }: { data: any }) =>
      salaryChangeRow({ requestBusinessEventId: data.requestBusinessEventId }),
    )

    const result = await requestSalaryChange({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.salary_changes.request"],
      employeeId: "emp-1",
      sourceContractId: "contract-1",
      proposedBaseSalary: "180000.00",
      effectiveFrom: "2026-07-01",
      requestReason: "Promotion",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result.salaryChange.status).toBe(PayrollSalaryChangeStatus.REQUESTED)
    expect(tx.payrollContract.update).not.toHaveBeenCalled()
    expect(tx.payrollSalaryChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentBaseSalary: new Prisma.Decimal("150000.00"),
          proposedBaseSalary: new Prisma.Decimal("180000.00"),
          requestedById: "hr-1",
        }),
      }),
    )
  })

  it("blocks a requester from approving their own salary change", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue(salaryChangeRow({ requestedById: "hr-1" }))

    await expect(
      approveSalaryChange({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.salary_changes.approve"],
        salaryChangeRequestId: "salary-change-1",
        decisionReason: "Approved",
        approvalEvidenceHash: "sha256:approval-evidence",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(tx.payrollSalaryChangeRequest.update).not.toHaveBeenCalled()
  })

  it("approves salary changes through maker-checker evidence", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue(salaryChangeRow({ requestedById: "hr-1" }))
    tx.payrollSalaryChangeRequest.update
      .mockResolvedValueOnce(salaryChangeRow({
        status: PayrollSalaryChangeStatus.APPROVED,
        approvedById: "approver-1",
        approvalEvidenceHash: "sha256:approval-evidence",
      }))
      .mockResolvedValueOnce(salaryChangeRow({
        status: PayrollSalaryChangeStatus.APPROVED,
        approvedById: "approver-1",
        approvalEvidenceHash: "sha256:approval-evidence",
        approvalBusinessEventId: "event-1",
      }))

    const result = await approveSalaryChange({
      organizationId: "org-1",
      actorId: "approver-1",
      actorPermissions: ["payroll.salary_changes.approve"],
      salaryChangeRequestId: "salary-change-1",
      decisionReason: "Approved by finance",
      approvalEvidenceHash: "sha256:approval-evidence",
    })

    expect(result.salaryChange.status).toBe(PayrollSalaryChangeStatus.APPROVED)
    expect(tx.payrollSalaryChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvedById: "approver-1",
          approvalEvidenceHash: "sha256:approval-evidence",
        }),
      }),
    )
  })

  it("applies approved salary changes by creating a new effective-dated contract version", async () => {
    const tx = buildTx()
    useTransaction(tx)
    const approved = salaryChangeRow({
      status: PayrollSalaryChangeStatus.APPROVED,
      approvedById: "approver-1",
      approvalEvidenceHash: "sha256:approval-evidence",
    })
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue(approved)
    tx.payrollRunLine.findFirst.mockResolvedValue(null)
    tx.payrollContract.update
      .mockResolvedValueOnce(contractRow({ effectiveTo: new Date("2026-06-30T00:00:00.000Z") }))
      .mockResolvedValueOnce(contractRow({ id: "contract-2", activatedBusinessEventId: "event-1" }))
    tx.payrollContract.create.mockImplementation(async ({ data }: { data: any }) =>
      contractRow({ ...data, id: "contract-2" }),
    )
    tx.payrollSalaryChangeRequest.update
      .mockResolvedValueOnce(salaryChangeRow({
        ...approved,
        status: PayrollSalaryChangeStatus.APPLIED,
        appliedById: "payroll-ops-1",
        supersedingContractId: "contract-2",
      }))
      .mockResolvedValueOnce(salaryChangeRow({
        ...approved,
        status: PayrollSalaryChangeStatus.APPLIED,
        appliedById: "payroll-ops-1",
        supersedingContractId: "contract-2",
        appliedBusinessEventId: "event-1",
      }))

    const result = await applyApprovedSalaryChange({
      organizationId: "org-1",
      actorId: "payroll-ops-1",
      actorPermissions: ["payroll.salary_changes.apply"],
      salaryChangeRequestId: "salary-change-1",
    })

    expect(result).toMatchObject({
      businessEventId: "event-1",
      supersedingContractId: "contract-2",
    })
    expect(tx.payrollContract.update.mock.calls[0][0].data).not.toHaveProperty("baseSalary")
    expect(tx.payrollContract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baseSalary: new Prisma.Decimal("180000.00"),
          signedDocumentHash: "sha256:approval-evidence",
          status: PayrollContractStatus.ACTIVE,
        }),
      }),
    )
  })

  it("blocks salary-change application when payroll run lines already cover the effective date", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue(salaryChangeRow({
      status: PayrollSalaryChangeStatus.APPROVED,
      approvedById: "approver-1",
      approvalEvidenceHash: "sha256:approval-evidence",
    }))
    tx.payrollRunLine.findFirst.mockResolvedValue({ id: "run-line-1" })

    await expect(
      applyApprovedSalaryChange({
        organizationId: "org-1",
        actorId: "payroll-ops-1",
        actorPermissions: ["payroll.salary_changes.apply"],
        salaryChangeRequestId: "salary-change-1",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollContract.create).not.toHaveBeenCalled()
  })

  it("rejects duplicate open salary change requests", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow())
    tx.payrollSalaryChangeRequest.findFirst.mockResolvedValue({ id: "salary-change-open" })

    await expect(
      requestSalaryChange({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.salary_changes.request"],
        employeeId: "emp-1",
        sourceContractId: "contract-1",
        proposedBaseSalary: "180000.00",
        effectiveFrom: "2026-07-01",
        requestReason: "Promotion",
        evidenceDocumentHash: "sha256:request-evidence",
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })
})
