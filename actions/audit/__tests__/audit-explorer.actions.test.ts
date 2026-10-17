jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("@/services/audit/audit-explorer.service", () => ({ readAuditExplorer: jest.fn() }))
import { requireRbacContext } from "@/lib/security/rbac"
import { readAuditExplorer } from "@/services/audit/audit-explorer.service"
import { ConflictError, ForbiddenError } from "@/services/_shared/action-errors"
import { readAuditExplorerAction } from "../audit-explorer.actions"
beforeEach(() => jest.resetAllMocks())
it("derives authority from the session", async () => {
  const ctx = { orgId: "actual", userId: "reader", permissions: [] }
  ;(requireRbacContext as jest.Mock).mockResolvedValue(ctx)
  ;(readAuditExplorer as jest.Mock).mockResolvedValue({ entries: [] })
  expect(await readAuditExplorerAction({ family: "all" })).toEqual({ success: true, data: { entries: [] } })
  expect(readAuditExplorer).toHaveBeenCalledWith(ctx, { family: "all" })
})
it.each([[new ForbiddenError("secret"), "restricted"], [new ConflictError("secret"), "snapshot"], [new Error("secret"), "unavailable"]])("returns a safe failure category", async (error, reason) => {
  ;(requireRbacContext as jest.Mock).mockResolvedValue({})
  ;(readAuditExplorer as jest.Mock).mockRejectedValue(error)
  expect(await readAuditExplorerAction({})).toEqual({ success: false, reason })
})
