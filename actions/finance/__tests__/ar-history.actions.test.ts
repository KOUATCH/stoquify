jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAnyPermission: jest.fn() }))
jest.mock("@/services/accounting/ar-open-item.service", () => ({ getCustomerAROpenItems: jest.fn() }))
jest.mock("@/services/accounting/ar-open-item-export.service", () => ({ prepareAROpenItemsExport: jest.fn() }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAnyPermission } from "@/lib/security/rbac"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"
import { prepareAROpenItemsExport } from "@/services/accounting/ar-open-item-export.service"
import { getAROpenItemsHistoryAction, prepareAROpenItemsHistoryExportAction } from "../ar-history.actions"

const ctx = { orgId: "org", userId: "actor", permissions: ["finance.receivables.read", "reports.export"] }
const verified = () => ({ ctx, claims: { sessionId: "session", lastAuthAt: Date.now() } })
beforeEach(() => { jest.resetAllMocks(); (requireAnyPermission as jest.Mock).mockResolvedValue(ctx); (requireFreshAuth as jest.Mock).mockResolvedValue(verified()); (getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [] }); (prepareAROpenItemsExport as jest.Mock).mockResolvedValue({ content: "private" }) })
it("binds selected customer reads to server identity and reports that scope", async () => {
  const result = await getAROpenItemsHistoryAction({ filters: { customerId: "customer" } })
  expect(getCustomerAROpenItems).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", customerId: "customer" }))
  expect(result).toMatchObject({ success: true, data: { scope: { organizationId: "org", actorUserId: "actor" } } })
})
it.each(["orgId", "userId"])("rejects a changed %s before returning history", async key => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce(ctx).mockResolvedValueOnce({ ...ctx, [key]: "changed" })
  expect(await getAROpenItemsHistoryAction()).toMatchObject({ success: false })
})
it.each([["reports.export"], ["finance.receivables.read"], []])("denies incomplete export permissions %j", async (...permissions) => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ ...verified(), ctx: { ...ctx, permissions } })
  expect(await prepareAROpenItemsHistoryExportAction()).toMatchObject({ success: false })
  expect(prepareAROpenItemsExport).not.toHaveBeenCalled()
})
it("requires fresh auth and rechecks session before returning export bytes", async () => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValueOnce(verified()).mockResolvedValueOnce({ ...verified(), claims: { ...verified().claims, sessionId: "changed" } })
  expect(await prepareAROpenItemsHistoryExportAction()).toMatchObject({ success: false })
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
})
it("denies expired and revoked authority", async () => {
  ;(requireFreshAuth as jest.Mock).mockRejectedValue(new Error("expired"))
  expect(await prepareAROpenItemsHistoryExportAction()).toMatchObject({ success: false })
  expect(prepareAROpenItemsExport).not.toHaveBeenCalled()
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce(ctx).mockRejectedValueOnce(new Error("revoked"))
  expect(await getAROpenItemsHistoryAction()).toMatchObject({ success: false })
})
it("returns authorized exports without accepting caller tenant or actor", async () => {
  expect(await prepareAROpenItemsHistoryExportAction({ organizationId: "foreign" })).toMatchObject({ success: false })
  expect(await prepareAROpenItemsHistoryExportAction({ filters: { customerId: "customer" } })).toMatchObject({ success: true })
  expect(prepareAROpenItemsExport).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", actorId: "actor", filters: { customerId: "customer" } }))
})
