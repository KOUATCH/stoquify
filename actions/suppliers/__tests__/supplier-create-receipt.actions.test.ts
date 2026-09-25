import { revalidatePath } from "next/cache"
import { requireOrg } from "@/services/_shared/require-org"
import { createSupplierForManagement } from "@/services/supplier/supplier.service"
import { createManagedSupplier } from "../supplier-management-actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/_shared/require-org", () => ({ requireOrg: jest.fn() }))
jest.mock("@/services/supplier/supplier.service", () => ({ createSupplierForManagement: jest.fn() }))
jest.mock("@/services/purchasing/ap-history.service", () => ({ readAPHistory: jest.fn() }))
jest.mock("@/services/supplier/supplier-export.service", () => ({ auditSupplierExportDecision: jest.fn() }))
jest.mock("@/services/security/export-safety.service", () => ({ buildExportWatermark: jest.fn(), evaluateExportSafety: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeLoggedActionErrorMessage: (_label: string, _error: unknown, _meta: unknown, fallback: string) => fallback }))

const mockCreate = createSupplierForManagement as jest.Mock
const mockOrg = requireOrg as jest.Mock
const mockRevalidate = revalidatePath as jest.Mock
const input = { name: "Supplier", isActive: true, preferredLocale: "EN" as const }
const receipt = { id: "saved-supplier", organizationId: "org-1", name: "Supplier", code: "SUP-1" }

beforeEach(() => {
  jest.resetAllMocks()
  mockOrg.mockResolvedValue({ orgId: "org-1", user: { permissions: ["purchases.suppliers.create"] } })
  mockCreate.mockResolvedValue(receipt)
})

it("returns the committed identity and invalidation status", async () => {
  await expect(createManagedSupplier("org-1", input)).resolves.toEqual({ success: true, data: { ...receipt, cacheStatus: "invalidated" } })
  expect(mockCreate).toHaveBeenCalledTimes(1)
  expect(mockCreate).toHaveBeenCalledWith("org-1", expect.objectContaining({ ...input, paymentTerms: 30 }))
})

it("keeps the saved result when route invalidation throws", async () => {
  mockRevalidate.mockImplementation(() => { throw new Error("Cache unavailable") })
  await expect(createManagedSupplier("org-1", input)).resolves.toEqual({ success: true, data: { ...receipt, cacheStatus: "deferred" } })
  expect(mockCreate).toHaveBeenCalledTimes(1)
})

it("does not create for another organization", async () => {
  expect((await createManagedSupplier("org-other", input)).success).toBe(false)
  expect(mockCreate).not.toHaveBeenCalled()
  expect(mockRevalidate).not.toHaveBeenCalled()
})

it("does not create without current supplier creation permission", async () => {
  mockOrg.mockResolvedValue({ orgId: "org-1", user: { permissions: ["purchases.suppliers.read"] } })
  expect((await createManagedSupplier("org-1", input)).success).toBe(false)
  expect(mockCreate).not.toHaveBeenCalled()
})

it("preserves real create failure without claiming success or invalidating", async () => {
  mockCreate.mockRejectedValue(new Error("Insert failed"))
  expect((await createManagedSupplier("org-1", input)).success).toBe(false)
  expect(mockCreate).toHaveBeenCalledTimes(1)
  expect(mockRevalidate).not.toHaveBeenCalled()
})
