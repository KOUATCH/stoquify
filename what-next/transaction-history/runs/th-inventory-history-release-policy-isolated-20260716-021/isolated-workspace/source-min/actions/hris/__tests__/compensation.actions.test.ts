import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  approveHrisCompensationAssignment,
  getHrisEmployeeCompensation,
  requestHrisCompensationAssignment,
} from "@/services/hris/compensation.service"

import {
  approveHrisCompensationAssignmentAction,
  getHrisEmployeeCompensationAction,
  requestHrisCompensationAssignmentAction,
} from "../compensation.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {},
  assertCanUseOrganization: jest.fn(),
  isRbacError: jest.fn(() => false),
  requirePermission: jest.fn(),
}))

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

jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/services/hris/compensation.service", () => ({
  applyApprovedHrisSalaryChange: jest.fn(),
  approveHrisCompensationAssignment: jest.fn(),
  approveHrisSalaryChange: jest.fn(),
  getHrisEmployeeCompensation: jest.fn(),
  requestHrisCompensationAssignment: jest.fn(),
  requestHrisSalaryChange: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockGetCompensation = getHrisEmployeeCompensation as jest.Mock
const mockRequestAssignment = requestHrisCompensationAssignment as jest.Mock
const mockApproveAssignment = approveHrisCompensationAssignment as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function rbacContext(userId: string, permissions: string[]) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: { id: userId, roles: [], permissions, organizationId: "org-1" },
  }
}

describe("HRIS compensation actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-15T00:00:00.000Z" },
    })
    mockGetCompensation.mockResolvedValue({ organizationId: "org-1", assignments: [] })
    mockRequestAssignment.mockResolvedValue({
      assignment: { id: "assignment-1", approvalStatus: "REQUESTED" },
    })
    mockApproveAssignment.mockResolvedValue({
      assignment: { id: "assignment-1", approvalStatus: "APPROVED" },
    })
  })

  it("derives tenant and actor context for compensation reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("manager-1", ["hris.people.read"]))

    const result = await getHrisEmployeeCompensationAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetCompensation).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }))
  })

  it("requires fresh authentication before compensation mutations", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await requestHrisCompensationAssignmentAction({
      employeeId: "emp-1",
      rubriqueId: "rub-1",
      amount: "10000.00",
      effectiveFrom: "2026-07-01",
      evidenceDocumentHash: "sha256:assignment-evidence",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockRequestAssignment).not.toHaveBeenCalled()
  })

  it("uses the HRIS manage gate and ignores submitted authority on approval", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("checker-1", ["hris.people.manage"]))

    const result = await approveHrisCompensationAssignmentAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      assignmentId: "assignment-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisEmployeeCompensation",
    })
    expect(mockApproveAssignment).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/compensation",
      "page",
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/command-center",
      "page",
    )
  })
})
