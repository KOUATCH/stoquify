jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("@/services/communication/delivery-issues.service", () => ({ readDeliveryIssues: jest.fn() }))
import { requireRbacContext } from "@/lib/security/rbac"
import { readDeliveryIssues } from "@/services/communication/delivery-issues.service"
import { readDeliveryIssuesAction } from "../delivery-issues.actions"

beforeEach(() => jest.resetAllMocks())
it("always derives authority from the current session", async () => {
  const context = { orgId: "actual", userId: "reader", permissions: [] }
  ;(requireRbacContext as jest.Mock).mockResolvedValue(context)
  ;(readDeliveryIssues as jest.Mock).mockResolvedValue({ pages: [], checkedAt: "now" })
  expect(await readDeliveryIssuesAction({ source: "all" })).toEqual({ success: true, data: { pages: [], checkedAt: "now" } })
  expect(readDeliveryIssues).toHaveBeenCalledWith(context, { source: "all" })
})
it("does not read data without a session or disclose internal errors", async () => {
  ;(requireRbacContext as jest.Mock).mockRejectedValue(new Error("private context"))
  expect(await readDeliveryIssuesAction({})).toEqual({ success: false })
  expect(readDeliveryIssues).not.toHaveBeenCalled()
})
