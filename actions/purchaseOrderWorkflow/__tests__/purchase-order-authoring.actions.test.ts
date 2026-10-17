jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), isRbacError: (error: unknown) => error instanceof Error && error.name === "RbacError" }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchase-order/purchase-order-authoring.service", () => ({ savePurchaseAuthoring: jest.fn(), getPurchaseAuthoring: jest.fn(), listPurchaseAuthoring: jest.fn(), preparePurchaseAuthoring: jest.fn(), createPurchaseOrderFromAuthoring: jest.fn(), discardPurchaseAuthoring: jest.fn() }))
import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ConflictError, ForbiddenError } from "@/services/_shared/action-errors"
import { savePurchaseAuthoring, createPurchaseOrderFromAuthoring } from "@/services/purchase-order/purchase-order-authoring.service"
import { savePurchaseAuthoringAction, createPurchaseOrderFromAuthoringAction } from "../purchase-order-authoring.actions"

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "buyer", permissions: ["purchases.orders.create"] })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: "org", userId: "buyer", sessionId: "session", sessionToken: "private" } })
  ;(savePurchaseAuthoring as jest.Mock).mockResolvedValue({ id: "draft" })
})
it("binds the operation to the current server context and session", async () => {
  expect(await savePurchaseAuthoringAction({ id: "draft" })).toEqual({ ok: true, data: { id: "draft" } })
  expect(savePurchaseAuthoring).toHaveBeenCalledWith({ orgId: "org", userId: "buyer", permissions: ["purchases.orders.create"], sessionId: "session", sessionToken: "private" }, { id: "draft" })
})
it.each([{ tenantId: "other", userId: "buyer" }, { tenantId: "org", userId: "other" }])("rejects mismatched session identity %o", async claims => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims })
  expect(await savePurchaseAuthoringAction({})).toEqual({ ok: false, code: "RESTRICTED" })
  expect(savePurchaseAuthoring).not.toHaveBeenCalled()
})
it.each([[new ConflictError("private revision"), "STALE"], [new ForbiddenError("private permission"), "RESTRICTED"], [new Error("database credentials or payload"), "UNAVAILABLE"]])("returns fixed error codes without raw service details", async (error, code) => {
  ;(savePurchaseAuthoring as jest.Mock).mockRejectedValueOnce(error)
  expect(await savePurchaseAuthoringAction({})).toEqual({ ok: false, code })
})
it("preserves a committed receipt if cache invalidation fails", async () => {
  ;(createPurchaseOrderFromAuthoring as jest.Mock).mockResolvedValue({ receipt: { orderId: "po" }, status: "CREATED" })
  ;(revalidateTag as jest.Mock).mockImplementationOnce(() => { throw new Error("cache unavailable") })
  expect(await createPurchaseOrderFromAuthoringAction({ id: "draft" })).toEqual({ ok: true, data: { receipt: { orderId: "po" }, status: "CREATED" } })
})
