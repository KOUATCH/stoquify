import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import {
  getHrisEmployeeDirectory,
  getHrisEmployeeProfile,
  getOwnHrisEmployeeProfile,
  upsertHrisEmployeeProfile,
} from "@/services/hris/employee.service"

import {
  getHrisEmployeeDirectoryAction,
  getHrisEmployeeProfileAction,
  getOwnHrisEmployeeProfileAction,
  upsertHrisEmployeeProfileAction,
} from "../employee.actions"

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
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
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
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/hris/employee.service", () => ({
  getHrisEmployeeDirectory: jest.fn(),
  getHrisEmployeeProfile: jest.fn(),
  getOwnHrisEmployeeProfile: jest.fn(),
  upsertHrisEmployeeProfile: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockGetDirectory = getHrisEmployeeDirectory as jest.Mock
const mockGetProfile = getHrisEmployeeProfile as jest.Mock
const mockGetOwnProfile = getOwnHrisEmployeeProfile as jest.Mock
const mockUpsertProfile = upsertHrisEmployeeProfile as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function rbacContext(userId = "actor-1", permissions = ["hris.people.read"]) {
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

describe("HRIS employee actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-14T00:00:00.000Z" },
    })
    mockGetDirectory.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-14T00:00:00.000Z",
      employees: [],
      summary: {},
      redaction: {},
      dataOwnership: {},
    })
    mockGetProfile.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-14T00:00:00.000Z",
      employee: { id: "emp-1" },
      redaction: {},
      dataOwnership: {},
    })
  })

  it("derives tenant and actor context for HRIS directory reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1"))

    const result = await getHrisEmployeeDirectoryAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "other-employee",
      userId: "other-user",
      limit: 25,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.read", {
      resource: "HrisEmployee",
      auditAllowed: false,
    })
    expect(mockGetDirectory).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["hris.people.read"],
      limit: 25,
    })
    expect(mockGetDirectory.mock.calls[0][0]).not.toHaveProperty("employeeId")
    expect(mockGetDirectory.mock.calls[0][0]).not.toHaveProperty("userId")
  })

  it("derives the tenant for an HRIS profile read", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1"))

    const result = await getHrisEmployeeProfileAction({
      organizationId: "client-org",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetProfile).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    })
  })

  it("ignores submitted identifiers when resolving the authenticated user's employee profile", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("employee-user-1", ["hris.self_service.read"]),
    )
    mockGetOwnProfile.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-14T00:00:00.000Z",
      employee: { id: "emp-1" },
      redaction: {},
      dataOwnership: {},
    })

    const result = await getOwnHrisEmployeeProfileAction({
      organizationId: "other-org",
      actorId: "other-user",
      employeeId: "other-employee",
      userId: "other-user",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.self_service.read", {
      resource: "HrisEmployee",
      auditAllowed: false,
    })
    expect(mockGetOwnProfile).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["hris.self_service.read"],
    })
  })

  it("requires fresh authentication before an HRIS profile write", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await upsertHrisEmployeeProfileAction({
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      hireDate: "2026-01-01",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockUpsertProfile).not.toHaveBeenCalled()
  })

  it("uses the HRIS manage gate and revalidates People and payroll compatibility views", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("hr-admin-1", ["hris.people.manage"]))
    mockUpsertProfile.mockResolvedValue({
      payrollEmployee: { id: "emp-1" },
      created: true,
      businessEventId: "event-1",
      evidenceReferenceCount: 0,
      dataOwnership: {},
    })

    const result = await upsertHrisEmployeeProfileAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      hireDate: "2026-01-01",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisEmployee",
    })
    expect(mockUpsertProfile).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.manage"],
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/people", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/employees", "page")
  })

  it("returns a safe denial before HRIS services run", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getHrisEmployeeProfileAction({ employeeId: "emp-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetProfile).not.toHaveBeenCalled()
  })
})