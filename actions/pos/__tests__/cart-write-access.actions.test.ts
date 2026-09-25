jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
jest.mock("@/services/pos/pos.service", () => ({ addPOSCartLine: jest.fn(), updatePOSCartLine: jest.fn(), removePOSCartLine: jest.fn(), getActivePOSCart: jest.fn() }))
import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { addPOSCartLine, updatePOSCartLine, removePOSCartLine } from "@/services/pos/pos.service"
import { POSCartWriteAccessError } from "@/services/pos/cart-write-access"
import { addPOSCartLineAction, updatePOSCartLineAction, removePOSCartLineAction } from "../cart.actions"

describe("cart write denial transport", () => {
  beforeEach(() => { jest.resetAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-a", userId: "cashier-a" }) })
  it.each([
    [addPOSCartLineAction, addPOSCartLine, "add"], [updatePOSCartLineAction, updatePOSCartLine, "update"], [removePOSCartLineAction, removePOSCartLine, "remove"],
  ] as const)("returns a stable denial and uses trusted identity", async (action, service, operation) => {
    ;(service as jest.Mock).mockRejectedValue(new POSCartWriteAccessError(operation))
    const result = await action({ checkoutLeaseId: "00000000-0000-4000-8000-000000000001", organizationId: "injected", userId: "injected", locationId: "loc-a", terminalId: "terminal-a", sessionId: "shift-a", itemId: "item-a", salesOrderId: "cart-a", lineId: "line-a", quantity: 2 })
    expect(result).toMatchObject({ success: false, data: null, code: "POS_CART_WRITE_UNAVAILABLE" })
    expect(service).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", userId: "cashier-a" }))
    expect(revalidateTag).not.toHaveBeenCalled()
  })
  it.each([
    [addPOSCartLineAction, addPOSCartLine], [updatePOSCartLineAction, updatePOSCartLine], [removePOSCartLineAction, removePOSCartLine],
  ] as const)("keeps a saved cart successful when cache revalidation fails", async (action, service) => {
    ;(service as jest.Mock).mockResolvedValue({ id: "cart-a", version: 2 })
    ;(revalidateTag as jest.Mock).mockImplementation(() => { throw new Error("Cache unavailable") })
    const result = await action({ checkoutLeaseId: "00000000-0000-4000-8000-000000000001", locationId: "loc-a", terminalId: "terminal-a", sessionId: "shift-a", itemId: "item-a", salesOrderId: "cart-a", lineId: "line-a", quantity: 2 })
    expect(result).toMatchObject({ success: true, data: { id: "cart-a", version: 2 } })
    expect(service).toHaveBeenCalledTimes(1)
  })
})
