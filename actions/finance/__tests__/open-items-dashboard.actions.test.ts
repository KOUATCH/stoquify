jest.mock("@/lib/security/rbac", () => ({ requireAnyPermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/finance/open-items-dashboard.service", () => ({ getOpenItemsDashboard: jest.fn() }))
jest.mock("@/services/analytics/sales-collections.service", () => ({ getSalesCollections: jest.fn() }))
jest.mock("@/services/finance/payables-workflow-dashboard.service", () => ({ getPayablesWorkflowDashboard: jest.fn() }))
import { requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getOpenItemsDashboard } from "@/services/finance/open-items-dashboard.service"
import { getSalesCollections } from "@/services/analytics/sales-collections.service"
import { getOpenItemsDashboardAction, getReceivablesCollectionsAction, getPayablesWorkflowDashboardAction } from "../open-items-dashboard.actions"
import { getPayablesWorkflowDashboard } from "@/services/finance/payables-workflow-dashboard.service"
const ctx = { orgId: "org1", userId: "u1", permissions: ["finance.receivables.read"] }
beforeEach(() => {
  jest.resetAllMocks()
  ;(requireAnyPermission as jest.Mock).mockResolvedValue(ctx)
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(getOpenItemsDashboard as jest.Mock).mockResolvedValue({ kind: "open-items-v1", organization: { id: "org1" }, currencies: [] })
  ;(getSalesCollections as jest.Mock).mockResolvedValue({ currency: "XAF", net: "10.00", creditIssued: "999.00" })
  ;(getPayablesWorkflowDashboard as jest.Mock).mockResolvedValue({ counts: {} })
})
it("requires the existing workbench permission before querying workflow sources", async () => {
  expect(await getPayablesWorkflowDashboardAction({})).toMatchObject({ success: true, data: { state: "restricted" } })
  expect(getPayablesWorkflowDashboard).not.toHaveBeenCalled()
  ;(requireAnyPermission as jest.Mock).mockResolvedValue({ ...ctx, permissions: ["purchasing.ap.invoice.view"] })
  expect((await getPayablesWorkflowDashboardAction({})).success).toBe(true)
  expect(getPayablesWorkflowDashboard).toHaveBeenCalledWith("org1", { approval: false, execution: false })
})
it("discards workflow counts on payment permission revocation and rejects caller scope", async () => {
  const permissions = ["purchasing.ap.invoice.view", "purchasing.ap.payment.approve", "purchasing.ap.payment.release"]
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce({ ...ctx, permissions }).mockResolvedValueOnce({ ...ctx, permissions: ["purchasing.ap.invoice.view"] })
  expect((await getPayablesWorkflowDashboardAction({})).success).toBe(false)
  expect((await getPayablesWorkflowDashboardAction({ organizationId: "org2" })).success).toBe(false)
  expect(getPayablesWorkflowDashboard).toHaveBeenCalledTimes(1)
})
it("binds tenant on the server and rejects caller authority/period injection", async () => {
  expect((await getOpenItemsDashboardAction({ view: "receivables" })).success).toBe(true)
  expect(getOpenItemsDashboard).toHaveBeenCalledWith(expect.objectContaining({ view: "receivables" }), "org1")
  for (const extra of [{ organizationId: "foreign" }, { actorPermissions: ["*"] }, { asOf: "2020-01-01" }, { period: "mtd" }]) expect((await getOpenItemsDashboardAction({ view: "receivables", ...extra })).success).toBe(false)
  expect(getOpenItemsDashboard).toHaveBeenCalledTimes(1)
})
it("does not query denied sources and enforces the purchasing module", async () => {
  ;(requireAnyPermission as jest.Mock).mockRejectedValueOnce(new Error("denied"))
  expect((await getOpenItemsDashboardAction({ view: "receivables" })).success).toBe(false)
  expect(getOpenItemsDashboard).not.toHaveBeenCalled()
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  expect(await getOpenItemsDashboardAction({ view: "payables" })).toMatchObject({ success: false, reason: "locked_module" })
  expect(getOpenItemsDashboard).not.toHaveBeenCalled()
})
it("rechecks authority after the read", async () => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce(ctx).mockResolvedValueOnce({ ...ctx, orgId: "org2" })
  expect((await getOpenItemsDashboardAction({ view: "receivables" })).success).toBe(false)
})
it("returns only a restricted marker without querying receipts", async () => {
  const result = await getReceivablesCollectionsAction({ start: "2026-10-01", end: "2026-10-02" })
  expect(result).toMatchObject({ success: true, data: { state: "restricted" } })
  expect(getSalesCollections).not.toHaveBeenCalled()
})
it("omits sales-only credit data and checks receipt access independently", async () => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValue({ ...ctx, permissions: [...ctx.permissions, "finance.payments.read"] })
  const result = await getReceivablesCollectionsAction({ start: "2026-10-01", end: "2026-10-02" })
  expect(result).toMatchObject({ success: true, data: { state: "ready", report: { net: "10.00" } } })
  expect(JSON.stringify(result)).not.toContain("creditIssued")
  expect(getSalesCollections).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org1", preset: "custom" }), { includeCreditIssued: false })
})
it("discards receipts if access is revoked during the read", async () => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce({ ...ctx, permissions: [...ctx.permissions, "finance.payments.read"] }).mockResolvedValueOnce(ctx)
  expect((await getReceivablesCollectionsAction({ start: "2026-10-01", end: "2026-10-02" })).success).toBe(false)
})

it.each([
  ["purchasing.ap.payment.approve", { approval: true, execution: false }],
  ["purchasing.ap.payment.release", { approval: false, execution: true }],
])("isolates the %s workflow capability", async (permission, expected) => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValue({ ...ctx, permissions: ["purchasing.ap.invoice.view", permission] })
  expect(await getPayablesWorkflowDashboardAction({})).toMatchObject({ success: true, data: { organizationId: "org1", state: "ready" } })
  expect(getPayablesWorkflowDashboard).toHaveBeenCalledWith("org1", expected)
})

it("discards AP workflow evidence if the module becomes unavailable during the read", async () => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValue({ ...ctx, permissions: ["purchasing.ap.invoice.view"] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false })
  const result = await getPayablesWorkflowDashboardAction({})
  expect(result.success).toBe(false)
  expect(result.data).toBeNull()
  expect(getPayablesWorkflowDashboard).toHaveBeenCalledTimes(1)
})

it.each(["orgId", "userId"])("discards workflow counts after a %s change", async key => {
  const authorized = { ...ctx, permissions: ["purchasing.ap.invoice.view"] }
  ;(requireAnyPermission as jest.Mock).mockResolvedValueOnce(authorized).mockResolvedValueOnce({ ...authorized, [key]: "changed" })
  const result = await getPayablesWorkflowDashboardAction({})
  expect(result.success).toBe(false)
  expect(result.data).toBeNull()
})
