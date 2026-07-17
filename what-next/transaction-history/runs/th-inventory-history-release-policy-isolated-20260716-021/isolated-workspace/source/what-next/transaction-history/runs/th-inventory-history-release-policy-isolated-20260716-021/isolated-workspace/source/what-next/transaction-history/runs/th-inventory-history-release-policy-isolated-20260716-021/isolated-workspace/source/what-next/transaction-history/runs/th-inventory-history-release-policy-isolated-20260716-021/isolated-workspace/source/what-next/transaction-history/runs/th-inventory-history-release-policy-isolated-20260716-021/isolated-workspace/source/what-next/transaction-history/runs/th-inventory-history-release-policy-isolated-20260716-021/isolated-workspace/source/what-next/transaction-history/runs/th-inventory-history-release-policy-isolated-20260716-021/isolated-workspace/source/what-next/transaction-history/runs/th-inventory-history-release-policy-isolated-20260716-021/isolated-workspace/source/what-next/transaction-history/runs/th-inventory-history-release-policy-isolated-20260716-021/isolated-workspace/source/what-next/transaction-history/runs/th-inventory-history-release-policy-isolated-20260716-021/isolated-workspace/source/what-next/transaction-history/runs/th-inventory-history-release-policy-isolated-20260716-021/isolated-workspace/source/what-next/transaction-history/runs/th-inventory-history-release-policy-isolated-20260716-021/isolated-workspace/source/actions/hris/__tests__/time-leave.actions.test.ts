import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  certifyHrisTimeLeaveAttendance,
  correctCertifiedHrisTimeLeaveAttendance,
  getHrisTimeLeaveAttendanceStatus,
} from "@/services/hris/time-leave.service"

import {
  certifyHrisTimeLeaveAttendanceAction,
  correctCertifiedHrisTimeLeaveAttendanceAction,
  getHrisTimeLeaveAttendanceStatusAction,
} from "../time-leave.actions"

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
jest.mock("@/services/hris/time-leave.service", () => ({
  certifyHrisTimeLeaveAttendance: jest.fn(),
  correctCertifiedHrisTimeLeaveAttendance: jest.fn(),
  getHrisTimeLeaveAttendanceStatus: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockCertify = certifyHrisTimeLeaveAttendance as jest.Mock
const mockCorrect = correctCertifiedHrisTimeLeaveAttendance as jest.Mock
const mockRead = getHrisTimeLeaveAttendanceStatus as jest.Mock
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

describe("HRIS time, leave, and attendance actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-15T00:00:00.000Z" },
    })
    mockRead.mockResolvedValue({ organizationId: "org-1", snapshots: [] })
    mockCertify.mockResolvedValue({
      attendanceSnapshot: { id: "attendance-1", certificationStatus: "CERTIFIED" },
    })
    mockCorrect.mockResolvedValue({
      attendanceSnapshot: { id: "attendance-2", correctedFromId: "attendance-1" },
    })
  })

  it("derives tenant and actor context for time and attendance reads", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("manager-1", ["hris.people.read"]),
    )

    const result = await getHrisTimeLeaveAttendanceStatusAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockRead).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }))
  })

  it("requires fresh authentication before manager certification", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await certifyHrisTimeLeaveAttendanceAction({
      payrollPeriodId: "period-1",
      employeeId: "emp-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockCertify).not.toHaveBeenCalled()
  })

  it("uses manager scope while ignoring submitted tenant and approver authority", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("manager-1", ["hris.people.read"]),
    )

    const result = await certifyHrisTimeLeaveAttendanceAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["payroll.attendance.freeze"],
      approvedById: "client-approver",
      payrollPeriodId: "period-1",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.read", {
      resource: "HrisTimeLeaveAttendance",
    })
    expect(mockCertify).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }))
    expect(mockCertify.mock.calls[0][0]).not.toHaveProperty("approvedById")
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/attendance",
      "page",
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/command-center",
      "page",
    )
  })

  it("requires the HRIS manage gate and fresh authentication for corrections", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("hr-admin-1", ["hris.people.manage"]),
    )

    const result = await correctCertifiedHrisTimeLeaveAttendanceAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      payrollPeriodId: "period-1",
      originalAttendanceSnapshotId: "attendance-1",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisTimeLeaveAttendance",
    })
    expect(mockCorrect).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.manage"],
      originalAttendanceSnapshotId: "attendance-1",
    }))
  })
})
