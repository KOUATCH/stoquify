import type { Prisma } from "@prisma/client"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { assertPOSShiftOpeningAccessInTx, POS_SHIFT_OPEN_ACCESS_POLICY } from "../shift-opening-access"
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))

describe("commercial shift opening admission", () => {
  const evaluate = evaluateModuleAccessInTx as jest.Mock
  const tx = {} as Prisma.TransactionClient
  beforeEach(() => jest.resetAllMocks())
  it("checks writable POS and required dependencies in the caller's transaction", async () => {
    evaluate.mockResolvedValue({ allowed: true })
    await assertPOSShiftOpeningAccessInTx(tx, { organizationId: "org-a", userId: "cashier-a" })
    expect(evaluate).toHaveBeenCalledWith(tx, { ...POS_SHIFT_OPEN_ACCESS_POLICY, organizationId: "org-a", userId: "cashier-a" })
  })
  it("denies an unavailable grant before the caller creates a shift", async () => {
    evaluate.mockResolvedValue({ allowed: false })
    await expect(assertPOSShiftOpeningAccessInTx(tx, { organizationId: "org-a", userId: "cashier-a" })).rejects.toMatchObject({
      code: "FORBIDDEN", metadata: { reason: "POS_SHIFT_ENTITLEMENT_UNAVAILABLE", policyVersion: POS_SHIFT_OPEN_ACCESS_POLICY.version },
    })
  })
  it("propagates a failed authority read rather than granting legacy access or claiming a policy denial", async () => {
    const failure = new Error("query unavailable");evaluate.mockRejectedValue(failure)
    await expect(assertPOSShiftOpeningAccessInTx(tx, { organizationId: "org-a", userId: "cashier-a" })).rejects.toBe(failure)
  })
})
