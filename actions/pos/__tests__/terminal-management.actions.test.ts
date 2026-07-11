import { revalidatePath, revalidateTag } from "next/cache"

import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  archiveTerminalForManagement,
  createTerminalForManagement,
  getTerminalManagementDataForOrg,
  updateTerminalForManagement,
} from "@/services/pos/terminal-management.service"

import {
  archiveManagedTerminal,
  createManagedTerminal,
  getTerminalManagementData,
  updateManagedTerminal,
} from "../terminal-management.actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
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
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/terminal-management.service", () => ({
  archiveTerminalForManagement: jest.fn(),
  createTerminalForManagement: jest.fn(),
  getTerminalManagementDataForOrg: jest.fn(),
  updateTerminalForManagement: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetTerminalManagementDataForOrg = getTerminalManagementDataForOrg as jest.Mock
const mockCreateTerminalForManagement = createTerminalForManagement as jest.Mock
const mockUpdateTerminalForManagement = updateTerminalForManagement as jest.Mock
const mockArchiveTerminalForManagement = archiveTerminalForManagement as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockRevalidateTag = revalidateTag as jest.Mock

const terminalInput = {
  terminalNumber: "T-001",
  name: "Front counter",
  locationId: "loc-1",
  isActive: true,
  hasCashDrawer: true,
}

const terminalRow = {
  id: "terminal-1",
  terminalNumber: "T-001",
  name: "Front counter",
  locationId: "loc-1",
  organizationId: "org-1",
  isActive: true,
  hasCashDrawer: true,
  currentSessionId: null,
  createdAt: new Date("2026-07-11T08:00:00.000Z"),
  updatedAt: new Date("2026-07-11T08:00:00.000Z"),
  locationName: "Main shop",
  locationCode: "MAIN",
  locationType: "STORE",
  currentSession: null,
  sessionsCount: 0,
  cashDrawersCount: 1,
  openCashDrawersCount: 0,
  salesOrdersCount: 0,
}

function rbacContext(overrides: Partial<{ orgId: string; isSuperUser: boolean; permissions: string[] }> = {}) {
  return {
    userId: "manager-1",
    orgId: overrides.orgId ?? "org-1",
    permissions: overrides.permissions ?? ["pos.read", "pos.session.start"],
    roles: [],
    isSuperUser: overrides.isSuperUser ?? false,
    fetchedAt: Date.now(),
    source: "better-auth",
  }
}

describe("terminal management actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetTerminalManagementDataForOrg.mockResolvedValue({
      terminals: [terminalRow],
      locations: [{ id: "loc-1", name: "Main shop", code: "MAIN", type: "STORE" }],
    })
    mockCreateTerminalForManagement.mockResolvedValue(terminalRow)
    mockUpdateTerminalForManagement.mockResolvedValue(terminalRow)
    mockArchiveTerminalForManagement.mockResolvedValue({ id: "terminal-1" })
  })

  it("loads terminal management data through explicit POS read RBAC and module observe evidence", async () => {
    const result = await getTerminalManagementData("org-1")

    expect(result).toEqual({
      success: true,
      data: {
        terminals: [terminalRow],
        locations: [{ id: "loc-1", name: "Main shop", code: "MAIN", type: "STORE" }],
      },
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.read", {
      resource: "POSTerminalManagement",
      resourceId: "org-1",
      auditAllowed: undefined,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "manager-1",
      actorPermissions: ["pos.read", "pos.session.start"],
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/terminal-management.actions.ts:getTerminalManagementData",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    })
    expect(mockGetTerminalManagementDataForOrg).toHaveBeenCalledWith("org-1")
  })

  it("blocks non-superuser cross-organization terminal reads before module observation or service execution", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext({ orgId: "org-1", isSuperUser: false }))

    const result = await getTerminalManagementData("org-2")

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "You do not have access to this organization",
    }))
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.read", {
      resource: "POSTerminalManagement",
      resourceId: "org-2",
      auditAllowed: undefined,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetTerminalManagementDataForOrg).not.toHaveBeenCalled()
  })

  it("observes the target organization before superuser cross-organization terminal reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext({ orgId: "org-1", isSuperUser: true }))

    const result = await getTerminalManagementData("org-2")

    expect(result.success).toBe(true)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-2",
      userId: "manager-1",
      moduleSlug: "pos",
      surface: "actions/pos/terminal-management.actions.ts:getTerminalManagementData",
      mode: "observe",
    }))
    expect(mockGetTerminalManagementDataForOrg).toHaveBeenCalledWith("org-2")
  })

  it("keeps module would-block decisions report-only while preserving wildcard evidence", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext({ permissions: ["*"] }))
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      wouldBlock: true,
      result: "would_block",
      rbacWildcardPresent: true,
      rbacWildcardBypassedEntitlement: false,
    })

    const result = await createManagedTerminal("org-1", terminalInput)

    expect(result.success).toBe(true)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "manager-1",
      actorPermissions: ["*"],
      moduleSlug: "pos",
      surface: "actions/pos/terminal-management.actions.ts:createManagedTerminal",
      accessIntent: "write",
      mode: "observe",
      audit: true,
    }))
    expect(mockCreateTerminalForManagement).toHaveBeenCalledWith("org-1", terminalInput)
  })

  it("denies terminal creation before invalid input validation, module observation, or service execution", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await createManagedTerminal("org-1", {
      terminalNumber: "",
      name: "",
      locationId: "",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Failed to create terminal",
    }))
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSTerminalManagement",
      resourceId: "org-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockCreateTerminalForManagement).not.toHaveBeenCalled()
  })

  it("authorizes and observes terminal update before returning a blank-terminal safe error", async () => {
    const result = await updateManagedTerminal("org-1", " ", terminalInput)

    expect(result).toEqual({
      success: false,
      data: null,
      error: "Terminal not found",
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSTerminalManagement",
      resourceId: "org-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      surface: "actions/pos/terminal-management.actions.ts:updateManagedTerminal",
      accessIntent: "write",
      mode: "observe",
    }))
    expect(mockUpdateTerminalForManagement).not.toHaveBeenCalled()
  })

  it("updates terminal management records through audited POS write RBAC and module observe evidence", async () => {
    const result = await updateManagedTerminal("org-1", "terminal-1", terminalInput)

    expect(result).toEqual({
      success: true,
      data: terminalRow,
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSTerminalManagement",
      resourceId: "terminal-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "manager-1",
      moduleSlug: "pos",
      surface: "actions/pos/terminal-management.actions.ts:updateManagedTerminal",
      accessIntent: "write",
      mode: "observe",
      audit: true,
    }))
    expect(mockUpdateTerminalForManagement).toHaveBeenCalledWith("org-1", "terminal-1", terminalInput)
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-terminals")
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-terminals-org-1")
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-terminal-terminal-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/settings/terminals", "page")
  })

  it("authorizes and observes terminal archive before returning a blank-terminal safe error", async () => {
    const result = await archiveManagedTerminal("org-1", "")

    expect(result).toEqual({
      success: false,
      data: null,
      error: "Terminal not found",
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSTerminalManagement",
      resourceId: "org-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      surface: "actions/pos/terminal-management.actions.ts:archiveManagedTerminal",
      accessIntent: "write",
      mode: "observe",
    }))
    expect(mockArchiveTerminalForManagement).not.toHaveBeenCalled()
  })

  it("archives terminals through audited POS write RBAC and module observe evidence", async () => {
    const result = await archiveManagedTerminal("org-1", "terminal-1")

    expect(result).toEqual({
      success: true,
      data: { id: "terminal-1" },
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSTerminalManagement",
      resourceId: "terminal-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "manager-1",
      moduleSlug: "pos",
      surface: "actions/pos/terminal-management.actions.ts:archiveManagedTerminal",
      accessIntent: "write",
      mode: "observe",
      audit: true,
    }))
    expect(mockArchiveTerminalForManagement).toHaveBeenCalledWith("org-1", "terminal-1")
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-terminal-terminal-1")
  })
})
