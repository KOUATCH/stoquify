jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeActionErrorMessage: jest.fn(
    (_error: unknown, _context: unknown, fallback: string) => fallback,
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/category/category.service", () => ({
  createCategory: jest.fn(),
}))

import { revalidatePath } from "next/cache"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { createCategory as createCategoryService } from "@/services/category/category.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { createBulkCategories } from "../createBulkCategories"

const MAX_BULK_CATEGORY_BATCH_SIZE = 100
const MAX_BULK_CATEGORY_FAILURES = 20

const mockRevalidatePath = revalidatePath as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockCreateCategory = createCategoryService as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: ["inventory.categories.create"],
}

describe("createBulkCategories authorization boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockCreateCategory.mockResolvedValue({ id: "category-1" })
  })

  it("uses one canonical audited permission and the trusted tenant for an allowed batch", async () => {
    const result = await createBulkCategories([
      { organizationId: "org-session", titleEn: "Food" },
      { organizationId: "org-session", titleEn: "Drinks" },
    ])

    expect(result).toMatchObject({
      success: true,
      data: { requestedCount: 2, createdCount: 2, failedCount: 0, failures: [] },
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledTimes(1)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.create", {
      resource: "CategoryBulkImport",
      auditAllowed: true,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledTimes(1)
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "inventory",
      organizationId: "org-session",
      accessIntent: "write",
      mode: "observe",
    }))
    expect(mockCreateCategory).toHaveBeenCalledTimes(2)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      1,
      "org-session",
      expect.objectContaining({ titleEn: "Food" }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/inventory/categories")
  })

  it("denies the batch before tenant checks, module observation, or mutation", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await createBulkCategories([{ titleEn: "Food" }])

    expect(result).toMatchObject({
      success: false,
      data: { requestedCount: 1, createdCount: 0, failedCount: 1 },
      error: "Failed to create categories",
    })
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockCreateCategory).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("bounds both batch size and returned row-failure evidence", async () => {
    const oversized = Array.from(
      { length: MAX_BULK_CATEGORY_BATCH_SIZE + 1 },
      (_, index) => ({ titleEn: `Category ${index}` }),
    )

    const oversizedResult = await createBulkCategories(oversized)
    expect(oversizedResult).toMatchObject({
      success: false,
      data: {
        requestedCount: MAX_BULK_CATEGORY_BATCH_SIZE + 1,
        createdCount: 0,
        failedCount: MAX_BULK_CATEGORY_BATCH_SIZE + 1,
        failures: [],
        failuresTruncated: true,
      },
    })
    expect(mockCreateCategory).not.toHaveBeenCalled()

    const invalidRows = Array.from(
      { length: MAX_BULK_CATEGORY_FAILURES + 2 },
      () => ({ titleEn: "" }),
    )
    const failedResult = await createBulkCategories(invalidRows)

    expect(failedResult.data.failedCount).toBe(MAX_BULK_CATEGORY_FAILURES + 2)
    expect(failedResult.data.failures).toHaveLength(MAX_BULK_CATEGORY_FAILURES)
    expect(failedResult.data.failuresTruncated).toBe(true)
    expect(mockCreateCategory).not.toHaveBeenCalled()
  })
})
