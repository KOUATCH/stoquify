import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  approvePayrollContractActivationFromHris,
  getEmployeeContractWorkflow,
  requestPayrollContractActivationFromHris,
} from "@/services/payroll/contract.service"

import {
  approveHrisContractActivation,
  getHrisEmployeeContractRegister,
  requestHrisContractActivation,
} from "../contract.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

jest.mock("@/services/payroll/contract.service", () => ({
  approvePayrollContractActivationFromHris: jest.fn(),
  getEmployeeContractWorkflow: jest.fn(),
  requestPayrollContractActivationFromHris: jest.fn(),
}))

const mockResolveScope = resolveHrisPeopleAccessScope as jest.Mock
const mockGetWorkflow = getEmployeeContractWorkflow as jest.Mock
const mockRequestActivation = requestPayrollContractActivationFromHris as jest.Mock
const mockApproveActivation = approvePayrollContractActivationFromHris as jest.Mock

const accessScope = {
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

function client() {
  return { auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) } }
}

function workflowContract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    employeeId: "emp-1",
    contractNumber: "CTR-001",
    type: "CDI",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    baseSalary: "[REDACTED:PAYROLL]",
    currency: "XAF",
    workingHoursPerMonth: "173.33",
    classification: "M2",
    echelon: "E1",
    convention: "Retail",
    signedDocumentHashPresent: true,
    activatedBusinessEventId: "event-1",
    hrisApprovalStatus: "LEGACY_ACTIVE",
    redactions: [{ field: "contracts.baseSalary", policy: "salary", reasonCode: "MISSING_PERMISSION" }],
    ...overrides,
  }
}

describe("HRIS contract facade", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveScope.mockResolvedValue(accessScope)
  })

  it("returns a scoped contract register without salary, user mapping, or document hashes", async () => {
    const scopedClient = client()
    mockGetWorkflow.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-15T00:00:00.000Z",
      summary: {},
      employees: [{
        id: "emp-1",
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        status: "ACTIVE",
        userId: "user-1",
        userMappingStatus: "linked",
        payrollEligible: true,
        activeContractId: "contract-1",
        contracts: [workflowContract()],
      }],
    })

    const result = await getHrisEmployeeContractRegister({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
    }, scopedClient as never)

    expect(mockResolveScope).toHaveBeenCalledWith(expect.objectContaining({ employeeId: "emp-1" }), scopedClient)
    expect(mockGetWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      employeeId: "emp-1",
      actorPermissions: ["payroll.contracts.read"],
    }), scopedClient)
    expect(result.employee?.contracts[0]).toMatchObject({
      approvalStatus: "LEGACY_ACTIVE",
      makerCheckerProven: false,
      payrollReadiness: "LEGACY_REVIEW_REQUIRED",
    })
    expect(JSON.stringify(result)).not.toMatch(/baseSalary|userId|signedDocumentHash|artifactHash/i)
  })

  it("fails before reading contracts when the employee is outside scope", async () => {
    mockResolveScope.mockRejectedValue(new ForbiddenError("Outside scope"))

    await expect(getHrisEmployeeContractRegister({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-2",
    }, client() as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockGetWorkflow).not.toHaveBeenCalled()
  })

  it("hashes the activation reason before delegating the request", async () => {
    mockRequestActivation.mockResolvedValue({
      contractId: "contract-1",
      employeeId: "emp-1",
      status: "REQUESTED",
      requestId: "event-1",
    })

    await requestHrisContractActivation({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      reason: "Approved hiring plan",
      requestEvidenceHash: "sha256:request-evidence",
    }, client() as never)

    expect(mockRequestActivation).toHaveBeenCalledWith(expect.objectContaining({
      reasonHash: expect.stringMatching(/^sha256:/),
      requestEvidenceHash: "sha256:request-evidence",
    }), expect.anything())
    expect(JSON.stringify(mockRequestActivation.mock.calls[0][0])).not.toContain("Approved hiring plan")
  })

  it("maps an approved activation without returning the salary field", async () => {
    mockApproveActivation.mockResolvedValue({
      contract: workflowContract({ hrisApprovalStatus: "APPROVED" }),
      businessEventId: "event-approved",
    })

    const result = await approveHrisContractActivation({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    }, client() as never)

    expect(result.contract).toMatchObject({ makerCheckerProven: true, payrollReadiness: "READY" })
    expect(JSON.stringify(result)).not.toMatch(/baseSalary|signedDocumentHash|artifactHash/i)
  })
})
