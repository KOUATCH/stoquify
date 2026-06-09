import { protect } from "@/services/_shared/protect"
import { RbacError, requirePermission } from "@/lib/security/rbac"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock

describe("protect", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("passes input and RBAC context to the handler when authorized", async () => {
    const ctx = { userId: "user-1", orgId: "org-1", permissions: ["users.read"] }
    mockRequirePermission.mockResolvedValue(ctx)
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ id: string }, { ok: boolean }>(
      { permission: "users.read", auditResource: "User" },
      handler,
    )
    const result = await action({ id: "user-2" })

    expect(result).toEqual({ success: true, data: { ok: true }, error: null, status: 200 })
    expect(mockRequirePermission).toHaveBeenCalledWith("users.read", { resource: "User" })
    expect(handler).toHaveBeenCalledWith({ id: "user-2" }, ctx)
  })

  it("returns forbidden when the RBAC check fails", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    const handler = jest.fn()

    const action = protect({ permission: "users.delete" }, handler)
    const result = await action({ id: "user-2" })

    expect(result).toEqual({ success: false, data: null, error: "Forbidden", status: 403 })
    expect(handler).not.toHaveBeenCalled()
  })
})
