import { revalidatePath } from "next/cache"
import {
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
} from "@prisma/client"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  applyApprovedSalaryChange,
  approveSalaryChange,
  assignEmployeeRubrique,
  getCompensationWorkflow,
  requestSalaryChange,
  upsertPayrollRubrique,
} from "@/services/payroll/compensation.service"

import {
  applyApprovedSalaryChangeAction,
  approveSalaryChangeAction,
  assignEmployeeRubriqueAction,
  getCompensationWorkflowAction,
  requestSalaryChangeAction,
  upsertPayrollRubriqueAction,
} from "../payroll-compensation.actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
    assertCanUseOrganization: jest.fn(),
  }
})

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payroll/compensation.service", () => {
  const actual = jest.requireActual("@/services/payroll/compensation.service")
  return {
    ...actual,
    getCompensationWorkflow: jest.fn(),
    upsertPayrollRubrique: jest.fn(),
    assignEmployeeRubrique: jest.fn(),
    requestSalaryChange: jest.fn(),
    approveSalaryChange: jest.fn(),
    rejectSalaryChange: jest.fn(),
    applyApprovedSalaryChange: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetCompensationWorkflow = getCompensationWorkflow as jest.Mock
const mockUpsertPayrollRubrique = upsertPayrollRubrique as jest.Mock
const mockAssignEmployeeRubrique = assignEmployeeRubrique as jest.Mock
const mockRequestSalaryChange = requestSalaryChange as jest.Mock
const mockApproveSalaryChange = approveSalaryChange as jest.Mock
const mockApplyApprovedSalaryChange = applyApprovedSalaryChange as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "actor-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.compensation.read",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: { moduleSlug: "payroll", status: "active", source: "requested_modules", startsAt: null, endsAt: null, readOnly: false, trial: false },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-06-26T00:00:00.000Z",
    ...overrides,
  }
}

function rbacContext(userId = "actor-1", permissions: string[] = []) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: userId,
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  }
}

describe("payroll compensation actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({})
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("passes authenticated tenant and actor context into compensation workflow reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.compensation.read"]))
    mockGetCompensationWorkflow.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-06-26T00:00:00.000Z",
      summary: {},
      rubriques: [],
      assignments: [],
      salaryChanges: [],
    })

    const result = await getCompensationWorkflowAction({
      organizationId: "client-org",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetCompensationWorkflow).toHaveBeenCalledWith({
      organizationId: "org-1",
      employeeId: "emp-1",
      actorId: "reader-1",
      actorPermissions: ["payroll.compensation.read"],
    })
  })

  it("blocks compensation reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.compensation.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      entitlement: null,
    }))

    const result = await getCompensationWorkflowAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetCompensationWorkflow).not.toHaveBeenCalled()
  })

  it("requires fresh auth before creating compensation rubriques", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await upsertPayrollRubriqueAction({
      code: "BASE",
      label: "Base salary",
      kind: PayrollRubriqueKind.EARNING,
      valueType: PayrollRubriqueValueType.FIXED_AMOUNT,
      status: PayrollRubriqueStatus.ACTIVE,
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockUpsertPayrollRubrique).not.toHaveBeenCalled()
  })

  it("derives tenant and actor context for rubrique and assignment writes", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("hr-1", ["payroll.compensation.manage"]))
    mockUpsertPayrollRubrique.mockResolvedValue({ businessEventId: "event-1", rubrique: { id: "rub-1" }, created: true })
    mockAssignEmployeeRubrique.mockResolvedValue({ businessEventId: "event-2", assignment: { id: "assignment-1" } })

    const rubriqueResult = await upsertPayrollRubriqueAction({
      organizationId: "client-org",
      actorId: "client-actor",
      code: "BASE",
      label: "Base salary",
      kind: PayrollRubriqueKind.EARNING,
      valueType: PayrollRubriqueValueType.FIXED_AMOUNT,
      status: PayrollRubriqueStatus.ACTIVE,
    })
    const assignmentResult = await assignEmployeeRubriqueAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      rubriqueId: "rub-1",
      amount: "10000.00",
      effectiveFrom: "2026-07-01",
    })

    expect(rubriqueResult.success).toBe(true)
    expect(assignmentResult.success).toBe(true)
    expect(mockUpsertPayrollRubrique).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.compensation.manage"],
    }))
    expect(mockAssignEmployeeRubrique).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.compensation.manage"],
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll", "page")
  })

  it("derives tenant and actor context for salary-change request and approval actions", async () => {
    mockRequirePermission
      .mockResolvedValueOnce(rbacContext("hr-1", ["payroll.salary_changes.request"]))
      .mockResolvedValueOnce(rbacContext("approver-1", ["payroll.salary_changes.approve"]))
      .mockResolvedValueOnce(rbacContext("payroll-ops-1", ["payroll.salary_changes.apply"]))
    mockRequestSalaryChange.mockResolvedValue({ businessEventId: "event-request", salaryChange: { id: "salary-change-1" } })
    mockApproveSalaryChange.mockResolvedValue({ businessEventId: "event-approve", salaryChange: { id: "salary-change-1" } })
    mockApplyApprovedSalaryChange.mockResolvedValue({ businessEventId: "event-apply", salaryChange: { id: "salary-change-1" } })

    await requestSalaryChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      sourceContractId: "contract-1",
      proposedBaseSalary: "180000.00",
      effectiveFrom: "2026-07-01",
      requestReason: "Promotion",
      evidenceDocumentHash: "sha256:request-evidence",
    })
    await approveSalaryChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      salaryChangeRequestId: "salary-change-1",
      decisionReason: "Approved",
      approvalEvidenceHash: "sha256:approval-evidence",
    })
    await applyApprovedSalaryChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      salaryChangeRequestId: "salary-change-1",
    })

    expect(mockRequestSalaryChange).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
    }))
    expect(mockApproveSalaryChange).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "approver-1",
    }))
    expect(mockApplyApprovedSalaryChange).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "payroll-ops-1",
    }))
  })

  it("returns client-safe RBAC denials before salary-change service calls", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await requestSalaryChangeAction({
      employeeId: "emp-1",
      sourceContractId: "contract-1",
      proposedBaseSalary: "180000.00",
      effectiveFrom: "2026-07-01",
      requestReason: "Promotion",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockRequestSalaryChange).not.toHaveBeenCalled()
  })
})
