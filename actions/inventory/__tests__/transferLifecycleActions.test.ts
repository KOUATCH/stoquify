/** @jest-environment node */
import { executeTransferCommand, getTransferDetail } from "../transferLifecycleActions"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { transitionStockTransfer, loadTransferDetail } from "@/services/inventory/inventory-transfer-lifecycle.service"
import { errorHandler } from "@/lib/error-handling/error-handler"
import { BusinessRuleError, ConflictError, ForbiddenError, ApplicationError } from "@/services/_shared/action-errors"
import { revalidateTag } from "next/cache"
jest.mock("@/lib/error-handling", () => jest.requireActual("@/lib/error-handling/server-action-wrapper"))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), hasRbacPermission: () => true }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/inventory/inventory-transfer-lifecycle.service", () => ({ transitionStockTransfer: jest.fn(), loadTransferDetail: jest.fn(), transferWorkflowAvailability: async () => ({ allowedOperations: ["SUBMIT"] }) }))
jest.mock("@/services/inventory/inventory-read.service", () => ({ toLocationTransferDTO: (value: unknown) => value }))
jest.mock("@/services/inventory/inventory-transfer-activity.service", () => ({ readTransferActivity: async () => [] }))
jest.mock("next/cache", () => ({ revalidateTag: jest.fn(), revalidatePath: jest.fn() }))
const input = { organizationId: "org", transferId: "transfer", operation: "SUBMIT" as const, requestId: "request", expectedUpdatedAt: "2026-09-12T10:00:00.000Z" }
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(errorHandler, "handle").mockResolvedValue({ handled: true } as any)
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "real-actor", permissions: ["inventory.stock.transfer"] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(transitionStockTransfer as jest.Mock).mockResolvedValue({ transfer: { id: "transfer" }, replayed: false })
  ;(loadTransferDetail as jest.Mock).mockResolvedValue({ id: "transfer" })
})
it("uses fresh server identity and enforced module write access", async () => {
  await executeTransferCommand({ ...input, actorId: "forged" } as any)
  expect(transitionStockTransfer).toHaveBeenCalledWith({ ...input, actorId: "real-actor" })
  expect(requirePermission).toHaveBeenCalledWith("inventory.stock.transfer", expect.objectContaining({ resourceId: "transfer" }))
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ mode: "enforce", accessIntent: "write", organizationId: "org" }))
  expect(revalidateTag).toHaveBeenCalledWith("inventory")
})
it("rejects a foreign organization before effects", async () => {
  expect(await executeTransferCommand({ ...input, organizationId: "foreign" })).toMatchObject({ success: false, error: { code: "FORBIDDEN" } })
  expect(transitionStockTransfer).not.toHaveBeenCalled()
})
it("rejects revoked permissions before effects", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new ForbiddenError("Forbidden"))
  expect(await executeTransferCommand(input)).toMatchObject({ success: false, error: { code: "FORBIDDEN" } })
  expect(transitionStockTransfer).not.toHaveBeenCalled()
})
it("rejects module denial before effects", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  expect(await executeTransferCommand(input)).toMatchObject({ success: false, error: { code: "FORBIDDEN" } })
  expect(transitionStockTransfer).not.toHaveBeenCalled()
})
it("fetches a scoped transfer directly rather than scanning the first history page", async () => {
  await getTransferDetail({ organizationId: "org", transferId: "older-transfer" })
  expect(loadTransferDetail).toHaveBeenCalledWith("org", "older-transfer")
})

it.each([
  new BusinessRuleError("This transfer already contains stock movement quantities and requires reconciliation."),
  new BusinessRuleError("Insufficient available stock for SKU."),
  new BusinessRuleError("An open accounting period is required for this stock movement."),
  new ConflictError("This transfer has changed. Refresh it before continuing."),
])("preserves the actionable dispatch failure through the real inventory wrapper: %s", async error => {
  ;(transitionStockTransfer as jest.Mock).mockRejectedValue(error)
  const result = await executeTransferCommand({ ...input, operation: "DISPATCH" })
  expect(result).toMatchObject({ success: false, error: { code: error.code, userMessage: error.message } })
  expect(revalidateTag).not.toHaveBeenCalled()
})
it("does not expose private application-error details", async () => {
  ;(transitionStockTransfer as jest.Mock).mockRejectedValue(new ApplicationError("INTERNAL_ERROR", "private database detail", 500, false))
  const result = await executeTransferCommand(input)
  expect(result.success).toBe(false)
  expect(JSON.stringify(result.error)).not.toContain("private database detail")
})
it("keeps unexpected failures private", async () => {
  ;(transitionStockTransfer as jest.Mock).mockRejectedValue(new Error("private database detail"))
  const result = await executeTransferCommand(input)
  expect(result.success).toBe(false)
  expect(JSON.stringify(result.error)).not.toContain("private database detail")
})
