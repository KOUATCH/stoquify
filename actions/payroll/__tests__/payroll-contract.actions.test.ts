import { revalidatePath } from "next/cache"
import { PayrollContractStatus, PayrollContractType } from "@prisma/client"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createPayrollContract,
  getEmployeeContractWorkflow,
  resolvePayrollEmployeeForUser,
  terminatePayrollContract,
  updatePayrollContract,
} from "@/services/payroll/contract.service"

import {
  createPayrollContractAction,
  getEmployeeContractWorkflowAction,
  resolvePayrollEmployeeForUserAction,
  terminatePayrollContractAction,
  updatePayrollContractAction,
} from "../payroll-contract.actions"

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

jest.mock("@/services/payroll/contract.service", () => {
  const actual = jest.requireActual("@/services/payroll/contract.service")
  return {
    ...actual,
    getEmployeeContractWorkflow: jest.fn(),
    resolvePayrollEmployeeForUser: jest.fn(),
    createPayrollContract: jest.fn(),
    updatePayrollContract: jest.fn(),
    terminatePayrollContract: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetEmployeeContractWorkflow = getEmployeeContractWorkflow as jest.Mock
const mockResolvePayrollEmployeeForUser = resolvePayrollEmployeeForUser as jest.Mock
const mockCreatePayrollContract = createPayrollContract as jest.Mock
const mockUpdatePayrollContract = updatePayrollContract as jest.Mock
const mockTerminatePayrollContract = terminatePayrollContract as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "actor-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.contracts.read",
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

describe("payroll contract actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({})
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("passes tenant, actor, and permission context into employee contract workflow reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("payroll-reader-1", ["payroll.contracts.read"]))
    mockGetEmployeeContractWorkflow.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-06-26T00:00:00.000Z",
      summary: {},
      employees: [],
    })

    const result = await getEmployeeContractWorkflowAction({
      organizationId: "client-org",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetEmployeeContractWorkflow).toHaveBeenCalledWith({
      organizationId: "org-1",
      employeeId: "emp-1",
      actorId: "payroll-reader-1",
      actorPermissions: ["payroll.contracts.read"],
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "payroll-reader-1",
      moduleSlug: "payroll",
      surface: "payroll.contracts.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("blocks contract workflow reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("payroll-reader-1", ["payroll.contracts.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
    }))

    const result = await getEmployeeContractWorkflowAction({ employeeId: "emp-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(mockGetEmployeeContractWorkflow).not.toHaveBeenCalled()
  })

  it("derives employee-user resolver context from the authenticated payroll reader", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("payroll-reader-1", ["payroll.contracts.read"]))
    mockResolvePayrollEmployeeForUser.mockResolvedValue({
      organizationId: "org-1",
      userId: "employee-user-1",
      employeeId: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
    })

    const result = await resolvePayrollEmployeeForUserAction({
      organizationId: "client-org",
      userId: "employee-user-1",
      requestedEmployeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockResolvePayrollEmployeeForUser).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "employee-user-1",
      requestedEmployeeId: "emp-1",
      actorId: "payroll-reader-1",
      actorPermissions: ["payroll.contracts.read"],
    })
  })

  it("requires fresh auth before creating a payroll contract", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await createPayrollContractAction({
      employeeId: "emp-1",
      contractNumber: "CTR-001",
      type: PayrollContractType.CDI,
      effectiveFrom: "2026-01-01",
      baseSalary: "150000.00",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      retryable: false,
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockCreatePayrollContract).not.toHaveBeenCalled()
  })

  it("derives tenant and actor fields for contract create and revalidates payroll paths", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("hr-1", ["payroll.contracts.manage"]))
    mockCreatePayrollContract.mockResolvedValue({
      businessEventId: "event-1",
      contract: { id: "contract-1" },
    })

    const result = await createPayrollContractAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      contractNumber: "CTR-001",
      type: PayrollContractType.CDI,
      status: PayrollContractStatus.DRAFT,
      effectiveFrom: "2026-01-01",
      baseSalary: "150000.00",
    })

    expect(result.success).toBe(true)
    expect(mockCreatePayrollContract).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.contracts.manage"],
      employeeId: "emp-1",
    }))
    expect(mockCreatePayrollContract.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      actorId: "client-actor",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/payroll", "page")
  })

  it("derives tenant and actor fields for contract update and termination", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("hr-1", ["payroll.contracts.manage"]))
    mockUpdatePayrollContract.mockResolvedValue({
      businessEventId: "event-update",
      contract: { id: "contract-1" },
    })
    mockTerminatePayrollContract.mockResolvedValue({
      businessEventId: "event-terminate",
      contract: { id: "contract-1" },
    })

    const updateResult = await updatePayrollContractAction({
      organizationId: "client-org",
      actorId: "client-actor",
      contractId: "contract-1",
      classification: "M3",
    })
    const terminateResult = await terminatePayrollContractAction({
      organizationId: "client-org",
      actorId: "client-actor",
      contractId: "contract-1",
      effectiveTo: "2026-06-30",
      terminationReason: "End of employment",
    })

    expect(updateResult.success).toBe(true)
    expect(terminateResult.success).toBe(true)
    expect(mockUpdatePayrollContract).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      contractId: "contract-1",
    }))
    expect(mockTerminatePayrollContract).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      contractId: "contract-1",
    }))
  })

  it("returns a client-safe RBAC denial for contract creates", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await createPayrollContractAction({
      employeeId: "emp-1",
      contractNumber: "CTR-001",
      type: PayrollContractType.CDI,
      effectiveFrom: "2026-01-01",
      baseSalary: "150000.00",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockCreatePayrollContract).not.toHaveBeenCalled()
  })
})
