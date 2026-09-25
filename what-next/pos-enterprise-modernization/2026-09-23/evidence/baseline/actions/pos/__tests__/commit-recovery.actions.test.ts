jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { code = "FORBIDDEN"; status = 403 }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/services/pos/pos.service", () => ({ getPOSSaleCommitStatus: jest.fn() }))
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPOSSaleCommitStatus } from "@/services/pos/pos.service"
import { getPOSSaleCommitStatusAction } from "../commit-recovery.actions"

const request = { clientCommitId: "original-1", salesOrderId: "sale-1", locationId: "loc-1", terminalId: "terminal-1", sessionId: "shift-1", tenders: [{ method: "CASH", amount: 100 }] }
beforeEach(() => { jest.clearAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "cashier-1", permissions: ["pos.read"] }) })
it("reads retained own-result evidence using current read permission without a write-entitlement gate", async () => {
  ;(getPOSSaleCommitStatus as jest.Mock).mockResolvedValue({ kind: "RECORDED" })
  const result = await getPOSSaleCommitStatusAction({ ...request, userId: "injected-user" })
  expect(result.success).toBe(true)
  expect(requirePermission).toHaveBeenCalledWith("pos.read", expect.objectContaining({ resource: "POSCommitResult", auditAllowed: true }))
  expect(getPOSSaleCommitStatus).toHaveBeenCalledWith({ ...request, organizationId: "org-1", userId: "cashier-1" })
  expect(observeModuleAccess).not.toHaveBeenCalled()
})
it("denies a user without current read permission before loading a result", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
  expect((await getPOSSaleCommitStatusAction(request)).success).toBe(false)
  expect(getPOSSaleCommitStatus).not.toHaveBeenCalled()
})
it("does not convert a failed result read into not-found", async () => {
  ;(getPOSSaleCommitStatus as jest.Mock).mockRejectedValue(new Error("Database unavailable"))
  const result = await getPOSSaleCommitStatusAction(request)
  expect(result).toMatchObject({ success: false, data: null })
})
