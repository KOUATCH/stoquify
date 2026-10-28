import {
  PayrollRubriqueAssignmentStatus,
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
  PayrollSalaryChangeStatus,
} from "@prisma/client"

import { NotFoundError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  applyApprovedSalaryChange,
  approveEmployeeRubriqueAssignment,
  approveSalaryChange,
  assignEmployeeRubrique,
  getCompensationWorkflow,
  requestSalaryChange,
  rejectSalaryChange,
} from "@/services/payroll/compensation.service"

import {
  approveHrisSalaryChange,
  getHrisEmployeeCompensation,
  rejectHrisSalaryChange,
  requestHrisCompensationAssignment,
} from "../compensation.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

jest.mock("@/services/payroll/compensation.service", () => {
  const actual = jest.requireActual("@/services/payroll/compensation.service")
  return {
    ...actual,
    applyApprovedSalaryChange: jest.fn(),
    approveEmployeeRubriqueAssignment: jest.fn(),
    approveSalaryChange: jest.fn(),
    assignEmployeeRubrique: jest.fn(),
    getCompensationWorkflow: jest.fn(),
    requestSalaryChange: jest.fn(),
    rejectSalaryChange: jest.fn(),
  }
})

const mockScope = resolveHrisPeopleAccessScope as jest.Mock
const mockGetWorkflow = getCompensationWorkflow as jest.Mock
const mockAssign = assignEmployeeRubrique as jest.Mock
const mockApproveSalary = approveSalaryChange as jest.Mock
const mockRejectSalary = rejectSalaryChange as jest.Mock

function accessScope() {
  return {
    organizationId: "org-1",
    authority: {
      kind: "TENANT_HRIS_ADMIN",
      label: "Tenant HRIS administration",
      basis: "HRIS_PERMISSION",
      reportingLineAuthority: false,
      effectiveDating: "NOT_APPLICABLE",
      historicalAccessSupported: false,
      delegationSupported: false,
    },
    managedLocations: [],
    employeeIds: null,
    limitations: [],
  }
}

function redaction() {
  return [{
    field: "payroll.compensation.amounts",
    policy: "payroll-sensitive-default-deny",
    reasonCode: "MISSING_PERMISSION",
  }]
}

function workflow() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    summary: {
      rubriques: 1,
      activeRubriques: 1,
      assignments: 1,
      requestedSalaryChanges: 1,
      approvedSalaryChanges: 0,
      redactedSalaryChanges: 1,
    },
    rubriques: [{
      id: "rub-1",
      code: "CNPS_EMPLOYEE",
      label: "CNPS employee",
      kind: PayrollRubriqueKind.DEDUCTION,
      valueType: PayrollRubriqueValueType.RATE,
      status: PayrollRubriqueStatus.ACTIVE,
      taxableBase: false,
      socialBase: true,
      employerCharge: false,
      payslipLabel: "CNPS employee",
      postingDebitAccountCode: "421000",
      postingCreditAccountCode: "431000",
      countryCode: "CM",
      statutoryParameterPath: "payroll.cnps.pensionRatesBps",
      countryPackVersion: "cm-2026.v1",
      countryPackSchemaVersion: "country-pack.v1",
      countryPackResolutionHash: "sha256:country-pack-resolution",
      countryPackLegalRef: "expert-review-required",
      countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
      countryPackCapabilityStatus: "SUPPORTED",
    }],
    assignments: [{
      id: "assignment-1",
      employeeId: "emp-1",
      employeeNumber: "EMP-001",
      rubriqueId: "rub-1",
      rubriqueCode: "CNPS_EMPLOYEE",
      status: PayrollRubriqueAssignmentStatus.DRAFT,
      amount: "[REDACTED:PAYROLL]",
      rateBps: "[REDACTED:PAYROLL]",
      quantity: "[REDACTED:PAYROLL]",
      currency: "XAF",
      effectiveFrom: "2026-07-01T00:00:00.000Z",
      effectiveTo: null,
      evidenceDocumentHashPresent: true,
      approvalBusinessEventPresent: false,
      hrisApprovalStatus: "REQUESTED",
      redactions: redaction(),
    }],
    salaryChanges: [{
      id: "salary-1",
      employeeId: "emp-1",
      employeeNumber: "EMP-001",
      sourceContractId: "contract-1",
      supersedingContractId: null,
      status: PayrollSalaryChangeStatus.REQUESTED,
      currentBaseSalary: "[REDACTED:PAYROLL]",
      proposedBaseSalary: "[REDACTED:PAYROLL]",
      currency: "XAF",
      effectiveFrom: "2026-08-01T00:00:00.000Z",
      requestedById: "requester-1",
      approvedById: null,
      appliedById: null,
      evidenceDocumentHashPresent: true,
      approvalEvidenceHashPresent: false,
      redactions: redaction(),
    }],
  }
}

describe("HRIS compensation boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScope.mockResolvedValue(accessScope())
    mockGetWorkflow.mockResolvedValue(workflow())
  })

  it("returns employee compensation through scoped redaction and ownership boundaries", async () => {
    const client = {
      payrollSalaryChangeRequest: { findFirst: jest.fn() },
    }

    const result = await getHrisEmployeeCompensation({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }, client as any)

    expect(mockScope).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      employeeId: "emp-1",
    }), client)
    expect(mockGetWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: expect.arrayContaining([
        "hris.people.read",
        "payroll.compensation.read",
      ]),
    }), client)
    expect(result.assignments[0]).toMatchObject({
      amount: "[REDACTED:PAYROLL]",
      rateBps: "[REDACTED:PAYROLL]",
      payrollReadiness: "BLOCKED",
    })
    expect(result.components[0]).toMatchObject({
      definitionOwner: "PAYROLL_COUNTRY_PACK",
      postingMapOwner: "ACCOUNTING",
      statutoryProvenance: { countryPackVersion: "cm-2026.v1" },
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("421000")
    expect(serialized).not.toContain("431000")
    expect(serialized).not.toContain("payroll.cnps.pensionRatesBps")
    expect(serialized).not.toContain("sha256:country-pack-resolution")
    expect(serialized).not.toContain("requester-1")
  })

  it("forces assignment requests to remain drafts behind the HRIS manage scope", async () => {
    const client = {
      payrollSalaryChangeRequest: { findFirst: jest.fn() },
    }
    mockAssign.mockResolvedValue({
      assignment: workflow().assignments[0],
      businessEventId: "event-request",
    })

    const result = await requestHrisCompensationAssignment({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      rubriqueId: "rub-1",
      amount: "10000.00",
      effectiveFrom: "2026-07-01",
      evidenceDocumentHash: "sha256:assignment-evidence",
    }, client as any)

    expect(mockAssign).toHaveBeenCalledWith(expect.objectContaining({
      status: PayrollRubriqueAssignmentStatus.DRAFT,
      actorPermissions: expect.arrayContaining([
        "hris.people.manage",
        "payroll.compensation.manage",
      ]),
    }), client)
    expect(result.assignment.approvalStatus).toBe("REQUESTED")
  })

  it("binds salary decisions to the scoped employee before delegation", async () => {
    const client = {
      payrollSalaryChangeRequest: { findFirst: jest.fn().mockResolvedValue(null) },
    }

    await expect(approveHrisSalaryChange({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      salaryChangeRequestId: "salary-other-employee",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    }, client as any)).rejects.toBeInstanceOf(NotFoundError)

    expect(client.payrollSalaryChangeRequest.findFirst).toHaveBeenCalledWith({
      where: {
        id: "salary-other-employee",
        organizationId: "org-1",
        employeeId: "emp-1",
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mockApproveSalary).not.toHaveBeenCalled()
  })

  it("delegates salary rejection through scoped HRIS authority", async () => {
    const client = {
      payrollSalaryChangeRequest: {
        findFirst: jest.fn().mockResolvedValue({ id: "salary-1" }),
      },
    }
    mockRejectSalary.mockResolvedValue({
      salaryChange: {
        ...workflow().salaryChanges[0],
        status: PayrollSalaryChangeStatus.REJECTED,
      },
      businessEventId: "event-salary-rejected",
    })

    const result = await rejectHrisSalaryChange({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      salaryChangeRequestId: "salary-1",
      decisionReason: "Request evidence is incomplete",
    }, client as any)

    expect(mockRejectSalary).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: expect.arrayContaining([
        "hris.people.manage",
        "payroll.salary_changes.approve",
      ]),
      salaryChangeRequestId: "salary-1",
      decisionReason: "Request evidence is incomplete",
    }), client)
    expect(result).toEqual(expect.objectContaining({
      businessEventId: "event-salary-rejected",
      salaryChange: expect.objectContaining({ status: PayrollSalaryChangeStatus.REJECTED }),
    }))
  })

  void applyApprovedSalaryChange
  void approveEmployeeRubriqueAssignment
  void requestSalaryChange
})
