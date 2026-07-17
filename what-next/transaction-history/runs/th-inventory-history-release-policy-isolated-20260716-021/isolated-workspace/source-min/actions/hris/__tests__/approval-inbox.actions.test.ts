import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  decideHrisApprovalInboxItem,
  getHrisApprovalInbox,
} from "@/services/hris/approval-inbox.service"

import {
  decideHrisApprovalInboxItemAction,
  getHrisApprovalInboxAction,
} from "../approval-inbox.actions"

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
jest.mock("@/services/hris/approval-inbox.service", () => ({
  decideHrisApprovalInboxItem: jest.fn(),
  getHrisApprovalInbox: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockGetInbox = getHrisApprovalInbox as jest.Mock
const mockDecide = decideHrisApprovalInboxItem as jest.Mock
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

describe("HRIS approval inbox actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-15T00:00:00.000Z" },
    })
    mockGetInbox.mockResolvedValue({ organizationId: "org-1", items: [] })
    mockDecide.mockResolvedValue({
      domain: "SALARY_CHANGE",
      decision: "APPROVE",
      status: "COMPLETED",
      businessEventId: "event-1",
    })
  })

  it("derives tenant authority and allowlists inbox filters", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("manager-1", ["hris.people.read"]),
    )

    const result = await getHrisApprovalInboxAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["hris.people.manage"],
      domain: "LIFECYCLE",
      stage: "REVIEW",
      limit: 25,
      internalAuthority: "TENANT_ADMIN",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.read", {
      resource: "HrisApprovalInbox",
      auditAllowed: false,
    })
    expect(mockGetInbox).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      domain: "LIFECYCLE",
      stage: "REVIEW",
      limit: 25,
    })
    expect(mockGetInbox.mock.calls[0][0]).not.toHaveProperty("internalAuthority")
  })

  it("requires fresh authentication before a decision", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await decideHrisApprovalInboxItemAction({
      domain: "SALARY_CHANGE",
      decision: "APPROVE",
      employeeId: "emp-1",
      sourceId: "salary-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockDecide).not.toHaveBeenCalled()
  })

  it("uses manage permission, server authority, and revalidates approval surfaces", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("checker-1", ["hris.people.manage"]),
    )

    const result = await decideHrisApprovalInboxItemAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["payroll.salary_changes.approve"],
      domain: "SALARY_CHANGE",
      decision: "APPROVE",
      employeeId: "emp-1",
      sourceId: "salary-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval",
      idempotencyKey: "inbox-approve-salary-1",
      requestedById: "forged-maker",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisApprovalInbox",
    })
    expect(mockDecide).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      domain: "SALARY_CHANGE",
      decision: "APPROVE",
      employeeId: "emp-1",
      sourceId: "salary-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval",
      idempotencyKey: "inbox-approve-salary-1",
    })
    expect(mockDecide.mock.calls[0][0]).not.toHaveProperty("requestedById")
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/people/approvals",
      "page",
    )
  })
})
