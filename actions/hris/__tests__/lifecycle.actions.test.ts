import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  applyApprovedHrisEmployeeLifecycle,
  approveHrisEmployeeLifecycle,
  getHrisEmployeeLifecycleTimeline,
  rejectHrisEmployeeLifecycle,
  requestHrisEmployeeLifecycle,
} from "@/services/hris/lifecycle.service"

import {
  approveHrisEmployeeLifecycleAction,
  getHrisEmployeeLifecycleTimelineAction,
  requestHrisEmployeeLifecycleAction,
} from "../lifecycle.actions"

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
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/hris/lifecycle.service", () => ({
  applyApprovedHrisEmployeeLifecycle: jest.fn(),
  approveHrisEmployeeLifecycle: jest.fn(),
  getHrisEmployeeLifecycleTimeline: jest.fn(),
  rejectHrisEmployeeLifecycle: jest.fn(),
  requestHrisEmployeeLifecycle: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockTimeline = getHrisEmployeeLifecycleTimeline as jest.Mock
const mockRequest = requestHrisEmployeeLifecycle as jest.Mock
const mockApprove = approveHrisEmployeeLifecycle as jest.Mock
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

describe("HRIS lifecycle actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: "2026-07-14T00:00:00.000Z" } })
    mockTimeline.mockResolvedValue({ organizationId: "org-1", employee: { id: "emp-1" }, events: [] })
    mockRequest.mockResolvedValue({ employee: { id: "emp-1" }, workflow: { status: "REQUESTED" } })
    mockApprove.mockResolvedValue({ employee: { id: "emp-1" }, workflow: { status: "APPROVED" } })
  })

  it("derives tenant and actor context for lifecycle timeline reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("auditor-1", ["hris.people.read"]))

    const result = await getHrisEmployeeLifecycleTimelineAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      limit: 20,
    })

    expect(result.success).toBe(true)
    expect(mockTimeline).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "auditor-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
      limit: 20,
    })
  })

  it("requires fresh authentication before lifecycle mutations", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await requestHrisEmployeeLifecycleAction({
      employeeId: "emp-1",
      type: "SUSPEND",
      effectiveAt: "2026-08-01",
      reason: "Pending investigation",
      evidenceHash: "sha256:evidence-hash",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it("uses the manage gate, ignores submitted authority, and refreshes dependent views", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("checker-1", ["hris.people.manage"]))

    const result = await approveHrisEmployeeLifecycleAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      requestId: "request-1",
      decisionReason: "Verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisEmployeeLifecycle",
    })
    expect(mockApprove).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/people", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/command-center", "page")
  })

  void applyApprovedHrisEmployeeLifecycle
  void rejectHrisEmployeeLifecycle
})
