import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { archiveLegacyCustomerForOrg } from "@/services/customer/customer.service"
import { deleteCustomer } from "../customerAction2"
import { deleteCustomerAction } from "../customerActions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/customer/customer.service", () => ({ archiveLegacyCustomerForOrg: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeServerActionErrorResult: (error: Error) => ({ success: false, error: { message: error.message, userMessage: error.message } }) }))

const mockRemove = archiveLegacyCustomerForOrg as jest.Mock
const mockPermission = requirePermission as jest.Mock
const mockObserve = observeModuleAccess as jest.Mock
const mockRevalidate = revalidatePath as jest.Mock

beforeEach(() => {
  jest.resetAllMocks()
  mockPermission.mockResolvedValue({ orgId: "org-current", userId: "actor", permissions: ["customers.delete"] })
  mockObserve.mockResolvedValue({ allowed: true })
  mockRemove.mockResolvedValue({ id: "customer-1", mode: "deactivated" })
})

it.each(["deactivated", "archived"])("preserves the actual %s receipt through both action layers", async mode => {
  mockRemove.mockResolvedValue({ id: "customer-1", mode })
  expect(await deleteCustomer("customer-1")).toEqual({ success: true, data: { id: "customer-1", mode } })
  expect(await deleteCustomerAction("customer-1")).toEqual({ success: true, data: { id: "customer-1", mode, cacheStatus: "invalidated" } })
  expect(mockRemove).toHaveBeenNthCalledWith(1, "org-current", "customer-1")
  expect(mockRemove).toHaveBeenNthCalledWith(2, "org-current", "customer-1")
  expect(mockPermission).toHaveBeenCalledWith("customers.delete", expect.objectContaining({ resourceId: "customer-1", auditAllowed: true }))
})

it("does not recast completed deactivation as failure when cache invalidation fails", async () => {
  mockRevalidate.mockImplementation(() => { throw new Error("Cache unavailable") })
  expect(await deleteCustomerAction("customer-1")).toEqual({ success: true, data: { id: "customer-1", mode: "deactivated", cacheStatus: "deferred" } })
  expect(mockRemove).toHaveBeenCalledTimes(1)
})

it("keeps current permission denial before module observation or removal", async () => {
  mockPermission.mockRejectedValue(new Error("Missing customers.delete permission"))
  expect((await deleteCustomerAction("customer-1")).success).toBe(false)
  expect(mockObserve).not.toHaveBeenCalled()
  expect(mockRemove).not.toHaveBeenCalled()
  expect(mockRevalidate).not.toHaveBeenCalled()
})

it("returns missing-object failure without cache invalidation", async () => {
  mockRemove.mockRejectedValue(new Error("Customer not found"))
  expect((await deleteCustomerAction("customer-other")).success).toBe(false)
  expect(mockRemove).toHaveBeenCalledTimes(1)
  expect(mockRevalidate).not.toHaveBeenCalled()
})

it("rejects missing identity before authorization and mutation", async () => {
  expect((await deleteCustomerAction("")).success).toBe(false)
  expect(mockPermission).not.toHaveBeenCalled()
  expect(mockRemove).not.toHaveBeenCalled()
})
