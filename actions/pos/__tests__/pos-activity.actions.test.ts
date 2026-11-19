import { canUsePermission, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { readPOSActivity, readPOSActivityDetail } from "@/services/pos/pos-activity.service"
import { getPOSActivityDetailAction, listPOSActivityAction } from "../pos-activity.actions"

jest.mock("@/lib/security/rbac", () => ({
  canUsePermission: jest.fn(),
  requireAnyPermission: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/pos/pos-activity.service", () => ({
  readPOSActivity: jest.fn(),
  readPOSActivityDetail: jest.fn(),
}))

const cashier = { orgId: "tenant-a", userId: "cashier-a", permissions: ["OPERATE_POS"] }
const manager = { ...cashier, permissions: ["OPERATE_POS", "finance.cash-drawer.read"] }

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(requireAnyPermission).mockResolvedValue(cashier as Awaited<ReturnType<typeof requireAnyPermission>>)
  jest.mocked(canUsePermission).mockReturnValue(true)
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof observeModuleAccess>>)
})

it("uses the server actor, module entitlement, and cashier scope", async () => {
  const filters = { date: "2026-11-18", locationId: null, view: "receipts", search: "A-123" } as const
  await expect(listPOSActivityAction(filters)).resolves.toMatchObject({
    success: true, scope: { organizationId: "tenant-a", actorId: "cashier-a" },
  })
  expect(requireAnyPermission).toHaveBeenCalledWith(expect.arrayContaining(["OPERATE_POS"]), { resource: "POSActivity" })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
    organizationId: "tenant-a", userId: "cashier-a", moduleSlug: "pos", accessIntent: "read", mode: "enforce",
  }))
  expect(readPOSActivity).toHaveBeenCalledWith(expect.objectContaining({
    organizationId: "tenant-a", userId: "cashier-a", manager: false, canUseWhatsApp: true,
  }), filters)
})

it("grants broader activity scope only from existing finance authority", async () => {
  jest.mocked(requireAnyPermission).mockResolvedValue(manager as Awaited<ReturnType<typeof requireAnyPermission>>)
  await getPOSActivityDetailAction({ id: "sale", kind: "sale" })
  expect(readPOSActivityDetail).toHaveBeenCalledWith(expect.objectContaining({ manager: true }), { id: "sale", kind: "sale" })
})

it("denies writes to the read scope and suppresses reads for unavailable POS modules", async () => {
  await expect(listPOSActivityAction({ organizationId: "unauthorized-tenant" })).resolves.toMatchObject({
    success: false, data: null, status: 400,
  })
  expect(requireAnyPermission).not.toHaveBeenCalled()
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof observeModuleAccess>>)
  await expect(getPOSActivityDetailAction({ id: "sale", kind: "sale" })).resolves.toMatchObject({
    success: false, data: null, status: 403,
  })
  expect(readPOSActivity).not.toHaveBeenCalled()
  expect(readPOSActivityDetail).not.toHaveBeenCalled()
})

