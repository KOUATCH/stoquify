import { getAccountingControlCenterAction } from "../settings.actions"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { getAccountingControlCenterData } from "@/services/accounting/control-center.service"

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
  }
})

jest.mock("@/lib/security/auth-session", () => ({
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/services/accounting/control-center.service", () => ({
  getAccountingControlCenterData: jest.fn(),
}))

jest.mock("@/services/accounting/accounting-settings.service", () => ({
  ensureAccountingSettings: jest.fn(),
  markAccountingSetupReady: jest.fn(),
  updateAccountingSettings: jest.fn(),
}))

jest.mock("@/services/accounting/periods.service", () => ({
  closeAccountingPeriod: jest.fn(),
  createFiscalYearWithPeriods: jest.fn(),
  listAccountingPeriods: jest.fn(),
  listFiscalYears: jest.fn(),
}))

jest.mock("@/services/accounting/journals.service", () => ({
  ensureDefaultJournals: jest.fn(),
  listJournals: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockGetAccountingControlCenterData = getAccountingControlCenterData as jest.Mock

describe("accounting settings actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns a client-safe forbidden response when control-center access is denied", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getAccountingControlCenterAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetAccountingControlCenterData).not.toHaveBeenCalled()
  })

  it("returns the control-center data when the actor has setup access", async () => {
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["accounting.setup.manage"],
    })
    mockGetAccountingControlCenterData.mockResolvedValue({
      organizationId: "org-1",
      status: "ready_to_lock",
    })

    const result = await getAccountingControlCenterAction({})

    expect(result).toEqual({
      success: true,
      data: { organizationId: "org-1", status: "ready_to_lock" },
      error: null,
      status: 200,
    })
    expect(mockGetAccountingControlCenterData).toHaveBeenCalledWith("org-1", {
      actorPermissions: ["accounting.setup.manage"],
    })
  })
})
