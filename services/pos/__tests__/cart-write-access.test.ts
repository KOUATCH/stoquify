import type { Prisma } from "@prisma/client"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { assertPOSCartWriteAccessInTx, POS_CART_WRITE_POLICY_VERSION } from "../cart-write-access"
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))

describe("cart commercial write policy", () => {
  const evaluate = evaluateModuleAccessInTx as jest.Mock, tx = {} as Prisma.TransactionClient
  beforeEach(() => jest.resetAllMocks())
  it.each(["add", "update", "remove"] as const)("checks writable POS access for %s in the caller transaction", async operation => {
    evaluate.mockResolvedValue({ allowed: false })
    await expect(assertPOSCartWriteAccessInTx(tx, { organizationId: "org-a", userId: "cashier-a", resourceId: "object-a", operation })).rejects.toMatchObject({
      code: "FORBIDDEN", metadata: { reason: "POS_CART_WRITE_UNAVAILABLE", policyId: `pos.cart.${operation}`, policyVersion: POS_CART_WRITE_POLICY_VERSION },
    })
    expect(evaluate).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: "org-a", userId: "cashier-a", moduleSlug: "pos", accessIntent: "write", mode: "enforce" }))
  })
  it("propagates a failed authority read without fallback", async () => {
    const failure = new Error("authority unavailable");evaluate.mockRejectedValue(failure)
    await expect(assertPOSCartWriteAccessInTx(tx, { organizationId: "org-a", userId: "cashier-a", resourceId: "object-a", operation: "update" })).rejects.toBe(failure)
  })
})
